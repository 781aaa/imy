<template>
  <div class="result-page">
    <header class="result-header">
      <div class="header-left">
        <el-button text class="back-button" @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
        <div class="header-title">成绩详情</div>
      </div>
      <el-tag v-if="result && result.published" effect="dark" type="info">
        {{ result.examTitle }}
      </el-tag>
    </header>

    <div v-if="loading" class="center-state">
      <el-icon class="is-loading" size="30"><Loading /></el-icon>
      <p>正在加载成绩…</p>
    </div>

    <div v-else-if="errorMessage" class="center-state">
      <el-result icon="error" title="加载失败" :sub-title="errorMessage">
        <template #extra>
          <el-button type="primary" @click="goBack">返回</el-button>
        </template>
      </el-result>
    </div>

    <div v-else-if="result && !result.published" class="pending-wrap">
      <div class="pending-card">
        <div class="pending-icon">
          <el-icon size="34"><Clock /></el-icon>
        </div>
        <h2>成绩尚未发布</h2>
        <p>{{ result.message || '请等待老师公布成绩后再来查看。' }}</p>
        <el-tag effect="plain" type="info">
          会话状态：{{ sessionStatusLabel(result.sessionStatus) }}
        </el-tag>
        <div class="pending-actions">
          <el-button type="primary" @click="goBack">返回我的考试</el-button>
        </div>
      </div>
    </div>

    <main v-else-if="result" class="result-body">
      <section class="hero">
        <div class="score-ring" :class="{ passed: result.passed, failed: !result.passed }">
          <div class="score-value">{{ result.totalScore }}</div>
          <div class="score-total">/ {{ maxTotal }}</div>
        </div>
        <div class="hero-info">
          <h2>{{ result.examTitle }}</h2>
          <p>{{ result.paperTitle }}</p>
          <div class="hero-tags">
            <el-tag
              :type="result.passed ? 'success' : 'danger'"
              effect="dark"
            >
              {{ result.passed ? '及格' : '不及格' }}
            </el-tag>
            <span class="pass-line">及格线 {{ result.passScore }} 分</span>
            <span class="violation-tag" v-if="result.violationCount > 0">
              异常操作 {{ result.violationCount }} 次
            </span>
          </div>
        </div>
      </section>

      <section class="stat-row">
        <div class="stat-item">
          <span class="stat-label">客观题</span>
          <strong>{{ result.objectiveScore }}</strong>
        </div>
        <div class="stat-item">
          <span class="stat-label">主观题</span>
          <strong>{{ result.subjectiveScore }}</strong>
        </div>
        <div class="stat-item">
          <span class="stat-label">交卷时间</span>
          <strong class="time-value">{{ formatTime(result.submittedAt) }}</strong>
        </div>
        <div class="stat-item">
          <span class="stat-label">答题数</span>
          <strong>{{ answeredQuestions }} / {{ result.questions.length }}</strong>
        </div>
      </section>

      <section class="review">
        <div class="section-title">逐题解析</div>

        <div
          v-for="(question, index) in result.questions"
          :key="question.sessionQuestionId"
          class="review-card"
          :class="{
            correct: question.isCorrect === true,
            wrong: question.isCorrect === false,
          }"
        >
          <div class="review-head">
            <span class="index">第 {{ index + 1 }} 题</span>
            <el-tag size="small" effect="plain">{{ question.typeLabel }}</el-tag>
            <span class="review-score">
              {{ question.score === null ? '待阅卷' : `${question.score} / ${question.maxScore}` }} 分
            </span>
            <el-tag
              v-if="question.isCorrect === true"
              size="small"
              type="success"
              effect="plain"
            >
              正确
            </el-tag>
            <el-tag
              v-else-if="question.isCorrect === false"
              size="small"
              type="danger"
              effect="plain"
            >
              错误
            </el-tag>
            <el-tag v-else size="small" type="info" effect="plain">
              待阅卷
            </el-tag>
          </div>

          <div class="review-stem">{{ question.stem }}</div>

          <div v-if="optionRows(question).length > 0" class="review-options">
            <div
              v-for="option in optionRows(question)"
              :key="option.label"
              class="review-option"
              :class="{
                'is-correct': isCorrectOption(question, option.label),
                'is-chosen': isUserOption(question, option.label),
                'is-wrong-chosen':
                  isUserOption(question, option.label)
                  && !isCorrectOption(question, option.label),
              }"
            >
              <span class="option-letter">{{ option.label === 'true' ? '对' : (option.label === 'false' ? '错' : option.label) }}</span>
              <span class="option-content">{{ option.content }}</span>
              <span
                v-if="isUserOption(question, option.label)"
                class="mark chosen-mark"
              >
                你的选择
              </span>
              <span
                v-if="isCorrectOption(question, option.label)"
                class="mark correct-mark"
              >
                正确答案
              </span>
            </div>
          </div>

          <div v-else class="answer-block">
            <div class="answer-row">
              <span class="answer-label">你的答案</span>
              <span class="answer-text user-answer">
                {{ formatAnswer(question, question.userAnswer) }}
              </span>
            </div>
            <div class="answer-row">
              <span class="answer-label">
                {{ question.type === 'short' ? '参考答案' : '正确答案' }}
              </span>
              <span class="answer-text correct-answer">
                {{ formatAnswer(question, question.correctAnswer) }}
              </span>
            </div>
          </div>

          <div v-if="question.analysis" class="analysis">
            <span class="analysis-label">解析</span>
            <span>{{ question.analysis }}</span>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { ArrowLeft, Clock, Loading } from '@element-plus/icons-vue';
import api from '../api';

const route = useRoute();
const router = useRouter();

const sessionId = Number(route.params.sessionId);

const loading = ref(true);
const errorMessage = ref('');
const result = ref(null);

const maxTotal = computed(() => {
  if (!result.value) return 0;
  return result.value.questions.reduce(
    (sum, question) => sum + Number(question.maxScore || 0),
    0,
  );
});

const answeredQuestions = computed(() => {
  if (!result.value) return 0;
  return result.value.questions.filter(
    (question) => question.userAnswer !== null
      && question.userAnswer !== undefined
      && String(
        Array.isArray(question.userAnswer)
          ? question.userAnswer.join('')
          : question.userAnswer,
      ).trim() !== '',
  ).length;
});

function toArray(value) {
  if (Array.isArray(value)) return value.map((item) => String(item));
  if (value === null || value === undefined || value === '') return [];
  return [String(value)];
}

function optionRows(question) {
  if (question.type === 'true_false') {
    return [
      { label: 'true', content: '正确' },
      { label: 'false', content: '错误' },
    ];
  }
  return question.options || [];
}

function isCorrectOption(question, label) {
  return toArray(question.correctAnswer).map((item) => item.toUpperCase())
    .includes(String(label).toUpperCase());
}

function isUserOption(question, label) {
  return toArray(question.userAnswer).map((item) => item.toUpperCase())
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

function formatTime(timestamp) {
  if (!timestamp) return '—';
  return new Date(timestamp).toLocaleString('zh-CN', { hour12: false });
}

function sessionStatusLabel(status) {
  const labels = {
    in_progress: '答题中',
    submitted: '待阅卷',
    graded: '已出分',
  };
  return labels[status] || status;
}

function goBack() {
  router.push({ name: 'my-exams' });
}

onMounted(async () => {
  try {
    result.value = await api.student.result(sessionId);
  } catch (error) {
    errorMessage.value = error.message || '无法加载成绩';
    ElMessage.error(errorMessage.value);
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.result-page {
  min-height: 100vh;
  background: #f2f5f9;
  padding-bottom: 40px;
}

.result-header {
  height: 58px;
  background: #fff;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  position: sticky;
  top: 0;
  z-index: 10;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.back-button {
  padding: 6px 8px;
}

.header-title {
  font-size: 16px;
  font-weight: 600;
}

.center-state {
  min-height: 60vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--text-sub);
}

.result-body {
  max-width: 880px;
  margin: 0 auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hero {
  background: linear-gradient(135deg, #1f4e79, #2f6fa8 65%, #4a90cc);
  border-radius: 16px;
  padding: 26px;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 26px;
  box-shadow: 0 14px 32px rgba(31, 78, 121, 0.22);
}

.score-ring {
  width: 128px;
  height: 128px;
  border-radius: 50%;
  border: 5px solid rgba(255, 255, 255, 0.22);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.score-ring.passed {
  border-color: #4ade80;
  box-shadow: 0 0 0 6px rgba(74, 222, 128, 0.1);
}

.score-ring.failed {
  border-color: #f87171;
  box-shadow: 0 0 0 6px rgba(248, 113, 113, 0.1);
}

.score-value {
  font-size: 42px;
  font-weight: 800;
  line-height: 1;
}

.score-total {
  font-size: 12px;
  opacity: 0.7;
  margin-top: 5px;
}

.hero-info h2 {
  margin: 0;
  font-size: 21px;
}

.hero-info p {
  margin: 7px 0 14px;
  font-size: 13px;
  opacity: 0.78;
}

.hero-tags {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 12px;
}

.pass-line {
  opacity: 0.78;
}

.violation-tag {
  background: rgba(220, 38, 38, 0.22);
  padding: 3px 9px;
  border-radius: 999px;
}

.stat-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.stat-item {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stat-label {
  font-size: 11px;
  color: var(--text-sub);
}

.stat-item strong {
  font-size: 20px;
  color: var(--brand);
}

.time-value {
  font-size: 13px !important;
  color: var(--text-main) !important;
}

.review {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  margin-top: 4px;
}

.review-card {
  background: #fff;
  border: 1px solid var(--border);
  border-left: 4px solid #d1d9e3;
  border-radius: 12px;
  padding: 18px 20px;
}

.review-card.correct {
  border-left-color: #16a34a;
}

.review-card.wrong {
  border-left-color: #dc2626;
}

.review-head {
  display: flex;
  align-items: center;
  gap: 9px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.index {
  font-size: 13px;
  font-weight: 600;
}

.review-score {
  margin-left: auto;
  font-size: 12px;
  color: var(--warning);
  font-weight: 600;
}

.review-stem {
  font-size: 14px;
  line-height: 1.75;
  white-space: pre-wrap;
  word-break: break-word;
  margin-bottom: 14px;
}

.review-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 14px;
}

.review-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid #e5ebf2;
  border-radius: 8px;
  background: #fbfcfe;
  font-size: 13px;
  flex-wrap: wrap;
}

.review-option.is-correct {
  border-color: #86efac;
  background: #f0fdf4;
}

.review-option.is-wrong-chosen {
  border-color: #fca5a5;
  background: #fef2f2;
}

.option-letter {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #eef2f7;
  color: var(--text-sub);
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.option-content {
  white-space: pre-wrap;
  word-break: break-word;
}

.mark {
  margin-left: auto;
  font-size: 10px;
  padding: 2px 7px;
  border-radius: 999px;
}

.chosen-mark {
  background: #e0ecf8;
  color: #1d4ed8;
}

.correct-mark {
  background: #dcfce7;
  color: #15803d;
}

.answer-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: #f8fafc;
  border-radius: 9px;
  padding: 12px 14px;
}

.answer-row {
  display: flex;
  gap: 12px;
  font-size: 13px;
  line-height: 1.7;
}

.answer-label {
  width: 62px;
  flex-shrink: 0;
  color: var(--text-sub);
  font-size: 12px;
}

.answer-text {
  white-space: pre-wrap;
  word-break: break-word;
}

.user-answer {
  color: var(--text-main);
}

.correct-answer {
  color: #15803d;
}

.analysis {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #fffbeb;
  color: #92400e;
  font-size: 12px;
  line-height: 1.7;
  display: flex;
  gap: 10px;
}

.analysis-label {
  flex-shrink: 0;
  font-weight: 600;
}

.pending-wrap {
  min-height: 70vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.pending-card {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 36px 40px;
  text-align: center;
  max-width: 460px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.pending-icon {
  width: 70px;
  height: 70px;
  border-radius: 20px;
  background: #fef3c7;
  color: #b45309;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pending-card h2 {
  margin: 6px 0 0;
  font-size: 19px;
}

.pending-card p {
  margin: 0;
  font-size: 13px;
  color: var(--text-sub);
  line-height: 1.7;
}

.pending-actions {
  margin-top: 10px;
}

@media (max-width: 700px) {
  .result-body {
    padding: 12px;
  }

  .hero {
    flex-direction: column;
    text-align: center;
    padding: 22px;
  }

  .hero-tags {
    justify-content: center;
  }

  .stat-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .review-card {
    padding: 15px;
  }
}
</style>
