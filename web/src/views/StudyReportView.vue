<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h2 class="page-title">学习报告</h2>
        <div class="page-subtitle">练习、模拟考试与正式考试的学习数据</div>
      </div>
      <el-button :loading="loading" @click="loadAll">刷新</el-button>
    </div>

    <div class="stat-grid">
      <div class="stat-card" v-for="card in cards" :key="card.label">
        <div class="stat-label">{{ card.label }}</div>
        <div class="stat-value">{{ card.value }}</div>
        <div class="stat-hint">{{ card.hint }}</div>
      </div>
    </div>

    <div class="chart-grid">
      <div class="card">
        <div class="section-title">最近 7 天练习</div>
        <div ref="practiceChartRef" class="chart"></div>
      </div>
      <div class="card">
        <div class="section-title">模拟考试得分率</div>
        <div ref="mockChartRef" class="chart"></div>
      </div>
    </div>

    <div class="card weak-card">
      <div class="section-title">薄弱知识点</div>
      <div v-if="practiceStats.weakTopics.length === 0" class="text-sub">
        多练几道题后，这里会显示需要加强的知识点。
      </div>
      <div v-else class="weak-list">
        <div
          v-for="item in practiceStats.weakTopics"
          :key="item.name"
          class="weak-item"
        >
          <span class="weak-name">{{ item.name }}</span>
          <el-progress
            :percentage="Math.round(item.rate * 100)"
            :stroke-width="8"
            :color="progressColor(item.rate)"
            class="weak-progress"
          />
          <span class="text-sub">{{ item.correct }} / {{ item.total }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
} from 'vue';
import * as echarts from 'echarts';
import api from '../api';

const loading = ref(false);
const practiceStats = ref({
  totalAnswered: 0,
  correctCount: 0,
  accuracy: 0,
  todayAnswered: 0,
  streakDays: 0,
  daily: [],
  weakTopics: [],
});
const mocks = ref([]);
const exams = ref([]);

const practiceChartRef = ref(null);
const mockChartRef = ref(null);
let practiceChart = null;
let mockChart = null;

const cards = computed(() => {
  const submittedMocks = mocks.value.filter(
    (item) => item.status === 'submitted',
  );
  const bestMock = submittedMocks.reduce((best, item) => {
    const rate = item.totalScore > 0 ? item.score / item.totalScore : 0;
    return rate > best ? rate : best;
  }, 0);
  const publishedExams = exams.value.filter(
    (item) => item.status === 'published' && item.mySession,
  );

  return [
    {
      label: '累计练习',
      value: practiceStats.value.totalAnswered,
      hint: `答对 ${practiceStats.value.correctCount} 题`,
    },
    {
      label: '练习正确率',
      value: `${Math.round(practiceStats.value.accuracy * 100)}%`,
      hint: '全部练习记录',
    },
    {
      label: '连续练习',
      value: `${practiceStats.value.streakDays} 天`,
      hint: `今日 ${practiceStats.value.todayAnswered} 题`,
    },
    {
      label: '模拟考试',
      value: submittedMocks.length,
      hint: `最高得分率 ${Math.round(bestMock * 100)}%`,
    },
    {
      label: '正式考试',
      value: publishedExams.length,
      hint: '已发布成绩',
    },
    {
      label: '薄弱环节',
      value: practiceStats.value.weakTopics.length,
      hint: '个知识点待加强',
    },
  ];
});

function progressColor(rate) {
  if (rate >= 0.8) return '#16a34a';
  if (rate >= 0.6) return '#d97706';
  return '#dc2626';
}

async function loadAll() {
  loading.value = true;
  try {
    const [stats, mockResult, examResult] = await Promise.all([
      api.practice.stats(),
      api.mock.list(),
      api.student.listExams(),
    ]);

    practiceStats.value = stats;
    mocks.value = mockResult.items || [];
    exams.value = examResult.items || [];

    await nextTick();
    renderCharts();
  } catch (error) {
    // 错误提示由拦截器处理
  } finally {
    loading.value = false;
  }
}

function renderPracticeChart() {
  if (!practiceChartRef.value) return;
  if (!practiceChart) {
    practiceChart = echarts.getInstanceByDom(practiceChartRef.value)
      || echarts.init(practiceChartRef.value);
  }

  const daily = practiceStats.value.daily || [];

  practiceChart.setOption({
    grid: { left: 40, right: 20, top: 20, bottom: 36 },
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: daily.map((item) => item.date.slice(5)),
      axisLabel: { fontSize: 11 },
    },
    yAxis: { type: 'value', minInterval: 1 },
    series: [
      {
        type: 'bar',
        data: daily.map((item) => item.count),
        barMaxWidth: 26,
        itemStyle: { color: '#8b5cf6', borderRadius: [4, 4, 0, 0] },
      },
    ],
  });
}

function renderMockChart() {
  if (!mockChartRef.value) return;
  if (!mockChart) {
    mockChart = echarts.getInstanceByDom(mockChartRef.value)
      || echarts.init(mockChartRef.value);
  }

  const items = mocks.value
    .filter((item) => item.status === 'submitted')
    .slice(0, 10)
    .reverse();

  mockChart.setOption({
    grid: { left: 40, right: 20, top: 20, bottom: 36 },
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const item = items[params[0].dataIndex];
        return `${item.title}<br/>${item.score} / ${item.totalScore}`;
      },
    },
    xAxis: {
      type: 'category',
      data: items.map((_, index) => `第${index + 1}次`),
      axisLabel: { fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      max: 100,
      axisLabel: { formatter: '{value}%' },
    },
    series: [
      {
        type: 'line',
        smooth: true,
        data: items.map((item) =>
          Math.round((item.score / (item.totalScore || 1)) * 100)),
        itemStyle: { color: '#6d28d9' },
        areaStyle: { color: 'rgba(139,92,246,0.14)' },
      },
    ],
  });
}

function renderCharts() {
  renderPracticeChart();
  renderMockChart();
}

function handleResize() {
  practiceChart?.resize();
  mockChart?.resize();
}

onMounted(async () => {
  window.addEventListener('resize', handleResize);
  await loadAll();
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  practiceChart?.dispose();
  mockChart?.dispose();
});
</script>

<style scoped>
.stat-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.stat-card {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 14px 16px;
}

.stat-label {
  font-size: 11px;
  color: var(--text-sub);
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--brand);
  margin: 5px 0 2px;
}

.stat-hint {
  font-size: 11px;
  color: #9aa5b1;
}

.chart-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-bottom: 16px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 10px;
}

.chart {
  width: 100%;
  height: 260px;
}

.weak-card {
  margin-bottom: 20px;
}

.weak-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.weak-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.weak-name {
  width: 120px;
  font-size: 13px;
  flex-shrink: 0;
}

.weak-progress {
  flex: 1;
}

@media (max-width: 1100px) {
  .stat-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 800px) {
  .chart-grid {
    grid-template-columns: 1fr;
  }

  .stat-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
