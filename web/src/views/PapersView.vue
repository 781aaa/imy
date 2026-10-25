<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h2 class="page-title">试卷管理</h2>
        <div class="page-subtitle">组卷、编辑大题、发布与复制</div>
      </div>
      <div class="header-actions">
        <el-button @click="openRandom">随机组卷</el-button>
        <el-button type="primary" @click="openCreate">新建试卷</el-button>
        <el-button :loading="loading" @click="loadPapers">刷新</el-button>
      </div>
    </div>

    <div class="card">
      <div class="toolbar">
        <el-input
          v-model="filters.keyword"
          placeholder="搜索试卷名称"
          clearable
          style="width: 220px"
          @keyup.enter="reload"
          @clear="reload"
        />
        <el-select
          v-model="filters.status"
          placeholder="全部状态"
          clearable
          style="width: 140px"
          @change="reload"
        >
          <el-option label="草稿" value="draft" />
          <el-option label="已发布" value="published" />
          <el-option label="已归档" value="archived" />
        </el-select>
        <el-button @click="reload">查询</el-button>
        <div class="spacer" />
        <span class="text-sub">共 {{ pagination.total }} 份试卷</span>
      </div>

      <el-table
        v-loading="loading"
        :data="papers"
        stripe
        :header-cell-style="{ background: '#f7fafc' }"
      >
        <el-table-column prop="title" label="试卷名称" min-width="220" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small" effect="plain">
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="总分" width="80">
          <template #default="{ row }">{{ row.totalScore }}</template>
        </el-table-column>
        <el-table-column label="题数" width="80">
          <template #default="{ row }">{{ row.questionCount }}</template>
        </el-table-column>
        <el-table-column label="时长" width="100">
          <template #default="{ row }">{{ row.durationMin }} 分钟</template>
        </el-table-column>
        <el-table-column prop="creatorName" label="创建人" width="100">
          <template #default="{ row }">
            <span class="text-sub">{{ row.creatorName || '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="更新时间" min-width="160">
          <template #default="{ row }">
            <span class="text-sub">{{ formatTime(row.updatedAt) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="210" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row.id)">
              查看/编辑
            </el-button>
            <el-button link type="primary" @click="duplicatePaper(row)">
              复制
            </el-button>
            <el-button
              link
              type="danger"
              :disabled="row.status !== 'draft'"
              @click="deletePaper(row)"
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
          @current-change="loadPapers"
          @size-change="reload"
        />
      </div>
    </div>

    <el-dialog v-model="createVisible" title="新建试卷" width="480px">
      <el-form label-position="top">
        <el-form-item label="试卷名称" required>
          <el-input v-model="createForm.title" maxlength="100" />
        </el-form-item>
        <el-form-item label="说明">
          <el-input v-model="createForm.description" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="考试时长（分钟）">
          <el-input-number v-model="createForm.durationMin" :min="5" :max="300" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="createPaper">
          创建
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="randomVisible" title="随机组卷" width="720px">
      <el-form label-position="top">
        <div class="form-row">
          <el-form-item label="试卷名称" class="form-col" required>
            <el-input v-model="randomForm.title" maxlength="100" />
          </el-form-item>
          <el-form-item label="时长（分钟）" class="form-col">
            <el-input-number v-model="randomForm.durationMin" :min="5" :max="300" />
          </el-form-item>
        </div>

        <div class="section-label">选题规则</div>
        <div
          v-for="(rule, index) in randomForm.rules"
          :key="index"
          class="rule-row"
        >
          <el-select v-model="rule.type" style="width: 120px">
            <el-option
              v-for="(label, value) in TYPE_LABELS"
              :key="value"
              :label="label"
              :value="value"
            />
          </el-select>
          <el-select v-model="rule.count" style="width: 100px">
            <el-option v-for="n in 20" :key="n" :value="n" :label="`${n} 题`" />
          </el-select>
          <el-input-number v-model="rule.score" :min="1" :max="50" :step="0.5" />
          <span class="text-sub">难度</span>
          <el-select v-model="rule.difficultyMin" style="width: 90px">
            <el-option v-for="n in 5" :key="n" :value="n" :label="`${n}`" />
          </el-select>
          <span class="text-sub">至</span>
          <el-select v-model="rule.difficultyMax" style="width: 90px">
            <el-option v-for="n in 5" :key="n" :value="n" :label="`${n}`" />
          </el-select>
          <el-button
            link
            type="danger"
            :disabled="randomForm.rules.length <= 1"
            @click="randomForm.rules.splice(index, 1)"
          >
            删除
          </el-button>
        </div>
        <el-button text type="primary" @click="addRule">+ 添加规则</el-button>

        <div class="random-hint">
          题量不足时会提示缺少多少道题；生成的试卷为草稿，可继续手动调整。
        </div>
      </el-form>
      <template #footer>
        <el-button @click="randomVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="generateRandom">
          生成试卷
        </el-button>
      </template>
    </el-dialog>

    <el-drawer
      v-model="detailVisible"
      size="920px"
      :title="detail ? detail.title : '试卷详情'"
      destroy-on-close
    >
      <div v-if="detail" class="paper-detail">
        <div class="detail-top">
          <el-tag :type="statusType(detail.status)" effect="plain">
            {{ statusLabel(detail.status) }}
          </el-tag>
          <span class="detail-meta">总分 {{ detail.totalScore }}</span>
          <span class="detail-meta">题数 {{ detail.questions.length }}</span>
          <span class="detail-meta">{{ detail.creatorName || '' }}</span>
          <div class="spacer" />
          <el-button
            v-if="detail.status === 'draft'"
            type="primary"
            :loading="saving"
            @click="publishPaper"
          >
            发布试卷
          </el-button>
          <el-button @click="duplicateDetail">复制</el-button>
        </div>

        <div v-if="detail.status === 'draft'" class="card info-card">
          <div class="form-row">
            <el-form-item label="试卷名称" class="form-col">
              <el-input v-model="infoForm.title" />
            </el-form-item>
            <el-form-item label="时长（分钟）" class="form-col">
              <el-input-number v-model="infoForm.durationMin" :min="5" :max="300" />
            </el-form-item>
            <el-form-item label=" " class="form-col">
              <el-button :loading="saving" @click="saveInfo">保存信息</el-button>
            </el-form-item>
          </div>
        </div>

        <div class="sections">
          <div
            v-for="section in detail.sections"
            :key="section.id"
            class="section-card"
          >
            <div class="section-head">
              <span class="section-title">{{ section.title }}</span>
              <span class="text-sub">{{ section.totalScore }} 分</span>
              <div class="spacer" />
              <el-button
                v-if="detail.status === 'draft'"
                link
                type="primary"
                @click="openAddQuestion(section.id)"
              >
                添加题目
              </el-button>
              <el-button
                v-if="detail.status === 'draft'"
                link
                type="danger"
                @click="removeSection(section)"
              >
                删除大题
              </el-button>
            </div>

            <el-table :data="questionsOf(section.id)" size="small" stripe>
              <el-table-column label="题干" min-width="300">
                <template #default="{ row }">
                  <div class="stem-cell">
                    <el-tag size="small" effect="plain">{{ row.typeLabel }}</el-tag>
                    <span>{{ truncate(row.stem, 60) }}</span>
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="难度" width="80">
                <template #default="{ row }">{{ row.difficulty }}</template>
              </el-table-column>
              <el-table-column label="分值" width="140">
                <template #default="{ row }">
                  <el-input-number
                    v-if="detail.status === 'draft'"
                    :model-value="row.score"
                    :min="0.5"
                    :max="100"
                    :step="0.5"
                    size="small"
                    @change="(value) => updateScore(row, value)"
                  />
                  <span v-else>{{ row.score }}</span>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="80">
                <template #default="{ row }">
                  <el-button
                    v-if="detail.status === 'draft'"
                    link
                    type="danger"
                    @click="removeQuestion(row)"
                  >
                    移除
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <div v-if="detail.status === 'draft'" class="section-add">
            <el-button @click="openAddSection">+ 添加大题</el-button>
          </div>

          <div v-if="detail.sections.length === 0" class="empty-hint">
            这份试卷还没有大题。可以直接添加题目，题目会进入「未分组」。
          </div>

          <div v-if="questionsOf(null).length > 0" class="section-card">
            <div class="section-head">
              <span class="section-title">未分组题目</span>
              <div class="spacer" />
              <el-button
                v-if="detail.status === 'draft'"
                link
                type="primary"
                @click="openAddQuestion(null)"
              >
                添加题目
              </el-button>
            </div>
            <el-table :data="questionsOf(null)" size="small" stripe>
              <el-table-column label="题干" min-width="300">
                <template #default="{ row }">
                  <div class="stem-cell">
                    <el-tag size="small" effect="plain">{{ row.typeLabel }}</el-tag>
                    <span>{{ truncate(row.stem, 60) }}</span>
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="分值" width="140">
                <template #default="{ row }">
                  <el-input-number
                    v-if="detail.status === 'draft'"
                    :model-value="row.score"
                    :min="0.5"
                    :max="100"
                    :step="0.5"
                    size="small"
                    @change="(value) => updateScore(row, value)"
                  />
                  <span v-else>{{ row.score }}</span>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="80">
                <template #default="{ row }">
                  <el-button
                    v-if="detail.status === 'draft'"
                    link
                    type="danger"
                    @click="removeQuestion(row)"
                  >
                    移除
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>
      </div>
    </el-drawer>

    <el-dialog v-model="sectionVisible" title="添加大题" width="420px">
      <el-form label-position="top">
        <el-form-item label="大题名称" required>
          <el-input v-model="sectionForm.title" placeholder="例如：一、单项选择题" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="sectionVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="addSection">
          添加
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="questionVisible"
      title="添加题目"
      width="820px"
      destroy-on-close
    >
      <div class="toolbar">
        <el-input
          v-model="questionFilters.keyword"
          placeholder="搜索题干"
          clearable
          style="width: 200px"
          @keyup.enter="loadQuestionBank"
          @clear="loadQuestionBank"
        />
        <el-select
          v-model="questionFilters.type"
          placeholder="全部题型"
          clearable
          style="width: 120px"
          @change="loadQuestionBank"
        >
          <el-option
            v-for="(label, value) in TYPE_LABELS"
            :key="value"
            :label="label"
            :value="value"
          />
        </el-select>
        <el-select
          v-model="questionFilters.difficulty"
          placeholder="难度"
          clearable
          style="width: 110px"
          @change="loadQuestionBank"
        >
          <el-option v-for="n in 5" :key="n" :value="n" :label="`难度 ${n}`" />
        </el-select>
        <el-button @click="loadQuestionBank">查询</el-button>
        <div class="spacer" />
        <span class="text-sub">加入后分值</span>
        <el-input-number v-model="addScore" :min="0.5" :max="100" :step="0.5" />
      </div>

      <el-table
        v-loading="questionLoading"
        :data="questionBank"
        size="small"
        stripe
        max-height="420"
      >
        <el-table-column label="题干" min-width="360">
          <template #default="{ row }">
            <div class="stem-cell">
              <el-tag size="small" effect="plain">{{ row.typeLabel }}</el-tag>
              <span>{{ truncate(row.stem, 55) }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="难度" width="70">
          <template #default="{ row }">{{ row.difficulty }}</template>
        </el-table-column>
        <el-table-column label="默认分值" width="90">
          <template #default="{ row }">{{ row.defaultScore }}</template>
        </el-table-column>
        <el-table-column label="操作" width="90">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              :disabled="addedIds.has(row.id)"
              @click="addQuestionToPaper(row)"
            >
              {{ addedIds.has(row.id) ? '已加入' : '加入' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="questionPagination.page"
          v-model:page-size="questionPagination.pageSize"
          :total="questionPagination.total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          background
          small
          @current-change="loadQuestionBank"
          @size-change="loadQuestionBank"
        />
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import api from '../api';

const TYPE_LABELS = {
  single: '单选题',
  multiple: '多选题',
  true_false: '判断题',
  fill: '填空题',
  short: '简答题',
};

const STATUS_LABELS = {
  draft: '草稿',
  published: '已发布',
  archived: '已归档',
};

const loading = ref(false);
const saving = ref(false);
const papers = ref([]);
const pagination = reactive({ page: 1, pageSize: 10, total: 0 });
const filters = reactive({ keyword: '', status: '' });

const createVisible = ref(false);
const createForm = reactive({ title: '', description: '', durationMin: 60 });

const randomVisible = ref(false);
const randomForm = reactive({
  title: '随机组卷',
  durationMin: 60,
  rules: [
    {
      type: 'single',
      count: 5,
      score: 5,
      difficultyMin: 1,
      difficultyMax: 5,
    },
  ],
});

const detailVisible = ref(false);
const detail = ref(null);
const infoForm = reactive({ title: '', durationMin: 60 });

const sectionVisible = ref(false);
const sectionForm = reactive({ title: '' });

const questionVisible = ref(false);
const questionLoading = ref(false);
const questionBank = ref([]);
const targetSectionId = ref(null);
const addScore = ref(5);
const questionFilters = reactive({
  keyword: '',
  type: '',
  difficulty: '',
});
const questionPagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
});

const addedIds = computed(() => {
  if (!detail.value) return new Set();
  return new Set(detail.value.questions.map((item) => item.questionId));
});

function statusLabel(status) {
  return STATUS_LABELS[status] || status;
}

function statusType(status) {
  const map = { draft: 'info', published: 'success', archived: 'warning' };
  return map[status] || 'info';
}

function formatTime(timestamp) {
  if (!timestamp) return '—';
  return new Date(timestamp).toLocaleString('zh-CN', { hour12: false });
}

function truncate(text, max) {
  const value = String(text || '');
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function questionsOf(sectionId) {
  if (!detail.value) return [];
  return detail.value.questions.filter(
    (item) => (item.sectionId ?? null) === (sectionId ?? null),
  );
}

async function loadPapers() {
  loading.value = true;
  try {
    const result = await api.papers.list({
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: filters.keyword || undefined,
      status: filters.status || undefined,
    });
    papers.value = result.items;
    pagination.total = result.pagination.total;
  } catch (error) {
    papers.value = [];
  } finally {
    loading.value = false;
  }
}

function reload() {
  pagination.page = 1;
  loadPapers();
}

function openCreate() {
  createForm.title = '';
  createForm.description = '';
  createForm.durationMin = 60;
  createVisible.value = true;
}

async function createPaper() {
  if (!createForm.title.trim()) {
    ElMessage.warning('请输入试卷名称');
    return;
  }

  saving.value = true;
  try {
    const paper = await api.papers.create({
      title: createForm.title,
      description: createForm.description,
      durationMin: createForm.durationMin,
    });
    createVisible.value = false;
    ElMessage.success('试卷已创建');
    await loadPapers();
    openDetail(paper.id);
  } catch (error) {
    // 错误提示由拦截器处理
  } finally {
    saving.value = false;
  }
}

function openRandom() {
  randomForm.title = '随机组卷';
  randomForm.durationMin = 60;
  randomForm.rules = [
    {
      type: 'single',
      count: 5,
      score: 5,
      difficultyMin: 1,
      difficultyMax: 5,
    },
  ];
  randomVisible.value = true;
}

function addRule() {
  randomForm.rules.push({
    type: 'single',
    count: 5,
    score: 5,
    difficultyMin: 1,
    difficultyMax: 5,
  });
}

async function generateRandom() {
  if (!randomForm.title.trim()) {
    ElMessage.warning('请输入试卷名称');
    return;
  }

  saving.value = true;
  try {
    const paper = await api.papers.random({
      title: randomForm.title,
      durationMin: randomForm.durationMin,
      sections: [
        {
          title: '随机组卷',
          rules: randomForm.rules,
        },
      ],
    });
    randomVisible.value = false;
    ElMessage.success('随机组卷完成');
    await loadPapers();
    openDetail(paper.id);
  } catch (error) {
    // 错误提示由拦截器处理
  } finally {
    saving.value = false;
  }
}

async function openDetail(id) {
  try {
    const data = await api.papers.detail(id);
    detail.value = data;
    infoForm.title = data.title;
    infoForm.durationMin = data.durationMin;
    detailVisible.value = true;
  } catch (error) {
    // 错误提示由拦截器处理
  }
}

async function saveInfo() {
  if (!detail.value) return;

  saving.value = true;
  try {
    detail.value = await api.papers.update(detail.value.id, {
      title: infoForm.title,
      durationMin: infoForm.durationMin,
    });
    ElMessage.success('已保存');
    await loadPapers();
  } catch (error) {
    // 错误提示由拦截器处理
  } finally {
    saving.value = false;
  }
}

function openAddSection() {
  sectionForm.title = '';
  sectionVisible.value = true;
}

async function addSection() {
  if (!sectionForm.title.trim()) {
    ElMessage.warning('请输入大题名称');
    return;
  }

  saving.value = true;
  try {
    detail.value = await api.papers.addSection(detail.value.id, {
      title: sectionForm.title,
    });
    sectionVisible.value = false;
    ElMessage.success('大题已添加');
  } catch (error) {
    // 错误提示由拦截器处理
  } finally {
    saving.value = false;
  }
}

async function removeSection(section) {
  try {
    await ElMessageBox.confirm(
      `删除大题「${section.title}」后，其中的题目会变为未分组。确定吗？`,
      '删除大题',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' },
    );
  } catch (error) {
    return;
  }

  try {
    detail.value = await api.papers.removeSection(
      detail.value.id,
      section.id,
    );
    ElMessage.success('大题已删除');
  } catch (error) {
    // 错误提示由拦截器处理
  }
}

async function openAddQuestion(sectionId) {
  targetSectionId.value = sectionId;
  questionFilters.keyword = '';
  questionFilters.type = '';
  questionFilters.difficulty = '';
  questionPagination.page = 1;
  addScore.value = 5;
  questionVisible.value = true;
  await loadQuestionBank();
}

async function loadQuestionBank() {
  questionLoading.value = true;
  try {
    const result = await api.questions.list({
      page: questionPagination.page,
      pageSize: questionPagination.pageSize,
      keyword: questionFilters.keyword || undefined,
      type: questionFilters.type || undefined,
      difficulty: questionFilters.difficulty || undefined,
      status: 'published',
    });
    questionBank.value = result.items;
    questionPagination.total = result.pagination.total;
  } catch (error) {
    questionBank.value = [];
  } finally {
    questionLoading.value = false;
  }
}

async function addQuestionToPaper(question) {
  try {
    detail.value = await api.papers.addQuestion(detail.value.id, {
      questionId: question.id,
      sectionId: targetSectionId.value,
      score: addScore.value,
    });
    ElMessage.success('题目已加入');
  } catch (error) {
    // 错误提示由拦截器处理
  }
}

async function updateScore(row, value) {
  if (!value) return;

  try {
    detail.value = await api.papers.updateQuestion(
      detail.value.id,
      row.paperQuestionId,
      { score: value },
    );
  } catch (error) {
    // 错误提示由拦截器处理
  }
}

async function removeQuestion(row) {
  try {
    await ElMessageBox.confirm('确定从试卷中移除这道题吗？', '移除题目', {
      type: 'warning',
      confirmButtonText: '移除',
      cancelButtonText: '取消',
    });
  } catch (error) {
    return;
  }

  try {
    detail.value = await api.papers.removeQuestion(
      detail.value.id,
      row.paperQuestionId,
    );
    ElMessage.success('题目已移除');
  } catch (error) {
    // 错误提示由拦截器处理
  }
}

async function publishPaper() {
  if (!detail.value) return;

  if (detail.value.questions.length === 0) {
    ElMessage.warning('试卷里还没有题目');
    return;
  }

  try {
    await ElMessageBox.confirm(
      '发布后会冻结题目快照，之后不能再编辑。确定发布吗？',
      '发布试卷',
      { type: 'warning', confirmButtonText: '发布', cancelButtonText: '取消' },
    );
  } catch (error) {
    return;
  }

  saving.value = true;
  try {
    detail.value = await api.papers.publish(detail.value.id);
    ElMessage.success('试卷已发布');
    await loadPapers();
  } catch (error) {
    // 错误提示由拦截器处理
  } finally {
    saving.value = false;
  }
}

async function duplicatePaper(row) {
  try {
    const paper = await api.papers.duplicate(row.id);
    ElMessage.success('已复制为草稿');
    await loadPapers();
    openDetail(paper.id);
  } catch (error) {
    // 错误提示由拦截器处理
  }
}

async function duplicateDetail() {
  if (!detail.value) return;
  await duplicatePaper(detail.value);
}

async function deletePaper(row) {
  try {
    await ElMessageBox.confirm(
      `确定删除试卷「${row.title}」吗？`,
      '删除试卷',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' },
    );
  } catch (error) {
    return;
  }

  try {
    await api.papers.remove(row.id);
    ElMessage.success('试卷已删除');
    await loadPapers();
  } catch (error) {
    // 错误提示由拦截器处理
  }
}

onMounted(loadPapers);
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

.section-label {
  font-weight: 600;
  margin: 12px 0 8px;
}

.rule-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.random-hint {
  margin-top: 10px;
  font-size: 12px;
  color: var(--text-sub);
  line-height: 1.6;
}

.paper-detail {
  padding: 0 16px 30px;
}

.detail-top {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.detail-meta {
  font-size: 12px;
  color: var(--text-sub);
}

.info-card {
  margin-bottom: 14px;
}

.sections {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-card {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px;
  background: #fff;
}

.section-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
}

.stem-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-add {
  margin-top: 2px;
}

.empty-hint {
  font-size: 12px;
  color: var(--text-sub);
  padding: 8px 0;
}
</style>
