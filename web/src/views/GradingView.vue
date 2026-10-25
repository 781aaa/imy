<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h2 class="page-title">阅卷中心</h2>
        <div class="page-subtitle">主观题评分、成绩合成与结果发布</div>
      </div>
      <el-button :loading="loading" @click="loadExams">刷新</el-button>
    </div>

    <div v-if="exams.length > 0" class="exam-bar">
      <button
        v-for="exam in exams"
        :key="exam.id"
        type="button"
        class="exam-chip"
        :class="{ active: exam.id === selectedExamId }"
        @click="selectExam(exam.id)"
      >
        <div class="chip-title">{{ exam.title }}</div>
        <div class="chip-meta">
          <el-tag size="small" :type="statusType(exam.status)" effect="plain">
            {{ statusLabel(exam.status) }}
          </el-tag>
          <span v-if="exam.pendingSessions > 0" class="pending">
            待阅 {{ exam.pendingSessions }}
          </span>
          <span v-else class="text-sub">无待阅</span>
        </div>
      </button>
    </div>

    <div v-if="selectedExam" class="card">
      <div class="toolbar">
        <div>
          <div class="exam-title">{{ selectedExam.title }}</div>
          <div class="text-sub">
            {{ selectedExam.paperTitle }} · 及格 {{ selectedExam.passScore }} 分
          </div>
        </div>
        <div class="spacer" />
        <el-button
          v-if="['scheduled', 'ongoing'].includes(selectedExam.status)"
          type="warning"
          plain
          @click="endExam"
        >
          结束考试
        </el-button>
        <el-button
          v-if="selectedExam.status === 'finished'"
          type="success"
          plain
          @click="publishResults"
        >
          发布成绩
        </el-button>
        <el-button :loading="sessionsLoading" @click="loadSessions">
          刷新列表
        </el-button>
      </div>

      <el-table
        v-loading="sessionsLoading"
        :data="sessions"
        stripe
        :header-cell-style="{ background: '#f7fafc' }"
      >
        <el-table-column prop="studentName" label="学生" min-width="110" />
        <el-table-column prop="username" label="学号" min-width="110" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag
              :type="sessionStatusType(row.status)"
              size="small"
              effect="plain"
            >
              {{ sessionStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="objectiveScore" label="客观" width="80" />
        <el-table-column prop="subjectiveScore" label="主观" width="80" />
        <el-table-column label="总分" width="80">
          <template #default="{ row }">
            <strong>{{ row.totalScore }}</strong>
          </template>
        </el-table-column>
        <el-table-column label="待阅" width="80">
          <template #default="{ row }">
            <el-tag
              v-if="row.pendingUngraded > 0"
              type="warning"
              size="small"
              effect="plain"
            >
              {{ row.pendingUngraded }}
            </el-tag>
            <span v-else class="text-sub">—</span>
          </template>
        </el-table-column>
        <el-table-column label="异常" width="70">
          <template #default="{ row }">
            <span :class="{ 'danger-text': row.violationCount > 0 }">
              {{ row.violationCount }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="交卷时间" min-width="150">
          <template #default="{ row }">
            <span class="text-sub">{{ formatTime(row.submittedAt) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              :disabled="row.status === 'in_progress'"
              @click="openSession(row)"
            >
              {{ row.status === 'graded' ? '查看' : '阅卷' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty
        v-if="!sessionsLoading && sessions.length === 0"
        description="还没有学生交卷"
        :image-size="80"
      />
    </div>

    <el-empty
      v-else
      description="选择一场考试开始阅卷"
      :image-size="90"
    />

    <el-drawer
      v-model="drawerVisible"
      size="880px"
      :title="drawerTitle"
      destroy-on-close
    >
      <div v-if="detail" class="grading-body">
        <div class="session-summary">
          <div class="summary-item">
            <span>学生</span>
            <strong>{{ detail.session.studentName }}</strong>
          </div>
          <div class="summary-item">
            <span>状态</span>
            <el-tag
              :type="sessionStatusType(detail.session.status)"
              size="small"
            >
              {{ sessionStatusLabel(detail.session.status) }}
            </el-tag>
          </div>
          <div class="summary-item">
            <span>客观分</span>
            <strong>{{ detail.session.objectiveScore }}</strong>
          </div>
          <div class="summary-item">
            <span>主观分</span>
            <strong>{{ detail.session.subjectiveScore }}</strong>
          </div>
          <div class="summary-item">
            <span>总分</span>
            <strong>{{ detail.session.totalScore }}</strong>
          </div>
          <div class="summary-item">
            <span>待阅</span>
            <strong class="pending-text">{{ pendingCount }}</strong>
          </div>
        </div>

        <div
          v-for="(question, index) in detail.questions"
          :key="question.sessionQuestionId"
          class="grade-card"
          :class="{ subjective: question.type === 'short' }"
        >
          <div class="grade-head">
            <span class="index">第 {{ index + 1 }} 题</span>
            <el-tag size="small" effect="plain">{{ question.typeLabel }}</el-tag>
            <span class="max-score">{{ question.maxScore }} 分</span>

            <el-tag
              v-if="question.type !== 'short'"
              :type="question.isCorrect ? 'success' : 'danger'"
              size="small"
              effect="plain"
            >
              {{ question.isCorrect ? '正确' : '错误' }}
            </el-tag>
            <el-tag
              v-else-if="question.graded"
              type="success"
              size="small"
              effect="plain"
            >
              已评 {{ question.score }} 分
            </el-tag>
            <el-tag v-else type="warning" size="small" effect="plain">
              待评分
            </el-tag>

            <span v-if="question.type !== 'short'" class="grade-score">
              {{ question.score ?? 0 }} / {{ question.maxScore }}
            </span>
          </div>

          <div class="stem">{{ question.stem }}</div>

          <div v-if="question.options && question.options.length" class="options">
            <div
              v-for="option in question.options"
              :key="option.label"
              class="option"
              :class="{
                correct: isCorrectOption(question, option.label),
                chosen: isUserOption(question, option.label),
              }"
            >
              <span class="letter">{{ option.label }}</span>
              <span class="option-text">{{ option.content }}</span>
              <span v-if="isUserOption(question, option.label)" class="tag chosen-tag">
                学生选择
              </span>
              <span v-if="isCorrectOption(question, option.label)" class="tag correct-tag">
                正确答案
              </span>
            </div>
          </div>

          <div v-else class="answer-grid">
            <div class="answer-box">
              <div class="answer-label">学生答案</div>
              <div class="answer-text">{{ formatAnswer(question, question.userAnswer) }}</div>
            </div>
            <div class="answer-box reference">
              <div class="answer-label">参考答案</div>
              <div class="answer-text">{{ formatAnswer(question, question.referenceAnswer) }}</div>
            </div>
          </div>

          <div v-if="question.type === 'short'" class="grade-inputs">
            <div class="score-input">
              <span>评分</span>
              <el-input-number
                v-model="grades[question.answerId].score"
                :min="0"
                :max="question.maxScore"
                :step="0.5"
              />
              <span class="text-sub">/ {{ question.maxScore }} 分</span>
            </div>
            <el-input
              v-model="grades[question.answerId].comment"
              placeholder="评语（选填）"
              class="comment-input"
            />
            <el-button type="primary" plain @click="saveOne(question)">
              保存本题
            </el-button>
          </div>
        </div>

        <div class="drawer-footer">
          <span class="text-sub">还有 {{ pendingCount }} 道主观题未评分</span>
          <div class="spacer" />
          <el-button @click="drawerVisible = false">关闭</el-button>
          <el-button
            type="primary"
            :loading="saving"
            :disabled="pendingCount > 0"
            @click="saveAllAndFinalize"
          >
            保存全部并合成成绩
          </el-button>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import api from '../api';

const loading = ref(false);
const sessionsLoading = ref(false);
const saving = ref(false);
const exams = ref([]);
const selectedExamId = ref(null);
const sessions = ref([]);

const drawerVisible = ref(false);
const detail = ref(null);
const grades = reactive({});

const EXAM_STATUS_LABELS = {
  scheduled: '未开始',
  ongoing: '进行中',
  finished: '已结束',
  published: '已发布',
};

const SESSION_STATUS_LABELS = {
  in_progress: '答题中',
  submitted: '待阅卷',
  graded: '已出分',
};

const selectedExam = computed(() =>
  exams.value.find((item) => item.id === selectedExamId.value) || null,
);

const drawerTitle = computed(() => {
  if (!detail.value) return '阅卷';
  return `${detail.value.session.studentName} · ${detail.value.session.examTitle}`;
});

const pendingCount = computed(() => {
  if (!detail.value) return 0;
  return detail.value.questions.filter((question) => {
    if (question.type !== 'short' || question.graded) return false;
    const grade = grades[question.answerId];
    return !grade
      || grade.score === undefined
      || grade.score === null
      || grade.score === '';
  }).length;
});

function statusLabel(status) {
  return EXAM_STATUS_LABELS[status] || status;
}

function statusType(status) {
  const map = {
    scheduled: 'info',
    ongoing: 'success',
    finished: 'warning',
    published: 'primary',
  };
  return map[status] || 'info';
}

function sessionStatusLabel(status) {
  return SESSION_STATUS_LABELS[status] || status;
}

function sessionStatusType(status) {
  const map = {
    in_progress: 'warning',
    submitted: 'info',
    graded: 'success',
  };
  return map[status] || 'info';
}

function formatTime(timestamp) {
  if (!timestamp) return '—';
  return new Date(timestamp).toLocaleString('zh-CN', { hour12: false });
}

function toArray(value) {
  if (Array.isArray(value)) return value.map((item) => String(item));
  if (value === null || value === undefined || value === '') return [];
  return [String(value)];
}

function isCorrectOption(question, label) {
  return toArray(question.referenceAnswer)
    .map((item) => item.toUpperCase())
    .includes(String(label).toUpperCase());
}

function isUserOption(question, label) {
  return toArray(question.userAnswer)
    .map((item) => item.toUpperCase())
    .includes(String(label).toUpperCase());
}

function formatAnswer(question, value) {
  if (value === null || value === undefined || value === '') return '未作答';

  if (question.type === 'multiple') {
    return toArray(value).join('、');
  }
  if (question.type === 'true_false') {
    return String(value) === 'true' ? '正确' : '错误';
  }
  if (question.type === 'fill') {
    return toArray(value)
      .map((item, index) => `第 ${index + 1} 空：${item || '空'}`)
      .join('；');
  }
  return String(value);
}

async function loadExams() {
  loading.value = true;
  try {
    const result = await api.grading.listExams();
    exams.value = result.items || [];

    if (exams.value.length === 0) {
      selectedExamId.value = null;
      sessions.value = [];
      return;
    }

    const stillExists = exams.value.some(
      (item) => item.id === selectedExamId.value,
    );
    if (!stillExists) {
      selectedExamId.value = exams.value[0].id;
    }

    await loadSessions();
  } catch (error) {
    exams.value = [];
  } finally {
    loading.value = false;
  }
}

async function loadSessions() {
  if (!selectedExamId.value) return;

  sessionsLoading.value = true;
  try {
    const result = await api.grading.listSessions(selectedExamId.value);
    sessions.value = result.items || [];
  } catch (error) {
    sessions.value = [];
  } finally {
    sessionsLoading.value = false;
  }
}

function selectExam(id) {
  selectedExamId.value = id;
  loadSessions();
}

async function openSession(row) {
  try {
    const data = await api.grading.sessionDetail(row.id);
    detail.value = data;

    for (const key of Object.keys(grades)) delete grades[key];
    for (const question of data.questions) {
      if (question.type !== 'short' || !question.answerId) continue;
      grades[question.answerId] = {
        score: question.score === null ? undefined : question.score,
        comment: question.comment || '',
      };
    }

    drawerVisible.value = true;
  } catch (error) {
    // 错误提示由拦截器处理
  }
}

async function saveOne(question) {
  const grade = grades[question.answerId];
  if (!grade || grade.score === undefined || grade.score === null) {
    ElMessage.warning('请先给这道题打分');
    return;
  }

  try {
    await api.grading.gradeAnswer(question.answerId, {
      score: Number(grade.score),
      comment: grade.comment,
    });
    question.score = Number(grade.score);
    question.comment = grade.comment;
    question.graded = true;
    ElMessage.success('评分已保存');
  } catch (error) {
    // 错误提示由拦截器处理
  }
}

async function saveAllAndFinalize() {
  if (!detail.value) return;

  saving.value = true;
  try {
    const shortQuestions = detail.value.questions.filter(
      (question) => question.type === 'short' && question.answerId,
    );

    for (const question of shortQuestions) {
      const grade = grades[question.answerId];
      if (!grade || grade.score === undefined || grade.score === null) continue;

      await api.grading.gradeAnswer(question.answerId, {
        score: Number(grade.score),
        comment: grade.comment,
      });
      question.score = Number(grade.score);
      question.comment = grade.comment;
      question.graded = true;
    }

    const result = await api.grading.finalize(detail.value.session.id);
    ElMessage.success(
      `阅卷完成：客观 ${result.objectiveScore} + 主观 ${result.subjectiveScore} = ${result.totalScore} 分`,
    );
    drawerVisible.value = false;
    await Promise.all([loadExams(), loadSessions()]);
  } catch (error) {
    // 错误提示由拦截器处理
  } finally {
    saving.value = false;
  }
}

async function endExam() {
  try {
    await ElMessageBox.confirm(
      '结束后学生将不能再作答，确定结束这场考试吗？',
      '结束考试',
      {
        confirmButtonText: '结束考试',
        cancelButtonText: '取消',
        type: 'warning',
      },
    );
  } catch (error) {
    return;
  }

  try {
    await api.exams.end(selectedExamId.value);
    ElMessage.success('考试已结束');
    await loadExams();
  } catch (error) {
    // 错误提示由拦截器处理
  }
}

async function publishResults() {
  try {
    await ElMessageBox.confirm(
      '发布后学生可以查看总分和逐题解析，确定发布吗？',
      '发布成绩',
      {
        confirmButtonText: '发布',
        cancelButtonText: '取消',
        type: 'warning',
      },
    );
  } catch (error) {
    return;
  }

  try {
    await api.exams.publishResults(selectedExamId.value);
    ElMessage.success('成绩已发布');
    await loadExams();
  } catch (error) {
    // 错误提示由拦截器处理
  }
}

onMounted(loadExams);
</script>

<style scoped>
.exam-bar {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 6px;
  margin-bottom: 14px;
}

.exam-chip {
  flex: 0 0 auto;
  min-width: 210px;
  text-align: left;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px 14px;
  cursor: pointer;
  transition: all 0.16s ease;
}

.exam-chip:hover {
  border-color: var(--brand-border-strong);
}

.exam-chip.active {
  border-color: var(--brand);
  background: var(--brand-soft);
  box-shadow: 0 0 0 2px var(--brand-ring);
}

.chip-title {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 8px;
}

.chip-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.pending {
  color: var(--warning);
  font-weight: 600;
}

.exam-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
}

.danger-text {
  color: var(--danger);
  font-weight: 600;
}

.grading-body {
  padding: 0 20px 90px;
}

.session-summary {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 10px;
  background: #f8fafc;
  border-radius: 12px;
  padding: 14px;
  margin-bottom: 16px;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 11px;
  color: var(--text-sub);
}

.summary-item strong {
  font-size: 17px;
  color: var(--text-main);
}

.pending-text {
  color: var(--warning) !important;
}

.grade-card {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px 18px;
  margin-bottom: 12px;
}

.grade-card.subjective {
  border-left: 3px solid var(--brand);
}

.grade-head {
  display: flex;
  align-items: center;
  gap: 9px;
  flex-wrap: wrap;
  margin-bottom: 10px;
  font-size: 12px;
}

.index {
  font-weight: 600;
}

.max-score {
  color: var(--text-sub);
}

.grade-score {
  margin-left: auto;
  color: var(--warning);
  font-weight: 600;
}

.stem {
  font-size: 14px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
  margin-bottom: 12px;
}

.options {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin-bottom: 12px;
}

.option {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 11px;
  border: 1px solid #e8edf4;
  border-radius: 8px;
  font-size: 13px;
  background: #fbfcfe;
  flex-wrap: wrap;
}

.option.correct {
  border-color: #86efac;
  background: #f0fdf4;
}

.option.chosen:not(.correct) {
  border-color: #fca5a5;
  background: #fef2f2;
}

.letter {
  width: 23px;
  height: 23px;
  border-radius: 50%;
  background: #eef2f7;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
}

.option-text {
  white-space: pre-wrap;
  word-break: break-word;
}

.tag {
  margin-left: auto;
  font-size: 10px;
  padding: 2px 7px;
  border-radius: 999px;
}

.chosen-tag {
  background: var(--sheet-answered-bg);
  color: var(--sheet-answered-text);
}

.correct-tag {
  background: #dcfce7;
  color: #15803d;
}

.answer-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 12px;
}

.answer-box {
  background: #f8fafc;
  border-radius: 9px;
  padding: 10px 12px;
  font-size: 13px;
  line-height: 1.7;
}

.answer-box.reference {
  background: #f0fdf4;
}

.answer-label {
  font-size: 11px;
  color: var(--text-sub);
  margin-bottom: 5px;
}

.answer-text {
  white-space: pre-wrap;
  word-break: break-word;
}

.grade-inputs {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  border-top: 1px dashed #e8edf4;
  padding-top: 12px;
}

.score-input {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.comment-input {
  flex: 1;
  min-width: 180px;
}

.drawer-footer {
  position: sticky;
  bottom: 0;
  background: #fff;
  border-top: 1px solid var(--border);
  padding: 12px 20px;
  margin: 0 -20px;
  display: flex;
  align-items: center;
  gap: 10px;
  z-index: 10;
}

@media (max-width: 760px) {
  .session-summary {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .answer-grid {
    grid-template-columns: 1fr;
  }

  .grading-body {
    padding: 0 12px 90px;
  }
}
</style>
