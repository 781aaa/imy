<template>
  <div class="page practice-page">
    <div class="page-header">
      <div>
        <h2 class="page-title">练习中心</h2>
        <div class="page-subtitle">选择题库和知识点，边练边看解析</div>
      </div>
      <el-button :loading="loadingLevels" @click="reloadAll">刷新</el-button>
    </div>

    <div class="practice-stats" v-if="stats.totalAnswered > 0">
      <div class="mini-stat">
        <span>今日练习</span>
        <strong>{{ stats.todayAnswered }}</strong>
      </div>
      <div class="mini-stat">
        <span>累计正确率</span>
        <strong>{{ Math.round(stats.accuracy * 100) }}%</strong>
      </div>
      <div class="mini-stat">
        <span>连续练习</span>
        <strong>{{ stats.streakDays }} 天</strong>
      </div>
      <div class="mini-stat wide" v-if="stats.weakTopics.length > 0">
        <span>薄弱知识点</span>
        <strong class="weak-text">{{ stats.weakTopics.map((item) => item.name).join('、') }}</strong>
      </div>
    </div>

    <!-- 设置 -->
    <template v-if="view === 'setup'">
      <div class="level-grid">
        <button
          v-for="level in levels"
          :key="level.id"
          type="button"
          class="level-card"
          :class="{ active: form.level === level.name }"
          @click="selectLevel(level)"
        >
          <div class="level-top">
            <span class="level-name">{{ level.name }}</span>
            <el-tag size="small" effect="plain">{{ level.questionCount }} 题可练</el-tag>
          </div>
          <div class="level-desc">{{ level.description }}</div>
          <div class="level-topics">
            <span
              v-for="topic in level.topics"
              :key="topic.id"
              class="topic-chip"
              :class="{ empty: topic.questionCount === 0 }"
            >
              {{ topic.name }} {{ topic.questionCount }}
            </span>
          </div>
        </button>
      </div>

      <div class="card setup-card">
        <div class="setup-grid">
          <div class="field">
            <label>知识点</label>
            <el-select
              v-model="form.topic"
              clearable
              placeholder="全部知识点"
              style="width: 100%"
            >
              <el-option
                v-for="topic in currentTopics"
                :key="topic.id"
                :label="`${topic.name}（${topic.questionCount}）`"
                :value="topic.name"
                :disabled="topic.questionCount === 0"
              />
            </el-select>
          </div>

          <div class="field">
            <label>题量</label>
            <el-select v-model="form.count" style="width: 100%">
              <el-option :value="5" label="5 题" />
              <el-option :value="10" label="10 题" />
              <el-option :value="20" label="20 题" />
              <el-option :value="30" label="30 题" />
            </el-select>
          </div>

          <div class="field">
            <label>难度范围</label>
            <div class="range-row">
              <el-select v-model="form.difficultyMin" style="width: 90px">
                <el-option v-for="level in 5" :key="level" :value="level" :label="`难度 ${level}`" />
              </el-select>
              <span class="text-sub">至</span>
              <el-select v-model="form.difficultyMax" style="width: 90px">
                <el-option v-for="level in 5" :key="level" :value="level" :label="`难度 ${level}`" />
              </el-select>
            </div>
          </div>

          <div class="field submit-field">
            <el-button
              type="primary"
              size="large"
              :loading="loadingQuestions"
              :disabled="!form.level"
              @click="startPractice"
            >
              开始练习
            </el-button>
          </div>
        </div>

        <div class="setup-hint">
          练习模式只包含单选、多选、判断、填空题，提交后立即显示答案和解析。
          翻译与写作请在考试模式中练习。
        </div>
      </div>
    </template>

    <!-- 答题 -->
    <template v-else-if="view === 'practice' && current">
      <div class="practice-bar">
        <div class="bar-left">
          <span class="progress-text">第 {{ currentIndex + 1 }} / {{ questions.length }} 题</span>
          <span class="text-sub">{{ form.level }}{{ form.topic ? ` · ${form.topic}` : '' }}</span>
        </div>
        <el-progress
          :percentage="progressPercent"
          :show-text="false"
          :stroke-width="7"
          class="bar-progress"
        />
        <div class="bar-right">
          <span class="correct-count">答对 {{ correctCount }}</span>
          <el-button link @click="quitPractice">结束练习</el-button>
        </div>
      </div>

      <div class="practice-card">
        <div class="question-meta">
          <el-tag effect="plain">{{ current.typeLabel }}</el-tag>
          <span class="stars">{{ stars(current.difficulty) }}</span>
          <span class="text-sub" v-if="current.knowledgeNames.length">
            {{ current.knowledgeNames.join(' / ') }}
          </span>
          <span class="position">第 {{ currentIndex + 1 }} 题</span>
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
            :class="optionClass(current, option.label)"
            :disabled="isSubmitted(current)"
            @click="chooseOption(current, option.label)"
          >
            <span class="option-letter">{{ option.label }}</span>
            <span class="option-content">{{ option.content }}</span>
            <span
              v-if="isSubmitted(current) && isCorrectOption(current, option.label)"
              class="option-mark"
            >
              正确答案
            </span>
          </button>
          <div v-if="current.type === 'multiple'" class="option-hint">
            多选题，可选择多个选项
          </div>
        </div>

        <div v-else-if="current.type === 'true_false'" class="options">
          <button
            type="button"
            class="option"
            :class="booleanClass(current, 'true')"
            :disabled="isSubmitted(current)"
            @click="setAnswer(current, 'true')"
          >
            <span class="option-letter">对</span>
            <span class="option-content">正确</span>
          </button>
          <button
            type="button"
            class="option"
            :class="booleanClass(current, 'false')"
            :disabled="isSubmitted(current)"
            @click="setAnswer(current, 'false')"
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
              :disabled="isSubmitted(current)"
              placeholder="请输入答案"
              @update:model-value="setFill(current, i - 1, $event)"
            />
          </div>
        </div>

        <div v-if="isSubmitted(current)" class="feedback" :class="feedbackClass(current)">
          <div class="feedback-head">
            <el-icon>
              <CircleCheck v-if="feedback[current.questionId].isCorrect" />
              <CircleClose v-else />
            </el-icon>
            <strong>
              {{ feedback[current.questionId].isCorrect ? '回答正确' : '回答错误' }}
            </strong>
            <span class="text-sub">
              正确答案：{{ formatAnswer(current, feedback[current.questionId].correctAnswer) }}
            </span>
          </div>
          <div v-if="feedback[current.questionId].analysis" class="analysis">
            {{ feedback[current.questionId].analysis }}
          </div>
        </div>

        <div class="question-actions">
          <el-button
            v-if="!isSubmitted(current)"
            type="primary"
            :loading="submitting"
            :disabled="!hasAnswer(current)"
            @click="submitCurrent"
          >
            提交答案
          </el-button>
          <el-button
            v-else
            type="primary"
            @click="nextQuestion"
          >
            {{ currentIndex < questions.length - 1 ? '下一题' : '完成练习' }}
          </el-button>
        </div>
      </div>
    </template>

    <!-- 总结 -->
    <template v-else-if="view === 'summary'">
      <div class="summary-card">
        <div class="summary-ring">
          <div class="summary-value">{{ correctCount }}</div>
          <div class="summary-total">/ {{ answeredCount }}</div>
        </div>
        <h2>本轮练习完成</h2>
        <p>
          共作答 {{ answeredCount }} 题，答对 {{ correctCount }} 题，
          正确率 {{ answeredCount ? Math.round((correctCount / answeredCount) * 100) : 0 }}%。
        </p>

        <div v-if="stats.weakTopics.length > 0" class="summary-weak">
          <div class="weak-title">需要加强</div>
          <div class="weak-list">
            <el-tag
              v-for="topic in stats.weakTopics"
              :key="topic.name"
              type="warning"
              effect="plain"
            >
              {{ topic.name }} {{ Math.round(topic.rate * 100) }}%
            </el-tag>
          </div>
        </div>

        <div class="summary-actions">
          <el-button type="primary" @click="startPractice">再来一组</el-button>
          <el-button @click="view = 'setup'">返回设置</el-button>
          <el-button @click="goWrongBook">查看错题本</el-button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { CircleCheck, CircleClose } from '@element-plus/icons-vue';
import api from '../api';

const router = useRouter();

const view = ref('setup');
const levels = ref([]);
const stats = ref({
  totalAnswered: 0,
  correctCount: 0,
  accuracy: 0,
  todayAnswered: 0,
  streakDays: 0,
  daily: [],
  weakTopics: [],
});

const form = reactive({
  level: '',
  topic: '',
  count: 10,
  difficultyMin: 1,
  difficultyMax: 5,
});

const questions = ref([]);
const currentIndex = ref(0);
const answers = reactive({});
const feedback = reactive({});
const submitted = reactive({});
const correctCount = ref(0);

const loadingLevels = ref(false);
const loadingQuestions = ref(false);
const submitting = ref(false);

const current = computed(() => questions.value[currentIndex.value] || null);

const answeredCount = computed(() =>
  Object.keys(submitted).filter((key) => submitted[key]).length,
);

const progressPercent = computed(() => {
  if (questions.value.length === 0) return 0;
  return Math.round(((currentIndex.value + 1) / questions.value.length) * 100);
});

const currentTopics = computed(() => {
  const level = levels.value.find((item) => item.name === form.level);
  return level ? level.topics : [];
});

function stars(level) {
  const value = Math.max(1, Math.min(5, Number(level) || 1));
  return '★'.repeat(value) + '☆'.repeat(5 - value);
}

function selectLevel(level) {
  form.level = level.name;
  form.topic = '';
}

function isSubmitted(question) {
  return Boolean(question && submitted[question.questionId]);
}

function hasAnswer(question) {
  const value = answers[question.questionId];
  if (question.type === 'multiple' || question.type === 'fill') {
    return Array.isArray(value) && value.some((item) => String(item ?? '').trim());
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

function isCorrectOption(question, label) {
  const result = feedback[question.questionId];
  if (!result) return false;
  const correct = Array.isArray(result.correctAnswer)
    ? result.correctAnswer
    : [result.correctAnswer];
  return correct.map((item) => String(item)).includes(String(label));
}

function optionClass(question, label) {
  const classes = {
    selected: isOptionSelected(question, label),
  };
  if (isSubmitted(question)) {
    classes.correct = isCorrectOption(question, label);
    classes.wrong = isOptionSelected(question, label)
      && !isCorrectOption(question, label);
  }
  return classes;
}

function booleanClass(question, value) {
  const classes = {
    selected: answers[question.questionId] === value,
  };
  if (isSubmitted(question)) {
    classes.correct = isCorrectOption(question, value);
    classes.wrong = answers[question.questionId] === value
      && !isCorrectOption(question, value);
  }
  return classes;
}

function chooseOption(question, label) {
  if (isSubmitted(question)) return;

  if (question.type === 'single') {
    answers[question.questionId] = label;
    return;
  }

  const currentValue = Array.isArray(answers[question.questionId])
    ? answers[question.questionId].slice()
    : [];
  const index = currentValue.indexOf(label);
  if (index >= 0) currentValue.splice(index, 1);
  else currentValue.push(label);
  answers[question.questionId] = currentValue.sort();
}

function setAnswer(question, value) {
  if (isSubmitted(question)) return;
  answers[question.questionId] = value;
}

function fillValue(question, index) {
  const value = answers[question.questionId];
  if (!Array.isArray(value)) return '';
  return value[index] || '';
}

function setFill(question, index, value) {
  if (isSubmitted(question)) return;
  const currentValue = Array.isArray(answers[question.questionId])
    ? answers[question.questionId].slice()
    : Array.from({ length: question.blankCount }, () => '');
  currentValue[index] = value;
  answers[question.questionId] = currentValue;
}

function buildAnswer(question) {
  const value = answers[question.questionId];
  if (question.type === 'multiple' || question.type === 'fill') {
    return Array.isArray(value) ? value : [];
  }
  return value;
}

function formatAnswer(question, value) {
  if (value === null || value === undefined || value === '') return '—';

  if (question.type === 'multiple') {
    return (Array.isArray(value) ? value : [value]).join('、');
  }
  if (question.type === 'true_false') {
    return String(value) === 'true' ? '正确' : '错误';
  }
  if (question.type === 'fill') {
    return (Array.isArray(value) ? value : [value]).join(' / ');
  }
  return String(value);
}

function feedbackClass(question) {
  return feedback[question.questionId] && feedback[question.questionId].isCorrect
    ? 'correct'
    : 'wrong';
}

async function loadLevels() {
  loadingLevels.value = true;
  try {
    const result = await api.practice.levels();
    levels.value = result.items || [];

    if (!form.level && levels.value.length > 0) {
      form.level = levels.value[0].name;
    }
  } catch (error) {
    levels.value = [];
  } finally {
    loadingLevels.value = false;
  }
}

async function loadStats() {
  try {
    stats.value = await api.practice.stats();
  } catch (error) {
    // 统计失败不影响练习
  }
}

async function reloadAll() {
  await Promise.all([loadLevels(), loadStats()]);
}

async function startPractice() {
  if (!form.level) {
    ElMessage.warning('请先选择题库');
    return;
  }

  loadingQuestions.value = true;
  try {
    const result = await api.practice.questions({
      level: form.level,
      topic: form.topic || undefined,
      count: form.count,
      difficultyMin: form.difficultyMin,
      difficultyMax: form.difficultyMax,
    });

    if (!result.items || result.items.length === 0) {
      ElMessage.warning(result.message || '没有符合条件的题目');
      return;
    }

    questions.value = result.items;
    currentIndex.value = 0;
    correctCount.value = 0;

    for (const key of Object.keys(answers)) delete answers[key];
    for (const key of Object.keys(feedback)) delete feedback[key];
    for (const key of Object.keys(submitted)) delete submitted[key];

    for (const question of result.items) {
      if (question.type === 'multiple') answers[question.questionId] = [];
      else if (question.type === 'fill') {
        answers[question.questionId] = Array.from(
          { length: question.blankCount || 1 },
          () => '',
        );
      } else answers[question.questionId] = '';
    }

    view.value = 'practice';
  } catch (error) {
    // 错误提示由拦截器处理
  } finally {
    loadingQuestions.value = false;
  }
}

async function submitCurrent() {
  const question = current.value;
  if (!question || submitting.value) return;

  submitting.value = true;
  try {
    const result = await api.practice.submit({
      questionId: question.questionId,
      answer: buildAnswer(question),
    });

    feedback[question.questionId] = result;
    submitted[question.questionId] = true;
    if (result.isCorrect) correctCount.value += 1;
  } catch (error) {
    // 错误提示由拦截器处理
  } finally {
    submitting.value = false;
  }
}

function nextQuestion() {
  if (currentIndex.value < questions.value.length - 1) {
    currentIndex.value += 1;
    return;
  }

  view.value = 'summary';
  loadStats();
}

async function quitPractice() {
  try {
    await ElMessageBox.confirm(
      '确定结束本轮练习吗？已作答的记录会保留。',
      '结束练习',
      {
        confirmButtonText: '结束',
        cancelButtonText: '继续练习',
        type: 'warning',
      },
    );
  } catch (error) {
    return;
  }

  view.value = 'summary';
  loadStats();
}

function goWrongBook() {
  router.push({ name: 'wrong-book' });
}

onMounted(reloadAll);
</script>

<style scoped>
.practice-stats {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.mini-stat {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 9px 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-sub);
}

.mini-stat strong {
  color: var(--brand);
  font-size: 15px;
}

.mini-stat.wide strong {
  font-size: 12px;
  font-weight: 600;
}

.weak-text {
  color: var(--warning) !important;
}

.level-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 13px;
  margin-bottom: 16px;
}

.level-card {
  text-align: left;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 13px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.16s ease;
}

.level-card:hover {
  border-color: var(--brand-border-strong);
}

.level-card.active {
  border-color: var(--brand);
  background: var(--brand-soft);
  box-shadow: 0 0 0 2px var(--brand-ring);
}

.level-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 7px;
}

.level-name {
  font-size: 15px;
  font-weight: 600;
}

.level-desc {
  font-size: 11px;
  color: var(--text-sub);
  line-height: 1.5;
  min-height: 33px;
  margin-bottom: 9px;
}

.level-topics {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.topic-chip {
  font-size: 11px;
  background: #f5f7fa;
  color: var(--text-sub);
  border-radius: 999px;
  padding: 3px 8px;
}

.topic-chip.empty {
  opacity: 0.45;
}

.setup-card {
  padding: 18px;
}

.setup-grid {
  display: grid;
  grid-template-columns: 1.4fr 0.8fr 1.2fr 0.8fr;
  gap: 14px;
  align-items: end;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field label {
  font-size: 12px;
  color: var(--text-sub);
}

.range-row {
  display: flex;
  align-items: center;
  gap: 7px;
}

.submit-field {
  justify-content: flex-end;
}

.setup-hint {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px dashed var(--border);
  font-size: 12px;
  color: var(--text-sub);
  line-height: 1.6;
}

.practice-bar {
  display: flex;
  align-items: center;
  gap: 14px;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 11px 16px;
  margin-bottom: 14px;
}

.bar-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
  white-space: nowrap;
}

.progress-text {
  font-weight: 600;
  font-size: 13px;
}

.bar-progress {
  flex: 1;
}

.bar-right {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  white-space: nowrap;
}

.correct-count {
  color: var(--success);
  font-weight: 600;
}

.practice-card {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 24px;
}

.question-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
  flex-wrap: wrap;
  font-size: 12px;
}

.stars {
  color: #f0a020;
  letter-spacing: 1px;
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
  transition: all 0.15s ease;
}

.option:hover:not(:disabled) {
  border-color: var(--brand-border-strong);
  background: var(--brand-soft);
}

.option.selected {
  border-color: var(--brand);
  background: var(--brand-soft);
  box-shadow: 0 0 0 2px var(--brand-ring);
}

.option.correct {
  border-color: #86efac;
  background: #f0fdf4;
}

.option.wrong {
  border-color: #fca5a5;
  background: #fef2f2;
}

.option:disabled {
  cursor: default;
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

.option.correct .option-letter {
  background: #16a34a;
  color: #fff;
}

.option.wrong .option-letter {
  background: #dc2626;
  color: #fff;
}

.option-content {
  white-space: pre-wrap;
  word-break: break-word;
}

.option-mark {
  margin-left: auto;
  font-size: 10px;
  color: #15803d;
  background: #dcfce7;
  border-radius: 999px;
  padding: 2px 7px;
  flex-shrink: 0;
}

.option-hint {
  font-size: 12px;
  color: var(--text-sub);
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

.feedback {
  margin-top: 18px;
  border-radius: 10px;
  padding: 12px 14px;
}

.feedback.correct {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
}

.feedback.wrong {
  background: #fef2f2;
  border: 1px solid #fecaca;
}

.feedback-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 13px;
}

.feedback.correct .feedback-head {
  color: #15803d;
}

.feedback.wrong .feedback-head {
  color: #b91c1c;
}

.analysis {
  margin-top: 8px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-main);
  white-space: pre-wrap;
}

.question-actions {
  margin-top: 18px;
  display: flex;
  justify-content: flex-end;
}

.summary-card {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 34px 28px;
  text-align: center;
  max-width: 620px;
  margin: 0 auto;
}

.summary-ring {
  width: 130px;
  height: 130px;
  border-radius: 50%;
  border: 5px solid var(--brand);
  margin: 0 auto 16px;
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 3px;
  padding-top: 34px;
  box-sizing: border-box;
}

.summary-value {
  font-size: 40px;
  font-weight: 800;
  color: var(--brand);
  line-height: 1;
}

.summary-total {
  font-size: 13px;
  color: var(--text-sub);
}

.summary-card h2 {
  margin: 0 0 8px;
  font-size: 20px;
}

.summary-card p {
  margin: 0;
  color: var(--text-sub);
  font-size: 13px;
  line-height: 1.7;
}

.summary-weak {
  margin-top: 18px;
}

.weak-title {
  font-size: 12px;
  color: var(--text-sub);
  margin-bottom: 8px;
}

.weak-list {
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
}

.summary-actions {
  margin-top: 22px;
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
}

@media (max-width: 900px) {
  .level-grid {
    grid-template-columns: 1fr;
  }

  .setup-grid {
    grid-template-columns: 1fr 1fr;
  }

  .submit-field {
    grid-column: 1 / -1;
  }
}

@media (max-width: 560px) {
  .practice-card {
    padding: 16px;
  }

  .practice-bar {
    flex-wrap: wrap;
  }

  .bar-progress {
    order: 3;
    flex-basis: 100%;
  }

  .stem {
    font-size: 16px;
  }

  .setup-grid {
    grid-template-columns: 1fr;
  }
}
</style>
