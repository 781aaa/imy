<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h2 class="page-title">审计日志</h2>
        <div class="page-subtitle">所有写操作的记录（登录、答题自动保存等高频率操作已排除）</div>
      </div>
      <el-button :loading="loading" @click="loadLogs">刷新</el-button>
    </div>

    <div class="card">
      <div class="toolbar">
        <el-input
          v-model="keyword"
          placeholder="搜索路径或动作"
          clearable
          style="width: 260px"
          @keyup.enter="reload"
          @clear="reload"
        />
        <el-button @click="reload">查询</el-button>
        <div class="spacer" />
        <span class="text-sub">共 {{ pagination.total }} 条</span>
      </div>

      <el-table
        v-loading="loading"
        :data="items"
        stripe
        :header-cell-style="{ background: '#f7fafc' }"
      >
        <el-table-column type="expand">
          <template #default="{ row }">
            <pre class="detail-json">{{ JSON.stringify(row.detail, null, 2) }}</pre>
          </template>
        </el-table-column>
        <el-table-column label="时间" min-width="170">
          <template #default="{ row }">
            {{ formatTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作人" width="130">
          <template #default="{ row }">
            {{ row.realName || row.username || '—' }}
          </template>
        </el-table-column>
        <el-table-column prop="action" label="动作" min-width="200" />
        <el-table-column prop="method" label="方法" width="90" />
        <el-table-column prop="path" label="路径" min-width="200" />
        <el-table-column prop="ip" label="IP" width="130" />
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          background
          @current-change="loadLogs"
          @size-change="reload"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import api from '../api';

const loading = ref(false);
const items = ref([]);
const keyword = ref('');
const pagination = reactive({ page: 1, pageSize: 20, total: 0 });

function formatTime(timestamp) {
  if (!timestamp) return '—';
  return new Date(timestamp).toLocaleString('zh-CN', { hour12: false });
}

async function loadLogs() {
  loading.value = true;
  try {
    const result = await api.audit.list({
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: keyword.value || undefined,
    });
    items.value = result.items;
    pagination.total = result.pagination.total;
  } catch (error) {
    items.value = [];
  } finally {
    loading.value = false;
  }
}

function reload() {
  pagination.page = 1;
  loadLogs();
}

onMounted(loadLogs);
</script>

<style scoped>
.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 14px;
}

.detail-json {
  margin: 0;
  padding: 10px 16px;
  background: #f8fafc;
  border-radius: 8px;
  font-size: 11px;
  line-height: 1.6;
  max-height: 220px;
  overflow: auto;
}
</style>
