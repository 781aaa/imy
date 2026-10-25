<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h2 class="page-title">统计分析</h2>
        <div class="page-subtitle">成绩概览、题目正确率与知识点掌握度</div>
      </div>
      <div class="header-actions">
        <el-select
          v-model="selectedExamId"
          placeholder="选择考试"
          style="width: 260px"
          @change="loadStats"
        >
          <el-option
            v-for="exam in exams"
            :key="exam.id"
            :label="exam.title"
            :value="exam.id"
          />
        </el-select>
        <el-button :disabled="!selectedExamId" @click="exportCsv">
          导出成绩 CSV
        </el-button>
        <el-button :loading="loading" @click="loadExams">刷新</el-button>
      </div>
    </div>

    <div v-if="!selectedExamId" class="empty-card">
      <el-icon size="32"><DataAnalysis /></el-icon>
      <h3>还没有可统计的考试</h3>
      <p>创建考试并有人交卷后，这里会显示统计数据。</p>
    </div>

    <template v-else>
      <div class="exam-strip">
        <div class="exam-name">{{ overview.exam.title || '—' }}</div>
        <el-tag :type="statusType(overview.exam.status)" size="small" effect="plain">
          {{ statusLabel(overview.exam.status) }}
        </el-tag>
        <span class="text-sub">{{ overview.exam.paperTitle }}</span>
        <div class="spacer" />
        <el-button
          v-if="['scheduled', 'ongoing'].includes(overview.exam.status)"
          type="warning"
          plain
          size="small"
          @click="endExam"
        >
          结束考试
        </el-button>
        <el-button
          v-if="overview.exam.status === 'finished'"
          type="success"
          plain
          size="small"
          @click="publishResults"
        >
          发布成绩
        </el-button>
      </div>

      <div class="stat-grid">
        <div class="stat-card" v-for="card in cards" :key="card.label">
          <div class="stat-label">{{ card.label }}</div>
          <div class="stat-value">{{ card.value }}</div>
          <div class="stat-hint">{{ card.hint }}</div>
        </div>
      </div>

      <div class="card tabs-card">
        <el-tabs v-model="activeTab" @tab-change="onTabChange">
          <el-tab-pane label="成绩单" name="sheet">
            <el-table
              :data="sheet.items"
              stripe
              :header-cell-style="{ background: '#f7fafc' }"
              empty-text="暂无交卷记录"
            >
              <el-table-column prop="username" label="学号" min-width="110" />
              <el-table-column prop="studentName" label="姓名" min-width="100" />
              <el-table-column label="状态" width="100">
                <template #default="{ row }">
                  <el-tag :type="sessionStatusType(row.status)" size="small" effect="plain">
                    {{ sessionStatusLabel(row.status) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="objectiveScore" label="客观" width="80" />
              <el-table-column prop="subjectiveScore" label="主观" width="80" />
              <el-table-column label="总分" width="90">
                <template #default="{ row }">
                  <strong>{{ row.totalScore }}</strong>
                </template>
              </el-table-column>
              <el-table-column label="是否及格" width="100">
                <template #default="{ row }">
                  <el-tag
                    v-if="row.passed !== null"
                    :type="row.passed ? 'success' : 'danger'"
                    size="small"
                    effect="plain"
                  >
                    {{ row.passed ? '及格' : '不及格' }}
                  </el-tag>
                  <span v-else class="text-sub">未出分</span>
                </template>
              </el-table-column>
              <el-table-column label="交卷时间" min-width="150">
                <template #default="{ row }">
                  <span class="text-sub">{{ formatTime(row.submittedAt) }}</span>
                </template>
              </el-table-column>
              <el-table-column label="异常" width="70">
                <template #default="{ row }">
                  <span :class="{ 'danger-text': row.violationCount > 0 }">
                    {{ row.violationCount }}
                  </span>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>

          <el-tab-pane label="排名" name="ranking">
            <el-table
              :data="ranking.items"
              stripe
              :header-cell-style="{ background: '#f7fafc' }"
              empty-text="还没有已出分的成绩"
            >
              <el-table-column prop="rank" label="排名" width="80" />
              <el-table-column prop="studentName" label="姓名" min-width="120" />
              <el-table-column prop="username" label="学号" min-width="120" />
              <el-table-column prop="totalScore" label="总分" width="90" />
              <el-table-column prop="objectiveScore" label="客观" width="90" />
              <el-table-column prop="subjectiveScore" label="主观" width="90" />
              <el-table-column label="交卷时间" min-width="150">
                <template #default="{ row }">
                  <span class="text-sub">{{ formatTime(row.submittedAt) }}</span>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>

          <el-tab-pane label="题目分析" name="questions">
            <div v-if="questionChartData.length === 0" class="chart-empty">
              暂无客观题作答数据
            </div>
            <div v-show="questionChartData.length > 0" ref="questionChartRef" class="chart"></div>

            <el-table
              :data="questionAnalysis.items"
              stripe
              :header-cell-style="{ background: '#f7fafc' }"
              class="analysis-table"
              empty-text="暂无数据"
            >
              <el-table-column label="题号" width="70">
                <template #default="{ $index }">Q{{ $index + 1 }}</template>
              </el-table-column>
              <el-table-column prop="typeLabel" label="题型" width="100" />
              <el-table-column prop="stem" label="题干" min-width="260" show-overflow-tooltip />
              <el-table-column label="正确率" width="100">
                <template #default="{ row }">
                  <span v-if="row.correctRate === null" class="text-sub">—</span>
                  <span v-else>{{ Math.round(row.correctRate * 100) }}%</span>
                </template>
              </el-table-column>
              <el-table-column label="平均分" width="100">
                <template #default="{ row }">
                  <span v-if="row.averageScore === null" class="text-sub">—</span>
                  <span v-else>{{ row.averageScore }} / {{ row.maxScore }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="attempts" label="作答次数" width="100" />
            </el-table>
          </el-tab-pane>

          <el-tab-pane label="知识点掌握" name="knowledge">
            <div v-if="knowledgeChartData.length === 0" class="chart-empty">
              暂无知识点数据
            </div>
            <div v-show="knowledgeChartData.length > 0" ref="knowledgeChartRef" class="chart"></div>

            <el-table
              :data="knowledgeMastery.items"
              stripe
              :header-cell-style="{ background: '#f7fafc' }"
              class="analysis-table"
              empty-text="暂无数据"
            >
              <el-table-column prop="name" label="知识点" min-width="180" />
              <el-table-column label="正确 / 总数" width="140">
                <template #default="{ row }">
                  {{ row.correct }} / {{ row.total }}
                </template>
              </el-table-column>
              <el-table-column label="掌握度" min-width="220">
                <template #default="{ row }">
                  <el-progress
                    :percentage="Math.round(row.rate * 100)"
                    :stroke-width="10"
                    :color="progressColor(row.rate)"
                  />
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
        </el-tabs>
      </div>
    </template>
  </div>
</template>

<script setup>
import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  watch,
} from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { DataAnalysis } from '@element-plus/icons-vue';
import * as echarts from 'echarts';
import api from '../api';
import { downloadFile } from '../api/client';

const loading = ref(false);
const exams = ref([]);
const selectedExamId = ref(null);
const activeTab = ref('sheet');

const overview = ref({ exam: {} });
const sheet = ref({ items: [] });
const ranking = ref({ items: [] });
const questionAnalysis = ref({ items: [] });
const knowledgeMastery = ref({ items: [] });

const questionChartRef = ref(null);
const knowledgeChartRef = ref(null);
let questionChart = null;
let knowledgeChart = null;

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

const cards = computed(() => {
  const data = overview.value;
  return [
    { label: '应交人数', value: data.assignedStudents ?? 0, hint: '指派班级学生' },
    { label: '已开始', value: data.startedSessions ?? 0, hint: '进入过考试' },
    { label: '已交卷', value: data.submittedCount ?? 0, hint: '含待阅卷' },
    { label: '已出分', value: data.gradedCount ?? 0, hint: '完成阅卷' },
    { label: '平均分', value: data.averageScore ?? 0, hint: `及格线 ${data.exam?.passScore ?? '—'}` },
    { label: '及格率', value: `${Math.round((data.passRate ?? 0) * 100)}%`, hint: `${data.passCount ?? 0} 人及格` },
    { label: '最高分', value: data.maxScore ?? 0, hint: '已出分成绩' },
    { label: '异常操作', value: data.violations ?? 0, hint: '切屏等事件总数' },
  ];
});

const questionChartData = computed(() =>
  questionAnalysis.value.items.filter((item) => item.correctRate !== null),
);

const knowledgeChartData = computed(() => knowledgeMastery.value.items);

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

function progressColor(rate) {
  if (rate >= 0.8) return '#16a34a';
  if (rate >= 0.6) return '#d97706';
  return '#dc2626';
}

async function loadExams() {
  loading.value = true;
  try {
    const result = await api.grading.listExams();
    exams.value = result.items || [];

    if (exams.value.length === 0) {
      selectedExamId.value = null;
      return;
    }

    const stillExists = exams.value.some(
      (exam) => exam.id === selectedExamId.value,
    );
    if (!stillExists) {
      selectedExamId.value = exams.value[0].id;
    }

    await loadStats();
  } catch (error) {
    exams.value = [];
  } finally {
    loading.value = false;
  }
}

async function loadStats() {
  if (!selectedExamId.value) return;

  loading.value = true;
  try {
    const id = selectedExamId.value;
    const [overviewData, sheetData, rankingData, questionData, knowledgeData] =
      await Promise.all([
        api.stats.overview(id),
        api.stats.scoreSheet(id),
        api.stats.ranking(id),
        api.stats.questionAnalysis(id),
        api.stats.knowledgeMastery(id),
      ]);

    overview.value = overviewData;
    sheet.value = sheetData;
    ranking.value = rankingData;
    questionAnalysis.value = questionData;
    knowledgeMastery.value = knowledgeData;

    await nextTick();
    renderCharts();
  } catch (error) {
    // 错误提示由拦截器处理
  } finally {
    loading.value = false;
  }
}

function renderQuestionChart() {
  if (!questionChartRef.value || questionChartData.value.length === 0) return;

  if (!questionChart) {
    questionChart = echarts.getInstanceByDom(questionChartRef.value)
      || echarts.init(questionChartRef.value);
  }

  const items = questionChartData.value;

  questionChart.setOption({
    grid: { left: 48, right: 24, top: 30, bottom: 64 },
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const item = items[params[0].dataIndex];
        const stem = item.stem.length > 40 ? `${item.stem.slice(0, 40)}…` : item.stem;
        return `${stem}<br/>正确率：${params[0].value}%`;
      },
    },
    xAxis: {
      type: 'category',
      data: items.map((item, index) => `Q${index + 1}`),
      axisLabel: { rotate: 40, fontSize: 10 },
    },
    yAxis: {
      type: 'value',
      max: 100,
      axisLabel: { formatter: '{value}%' },
    },
    series: [
      {
        type: 'bar',
        data: items.map((item) => Math.round(item.correctRate * 100)),
        barMaxWidth: 26,
        itemStyle: {
          color: '#2f6fa8',
          borderRadius: [4, 4, 0, 0],
        },
      },
    ],
  });
}

function renderKnowledgeChart() {
  if (!knowledgeChartRef.value || knowledgeChartData.value.length === 0) return;

  if (!knowledgeChart) {
    knowledgeChart = echarts.getInstanceByDom(knowledgeChartRef.value)
      || echarts.init(knowledgeChartRef.value);
  }

  const items = knowledgeChartData.value;

  knowledgeChart.setOption({
    grid: { left: 48, right: 24, top: 30, bottom: 40 },
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const item = items[params[0].dataIndex];
        return `${item.name}<br/>掌握度：${params[0].value}%（${item.correct}/${item.total}）`;
      },
    },
    xAxis: {
      type: 'category',
      data: items.map((item) => item.name),
      axisLabel: { fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      max: 100,
      axisLabel: { formatter: '{value}%' },
    },
    series: [
      {
        type: 'bar',
        data: items.map((item) => Math.round(item.rate * 100)),
        barMaxWidth: 36,
        itemStyle: {
          color: '#6d28d9',
          borderRadius: [4, 4, 0, 0],
        },
      },
    ],
  });
}

function renderCharts() {
  if (activeTab.value === 'questions') renderQuestionChart();
  if (activeTab.value === 'knowledge') renderKnowledgeChart();
}

function onTabChange() {
  nextTick(() => {
    renderCharts();
    questionChart?.resize();
    knowledgeChart?.resize();
  });
}

function handleResize() {
  questionChart?.resize();
  knowledgeChart?.resize();
}

watch([questionAnalysis, knowledgeMastery], async () => {
  await nextTick();
  renderCharts();
});

async function exportCsv() {
  if (!selectedExamId.value) return;

  try {
    await downloadFile(
      `/stats/exams/${selectedExamId.value}/scores.csv`,
      `exam-${selectedExamId.value}-scores.csv`,
    );
    ElMessage.success('成绩已导出');
  } catch (error) {
    ElMessage.error(error.message || '导出失败');
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

onMounted(async () => {
  window.addEventListener('resize', handleResize);
  await loadExams();
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  questionChart?.dispose();
  knowledgeChart?.dispose();
});
</script>

<style scoped>
.header-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.exam-strip {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px 16px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.exam-name {
  font-size: 15px;
  font-weight: 600;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
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
  font-size: 25px;
  font-weight: 700;
  color: var(--brand);
  margin: 5px 0 2px;
}

.stat-hint {
  font-size: 11px;
  color: #9aa5b1;
}

.tabs-card {
  padding-top: 8px;
}

.chart {
  width: 100%;
  height: 320px;
  margin-bottom: 16px;
}

.chart-empty {
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-sub);
  font-size: 13px;
}

.analysis-table {
  margin-top: 8px;
}

.danger-text {
  color: var(--danger);
  font-weight: 600;
}

.empty-card {
  background: #fff;
  border: 1px dashed #d6dfe9;
  border-radius: 14px;
  min-height: 260px;
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
  margin: 0;
  font-size: 13px;
}

@media (max-width: 900px) {
  .stat-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
