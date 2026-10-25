<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h2 class="page-title">用户管理</h2>
        <div class="page-subtitle">管理员、教师与学生账号统一管理</div>
      </div>
      <el-button type="primary" @click="openCreate">
        <el-icon><Plus /></el-icon>
        新建用户
      </el-button>
    </div>

    <div class="card">
      <div class="toolbar">
        <el-input
          v-model="filters.keyword"
          placeholder="搜索用户名或姓名"
          clearable
          style="width: 220px"
          @keyup.enter="reload"
          @clear="reload"
        />
        <el-select
          v-model="filters.role"
          placeholder="全部角色"
          clearable
          style="width: 140px"
          @change="reload"
        >
          <el-option label="管理员" value="admin" />
          <el-option label="教师" value="teacher" />
          <el-option label="学生" value="student" />
        </el-select>
        <el-select
          v-model="filters.status"
          placeholder="全部状态"
          clearable
          style="width: 140px"
          @change="reload"
        >
          <el-option label="正常" value="active" />
          <el-option label="已禁用" value="disabled" />
        </el-select>
        <el-button @click="reload">查询</el-button>
        <div class="spacer" />
        <span class="text-sub">共 {{ pagination.total }} 个账号</span>
      </div>

      <el-table
        v-loading="loading"
        :data="users"
        stripe
        style="width: 100%"
        :header-cell-style="{ background: '#f7fafc' }"
      >
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="username" label="用户名" min-width="120" />
        <el-table-column prop="realName" label="姓名" min-width="100" />
        <el-table-column label="角色" width="100">
          <template #default="{ row }">
            <el-tag :type="roleType(row.role)" size="small" effect="plain">
              {{ roleLabel(row.role) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="email" label="邮箱" min-width="180">
          <template #default="{ row }">
            <span class="text-sub">{{ row.email || '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-switch
              :model-value="row.status === 'active'"
              :disabled="row.id === auth.user?.id"
              inline-prompt
              active-text="正常"
              inactive-text="禁用"
              @change="(value) => toggleStatus(row, value)"
            />
          </template>
        </el-table-column>
        <el-table-column label="创建时间" min-width="160">
          <template #default="{ row }">
            <span class="text-sub">{{ formatDate(row.createdAt) }}</span>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          background
          @current-change="load"
          @size-change="reload"
        />
      </div>
    </div>

    <el-dialog
      v-model="createVisible"
      title="新建用户"
      width="480px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="createFormRef"
        :model="createForm"
        :rules="createRules"
        label-position="top"
      >
        <el-form-item label="用户名" prop="username">
          <el-input
            v-model="createForm.username"
            placeholder="3-32 位字母、数字或下划线"
          />
        </el-form-item>
        <el-form-item label="姓名" prop="realName">
          <el-input v-model="createForm.realName" placeholder="真实姓名" />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="createForm.role" style="width: 100%">
            <el-option label="管理员" value="admin" />
            <el-option label="教师" value="teacher" />
            <el-option label="学生" value="student" />
          </el-select>
        </el-form-item>
        <el-form-item label="初始密码" prop="password">
          <el-input
            v-model="createForm.password"
            type="password"
            show-password
            placeholder="至少 6 位"
          />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="createForm.email" placeholder="选填" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="submitCreate">
          创建
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import api from '../api';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();

const loading = ref(false);
const users = ref([]);

const filters = reactive({
  keyword: '',
  role: '',
  status: '',
});

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
});

const createVisible = ref(false);
const creating = ref(false);
const createFormRef = ref(null);

const createForm = reactive({
  username: '',
  realName: '',
  role: 'student',
  password: '',
  email: '',
});

const createRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    {
      pattern: /^[a-zA-Z0-9_]{3,32}$/,
      message: '只能包含字母、数字和下划线，长度 3-32 位',
      trigger: 'blur',
    },
  ],
  realName: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
  password: [
    { required: true, message: '请输入初始密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' },
  ],
  email: [
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' },
  ],
};

const ROLE_LABELS = { admin: '管理员', teacher: '教师', student: '学生' };
const ROLE_TAG_TYPES = { admin: 'danger', teacher: 'warning', student: 'success' };

function roleLabel(role) {
  return ROLE_LABELS[role] || role;
}

function roleType(role) {
  return ROLE_TAG_TYPES[role] || 'info';
}

function formatDate(timestamp) {
  if (!timestamp) return '—';
  return new Date(timestamp).toLocaleString('zh-CN', { hour12: false });
}

async function load() {
  loading.value = true;
  try {
    const result = await api.users.list({
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: filters.keyword || undefined,
      role: filters.role || undefined,
      status: filters.status || undefined,
    });
    users.value = result.items;
    pagination.total = result.pagination.total;
  } catch (error) {
    users.value = [];
  } finally {
    loading.value = false;
  }
}

function reload() {
  pagination.page = 1;
  load();
}

async function toggleStatus(row, value) {
  try {
    await api.users.setStatus(row.id, value ? 'active' : 'disabled');
    row.status = value ? 'active' : 'disabled';
    ElMessage.success(value ? '已启用该账号' : '已禁用该账号');
  } catch (error) {
    // 失败时保持原状态
  }
}

function openCreate() {
  createForm.username = '';
  createForm.realName = '';
  createForm.role = 'student';
  createForm.password = '';
  createForm.email = '';
  createVisible.value = true;
}

async function submitCreate() {
  const valid = await createFormRef.value.validate().catch(() => false);
  if (!valid) return;

  creating.value = true;
  try {
    await api.users.create({
      username: createForm.username,
      realName: createForm.realName,
      role: createForm.role,
      password: createForm.password,
      email: createForm.email || undefined,
    });
    ElMessage.success('用户已创建');
    createVisible.value = false;
    await load();
  } catch (error) {
    // 错误提示由拦截器处理
  } finally {
    creating.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

@media (max-width: 640px) {
  .pagination {
    justify-content: center;
  }
}
</style>
