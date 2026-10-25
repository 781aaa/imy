<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h2 class="page-title">我的考试</h2>
        <div class="page-subtitle">只显示指派给你所在班级的考试</div>
      </div>
      <el-button :loading="loading" @click="load">刷新</el-button>
    </div>

    <div v-if="loading && exams.length === 0" class="empty-card">
      <el-icon class="is-loading" size="26"><Loading /></el-icon>
      <span>正在加载考试…</span>
    </div>

    <div v-else-if="exams.length === 0" class="empty-card">
      <el-icon size="32"><Calendar /></el-icon>
      <h3>暂时没有考试</h3>
      <p>老师发布并指派考试后会显示在这里。</p>
    </div>

    <div v-else class="exam-grid">
      <div v-for="exam in exams" :key="exam.id" class="exam-card">
        <div class="exam-head">
          <div class="exam-title">{{ exam.title }}</div>
          <el-tag
            :type="examStatusType(exam.status)"
            size="small"
            effect="plain"
          >
            {{ EXAM_STATUS_LABELS[exam.status] || exam.status }}
          </el-tag>
        </div>

        <div class="exam-sub">{{ exam.paperTitle }}</div>

        <div class="exam-meta">
          <div class="meta-row">
            <el-icon><Clock /></el-icon>
            <span>{{ formatTime(exam.startAt) }} — {{ formatTime(exam.endAt) }}</span>
          </div>
          <div class="meta-row">
            <el-icon><Timer /></el-icon>
            <span>考试时长 {{ exam.durationMin }} 分钟 · 及格 {{ exam.passScore }} 分</span>
          </div>
          <div class="meta-row">
            <el-icon><Refresh /></el-icon>
            <span>已考 {{ exam.attemptCount }} / {{ exam.maxAttempts }} 次</span>
          </div>
        </div>

        <div class="exam-status">
          <template v-if="exam.mySession">
            <el-tag
              :type="sessionStatusType(exam.mySession.status)"
              size="small"
            >
              {{ SESSION_STATUS_LABELS[exam.mySession.status] || exam.mySession.status }}
            </el-tag>
            <span
              v-if="exam.status === 'published' && exam.mySession.score !== null"
              class="score-text"
            >
              {{ exam.mySession.score }} 分
            </span>
          </template>
          <span v-else class="text-sub">尚未参加</span>

          <span
            v-if="exam.mySession && exam.mySession.status === 'in_progress'"
            class="deadline-text"
          >
            剩余 {{ remainingText(exam.mySession.deadlineAt) }}
          </span>
        </div>

        <div class="exam-actions">
          <el-button
            v-if="exam.mySession && exam.mySession.status === 'in_progress'"
            type="primary"
            @click="goExam(exam)"
          >
            继续考试
          </el-button>
          <el-button
            v-else-if="exam.canStart"
            type="primary"
            @click="goExam(exam)"
          >
            开始考试
          </el-button>
          <el-button
            v-if="exam.mySession && exam.mySession.status !== 'in_progress'"
            :disabled="exam.status !== 'published'"
            @click="goResult(exam)"
          >
            {{ exam.status === 'published' ? '查看成绩' : '成绩待发布' }}
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import {
  Calendar,
  Clock,
  Loading,
  Refresh,
  Timer,
} from '@element-plus/icons-vue';
import api from '../api';

const router = useRouter();
const loading = ref(false);
const exams = ref([]);

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

function examStatusType(status) {
  const map = {
    scheduled: 'info',
    ongoing: 'success',
    finished: 'warning',
    published: 'primary',
  };
  return map[status] || 'info';
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
  return new Date(timestamp).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function remainingText(deadlineAt) {
  if (!deadlineAt) return '—';
  const seconds = Math.max(0, Math.floor((deadlineAt - Date.now()) / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${minutes} 分钟`;
}

async function load() {
  loading.value = true;
  try {
    const result = await api.student.listExams();
    exams.value = result.items || [];
  } catch (error) {
    exams.value = [];
  } finally {
    loading.value = false;
  }
}

function goExam(exam) {
  router.push({ name: 'exam-taking', params: { examId: exam.id } });
}

function goResult(exam) {
  if (!exam.mySession) return;
  if (exam.status !== 'published') {
    ElMessage.info('成绩尚未发布');
    return;
  }
  router.push({ name: 'exam-result', params: { sessionId: exam.mySession.id } });
}

onMounted(load);
</script>

<style scoped>
.exam-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.exam-card {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: box-shadow 0.2s ease;
}

.exam-card:hover {
  box-shadow: 0 8px 22px rgba(31, 78, 121, 0.08);
}

.exam-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}

.exam-title {
  font-size: 16px;
  font-weight: 600;
}

.exam-sub {
  font-size: 12px;
  color: var(--text-sub);
}

.exam-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  background: #f8fafc;
  border-radius: 10px;
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  color: var(--text-sub);
}

.exam-status {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  flex-wrap: wrap;
}

.score-text {
  font-weight: 700;
  color: var(--brand);
  font-size: 16px;
}

.deadline-text {
  color: var(--warning);
  font-size: 12px;
}

.exam-actions {
  display: flex;
  gap: 8px;
  margin-top: 2px;
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

@media (max-width: 860px) {
  .exam-grid {
    grid-template-columns: 1fr;
  }
}
</style>
