<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h2 class="page-title">考试管理</h2>
        <div class="page-subtitle">创建考试、指派班级、排期与发布成绩</div>
      </div>
      <div class="header-actions">
        <el-button type="primary" @click="openCreate">新建考试</el-button>
        <el-button :loading="loading" @click="loadExams">刷新</el-button>
      </div>
    </div>

    <div class="card">
      <div class="toolbar">
        <el-input
          v-model="filters.keyword"
          placeholder="搜索考试名称"
          clearable
          style="width: 220px"
          @keyup.enter="reload"
          @clear="reload"
        />
        <el-select
          v-model="filters.status"
          placeholder="全部状态"
          clearable
          style="width: 150px"
          @change="reload"
        >
          <el-option label="草稿" value="draft" />
          <el-option label="已排期" value="scheduled" />
          <el-option label="进行中" value="ongoing" />
          <el-option label="已结束" value="finished" />
          <el-option label="已发布成绩" value="published" />
        </el-select>
        <el-button @click="reload">查询</el-button>
        <div class="spacer" />
        <span class="text-sub">共 {{ pagination.total }} 场考试</span>
      </div>

      <el-table
        v-loading="loading"
        :data="exams"
        stripe
        :header-cell-style="{ background: '#f7fafc' }"
      >
        <el-table-column prop="title" label="考试名称" min-width="180" />
        <el-table-column prop="paperTitle" label="试卷" min-width="150" />
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small" effect="plain">
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="时间窗" min-width="200">
          <template #default="{ row }">
            <span class="text-sub">
              {{ formatTime(row.startAt) }} — {{ formatTime(row.endAt) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="时长" width="90">
          <template #default="{ row }">{{ row.durationMin }} 分钟</template>
        </el-table-column>
        <el-table-column label="班级" width="80">
          <template #default="{ row }">{{ row.classCount }}</template>
        </el-table-column>
        <el-table-column label="交卷" width="80">
          <template #default="{ row }">{{ row.sessionCount }}</template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">
              详情
            </el-button>
            <el-button
              v-if="row.status === 'draft'"
              link
              type="primary"
              @click="openEdit(row)"
            >
              编辑
            </el-button>
            <el-button
              v-if="row.status === 'draft'"
              link
              type="success"
              @click="scheduleExam(row)"
            >
              排期
            </el-button>
            <el-button
              v-if="['scheduled', 'ongoing'].includes(row.status)"
              link
              type="warning"
              @click="endExam(row)"
            >
              结束
            </el-button>
            <el-button
              v-if="row.status === 'finished'"
              link
              type="success"
              @click="publishResults(row)"
            >
              发布成绩
            </el-button>
            <el-button
              v-if="row.status === 'draft'"
              link
              type="danger"
              @click="deleteExam(row)"
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
          @current-change="loadExams"
          @size-change="reload"
        />
      </div>
    </div>

    <el-dialog
      v-model="formVisible"
      :title="editingId ? '编辑考试' : '新建考试'"
      width="720px"
      destroy-on-close
    >
      <el-form label-position="top">
        <div class="form-row">
          <el-form-item label="考试名称" class="form-col" required>
            <el-input v-model="form.title" maxlength="100" />
          </el-form-item>
          <el-form-item label="试卷" class="form-col" required>
            <el-select
              v-model="form.paperId"
              :disabled="Boolean(editingId)"
              placeholder="选择已发布试卷"
              style="width: 100%"
            >
              <el-option
                v-for="paper in papers"
                :key="paper.id"
                :label="`${paper.title}（${paper.totalScore} 分）`"
                :value="paper.id"
              />
            </el-select>
          </el-form-item>
        </div>

        <div class="form-row">
          <el-form-item label="开始时间" class="form-col" required>
            <el-date-picker
              v-model="form.startAt"
              type="datetime"
              value-format="x"
              placeholder="开始时间"
              style="width: 100%"
            />
          </el-form-item>
          <el-form-item label="结束时间" class="form-col" required>
            <el-date-picker
              v-model="form.endAt"
              type="datetime"
              value-format="x"
              placeholder="结束时间"
              style="width: 100%"
            />
          </el-form-item>
        </div>

        <div class="form-row">
          <el-form-item label="时长（分钟）" class="form-col">
            <el-input-number v-model="form.durationMin" :min="5" :max="300" style="width: 100%" />
          </el-form-item>
          <el-form-item label="及格分" class="form-col">
            <el-input-number v-model="form.passScore" :min="0" :max="1000" style="width: 100%" />
          </el-form-item>
          <el-form-item label="最多考试次数" class="form-col">
            <el-input-number v-model="form.maxAttempts" :min="1" :max="10" style="width: 100%" />
          </el-form-item>
        </div>

        <div class="form-row">
          <el-form-item label="题目乱序" class="form-col">
            <el-switch v-model="form.shuffleQuestions" />
          </el-form-item>
          <el-form-item label="选项乱序" class="form-col">
            <el-switch v-model="form.shuffleOptions" />
          </el-form-item>
        </div>

        <el-form-item label="指派班级">
          <el-select
            v-model="form.classIds"
            multiple
            filterable
            placeholder="选择班级"
            style="width: 100%"
          >
            <el-option
              v-for="item in classes"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveExam">
          {{ editingId ? '保存' : '创建并排期' }}
        </el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="detailVisible" size="620px" title="考试详情">
      <div v-if="detail" class="exam-detail">
        <h3>{{ detail.title }}</h3>
        <div class="detail-tags">
          <el-tag :type="statusType(detail.status)" effect="plain">
            {{ statusLabel(detail.status) }}
          </el-tag>
          <span class="text-sub">{{ detail.paperTitle }}</span>
        </div>

        <el-descriptions :column="1" border class="detail-desc">
          <el-descriptions-item label="时间窗">
            {{ formatTime(detail.startAt) }} — {{ formatTime(detail.endAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="时长">{{ detail.durationMin }} 分钟</el-descriptions-item>
          <el-descriptions-item label="及格分">{{ detail.passScore }}</el-descriptions-item>
          <el-descriptions-item label="最多次数">{{ detail.maxAttempts }}</el-descriptions-item>
          <el-descriptions-item label="题目乱序">{{ detail.shuffleQuestions ? '是' : '否' }}</el-descriptions-item>
          <el-descriptions-item label="选项乱序">{{ detail.shuffleOptions ? '是' : '否' }}</el-descriptions-item>
          <el-descriptions-item label="已交卷">{{ detail.sessionCount }}</el-descriptions-item>
        </el-descriptions>

        <div class="detail-section">
          <div class="section-title">指派班级</div>
          <div v-if="detail.classes.length === 0" class="text-sub">尚未指派班级</div>
          <el-tag
            v-for="item in detail.classes"
            :key="item.id"
            class="class-tag"
            effect="plain"
          >
            {{ item.name }}
          </el-tag>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import api from '../api';

const loading = ref(false);
const saving = ref(false);
const exams = ref([]);
const papers = ref([]);
const classes = ref([]);

const filters = reactive({ keyword: '', status: '' });
const pagination = reactive({ page: 1, pageSize: 10, total: 0 });

const formVisible = ref(false);
const editingId = ref(null);
const form = reactive({
  title: '',
  paperId: null,
  startAt: null,
  endAt: null,
  durationMin: 60,
  passScore: 60,
  maxAttempts: 1,
  shuffleQuestions: false,
  shuffleOptions: false,
  classIds: [],
});

const detailVisible = ref(false);
const detail = ref(null);

const STATUS_LABELS = {
  draft: '草稿',
  scheduled: '已排期',
  ongoing: '进行中',
  finished: '已结束',
  published: '已发布成绩',
};

function statusLabel(status) {
  return STATUS_LABELS[status] || status;
}

function statusType(status) {
  const map = {
    draft: 'info',
    scheduled: 'primary',
    ongoing: 'success',
    finished: 'warning',
    published: 'success',
  };
  return map[status] || 'info';
}

function formatTime(timestamp) {
  if (!timestamp) return '—';
  return new Date(timestamp).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

async function loadExams() {
  loading.value = true;
  try {
    const result = await api.exams.list({
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: filters.keyword || undefined,
      status: filters.status || undefined,
    });
    exams.value = result.items;
    pagination.total = result.pagination.total;
  } catch (error) {
    exams.value = [];
  } finally {
    loading.value = false;
  }
}

function reload() {
  pagination.page = 1;
  loadExams();
}

async function loadOptions() {
  try {
    const result = await api.papers.list({
      status: 'published',
      page: 1,
      pageSize: 100,
    });
    papers.value = result.items || [];
  } catch (error) {
    papers.value = [];
  }

  try {
    const result = await api.classes.list({ page: 1, pageSize: 100 });
    classes.value = result.items || [];
  } catch (error) {
    classes.value = [];
  }
}

function resetForm() {
  const now = Date.now();
  form.title = '';
  form.paperId = null;
  form.startAt = String(now + 60 * 60 * 1000);
  form.endAt = String(now + 3 * 60 * 60 * 1000);
  form.durationMin = 60;
  form.passScore = 60;
  form.maxAttempts = 1;
  form.shuffleQuestions = false;
  form.shuffleOptions = false;
  form.classIds = [];
}

async function openCreate() {
  editingId.value = null;
  resetForm();
  await loadOptions();
  formVisible.value = true;
}

function openEdit(row) {
  editingId.value = row.id;
  form.title = row.title;
  form.paperId = row.paperId;
  form.startAt = String(row.startAt);
  form.endAt = String(row.endAt);
  form.durationMin = row.durationMin;
  form.passScore = row.passScore;
  form.maxAttempts = row.maxAttempts;
  form.shuffleQuestions = row.shuffleQuestions;
  form.shuffleOptions = row.shuffleOptions;
  form.classIds = [];
  loadOptions();
  formVisible.value = true;
}

async function saveExam() {
  if (!form.title.trim()) {
    ElMessage.warning('请输入考试名称');
    return;
  }
  if (!editingId.value && !form.paperId) {
    ElMessage.warning('请选择试卷');
    return;
  }
  if (!form.startAt || !form.endAt) {
    ElMessage.warning('请选择开始和结束时间');
    return;
  }
  if (Number(form.endAt) <= Number(form.startAt)) {
    ElMessage.warning('结束时间必须晚于开始时间');
    return;
  }

  saving.value = true;
  try {
    if (editingId.value) {
      await api.exams.update(editingId.value, {
        title: form.title,
        startAt: Number(form.startAt),
        endAt: Number(form.endAt),
        durationMin: form.durationMin,
        passScore: form.passScore,
        maxAttempts: form.maxAttempts,
        shuffleQuestions: form.shuffleQuestions,
        shuffleOptions: form.shuffleOptions,
      });
      ElMessage.success('考试已更新');
    } else {
      const created = await api.exams.create({
        title: form.title,
        paperId: form.paperId,
        startAt: Number(form.startAt),
        endAt: Number(form.endAt),
        durationMin: form.durationMin,
        passScore: form.passScore,
        maxAttempts: form.maxAttempts,
        shuffleQuestions: form.shuffleQuestions,
        shuffleOptions: form.shuffleOptions,
        classIds: form.classIds,
      });

      if (form.classIds.length > 0) {
        await api.exams.schedule(created.id);
        ElMessage.success('考试已创建并排期');
      } else {
        ElMessage.warning('考试已创建为草稿，请指派班级后再排期');
      }
    }

    formVisible.value = false;
    await loadExams();
  } catch (error) {
    // 错误提示由拦截器处理
  } finally {
    saving.value = false;
  }
}

async function scheduleExam(row) {
  if (row.classCount === 0) {
    ElMessage.warning('请先在详情中添加班级，再排期');
    return;
  }

  try {
    await ElMessageBox.confirm(
      '排期后考试会按时间窗自动开始，确定吗？',
      '排期',
      { type: 'warning', confirmButtonText: '排期', cancelButtonText: '取消' },
    );
  } catch (error) {
    return;
  }

  try {
    await api.exams.schedule(row.id);
    ElMessage.success('考试已排期');
    await loadExams();
  } catch (error) {
    // 错误提示由拦截器处理
  }
}

async function endExam(row) {
  try {
    await ElMessageBox.confirm('结束后学生将不能再作答，确定吗？', '结束考试', {
      type: 'warning',
      confirmButtonText: '结束',
      cancelButtonText: '取消',
    });
  } catch (error) {
    return;
  }

  try {
    await api.exams.end(row.id);
    ElMessage.success('考试已结束');
    await loadExams();
  } catch (error) {
    // 错误提示由拦截器处理
  }
}

async function publishResults(row) {
  try {
    await ElMessageBox.confirm(
      '发布后学生可以查看总分和逐题解析，确定吗？',
      '发布成绩',
      { type: 'warning', confirmButtonText: '发布', cancelButtonText: '取消' },
    );
  } catch (error) {
    return;
  }

  try {
    await api.exams.publishResults(row.id);
    ElMessage.success('成绩已发布');
    await loadExams();
  } catch (error) {
    // 错误提示由拦截器处理
  }
}

async function deleteExam(row) {
  try {
    await ElMessageBox.confirm(`确定删除考试「${row.title}」吗？`, '删除考试', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    });
  } catch (error) {
    return;
  }

  try {
    await api.exams.remove(row.id);
    ElMessage.success('考试已删除');
    await loadExams();
  } catch (error) {
    // 错误提示由拦截器处理
  }
}

async function openDetail(row) {
  try {
    detail.value = await api.exams.detail(row.id);
    detailVisible.value = true;
  } catch (error) {
    // 错误提示由拦截器处理
  }
}

onMounted(async () => {
  await loadOptions();
  await loadExams();
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

.form-row {
  display: flex;
  gap: 12px;
}

.form-col {
  flex: 1;
}

.exam-detail {
  padding: 0 16px 30px;
}

.exam-detail h3 {
  margin: 0 0 10px;
}

.detail-tags {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.detail-desc {
  margin-bottom: 16px;
}

.detail-section {
  margin-top: 8px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
}

.class-tag {
  margin: 0 6px 6px 0;
}
</style>
