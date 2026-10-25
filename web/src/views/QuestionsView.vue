<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h2 class="page-title">题库管理</h2>
        <div class="page-subtitle">
          支持单选、多选、判断、填空、简答五种题型
        </div>
      </div>
      <div class="header-actions">
        <el-button @click="downloadTemplate">下载模板</el-button>
        <el-button @click="openImport">导入 CSV</el-button>
        <el-button @click="exportCsv">导出 CSV</el-button>
        <el-button type="primary" @click="openCreate">
          <el-icon><Plus /></el-icon>
          新建题目
        </el-button>
      </div>
    </div>

    <div class="stat-strip">
      <div class="stat-chip" v-for="item in typeStats" :key="item.type">
        <span class="stat-dot" :style="{ background: item.color }" />
        <span>{{ item.label }}</span>
        <strong>{{ item.count }}</strong>
      </div>
      <div class="stat-chip total">
        <span>题目总数</span>
        <strong>{{ statistics.total }}</strong>
      </div>
    </div>

    <div class="card">
      <div class="toolbar">
        <el-input
          v-model="filters.keyword"
          placeholder="搜索题干或解析"
          clearable
          style="width: 240px"
          @keyup.enter="reload"
          @clear="reload"
        />
        <el-select
          v-model="filters.type"
          placeholder="全部题型"
          clearable
          style="width: 130px"
          @change="reload"
        >
          <el-option
            v-for="(label, value) in TYPE_LABELS"
            :key="value"
            :label="label"
            :value="value"
          />
        </el-select>
        <el-select
          v-model="filters.difficulty"
          placeholder="全部难度"
          clearable
          style="width: 130px"
          @change="reload"
        >
          <el-option
            v-for="level in 5"
            :key="level"
            :label="`难度 ${level}`"
            :value="level"
          />
        </el-select>
        <el-select
          v-model="filters.status"
          placeholder="全部状态"
          clearable
          style="width: 130px"
          @change="reload"
        >
          <el-option label="已发布" value="published" />
          <el-option label="草稿" value="draft" />
          <el-option label="已归档" value="archived" />
        </el-select>
        <el-select
          v-model="filters.knowledgePointId"
          placeholder="全部知识点"
          clearable
          filterable
          style="width: 160px"
          @change="reload"
        >
          <el-option
            v-for="point in knowledgePoints"
            :key="point.id"
            :label="point.name"
            :value="point.id"
          />
        </el-select>
        <el-button @click="reload">查询</el-button>
        <div class="spacer" />
        <span class="text-sub">共 {{ pagination.total }} 道题</span>
      </div>

      <el-table
        v-loading="loading"
        :data="questions"
        stripe
        style="width: 100%"
        :header-cell-style="{ background: '#f7fafc' }"
      >
        <el-table-column label="题干" min-width="280">
          <template #default="{ row }">
            <div class="stem-cell">
              <el-tag
                :type="typeTag(row.type)"
                size="small"
                effect="plain"
                class="type-tag"
              >
                {{ row.typeLabel }}
              </el-tag>
              <el-tooltip :content="row.stem" placement="top" :show-after="400">
                <span class="stem-text">{{ truncate(row.stem, 46) }}</span>
              </el-tooltip>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="难度" width="110">
          <template #default="{ row }">
            <span class="stars">{{ stars(row.difficulty) }}</span>
          </template>
        </el-table-column>

        <el-table-column label="分值" width="80">
          <template #default="{ row }">
            {{ row.defaultScore }} 分
          </template>
        </el-table-column>

        <el-table-column label="知识点" min-width="150">
          <template #default="{ row }">
            <span v-if="row.knowledgeNames.length === 0" class="text-sub">
              —
            </span>
            <el-tag
              v-for="name in row.knowledgeNames"
              :key="name"
              size="small"
              class="kp-tag"
            >
              {{ name }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="创建人" width="100">
          <template #default="{ row }">
            <span class="text-sub">{{ row.creatorName || '—' }}</span>
          </template>
        </el-table-column>

        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="statusTag(row.status)" size="small" effect="plain">
              {{ STATUS_LABELS[row.status] }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="210" fixed="right">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              :disabled="!canModify(row)"
              @click="openEdit(row)"
            >
              编辑
            </el-button>
            <el-button
              v-if="row.status !== 'published'"
              link
              type="success"
              :disabled="!canModify(row)"
              @click="changeStatus(row, 'publish')"
            >
              发布
            </el-button>
            <el-button
              v-else
              link
              type="warning"
              :disabled="!canModify(row)"
              @click="changeStatus(row, 'archive')"
            >
              归档
            </el-button>
            <el-button
              link
              type="danger"
              :disabled="!canModify(row)"
              @click="removeQuestion(row)"
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
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          background
          @current-change="load"
          @size-change="reload"
        />
      </div>
    </div>

    <el-dialog
      v-model="editorVisible"
      :title="form.id ? '编辑题目' : '新建题目'"
      width="720px"
      top="6vh"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form label-position="top" class="editor-form">
        <div class="form-row">
          <el-form-item label="题型" class="form-col">
            <el-select v-model="form.type" @change="onTypeChange">
              <el-option
                v-for="(label, value) in TYPE_LABELS"
                :key="value"
                :label="label"
                :value="value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="难度" class="form-col">
            <el-select v-model="form.difficulty">
              <el-option
                v-for="level in 5"
                :key="level"
                :label="`难度 ${level}`"
                :value="level"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="分值" class="form-col">
            <el-input-number
              v-model="form.defaultScore"
              :min="0.5"
              :max="100"
              :step="0.5"
              style="width: 100%"
            />
          </el-form-item>
          <el-form-item label="状态" class="form-col">
            <el-select v-model="form.status">
              <el-option label="已发布" value="published" />
              <el-option label="草稿" value="draft" />
            </el-select>
          </el-form-item>
        </div>

        <el-form-item label="题干" required>
          <el-input
            v-model="form.stem"
            type="textarea"
            :rows="3"
            maxlength="5000"
            show-word-limit
            placeholder="请输入题目内容"
          />
        </el-form-item>

        <template v-if="form.type === 'single' || form.type === 'multiple'">
          <el-form-item :label="`选项（${form.type === 'single' ? '单选' : '多选'}）`" required>
            <div class="options-editor">
              <div
                v-for="(option, index) in form.options"
                :key="option.uid"
                class="option-row"
              >
                <span class="option-label">{{ option.label }}</span>
                <el-input
                  v-model="option.content"
                  placeholder="选项内容"
                  class="option-input"
                />
                <el-radio
                  v-if="form.type === 'single'"
                  v-model="form.singleAnswer"
                  :value="option.label"
                  class="option-correct"
                >
                  正确
                </el-radio>
                <el-checkbox
                  v-else
                  v-model="option.isCorrect"
                  class="option-correct"
                >
                  正确
                </el-checkbox>
                <el-button
                  link
                  type="danger"
                  :disabled="form.options.length <= 2"
                  @click="removeOption(index)"
                >
                  删除
                </el-button>
              </div>
              <el-button
                text
                type="primary"
                :disabled="form.options.length >= 6"
                @click="addOption"
              >
                + 添加选项
              </el-button>
            </div>
          </el-form-item>
        </template>

        <template v-else-if="form.type === 'true_false'">
          <el-form-item label="正确答案" required>
            <el-radio-group v-model="form.booleanAnswer">
              <el-radio value="true">正确</el-radio>
              <el-radio value="false">错误</el-radio>
            </el-radio-group>
          </el-form-item>
        </template>

        <template v-else-if="form.type === 'fill'">
          <el-form-item label="填空答案" required>
            <div class="fill-editor">
              <div
                v-for="(answer, index) in form.fillAnswers"
                :key="index"
                class="fill-row"
              >
                <span class="fill-index">第 {{ index + 1 }} 空</span>
                <el-input
                  v-model="form.fillAnswers[index]"
                  placeholder="多个可接受答案用 | 分隔，例如：8|八"
                />
                <el-button
                  link
                  type="danger"
                  :disabled="form.fillAnswers.length <= 1"
                  @click="removeFillBlank(index)"
                >
                  删除
                </el-button>
              </div>
              <el-button text type="primary" @click="addFillBlank">
                + 添加空
              </el-button>
            </div>
          </el-form-item>
        </template>

        <template v-else>
          <el-form-item label="参考答案" required>
            <el-input
              v-model="form.textAnswer"
              type="textarea"
              :rows="3"
              placeholder="简答题的参考答案，用于阅卷时对照"
            />
          </el-form-item>
        </template>

        <el-form-item label="解析">
          <el-input
            v-model="form.analysis"
            type="textarea"
            :rows="2"
            maxlength="5000"
            placeholder="选填，答错时展示"
          />
        </el-form-item>

        <el-form-item label="知识点">
          <el-select
            v-model="form.knowledgePointIds"
            multiple
            filterable
            clearable
            placeholder="选择关联知识点"
            style="width: 100%"
          >
            <el-option
              v-for="point in knowledgePoints"
              :key="point.id"
              :label="point.name"
              :value="point.id"
            />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="editorVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitQuestion">
          保存
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="importVisible"
      title="导入题目"
      width="560px"
      :close-on-click-modal="false"
    >
      <div class="import-tip">
        请先下载模板，按列填写。支持单选、多选、判断、填空、简答五种题型。
        填空多空用 <code>&&</code> 分隔，同一空多个答案用 <code>|</code> 分隔。
      </div>

      <input
        ref="fileInput"
        type="file"
        accept=".csv,text/csv"
        class="hidden-input"
        @change="onFileChange"
      />
      <div class="import-picker">
        <el-button @click="fileInput.click()">选择 CSV 文件</el-button>
        <span v-if="selectedFile" class="file-name">{{ selectedFile.name }}</span>
        <span v-else class="text-sub">未选择文件</span>
      </div>

      <div v-if="importResult" class="import-result">
        <el-alert
          :type="importResult.failed > 0 ? 'warning' : 'success'"
          :closable="false"
          show-icon
          :title="`成功 ${importResult.created} 条，失败 ${importResult.failed} 条`"
        />
        <div v-if="importResult.errors.length" class="error-list">
          <div class="error-title">失败明细（最多显示 30 条）</div>
          <div
            v-for="(item, index) in importResult.errors"
            :key="index"
            class="error-item"
          >
            第 {{ item.row }} 行：{{ item.message }}
          </div>
        </div>
        <div v-if="importResult.warnings.length" class="warning-list">
          <div
            v-for="(item, index) in importResult.warnings.slice(0, 10)"
            :key="index"
          >
            {{ item }}
          </div>
        </div>
      </div>

      <template #footer>
        <el-button @click="importVisible = false">关闭</el-button>
        <el-button
          type="primary"
          :loading="importing"
          :disabled="!selectedFile"
          @click="submitImport"
        >
          开始导入
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import api from '../api';
import { downloadFile } from '../api/client';
import { useAuthStore } from '../stores/auth';

const TYPE_LABELS = {
  single: '单选题',
  multiple: '多选题',
  true_false: '判断题',
  fill: '填空题',
  short: '简答题',
};

const TYPE_TAG_TYPES = {
  single: 'primary',
  multiple: 'success',
  true_false: 'warning',
  fill: 'info',
  short: 'danger',
};

const STATUS_LABELS = {
  published: '已发布',
  draft: '草稿',
  archived: '已归档',
};

const STATUS_TAG_TYPES = {
  published: 'success',
  draft: 'info',
  archived: 'warning',
};

const auth = useAuthStore();

const loading = ref(false);
const saving = ref(false);
const questions = ref([]);
const knowledgePoints = ref([]);
const statistics = ref({ total: 0, byType: {} });

const filters = reactive({
  keyword: '',
  type: '',
  difficulty: '',
  status: '',
  knowledgePointId: '',
});

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
});

const editorVisible = ref(false);
const importVisible = ref(false);
const importing = ref(false);
const importResult = ref(null);
const selectedFile = ref(null);
const fileInput = ref(null);

const TYPE_COLORS = {
  single: '#3b82f6',
  multiple: '#16a34a',
  true_false: '#d97706',
  fill: '#0ea5e9',
  short: '#dc2626',
};

const typeStats = computed(() =>
  Object.entries(TYPE_LABELS).map(([type, label]) => ({
    type,
    label,
    color: TYPE_COLORS[type],
    count: statistics.value.byType[type] || 0,
  })),
);

let uidSeed = 0;

function createEmptyForm() {
  return {
    id: null,
    type: 'single',
    stem: '',
    options: [
      { uid: ++uidSeed, label: 'A', content: '', isCorrect: false },
      { uid: ++uidSeed, label: 'B', content: '', isCorrect: false },
      { uid: ++uidSeed, label: 'C', content: '', isCorrect: false },
      { uid: ++uidSeed, label: 'D', content: '', isCorrect: false },
    ],
    singleAnswer: 'A',
    booleanAnswer: 'true',
    fillAnswers: [''],
    textAnswer: '',
    difficulty: 3,
    defaultScore: 5,
    analysis: '',
    status: 'published',
    knowledgePointIds: [],
  };
}

const form = reactive(createEmptyForm());

function typeTag(type) {
  return TYPE_TAG_TYPES[type] || 'info';
}

function statusTag(status) {
  return STATUS_TAG_TYPES[status] || 'info';
}

function stars(level) {
  const value = Math.max(1, Math.min(5, Number(level) || 1));
  return '★'.repeat(value) + '☆'.repeat(5 - value);
}

function truncate(text, max) {
  const value = String(text || '');
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function canModify(row) {
  if (auth.role === 'admin') return true;
  return Number(row.creatorId) === Number(auth.user && auth.user.id);
}

async function loadKnowledgePoints() {
  try {
    const result = await api.knowledge.flat();
    knowledgePoints.value = result.items || [];
  } catch (error) {
    knowledgePoints.value = [];
  }
}

async function loadStatistics() {
  try {
    statistics.value = await api.questions.statistics();
  } catch (error) {
    statistics.value = { total: 0, byType: {} };
  }
}

async function load() {
  loading.value = true;
  try {
    const result = await api.questions.list({
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: filters.keyword || undefined,
      type: filters.type || undefined,
      difficulty: filters.difficulty || undefined,
      status: filters.status || undefined,
      knowledgePointId: filters.knowledgePointId || undefined,
    });
    questions.value = result.items;
    pagination.total = result.pagination.total;
  } catch (error) {
    questions.value = [];
  } finally {
    loading.value = false;
  }
}

function reload() {
  pagination.page = 1;
  load();
}

function resetForm() {
  Object.assign(form, createEmptyForm());
}

function openCreate() {
  resetForm();
  editorVisible.value = true;
}

async function openEdit(row) {
  try {
    const detail = await api.questions.detail(row.id);
    resetForm();

    form.id = detail.id;
    form.type = detail.type;
    form.stem = detail.stem;
    form.analysis = detail.analysis || '';
    form.difficulty = detail.difficulty;
    form.defaultScore = detail.defaultScore;
    form.status = detail.status === 'archived' ? 'draft' : detail.status;
    form.knowledgePointIds = detail.knowledgePointIds || [];

    if (detail.type === 'single' || detail.type === 'multiple') {
      form.options = detail.options.map((option) => ({
        uid: ++uidSeed,
        label: option.label,
        content: option.content,
        isCorrect: option.isCorrect,
      }));
      const correct = detail.options.find((option) => option.isCorrect);
      form.singleAnswer = correct ? correct.label : 'A';
    } else if (detail.type === 'true_false') {
      form.booleanAnswer = String(detail.answer);
    } else if (detail.type === 'fill') {
      form.fillAnswers = Array.isArray(detail.answer)
        ? detail.answer.map((item) => String(item))
        : [String(detail.answer || '')];
    } else {
      form.textAnswer = String(detail.answer || '');
    }

    editorVisible.value = true;
  } catch (error) {
    // 错误提示由拦截器处理
  }
}

function onTypeChange() {
  form.singleAnswer = 'A';
  form.booleanAnswer = 'true';
  form.fillAnswers = [''];
  form.textAnswer = '';
  if (form.options.length < 2) {
    form.options = [
      { uid: ++uidSeed, label: 'A', content: '', isCorrect: false },
      { uid: ++uidSeed, label: 'B', content: '', isCorrect: false },
    ];
  }
}

function relabelOptions() {
  form.options.forEach((option, index) => {
    option.label = String.fromCharCode(65 + index);
  });
}

function addOption() {
  if (form.options.length >= 6) return;
  form.options.push({
    uid: ++uidSeed,
    label: String.fromCharCode(65 + form.options.length),
    content: '',
    isCorrect: false,
  });
}

function removeOption(index) {
  if (form.options.length <= 2) return;
  const removedLabel = form.options[index].label;
  form.options.splice(index, 1);
  relabelOptions();
  if (form.singleAnswer === removedLabel
    || !form.options.some((option) => option.label === form.singleAnswer)) {
    form.singleAnswer = form.options[0].label;
  }
}

function addFillBlank() {
  form.fillAnswers.push('');
}

function removeFillBlank(index) {
  if (form.fillAnswers.length <= 1) return;
  form.fillAnswers.splice(index, 1);
}

function validateForm() {
  if (!form.stem.trim()) return '请输入题干';
  if (!form.defaultScore || form.defaultScore <= 0) return '分值必须大于 0';

  if (form.type === 'single' || form.type === 'multiple') {
    if (form.options.length < 2) return '至少需要两个选项';
    if (form.options.some((option) => !option.content.trim())) {
      return '所有选项内容不能为空';
    }

    if (form.type === 'single') {
      if (!form.singleAnswer) return '请选择正确答案';
    } else if (!form.options.some((option) => option.isCorrect)) {
      return '多选题至少需要一个正确选项';
    }
  }

  if (form.type === 'true_false' && !form.booleanAnswer) {
    return '请选择判断题答案';
  }

  if (form.type === 'fill') {
    if (form.fillAnswers.every((item) => !String(item).trim())) {
      return '请至少填写一个空的答案';
    }
  }

  if (form.type === 'short' && !form.textAnswer.trim()) {
    return '请填写参考答案';
  }

  return null;
}

function buildPayload() {
  const payload = {
    type: form.type,
    stem: form.stem.trim(),
    difficulty: form.difficulty,
    defaultScore: form.defaultScore,
    analysis: form.analysis.trim(),
    status: form.status,
    knowledgePointIds: form.knowledgePointIds,
  };

  if (form.type === 'single' || form.type === 'multiple') {
    payload.options = form.options.map((option) => ({
      label: option.label,
      content: option.content.trim(),
      isCorrect: form.type === 'single'
        ? option.label === form.singleAnswer
        : Boolean(option.isCorrect),
    }));
  } else if (form.type === 'true_false') {
    payload.answer = form.booleanAnswer;
  } else if (form.type === 'fill') {
    payload.answer = form.fillAnswers
      .map((item) => String(item).trim())
      .filter(Boolean);
  } else {
    payload.answer = form.textAnswer.trim();
  }

  return payload;
}

async function submitQuestion() {
  const error = validateForm();
  if (error) {
    ElMessage.warning(error);
    return;
  }

  saving.value = true;
  try {
    const payload = buildPayload();
    if (form.id) {
      await api.questions.update(form.id, payload);
      ElMessage.success('题目已更新');
    } else {
      await api.questions.create(payload);
      ElMessage.success('题目已创建');
    }
    editorVisible.value = false;
    await Promise.all([load(), loadStatistics()]);
  } catch (error) {
    // 错误提示由拦截器处理
  } finally {
    saving.value = false;
  }
}

async function changeStatus(row, action) {
  try {
    if (action === 'publish') {
      await api.questions.publish(row.id);
      ElMessage.success('题目已发布');
    } else {
      await api.questions.archive(row.id);
      ElMessage.success('题目已归档');
    }
    await Promise.all([load(), loadStatistics()]);
  } catch (error) {
    // 错误提示由拦截器处理
  }
}

async function removeQuestion(row) {
  try {
    await ElMessageBox.confirm(
      `确定删除题目「${truncate(row.stem, 30)}」吗？删除后无法恢复。`,
      '删除确认',
      {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消',
      },
    );
  } catch (error) {
    return;
  }

  try {
    await api.questions.remove(row.id);
    ElMessage.success('题目已删除');
    await Promise.all([load(), loadStatistics()]);
  } catch (error) {
    // 错误提示由拦截器处理
  }
}

function buildQueryParams() {
  return {
    keyword: filters.keyword || undefined,
    type: filters.type || undefined,
    difficulty: filters.difficulty || undefined,
    status: filters.status || undefined,
    knowledgePointId: filters.knowledgePointId || undefined,
  };
}

async function exportCsv() {
  try {
    await downloadFile(
      `/questions/export?${new URLSearchParams(
        Object.entries(buildQueryParams()).filter(([, value]) => value !== undefined),
      ).toString()}`,
      'questions-export.csv',
    );
    ElMessage.success('导出成功');
  } catch (error) {
    ElMessage.error(error.message || '导出失败');
  }
}

async function downloadTemplate() {
  try {
    await downloadFile('/questions/template', 'questions-template.csv');
  } catch (error) {
    ElMessage.error(error.message || '模板下载失败');
  }
}

function openImport() {
  selectedFile.value = null;
  importResult.value = null;
  importVisible.value = true;
}

function onFileChange(event) {
  const file = event.target.files && event.target.files[0];
  selectedFile.value = file || null;
  importResult.value = null;
}

async function submitImport() {
  if (!selectedFile.value) return;

  importing.value = true;
  try {
    const formData = new FormData();
    formData.append('file', selectedFile.value);
    importResult.value = await api.questions.importCsv(formData);
    ElMessage.success(
      `导入完成：成功 ${importResult.value.created} 条，失败 ${importResult.value.failed} 条`,
    );
    await Promise.all([load(), loadStatistics(), loadKnowledgePoints()]);
  } catch (error) {
    // 错误提示由拦截器处理
  } finally {
    importing.value = false;
  }
}

onMounted(async () => {
  await Promise.all([loadKnowledgePoints(), loadStatistics(), load()]);
});
</script>

<style scoped>
.header-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.stat-strip {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.stat-chip {
  display: flex;
  align-items: center;
  gap: 7px;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 6px 14px;
  font-size: 13px;
  color: var(--text-sub);
}

.stat-chip strong {
  color: var(--text-main);
  font-size: 14px;
}

.stat-chip.total {
  background: var(--brand-soft);
  border-color: #cfe0f1;
  color: var(--brand);
}

.stat-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.stem-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.type-tag {
  flex-shrink: 0;
}

.stem-text {
  cursor: default;
}

.stars {
  color: #f0a020;
  letter-spacing: 1px;
  font-size: 13px;
}

.kp-tag {
  margin: 2px 4px 2px 0;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.form-row {
  display: flex;
  gap: 12px;
}

.form-col {
  flex: 1;
}

.options-editor,
.fill-editor {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.option-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.option-label {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--brand-soft);
  color: var(--brand);
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.option-input {
  flex: 1;
}

.option-correct {
  margin-right: 0;
  flex-shrink: 0;
}

.fill-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.fill-index {
  width: 64px;
  flex-shrink: 0;
  font-size: 13px;
  color: var(--text-sub);
}

.import-tip {
  font-size: 13px;
  color: var(--text-sub);
  line-height: 1.7;
  background: #f7fafc;
  border-radius: 8px;
  padding: 12px 14px;
  margin-bottom: 14px;
}

.import-tip code {
  background: #e8eef6;
  padding: 1px 5px;
  border-radius: 4px;
  color: var(--brand);
}

.hidden-input {
  display: none;
}

.import-picker {
  display: flex;
  align-items: center;
  gap: 10px;
}

.file-name {
  font-size: 13px;
  color: var(--text-main);
}

.import-result {
  margin-top: 16px;
}

.error-list,
.warning-list {
  margin-top: 12px;
  font-size: 12px;
  color: var(--text-sub);
  max-height: 180px;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 12px;
}

.error-title {
  font-weight: 600;
  color: var(--danger);
  margin-bottom: 6px;
}

.error-item {
  line-height: 1.7;
  color: #b91c1c;
}

.warning-list {
  color: var(--warning);
}

@media (max-width: 760px) {
  .form-row {
    flex-wrap: wrap;
  }

  .form-col {
    flex: 1 1 45%;
  }

  .option-row {
    flex-wrap: wrap;
  }

  .option-input {
    flex: 1 1 100%;
    order: 3;
  }
}
</style>
