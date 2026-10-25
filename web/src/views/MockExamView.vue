<template>
  <div class="mock-page theme-purple">
    <header class="mock-header">
      <div class="brand">
        <div class="brand-mark">考</div>
        <div class="brand-text">
          <div class="title">{{ data ? data.title : '模拟考试' }}</div>
          <div class="sub" v-if="data">{{ data.levelName }} · {{ data.questionCount }} 题</div>
        </div>
      </div>

      <div v-if="mode === 'taking' && data" class="header-status">
        <div class="timer" :class="{ warning: remainingSeconds <= 300 }">
          <el-icon><Timer /></el-icon>
          <span>{{ timeText }}</span>
        </div>
        <div class="save-state" :class="saveState">{{ saveText }}</div>
      </div>

      <div class="header-actions">
        <template v-if="mode === 'taking'">
          <el-button @click="quitMock">离开</el-button>
          <el-button type="primary" :loading="submitting" @click="confirmSubmit">
            交卷
          </el-button>
        </template>
        <template v-else-if="mode === 'result'">
          <el-button type="primary" @click="goHome">再来一场</el-button>
        </template>
      </div>
    </header>

    <div v-if="loading" class="center-state">
      <el-icon class="is-loading" size="30"><Loading /></el-icon>
      <p>正在加载…</p>
    </div>

    <div v-else-if="errorMessage" class="center-state">
      <el-result icon="warning" title="加载失败" :sub-title="errorMessage">
        <template #extra>
          <el-button type="primary" @click="goHome">返回模拟考试</el-button>
        </template>
      </el-result>
    </div>

    <main v-else-if="mode === 'taking' && current" class="mock-body">
      <aside class="sheet">
        <div class="sheet-head">
          <span>答题卡</span>
          <span class="sheet-progress">{{ answeredCount }} / {{ data.questions.length }}</span>
        </div>
        <div class="sheet-grid">
          <button
            v-for="(question, index) in data.questions"
            :key="question.questionId"
            type="button"
            class="sheet-item"
            :class="{ answered: isAnswered(question), current: index === currentIndex }"
            @click="currentIndex = index"
          >
            {{ index + 1 }}
          </button>
        </div>
      </aside>

      <section class="question-area">
        <div class="question-card">
          <div class="question-meta">
            <el-tag effect="plain">{{ current.typeLabel }}</el-tag>
            <span class="score">{{ current.maxScore }} 分</span>
            <span class="position">第 {{ currentIndex + 1 }} / {{ data.questions.length }} 题</span>
          </div>

          <h3 class="stem">{{ current.stem }}</h3>

          <div v-if="current.type === 'single' || current.type === 'multiple'" class="options">
            <button
              v-for="option in current.options"
              :key="option.label"
              type="button"
              class="option"
              :class="{ selected: isOptionSelected(current, option.label) }"
              @click="chooseOption(current, option.label)"
            >
              <span class="option-letter">{{ option.label }}</span>
              <span class="option-content">{{ option.content }}</span>
            </button>
            <div v-if="current.type === 'multiple'" class="option-hint">
              多选题，可选择多个选项
            </div>
          </div>

          <div v-else-if="current.type === 'true_false'" class="options">
            <button
              type="button"
              class="option"
              :class="{ selected: answers[current.questionId] === 'true' }"
              @click="setAnswer(current.questionId, 'true')"
            >
              <span class="option-letter">对</span>
              <span class="option-content">正确</span>
            </button>
            <button
              type="button"
              class="option"
              :class="{ selected: answers[current.questionId] === 'false' }"
              @click="setAnswer(current.questionId, 'false')"
            >
              <span class="option-letter">错</span>
              <span class="option-content">错误</span>
            </button>
          </div>

          <div v-else class="fill-area">
            <div v-for="i in current.blankCount" :key="i" class="fill-row">
              <span class="fill-label">第 {{ i }} 空</span>
              <el-input
                :model-value="fillValue(current, i - 1)"
                placeholder="请输入答案"
                @update:model-value="setFill(current, i - 1, $event)"
              />
            </div>
          </div>
        </div>

        <div class="question-nav">
          <el-button :disabled="currentIndex === 0" @click="currentIndex -= 1">
            上一题
          </el-button>
          <div class="nav-center">
            <span class="text-sub">已答 {{ answeredCount }} / {{ data.questions.length }}</span>
            <el-progress :percentage="progressPercent" :show-text="false" :stroke-width="6" />
          </div>
          <el-button
            v-if="currentIndex < data.questions.length - 1"
            type="primary"
            @click="currentIndex += 1"
          >
            下一题
          </el-button>
          <el-button v-else type="primary" :loading="submitting" @click="confirmSubmit">
            交卷
          </el-button>
        </div>
      </section>
    </main>

    <main v-else-if="mode === 'result' && result" class="result-body">
      <section class="hero">
        <div class="score-ring">
          <div class="score-value">{{ result.score }}</div>
          <div class="score-total">/ {{ result.totalScore }}</div>
        </div>
        <div class="hero-info">
          <h2>{{ result.title }}</h2>
          <p>正确率 {{ Math.round(result.accuracy * 100) }}% · 交卷 {{ formatTime(result.submittedAt) }}</p>
          <el-tag :type="result.accuracy >= 0.6 ? 'success' : 'warning'" effect="dark">
            {{ result.accuracy >= 0.6 ? '表现不错' : '继续加油' }}
          </el-tag>
        </div>
      </section>

      <section class="review">
        <div
          v-for="(question, index) in result.questions"
          :key="question.questionId"
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
              {{ question.score ?? 0 }} / {{ question.maxScore }} 分
            </span>
            <el-tag
              :type="question.isCorrect ? 'success' : 'danger'"
              size="small"
              effect="plain"
            >
              {{ question.isCorrect ? '正确' : '错误' }}
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
                'is-wrong-chosen':
                  isUserOption(question, option.label)
                  && !isCorrectOption(question, option.label),
              }"
            >
              <span class="option-letter">
                {{ option.label === 'true' ? '对' : (option.label === 'false' ? '错' : option.label) }}
              </span>
              <span class="option-content">{{ option.content }}</span>
              <span v-if="isUserOption(question, option.label)" class="mark chosen-mark">
                你的选择
              </span>
              <span v-if="isCorrectOption(question, option.label)" class="mark correct-mark">
                正确答案
              </span>
            </div>
          </div>

          <div v-else class="answer-block">
            <div class="answer-row">
              <span class="answer-label">你的答案</span>
              <span class="answer-text">{{ formatAnswer(question, question.userAnswer) }}</span>
            </div>
            <div class="answer-row">
              <span class="answer-label">正确答案</span>
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
import {
  computed,
  onMounted,
  onUnmounted,
  reactive,
  ref,
} from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Loading, Timer } from '@element-plus/icons-vue';
import api from '../api';

const route = useRoute();
const router = useRouter();

const mockExamId = Number(route.params.mockExamId);

const loading = ref(true);
const errorMessage = ref('');
const mode = ref('loading');
const data = ref(null);
const result = ref(null);

const answers = reactive({});
const currentIndex = ref(0);

const saving = ref(false);
const submitting = ref(false);
const saveState = ref('idle');
const savedAt = ref(null);

const remainingSeconds = ref(0);
const submitted = ref(false);

let serverOffset = 0;
let timerId = null;
let saveTimer = null;
let pendingSave = false;

const current = computed(() => {
  if (!data.value || !data.value.questions.length) return null;
  return data.value.questions[currentIndex.value];
});

const answeredCount = computed(() => {
  if (!data.value) return 0;
  return data.value.questions.filter((question) => isAnswered(question)).length;
});

const progressPercent = computed(() => {
  if (!data.value || data.value.questions.length === 0) return 0;
  return Math.round((answeredCount.value / data.value.questions.length) * 100);
});

const timeText = computed(() => {
  const total = Math.max(0, remainingSeconds.value);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (value) => String(value).padStart(2, '0');
  return hours > 0
    ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
});

const saveText = computed(() => {
  if (saveState.value === 'saving') return '保存中…';
  if (saveState.value === 'saved') {
    const time = savedAt.value
      ? new Date(savedAt.value).toLocaleTimeString('zh-CN', { hour12: false })
      : '';
    return `已保存 ${time}`;
  }
  if (saveState.value === 'error') return '保存失败';
  return '自动保存';
});

function isAnswered(question) {
  const value = answers[question.questionId];
  if (question.type === 'multiple' || question.type === 'fill') {
    return Array.isArray(value)
      && value.some((item) => String(item ?? '').trim() !== '');
  }
  return String(value ?? '').trim() !== '';
}

function isOptionSelected(question, label) {
  const value = answers[question.questionId];
  if (question.type === 'multiple') {
    return Array.isArray(value) && value.includes(label);
  }
  return value === label;
}

function chooseOption(question, label) {
  if (question.type === 'single') {
    answers[question.questionId] = label;
  } else {
    const currentValue = Array.isArray(answers[question.questionId])
      ? answers[question.questionId].slice()
      : [];
    const index = currentValue.indexOf(label);
    if (index >= 0) currentValue.splice(index, 1);
    else currentValue.push(label);
    answers[question.questionId] = currentValue.sort();
  }
  scheduleSave();
}

function setAnswer(questionId, value) {
  answers[questionId] = value;
  scheduleSave();
}

function fillValue(question, index) {
  const value = answers[question.questionId];
  if (!Array.isArray(value)) return '';
  return value[index] || '';
}

function setFill(question, index, value) {
  const currentValue = Array.isArray(answers[question.questionId])
    ? answers[question.questionId].slice()
    : Array.from({ length: question.blankCount }, () => '');
  currentValue[index] = value;
  answers[question.questionId] = currentValue;
  scheduleSave();
}

function buildPayload() {
  if (!data.value) return [];
  return data.value.questions.map((question) => ({
    questionId: question.questionId,
    answer: answers[question.questionId] ?? null,
  }));
}

async function saveAll() {
  if (!data.value) return null;
  return api.mock.saveAnswers(data.value.id, buildPayload());
}

function scheduleSave() {
  if (submitted.value) return;
  saveState.value = 'saving';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => flushSave(), 700);
}

async function flushSave() {
  if (!data.value || submitted.value) return;
  if (saving.value) {
    pendingSave = true;
    return;
  }

  saving.value = true;
  try {
    const response = await saveAll();
    saveState.value = 'saved';
    savedAt.value = response.serverTime;
  } catch (error) {
    if (error.code === 'SESSION_EXPIRED') {
      await finishWithSubmittedResult();
      return;
    }
    saveState.value = 'error';
  } finally {
    saving.value = false;
    if (pendingSave) {
      pendingSave = false;
      flushSave();
    }
  }
}

function tick() {
  if (!data.value || mode.value !== 'taking') return;

  const now = Date.now() + serverOffset;
  remainingSeconds.value = Math.max(
    0,
    Math.floor((data.value.deadlineAt - now) / 1000),
  );

  if (remainingSeconds.value <= 0 && !submitted.value) {
    autoSubmit();
  }
}

function startTimer() {
  stopTimer();
  tick();
  timerId = setInterval(tick, 1000);
}

function stopTimer() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
}

async function finishWithSubmittedResult() {
  submitted.value = true;
  stopTimer();
  try {
    const detail = await api.mock.detail(mockExamId);
    if (detail.status === 'submitted') {
      result.value = detail;
      mode.value = 'result';
    }
  } catch (error) {
    // 忽略
  }
}

async function doSubmit(auto) {
  if (submitting.value || !data.value) return;

  submitting.value = true;
  stopTimer();
  clearTimeout(saveTimer);

  try {
    try {
      await saveAll();
    } catch (error) {
      // 即使保存失败也尝试交卷
    }

    const response = await api.mock.submit(data.value.id);
    submitted.value = true;
    result.value = response;
    mode.value = 'result';
    ElMessage.success(auto ? '时间到，已自动交卷' : `交卷成功：${response.score} 分`);
  } catch (error) {
    if (error.code === 'SESSION_EXPIRED') {
      await finishWithSubmittedResult();
      return;
    }
    ElMessage.error(error.message || '交卷失败，请重试');
    submitting.value = false;
    if (!auto) startTimer();
  }
}

function autoSubmit() {
  if (submitting.value) return;
  ElMessage.warning('时间到，正在自动交卷');
  doSubmit(true);
}

async function confirmSubmit() {
  if (!data.value || submitting.value) return;

  const unanswered = data.value.questions.length - answeredCount.value;

  try {
    await ElMessageBox.confirm(
      unanswered > 0
        ? `还有 ${unanswered} 题未作答，确定交卷吗？`
        : '确定交卷吗？交卷后立刻出分。',
      '交卷确认',
      {
        confirmButtonText: '交卷',
        cancelButtonText: '继续答题',
        type: 'warning',
      },
    );
  } catch (error) {
    return;
  }

  await doSubmit(false);
}

async function quitMock() {
  try {
    await ElMessageBox.confirm(
      '离开后计时仍会继续，可以从「模拟考试」历史记录里回来继续。确定离开吗？',
      '离开考试',
      {
        confirmButtonText: '离开',
        cancelButtonText: '继续答题',
        type: 'warning',
      },
    );
  } catch (error) {
    return;
  }

  goHome();
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
  return toArray(question.correctAnswer)
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

  if (question.type === 'multiple') return toArray(value).join('、');
  if (question.type === 'true_false') {
    return String(value) === 'true' ? '正确' : '错误';
  }
  if (question.type === 'fill') {
    return toArray(value)
      .map((text, index) => `第 ${index + 1} 空：${text || '空'}`)
      .join('；');
  }
  return String(value);
}

function handleBeforeUnload(event) {
  if (mode.value === 'taking' && !submitted.value) {
    event.preventDefault();
    event.returnValue = '';
  }
}

function goHome() {
  router.push({ name: 'mock' });
}

onMounted(async () => {
  try {
    const detail = await api.mock.detail(mockExamId);
    data.value = detail;

    if (detail.status === 'submitted') {
      result.value = detail;
      mode.value = 'result';
      return;
    }

    mode.value = 'taking';

    for (const question of detail.questions) {
      if (question.savedAnswer !== null && question.savedAnswer !== undefined) {
        answers[question.questionId] = question.savedAnswer;
      } else if (question.type === 'multiple') {
        answers[question.questionId] = [];
      } else if (question.type === 'fill') {
        answers[question.questionId] = Array.from(
          { length: question.blankCount || 1 },
          () => '',
        );
      } else {
        answers[question.questionId] = '';
      }
    }

    serverOffset = detail.serverTime - Date.now();
    startTimer();
    window.addEventListener('beforeunload', handleBeforeUnload);
  } catch (error) {
    errorMessage.value = error.message || '无法加载模拟考试';
  } finally {
    loading.value = false;
  }
});

onUnmounted(() => {
  stopTimer();
  clearTimeout(saveTimer);
  window.removeEventListener('beforeunload', handleBeforeUnload);
});
</script>

<style scoped>
.mock-page {
  min-height: 100vh;
  background: var(--page-bg);
  display: flex;
  flex-direction: column;
}

.mock-header {
  height: 64px;
  background: var(--brand-deep);
  color: #fff;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 20px;
  position: sticky;
  top: 0;
  z-index: 20;
}

.brand {
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 0;
}

.brand-mark {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--brand-light), var(--brand));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
  flex-shrink: 0;
}

.brand-text {
  min-width: 0;
}

.title {
  font-size: 15px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sub {
  font-size: 11px;
  opacity: 0.6;
}

.header-status {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
}

.timer {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 19px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  background: rgba(255, 255, 255, 0.12);
  padding: 5px 13px;
  border-radius: 9px;
}

.timer.warning {
  background: rgba(220, 38, 38, 0.25);
  color: #fecaca;
}

.save-state {
  font-size: 12px;
  opacity: 0.7;
  white-space: nowrap;
}

.save-state.error {
  color: #fca5a5;
  opacity: 1;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.center-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-sub);
  gap: 8px;
}

.mock-body {
  flex: 1;
  display: flex;
  gap: 18px;
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
  padding: 20px;
}

.sheet {
  width: 220px;
  flex-shrink: 0;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 13px;
  padding: 16px;
  height: fit-content;
  position: sticky;
  top: 84px;
}

.sheet-head {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
}

.sheet-progress {
  font-size: 12px;
  color: var(--text-sub);
  font-weight: 400;
}

.sheet-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}

.sheet-item {
  aspect-ratio: 1;
  border: 1px solid #dde5ee;
  background: #f8fafc;
  border-radius: 7px;
  font-size: 12px;
  color: var(--text-sub);
  cursor: pointer;
}

.sheet-item.answered {
  background: var(--sheet-answered-bg);
  border-color: var(--sheet-answered-border);
  color: var(--sheet-answered-text);
  font-weight: 600;
}

.sheet-item.current {
  background: var(--brand);
  border-color: var(--brand);
  color: #fff;
  font-weight: 700;
}

.question-area {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.question-card {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 24px;
  min-height: 360px;
}

.question-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
  font-size: 12px;
}

.score {
  color: var(--warning);
  font-weight: 600;
}

.position {
  margin-left: auto;
  color: var(--text-sub);
}

.stem {
  font-size: 17px;
  line-height: 1.75;
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0 0 20px;
}

.options {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.option {
  display: flex;
  align-items: flex-start;
  gap: 11px;
  padding: 13px 15px;
  border: 1px solid #e1e8f0;
  background: #fbfcfe;
  border-radius: 10px;
  cursor: pointer;
  text-align: left;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-main);
}

.option.selected {
  border-color: var(--brand);
  background: var(--brand-soft);
  box-shadow: 0 0 0 2px var(--brand-ring);
}

.option-letter {
  width: 25px;
  height: 25px;
  border-radius: 50%;
  background: #eef2f7;
  color: var(--text-sub);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}

.option.selected .option-letter {
  background: var(--brand);
  color: #fff;
}

.fill-area {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.fill-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.fill-label {
  width: 58px;
  flex-shrink: 0;
  font-size: 13px;
  color: var(--text-sub);
}

.question-nav {
  display: flex;
  align-items: center;
  gap: 14px;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px 16px;
}

.nav-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
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
  background: var(--brand-grad);
  border-radius: 16px;
  padding: 26px;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 26px;
  box-shadow: 0 14px 32px var(--brand-shadow);
}

.score-ring {
  width: 128px;
  height: 128px;
  border-radius: 50%;
  border: 5px solid rgba(255, 255, 255, 0.28);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.score-value {
  font-size: 42px;
  font-weight: 800;
  line-height: 1;
}

.score-total {
  font-size: 12px;
  opacity: 0.72;
  margin-top: 5px;
}

.hero-info h2 {
  margin: 0;
  font-size: 21px;
}

.hero-info p {
  margin: 7px 0 12px;
  font-size: 13px;
  opacity: 0.8;
}

.review {
  display: flex;
  flex-direction: column;
  gap: 12px;
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
  margin-bottom: 11px;
  font-size: 12px;
}

.index {
  font-weight: 600;
}

.review-score {
  margin-left: auto;
  color: var(--warning);
  font-weight: 600;
}

.review-stem {
  font-size: 14px;
  line-height: 1.75;
  white-space: pre-wrap;
  word-break: break-word;
  margin-bottom: 12px;
}

.review-options {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin-bottom: 12px;
}

.review-option {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 9px 11px;
  border: 1px solid #e8edf4;
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

.mark {
  margin-left: auto;
  font-size: 10px;
  padding: 2px 7px;
  border-radius: 999px;
}

.chosen-mark {
  background: var(--sheet-answered-bg);
  color: var(--sheet-answered-text);
}

.correct-mark {
  background: #dcfce7;
  color: #15803d;
}

.answer-block {
  background: #f8fafc;
  border-radius: 9px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.answer-row {
  display: flex;
  gap: 10px;
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

.correct-answer {
  color: #15803d;
}

.analysis {
  margin-top: 10px;
  background: #fffbeb;
  border-radius: 8px;
  padding: 9px 11px;
  font-size: 12px;
  line-height: 1.7;
  color: #92400e;
  display: flex;
  gap: 9px;
}

.analysis-label {
  flex-shrink: 0;
  font-weight: 600;
}

@media (max-width: 900px) {
  .mock-header {
    height: auto;
    min-height: 60px;
    flex-wrap: wrap;
    padding: 10px 14px;
  }

  .header-status {
    order: 3;
    flex-basis: 100%;
    justify-content: space-between;
  }

  .mock-body {
    flex-direction: column;
    padding: 12px;
  }

  .sheet {
    width: 100%;
    position: static;
  }

  .sheet-grid {
    grid-template-columns: repeat(auto-fill, minmax(36px, 1fr));
  }

  .question-card {
    padding: 18px;
  }

  .stem {
    font-size: 16px;
  }

  .hero {
    flex-direction: column;
    text-align: center;
  }
}
</style>
