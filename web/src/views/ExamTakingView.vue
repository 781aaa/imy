<template>
  <div class="exam-page theme-purple">
    <header class="exam-header">
      <div class="exam-brand">
        <div class="brand-mark">考</div>
        <div class="exam-title-wrap">
          <div class="exam-title">{{ paper ? paper.examTitle : '在线考试' }}</div>
          <div v-if="paper" class="exam-sub">{{ paper.paperTitle }}</div>
        </div>
      </div>

      <div v-if="paper" class="header-status">
        <div class="timer" :class="{ warning: remainingSeconds <= 300 }">
          <el-icon><Timer /></el-icon>
          <span>{{ timeText }}</span>
        </div>
        <div class="save-state" :class="saveState">{{ saveText }}</div>
      </div>

      <div v-if="paper" class="header-actions">
        <el-button @click="toggleFullscreen">
          {{ isFullscreen ? '退出全屏' : '全屏' }}
        </el-button>
        <el-button type="primary" :loading="submitting" @click="confirmSubmit">
          交卷
        </el-button>
      </div>
    </header>

    <div v-if="loading" class="center-state">
      <el-icon class="is-loading" size="32"><Loading /></el-icon>
      <p>正在准备试卷…</p>
    </div>

    <div v-else-if="errorMessage" class="center-state">
      <el-result
        icon="warning"
        title="无法开始考试"
        :sub-title="errorMessage"
      >
        <template #extra>
          <el-button type="primary" @click="goBack">返回我的考试</el-button>
        </template>
      </el-result>
    </div>

    <main v-else-if="paper && current" class="exam-body">
      <aside class="sheet">
        <div class="sheet-head">
          <span>答题卡</span>
          <span class="sheet-progress">
            {{ answeredCount }} / {{ paper.questions.length }}
          </span>
        </div>

        <div class="sheet-grid">
          <button
            v-for="(question, index) in paper.questions"
            :key="question.sessionQuestionId"
            type="button"
            class="sheet-item"
            :class="{
              answered: isAnswered(question),
              current: index === currentIndex,
            }"
            @click="currentIndex = index"
          >
            {{ index + 1 }}
          </button>
        </div>

        <div class="sheet-legend">
          <span><i class="dot answered" />已答</span>
          <span><i class="dot" />未答</span>
        </div>

        <div v-if="violationCount > 0" class="violation">
          已记录 {{ violationCount }} 次异常操作
        </div>
      </aside>

      <section class="question-area">
        <div class="question-card">
          <div class="question-meta">
            <el-tag effect="plain">{{ current.typeLabel }}</el-tag>
            <span class="score">{{ current.score }} 分</span>
            <span class="position">
              第 {{ currentIndex + 1 }} / {{ paper.questions.length }} 题
            </span>
          </div>

          <h3 class="stem">{{ current.stem }}</h3>

          <div
            v-if="current.type === 'single' || current.type === 'multiple'"
            class="options"
          >
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
              :class="{ selected: answers[current.sessionQuestionId] === 'true' }"
              @click="setAnswer(current.sessionQuestionId, 'true')"
            >
              <span class="option-letter">对</span>
              <span class="option-content">正确</span>
            </button>
            <button
              type="button"
              class="option"
              :class="{ selected: answers[current.sessionQuestionId] === 'false' }"
              @click="setAnswer(current.sessionQuestionId, 'false')"
            >
              <span class="option-letter">错</span>
              <span class="option-content">错误</span>
            </button>
          </div>

          <div v-else-if="current.type === 'fill'" class="fill-area">
            <div v-for="i in current.blankCount" :key="i" class="fill-row">
              <span class="fill-label">第 {{ i }} 空</span>
              <el-input
                :model-value="fillValue(current, i - 1)"
                placeholder="请输入答案"
                @update:model-value="setFill(current, i - 1, $event)"
              />
            </div>
          </div>

          <div v-else class="short-area">
            <el-input
              type="textarea"
              :rows="7"
              :model-value="answers[current.sessionQuestionId] || ''"
              placeholder="请输入你的答案"
              @update:model-value="setAnswer(current.sessionQuestionId, $event)"
            />
            <div class="char-count">
              {{ String(answers[current.sessionQuestionId] || '').length }} 字
            </div>
          </div>
        </div>

        <div class="question-nav">
          <el-button
            :disabled="currentIndex === 0"
            @click="currentIndex -= 1"
          >
            上一题
          </el-button>

          <div class="nav-center">
            <span class="text-sub">
              已答 {{ answeredCount }} / {{ paper.questions.length }}
            </span>
            <el-progress
              :percentage="progressPercent"
              :show-text="false"
              :stroke-width="6"
              class="progress"
            />
          </div>

          <el-button
            v-if="currentIndex < paper.questions.length - 1"
            type="primary"
            @click="currentIndex += 1"
          >
            下一题
          </el-button>
          <el-button
            v-else
            type="primary"
            :loading="submitting"
            @click="confirmSubmit"
          >
            交卷
          </el-button>
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
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Loading, Timer } from '@element-plus/icons-vue';
import api from '../api';

const route = useRoute();
const router = useRouter();

const examId = Number(route.params.examId);

const loading = ref(true);
const errorMessage = ref('');
const paper = ref(null);
const answers = reactive({});
const currentIndex = ref(0);

const saving = ref(false);
const saveState = ref('idle');
const savedAt = ref(null);
const submitting = ref(false);
const submitted = ref(false);
const autoSubmitted = ref(false);

const remainingSeconds = ref(0);
const violationCount = ref(0);
const isFullscreen = ref(false);

let serverOffset = 0;
let timerId = null;
let saveTimer = null;
let pendingSave = false;
let warnedFiveMinutes = false;
let wasFullscreen = false;
let clientSeq = 0;
const lastEventAt = {};

const current = computed(() => {
  if (!paper.value || paper.value.questions.length === 0) return null;
  return paper.value.questions[currentIndex.value];
});

const answeredCount = computed(() => {
  if (!paper.value) return 0;
  return paper.value.questions.filter((question) => isAnswered(question)).length;
});

const progressPercent = computed(() => {
  if (!paper.value || paper.value.questions.length === 0) return 0;
  return Math.round((answeredCount.value / paper.value.questions.length) * 100);
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
  if (saveState.value === 'error') return '保存失败，将自动重试';
  return '自动保存已开启';
});

function isAnswered(question) {
  const value = answers[question.sessionQuestionId];
  if (question.type === 'multiple' || question.type === 'fill') {
    return Array.isArray(value)
      && value.some((item) => String(item ?? '').trim() !== '');
  }
  return String(value ?? '').trim() !== '';
}

function isOptionSelected(question, label) {
  const value = answers[question.sessionQuestionId];
  if (question.type === 'multiple') {
    return Array.isArray(value) && value.includes(label);
  }
  return value === label;
}

function chooseOption(question, label) {
  if (question.type === 'single') {
    answers[question.sessionQuestionId] = label;
  } else {
    const currentValue = Array.isArray(answers[question.sessionQuestionId])
      ? answers[question.sessionQuestionId].slice()
      : [];
    const index = currentValue.indexOf(label);
    if (index >= 0) {
      currentValue.splice(index, 1);
    } else {
      currentValue.push(label);
    }
    answers[question.sessionQuestionId] = currentValue.sort();
  }
  scheduleSave();
}

function setAnswer(sessionQuestionId, value) {
  answers[sessionQuestionId] = value;
  scheduleSave();
}

function fillValue(question, index) {
  const value = answers[question.sessionQuestionId];
  if (!Array.isArray(value)) return '';
  return value[index] || '';
}

function setFill(question, index, value) {
  const currentValue = Array.isArray(answers[question.sessionQuestionId])
    ? answers[question.sessionQuestionId].slice()
    : Array.from({ length: question.blankCount }, () => '');
  currentValue[index] = value;
  answers[question.sessionQuestionId] = currentValue;
  scheduleSave();
}

function scheduleSave() {
  if (submitted.value) return;
  saveState.value = 'saving';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    flushSave();
  }, 700);
}

function buildAnswerPayload() {
  if (!paper.value) return [];
  return paper.value.questions.map((question) => ({
    sessionQuestionId: question.sessionQuestionId,
    answer: answers[question.sessionQuestionId] ?? null,
  }));
}

async function saveAll() {
  if (!paper.value) return null;
  return api.student.saveAnswers(paper.value.sessionId, buildAnswerPayload());
}

async function flushSave() {
  if (!paper.value || submitted.value) return;
  if (saving.value) {
    pendingSave = true;
    return;
  }

  saving.value = true;
  saveState.value = 'saving';

  try {
    const result = await saveAll();
    saveState.value = 'saved';
    savedAt.value = result.serverTime;
    if (result.deadlineAt) {
      remainingSeconds.value = Math.max(
        0,
        Math.floor((result.deadlineAt - (Date.now() + serverOffset)) / 1000),
      );
    }
  } catch (error) {
    if (error.code === 'SESSION_EXPIRED' || error.code === 'SESSION_SUBMITTED') {
      submitted.value = true;
      router.replace({
        name: 'exam-result',
        params: { sessionId: paper.value.sessionId },
      });
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
  if (!paper.value) return;

  const now = Date.now() + serverOffset;
  remainingSeconds.value = Math.max(
    0,
    Math.floor((paper.value.deadlineAt - now) / 1000),
  );

  if (
    remainingSeconds.value <= 300
    && remainingSeconds.value > 0
    && !warnedFiveMinutes
    && !submitted.value
  ) {
    warnedFiveMinutes = true;
    ElMessage.warning('距离考试结束还有 5 分钟');
  }

  if (remainingSeconds.value <= 0 && !submitted.value && !autoSubmitted.value) {
    autoSubmitted.value = true;
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

function reportEvent(eventType) {
  if (!paper.value || submitted.value) return;

  const now = Date.now();
  if (lastEventAt[eventType] && now - lastEventAt[eventType] < 2000) {
    return;
  }
  lastEventAt[eventType] = now;

  api.student
    .reportEvent(paper.value.sessionId, {
      eventType,
      clientSeq: (clientSeq += 1),
      occurredAt: now,
    })
    .then((result) => {
      if (result && result.violationCount !== undefined) {
        violationCount.value = result.violationCount;
      }
    })
    .catch(() => {
      // 埋点失败不影响答题
    });
}

function onWindowBlur() {
  reportEvent('blur');
}

function onVisibilityChange() {
  if (document.hidden) reportEvent('visibility');
}

function onCopy() {
  reportEvent('copy');
}

function onPaste() {
  reportEvent('paste');
}

function onFullscreenChange() {
  const active = Boolean(document.fullscreenElement);
  if (!active && wasFullscreen) {
    wasFullscreen = false;
    reportEvent('fullscreen_exit');
  }
  isFullscreen.value = active;
}

async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await document.documentElement.requestFullscreen();
      wasFullscreen = true;
    }
  } catch (error) {
    ElMessage.warning('当前环境不支持全屏');
  }
}

async function doSubmit(auto) {
  if (!paper.value || submitting.value) return;

  submitting.value = true;
  stopTimer();
  clearTimeout(saveTimer);

  try {
    try {
      await saveAll();
    } catch (error) {
      // 超时或已交卷时保存会失败，继续走交卷
    }

    await api.student.submit(paper.value.sessionId);
    submitted.value = true;
    ElMessage.success(auto ? '时间到，已自动交卷' : '交卷成功');
    router.replace({
      name: 'exam-result',
      params: { sessionId: paper.value.sessionId },
    });
  } catch (error) {
    if (
      error.code === 'SESSION_EXPIRED'
      || error.code === 'SESSION_SUBMITTED'
    ) {
      submitted.value = true;
      router.replace({
        name: 'exam-result',
        params: { sessionId: paper.value.sessionId },
      });
      return;
    }

    ElMessage.error(error.message || '交卷失败，请重试');
    submitting.value = false;
    if (!auto) startTimer();
  }
}

function autoSubmit() {
  ElMessage.warning('考试时间到，正在自动交卷');
  doSubmit(true);
}

async function confirmSubmit() {
  if (!paper.value || submitting.value) return;

  const unanswered = paper.value.questions.length - answeredCount.value;

  try {
    await ElMessageBox.confirm(
      unanswered > 0
        ? `还有 ${unanswered} 题未作答，确定要交卷吗？交卷后不能修改。`
        : '确定要交卷吗？交卷后不能修改。',
      '交卷确认',
      {
        confirmButtonText: '确定交卷',
        cancelButtonText: '继续答题',
        type: 'warning',
      },
    );
  } catch (error) {
    return;
  }

  await doSubmit(false);
}

function handleBeforeUnload(event) {
  if (!submitted.value) {
    event.preventDefault();
    event.returnValue = '';
  }
}

function goBack() {
  router.replace({ name: 'my-exams' });
}

onBeforeRouteLeave(async () => {
  if (submitted.value || !paper.value || errorMessage.value) return true;

  try {
    await ElMessageBox.confirm(
      '考试尚未交卷，离开后计时仍会继续，稍后可以回来继续答题。确定离开吗？',
      '离开考试',
      {
        confirmButtonText: '离开',
        cancelButtonText: '继续答题',
        type: 'warning',
      },
    );
    return true;
  } catch (error) {
    return false;
  }
});

onMounted(async () => {
  try {
    const data = await api.student.start(examId);
    paper.value = data;
    violationCount.value = data.violationCount || 0;

    for (const question of data.questions) {
      if (question.savedAnswer !== null && question.savedAnswer !== undefined) {
        answers[question.sessionQuestionId] = question.savedAnswer;
      } else if (question.type === 'multiple') {
        answers[question.sessionQuestionId] = [];
      } else if (question.type === 'fill') {
        answers[question.sessionQuestionId] = Array.from(
          { length: question.blankCount || 1 },
          () => '',
        );
      } else {
        answers[question.sessionQuestionId] = '';
      }
    }

    serverOffset = data.serverTime - Date.now();
    startTimer();

    window.addEventListener('blur', onWindowBlur);
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', onVisibilityChange);
    document.addEventListener('copy', onCopy);
    document.addEventListener('paste', onPaste);
    document.addEventListener('fullscreenchange', onFullscreenChange);
  } catch (error) {
    errorMessage.value = error.message || '无法开始考试';
  } finally {
    loading.value = false;
  }
});

onUnmounted(() => {
  stopTimer();
  clearTimeout(saveTimer);
  window.removeEventListener('blur', onWindowBlur);
  window.removeEventListener('beforeunload', handleBeforeUnload);
  document.removeEventListener('visibilitychange', onVisibilityChange);
  document.removeEventListener('copy', onCopy);
  document.removeEventListener('paste', onPaste);
  document.removeEventListener('fullscreenchange', onFullscreenChange);
});
</script>

<style scoped>
.exam-page {
  min-height: 100vh;
  background: var(--page-bg);
  display: flex;
  flex-direction: column;
}

.exam-header {
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

.exam-brand {
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

.exam-title-wrap {
  min-width: 0;
}

.exam-title {
  font-size: 15px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.exam-sub {
  font-size: 11px;
  opacity: 0.6;
}

.header-status {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.timer {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 20px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  background: rgba(255, 255, 255, 0.12);
  padding: 5px 14px;
  border-radius: 9px;
}

.timer.warning {
  background: rgba(220, 38, 38, 0.25);
  color: #fecaca;
  animation: pulse 1.4s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.72; }
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
  padding: 40px 20px;
}

.exam-body {
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
  align-items: center;
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
  transition: all 0.15s ease;
}

.sheet-item:hover {
  border-color: var(--brand-border-strong);
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

.sheet-legend {
  display: flex;
  gap: 14px;
  margin-top: 13px;
  font-size: 11px;
  color: var(--text-sub);
}

.sheet-legend span {
  display: flex;
  align-items: center;
  gap: 5px;
}

.dot {
  width: 9px;
  height: 9px;
  border-radius: 3px;
  background: #f8fafc;
  border: 1px solid #dde5ee;
  display: inline-block;
}

.dot.answered {
  background: var(--sheet-answered-bg);
  border-color: var(--sheet-answered-border);
}

.violation {
  margin-top: 14px;
  padding: 8px 10px;
  border-radius: 8px;
  background: #fef2f2;
  color: #b91c1c;
  font-size: 11px;
  line-height: 1.5;
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
  min-height: 380px;
}

.question-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.score {
  font-size: 12px;
  color: var(--warning);
  font-weight: 600;
}

.position {
  margin-left: auto;
  font-size: 12px;
  color: var(--text-sub);
}

.stem {
  font-size: 17px;
  line-height: 1.75;
  margin: 0 0 22px;
  white-space: pre-wrap;
  word-break: break-word;
}

.options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.option {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid #e1e8f0;
  background: #fbfcfe;
  border-radius: 10px;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-main);
}

.option:hover {
  border-color: var(--brand-border-strong);
  background: var(--brand-soft);
}

.option.selected {
  border-color: var(--brand);
  background: var(--brand-soft);
  box-shadow: 0 0 0 2px var(--brand-ring);
}

.option-letter {
  width: 26px;
  height: 26px;
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

.option-content {
  white-space: pre-wrap;
  word-break: break-word;
}

.option-hint {
  font-size: 12px;
  color: var(--text-sub);
  margin-top: 2px;
}

.fill-area {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.fill-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.fill-label {
  width: 62px;
  flex-shrink: 0;
  font-size: 13px;
  color: var(--text-sub);
}

.short-area {
  position: relative;
}

.char-count {
  text-align: right;
  font-size: 11px;
  color: var(--text-sub);
  margin-top: 6px;
}

.question-nav {
  display: flex;
  align-items: center;
  gap: 16px;
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

.progress {
  width: 100%;
}

@media (max-width: 900px) {
  .exam-header {
    height: auto;
    min-height: 60px;
    flex-wrap: wrap;
    padding: 10px 14px;
    gap: 8px;
  }

  .header-status {
    order: 3;
    flex-basis: 100%;
    justify-content: space-between;
  }

  .timer {
    font-size: 17px;
  }

  .exam-body {
    flex-direction: column;
    padding: 12px;
    gap: 12px;
  }

  .sheet {
    width: 100%;
    position: static;
    padding: 12px;
  }

  .sheet-grid {
    grid-template-columns: repeat(auto-fill, minmax(36px, 1fr));
  }

  .question-card {
    padding: 18px;
    min-height: 320px;
  }

  .stem {
    font-size: 16px;
  }

  .question-nav {
    padding: 10px 12px;
    gap: 10px;
  }

  .nav-center {
    display: none;
  }
}
</style>
