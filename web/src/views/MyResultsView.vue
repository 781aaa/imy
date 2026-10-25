<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h2 class="page-title">我的成绩</h2>
        <div class="page-subtitle">已发布成绩的考试可以查看逐题解析</div>
      </div>
      <el-button :loading="loading" @click="load">刷新</el-button>
    </div>

    <div v-if="loading && results.length === 0" class="empty-card">
      <el-icon class="is-loading" size="26"><Loading /></el-icon>
      <span>正在加载成绩…</span>
    </div>

    <div v-else-if="results.length === 0" class="empty-card">
      <el-icon size="32"><DataAnalysis /></el-icon>
      <h3>还没有成绩记录</h3>
      <p>完成考试并等待老师发布成绩后，这里会出现记录。</p>
    </div>

    <div v-else class="card">
      <el-table :data="results" stripe :header-cell-style="{ background: '#f7fafc' }">
        <el-table-column prop="title" label="考试" min-width="180" />
        <el-table-column prop="paperTitle" label="试卷" min-width="160" />
        <el-table-column label="交卷时间" min-width="160">
          <template #default="{ row }">
            <span class="text-sub">{{ formatTime(row.mySession.deadlineAt) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag
              :type="row.status === 'published' ? 'success' : 'info'"
              size="small"
              effect="plain"
            >
              {{ row.status === 'published' ? '已发布' : '待发布' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="得分" width="110">
          <template #default="{ row }">
            <span
              v-if="row.status === 'published' && row.mySession.score !== null"
              class="score"
            >
              {{ row.mySession.score }}
            </span>
            <span v-else class="text-sub">—</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              :disabled="row.status !== 'published'"
              @click="viewResult(row)"
            >
              查看详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { DataAnalysis, Loading } from '@element-plus/icons-vue';
import api from '../api';

const router = useRouter();
const loading = ref(false);
const results = ref([]);

function formatTime(timestamp) {
  if (!timestamp) return '—';
  return new Date(timestamp).toLocaleString('zh-CN', { hour12: false });
}

async function load() {
  loading.value = true;
  try {
    const result = await api.student.listExams();
    results.value = (result.items || []).filter(
      (item) => item.mySession && item.mySession.status !== 'in_progress',
    );
  } catch (error) {
    results.value = [];
  } finally {
    loading.value = false;
  }
}

function viewResult(row) {
  router.push({ name: 'exam-result', params: { sessionId: row.mySession.id } });
}

onMounted(load);
</script>

<style scoped>
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

.score {
  font-size: 18px;
  font-weight: 700;
  color: var(--brand);
}
</style>
