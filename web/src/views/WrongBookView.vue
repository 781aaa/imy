<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h2 class="page-title">错题本</h2>
        <div class="page-subtitle">
          练习中答错的题会自动收集，标记掌握后会移除
        </div>
      </div>
      <div class="header-actions">
        <el-input
          v-model="keyword"
          placeholder="搜索题干"
          clearable
          style="width: 220px"
        />
        <el-button :loading="loading" @click="load">刷新</el-button>
      </div>
    </div>

    <div v-if="loading && items.length === 0" class="empty-card">
      <el-icon class="is-loading" size="26"><Loading /></el-icon>
      <span>正在加载错题…</span>
    </div>

    <div v-else-if="filteredItems.length === 0" class="empty-card">
      <el-icon size="32"><CircleCheck /></el-icon>
      <h3>{{ items.length === 0 ? '还没有错题' : '没有匹配的错题' }}</h3>
      <p>
        {{ items.length === 0
          ? '去练习中心做几道题，答错的会自动出现在这里。'
          : '换个关键词试试。' }}
      </p>
      <el-button
        v-if="items.length === 0"
        type="primary"
        @click="router.push({ name: 'practice' })"
      >
        去练习
      </el-button>
    </div>

    <div v-else class="wrong-list">
      <div
        v-for="item in filteredItems"
        :key="item.questionId"
        class="wrong-card"
      >
        <div class="wrong-head">
          <el-tag size="small" effect="plain">{{ item.typeLabel }}</el-tag>
          <span class="stars">{{ stars(item.difficulty) }}</span>
          <el-tag
            v-for="name in item.knowledgeNames"
            :key="name"
            size="small"
            effect="plain"
            type="info"
          >
            {{ name }}
          </el-tag>
          <span class="wrong-count">错过 {{ item.wrongCount }} 次</span>
          <span class="text-sub time">{{ formatTime(item.answeredAt) }}</span>
        </div>

        <div class="stem">{{ item.stem }}</div>

        <div v-if="optionRows(item).length > 0" class="options">
          <div
            v-for="option in optionRows(item)"
            :key="option.label"
            class="option"
            :class="{
              correct: isCorrectOption(item, option.label),
              chosen: isUserOption(item, option.label),
            }"
          >
            <span class="letter">
              {{ option.label === 'true' ? '对' : (option.label === 'false' ? '错' : option.label) }}
            </span>
            <span class="option-content">{{ option.content }}</span>
            <span v-if="isUserOption(item, option.label)" class="mark chosen-mark">
              你的选择
            </span>
            <span v-if="isCorrectOption(item, option.label)" class="mark correct-mark">
              正确答案
            </span>
          </div>
        </div>

        <div v-else class="answer-block">
          <div class="answer-row">
            <span class="answer-label">你的答案</span>
            <span class="answer-text">{{ formatAnswer(item, item.userAnswer) }}</span>
          </div>
          <div class="answer-row">
            <span class="answer-label">正确答案</span>
            <span class="answer-text correct-answer">
              {{ formatAnswer(item, item.correctAnswer) }}
            </span>
          </div>
        </div>

        <div v-if="item.analysis" class="analysis">
          <span class="analysis-label">解析</span>
          <span>{{ item.analysis }}</span>
        </div>

        <div class="wrong-actions">
          <el-button link type="primary" @click="markMastered(item)">
            标记已掌握
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  CircleCheck,
  Loading,
} from '@element-plus/icons-vue';
import api from '../api';

const router = useRouter();

const loading = ref(false);
const items = ref([]);
const keyword = ref('');

const filteredItems = computed(() => {
  const text = keyword.value.trim().toLowerCase();
  if (!text) return items.value;
  return items.value.filter(
    (item) => String(item.stem).toLowerCase().includes(text)
      || item.knowledgeNames.some(
        (name) => String(name).toLowerCase().includes(text),
      ),
  );
});

function stars(level) {
  const value = Math.max(1, Math.min(5, Number(level) || 1));
  return '★'.repeat(value) + '☆'.repeat(5 - value);
}

function formatTime(timestamp) {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function toArray(value) {
  if (Array.isArray(value)) return value.map((item) => String(item));
  if (value === null || value === undefined || value === '') return [];
  return [String(value)];
}

function optionRows(item) {
  if (item.type === 'true_false') {
    return [
      { label: 'true', content: '正确' },
      { label: 'false', content: '错误' },
    ];
  }
  return item.options || [];
}

function isCorrectOption(item, label) {
  return toArray(item.correctAnswer)
    .map((value) => value.toUpperCase())
    .includes(String(label).toUpperCase());
}

function isUserOption(item, label) {
  return toArray(item.userAnswer)
    .map((value) => value.toUpperCase())
    .includes(String(label).toUpperCase());
}

function formatAnswer(item, value) {
  if (value === null || value === undefined || value === '') return '未作答';

  if (item.type === 'multiple') return toArray(value).join('、');
  if (item.type === 'true_false') {
    return String(value) === 'true' ? '正确' : '错误';
  }
  if (item.type === 'fill') {
    return toArray(value)
      .map((text, index) => `第 ${index + 1} 空：${text || '空'}`)
      .join('；');
  }
  return String(value);
}

async function load() {
  loading.value = true;
  try {
    const result = await api.practice.wrongQuestions({ limit: 100 });
    items.value = result.items || [];
  } catch (error) {
    items.value = [];
  } finally {
    loading.value = false;
  }
}

async function markMastered(item) {
  try {
    await ElMessageBox.confirm(
      '确认已经掌握这道题？它会从错题本中移除。',
      '标记已掌握',
      {
        confirmButtonText: '移除',
        cancelButtonText: '取消',
        type: 'warning',
      },
    );
  } catch (error) {
    return;
  }

  try {
    await api.practice.removeWrong(item.questionId);
    ElMessage.success('已从错题本移除');
    await load();
  } catch (error) {
    // 错误提示由拦截器处理
  }
}

onMounted(load);
</script>

<style scoped>
.header-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.wrong-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.wrong-card {
  background: #fff;
  border: 1px solid var(--border);
  border-left: 4px solid rgba(109, 40, 217, 0.35);
  border-radius: 12px;
  padding: 16px 18px;
}

.wrong-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
  font-size: 12px;
}

.stars {
  color: #f0a020;
  letter-spacing: 1px;
}

.wrong-count {
  color: var(--danger);
  font-weight: 600;
}

.time {
  margin-left: auto;
  font-size: 11px;
}

.stem {
  font-size: 14px;
  line-height: 1.75;
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
  padding: 9px 11px;
  border: 1px solid #e8edf4;
  border-radius: 8px;
  background: #fbfcfe;
  font-size: 13px;
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
  color: var(--text-sub);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
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
  margin-bottom: 10px;
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

.wrong-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

.empty-card {
  background: #fff;
  border: 1px dashed #d6dfe9;
  border-radius: 14px;
  min-height: 280px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--text-sub);
  text-align: center;
}

.empty-card h3 {
  margin: 4px 0 0;
  color: var(--text-main);
  font-size: 16px;
}

.empty-card p {
  margin: 0 0 8px;
  font-size: 13px;
}
</style>
