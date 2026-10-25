<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h2 class="page-title">班级管理</h2>
        <div class="page-subtitle">班级、成员与班主任</div>
      </div>
      <div class="header-actions">
        <el-button
          v-if="auth.role === 'admin'"
          type="primary"
          @click="openCreate"
        >
          新建班级
        </el-button>
        <el-button :loading="loading" @click="loadClasses">刷新</el-button>
      </div>
    </div>

    <div class="card">
      <div class="toolbar">
        <el-input
          v-model="keyword"
          placeholder="搜索班级名称"
          clearable
          style="width: 220px"
          @keyup.enter="reload"
          @clear="reload"
        />
        <el-button @click="reload">查询</el-button>
        <div class="spacer" />
        <span class="text-sub">共 {{ pagination.total }} 个班级</span>
      </div>

      <el-table
        v-loading="loading"
        :data="classes"
        stripe
        :header-cell-style="{ background: '#f7fafc' }"
      >
        <el-table-column prop="name" label="班级名称" min-width="180" />
        <el-table-column prop="grade" label="年级" width="100">
          <template #default="{ row }">{{ row.grade || '—' }}</template>
        </el-table-column>
        <el-table-column prop="teacherName" label="班主任" width="120">
          <template #default="{ row }">{{ row.teacherName || '—' }}</template>
        </el-table-column>
        <el-table-column label="学生数" width="90">
          <template #default="{ row }">{{ row.memberCount ?? '—' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small" effect="plain">
              {{ row.status === 'active' ? '正常' : '归档' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openMembers(row)">
              成员
            </el-button>
            <el-button link type="primary" @click="openEdit(row)">
              编辑
            </el-button>
            <el-button
              v-if="auth.role === 'admin'"
              link
              type="danger"
              @click="deleteClass(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          background
          @current-change="loadClasses"
          @size-change="reload"
        />
      </div>
    </div>

    <el-dialog
      v-model="formVisible"
      :title="editingId ? '编辑班级' : '新建班级'"
      width="460px"
    >
      <el-form label-position="top">
        <el-form-item label="班级名称" required>
          <el-input v-model="form.name" maxlength="50" />
        </el-form-item>
        <el-form-item label="年级">
          <el-input v-model="form.grade" maxlength="20" placeholder="例如：2024" />
        </el-form-item>
        <el-form-item v-if="auth.role === 'admin'" label="班主任">
          <el-select v-model="form.teacherId" clearable style="width: 100%">
            <el-option
              v-for="teacher in teachers"
              :key="teacher.id"
              :label="teacher.realName"
              :value="teacher.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveClass">
          保存
        </el-button>
      </template>
    </el-dialog>

    <el-drawer
      v-model="membersVisible"
      size="620px"
      :title="currentClass ? `${currentClass.name} · 成员` : '班级成员'"
    >
      <div v-if="currentClass" class="members">
        <div class="toolbar">
          <span class="text-sub">共 {{ members.length }} 名学生</span>
          <div class="spacer" />
          <el-button type="primary" plain @click="openAddStudents">
            添加学生
          </el-button>
        </div>

        <el-table :data="members" size="small" stripe>
          <el-table-column prop="username" label="学号" width="120" />
          <el-table-column prop="realName" label="姓名" min-width="100" />
          <el-table-column label="加入时间" min-width="150">
            <template #default="{ row }">
              <span class="text-sub">{{ formatTime(row.joinedAt) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="90">
            <template #default="{ row }">
              <el-button link type="danger" @click="removeStudent(row)">
                移除
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <el-empty
          v-if="members.length === 0"
          description="班级里还没有学生"
          :image-size="70"
        />
      </div>
    </el-drawer>

    <el-dialog v-model="addStudentsVisible" title="添加学生" width="520px">
      <el-select
        v-model="selectedStudentIds"
        multiple
        filterable
        placeholder="选择学生"
        style="width: 100%"
      >
        <el-option
          v-for="student in availableStudents"
          :key="student.id"
          :label="`${student.realName}（${student.username}）`"
          :value="student.id"
        />
      </el-select>
      <template #footer>
        <el-button @click="addStudentsVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="addStudents">
          添加
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import api from '../api';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();

const loading = ref(false);
const saving = ref(false);
const classes = ref([]);
const teachers = ref([]);
const keyword = ref('');
const pagination = reactive({ page: 1, pageSize: 10, total: 0 });

const formVisible = ref(false);
const editingId = ref(null);
const form = reactive({ name: '', grade: '', teacherId: null });

const membersVisible = ref(false);
const currentClass = ref(null);
const members = ref([]);
const allStudents = ref([]);
const addStudentsVisible = ref(false);
const selectedStudentIds = ref([]);

const availableStudents = computed(() => {
  const existing = new Set(members.value.map((item) => item.id));
  return allStudents.value.filter((item) => !existing.has(item.id));
});

function formatTime(timestamp) {
  if (!timestamp) return '—';
  return new Date(timestamp).toLocaleString('zh-CN', { hour12: false });
}

async function loadClasses() {
  loading.value = true;
  try {
    const result = await api.classes.list({
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: keyword.value || undefined,
    });
    classes.value = result.items;
    pagination.total = result.pagination.total;

    const withCounts = await Promise.all(
      result.items.map(async (item) => {
        try {
          const detail = await api.classes.detail(item.id);
          const memberResult = await api.classes.members(item.id);
          return {
            ...item,
            memberCount: (memberResult.items || []).length,
            teacherName: detail.teacherName || item.teacherName,
          };
        } catch (error) {
          return { ...item, memberCount: 0 };
        }
      }),
    );
    classes.value = withCounts;
  } catch (error) {
    classes.value = [];
  } finally {
    loading.value = false;
  }
}

function reload() {
  pagination.page = 1;
  loadClasses();
}

async function loadTeachers() {
  if (auth.role !== 'admin') return;
  try {
    const result = await api.users.list({ role: 'teacher', pageSize: 100 });
    teachers.value = result.items || [];
  } catch (error) {
    teachers.value = [];
  }
}

function openCreate() {
  editingId.value = null;
  form.name = '';
  form.grade = '';
  form.teacherId = null;
  formVisible.value = true;
}

function openEdit(row) {
  editingId.value = row.id;
  form.name = row.name;
  form.grade = row.grade || '';
  form.teacherId = row.teacherId || null;
  formVisible.value = true;
}

async function saveClass() {
  if (!form.name.trim()) {
    ElMessage.warning('请输入班级名称');
    return;
  }

  saving.value = true;
  try {
    const payload = {
      name: form.name,
      grade: form.grade,
    };
    if (auth.role === 'admin') {
      payload.teacherId = form.teacherId || null;
    }

    if (editingId.value) {
      await api.classes.update(editingId.value, payload);
      ElMessage.success('班级已更新');
    } else {
      await api.classes.create(payload);
      ElMessage.success('班级已创建');
    }
    formVisible.value = false;
    await loadClasses();
  } catch (error) {
    // 错误提示由拦截器处理
  } finally {
    saving.value = false;
  }
}

async function deleteClass(row) {
  try {
    await ElMessageBox.confirm(
      `确定删除班级「${row.name}」吗？班级里有学生时不能删除。`,
      '删除班级',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' },
    );
  } catch (error) {
    return;
  }

  try {
    await api.classes.remove(row.id);
    ElMessage.success('班级已删除');
    await loadClasses();
  } catch (error) {
    // 错误提示由拦截器处理
  }
}

async function openMembers(row) {
  currentClass.value = row;
  membersVisible.value = true;
  await loadMembers();
}

async function loadMembers() {
  if (!currentClass.value) return;
  try {
    const result = await api.classes.members(currentClass.value.id);
    members.value = result.items || [];
  } catch (error) {
    members.value = [];
  }
}

async function openAddStudents() {
  try {
    const result = await api.users.students();
    allStudents.value = result.items || [];
    selectedStudentIds.value = [];
    addStudentsVisible.value = true;
  } catch (error) {
    // 错误提示由拦截器处理
  }
}

async function addStudents() {
  if (selectedStudentIds.value.length === 0) {
    ElMessage.warning('请选择学生');
    return;
  }

  saving.value = true;
  try {
    await api.classes.addStudents(
      currentClass.value.id,
      selectedStudentIds.value,
    );
    ElMessage.success('学生已添加');
    addStudentsVisible.value = false;
    await Promise.all([loadMembers(), loadClasses()]);
  } catch (error) {
    // 错误提示由拦截器处理
  } finally {
    saving.value = false;
  }
}

async function removeStudent(row) {
  try {
    await ElMessageBox.confirm(
      `确定把「${row.realName}」移出班级吗？`,
      '移除学生',
      { type: 'warning', confirmButtonText: '移除', cancelButtonText: '取消' },
    );
  } catch (error) {
    return;
  }

  try {
    await api.classes.removeStudent(currentClass.value.id, row.id);
    ElMessage.success('已移除');
    await Promise.all([loadMembers(), loadClasses()]);
  } catch (error) {
    // 错误提示由拦截器处理
  }
}

onMounted(async () => {
  await Promise.all([loadTeachers(), loadClasses()]);
});
</script>

<style scoped>
.header-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 14px;
}

.members {
  padding: 0 16px 20px;
}
</style>
