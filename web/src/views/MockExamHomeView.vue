<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h2 class="page-title">模拟考试</h2>
        <div class="page-subtitle">
          自己发起一场限时模拟，交卷后立刻出分和逐题解析
        </div>
      </div>
      <el-button :loading="loading" @click="loadAll">刷新</el-button>
    </div>

    <div class="card setup-card">
      <div class="section-title">发起新考试</div>

      <div class="setup-grid">
        <div class="field">
          <label>题库</label>
          <el-select v-model="form.level" style="width: 100%">
            <el-option
              v-for="level in levels"
              :key="level.id"
              :label="`${level.name}（${level.questionCount}）`"
              :value="level.name"
            />
          </el-select>
        </div>

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
          <label>时长</label>
          <el-select v-model="form.durationMin" style="width: 100%">
            <el-option :value="15" label="15 分钟" />
            <el-option :value="30" label="30 分钟" />
            <el-option :value="45" label="45 分钟" />
            <el-option :value="60" label="60 分钟" />
            <el-option :value="90" label="90 分钟" />
          </el-select>
        </div>

        <div class="field submit-field">
          <el-button
            type="primary"
            size="large"
            :loading="creating"
            :disabled="!form.level"
            @click="startMock"
          >
            开始模拟
          </el-button>
        </div>
      </div>

      <div class="hint">
        模拟考试只包含客观题（单选、多选、判断、填空），从题库随机抽题。
        交卷后立即显示总分、对错和解析，不需要等老师发布。
      </div>
    </div>

    <div class="card history-card">
      <div class="section-title">历史记录</div>

      <el-table
        v-if="history.length > 0"
        :data="history"
        stripe
        :header-cell-style="{ background: '#f7fafc' }"
      >
        <el-table-column prop="title" label="考试" min-width="220" />
        <el-table-column prop="levelName" label="题库" width="130" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag
              :type="row.status === 'submitted' ? 'success' : 'warning'"
              size="small"
              effect="plain"
            >
              {{ row.status === 'submitted' ? '已交卷' : '进行中' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="得分" width="110">
          <template #default="{ row }">
            <span v-if="row.status === 'submitted'" class="score">
              {{ row.score }} / {{ row.totalScore }}
            </span>
            <span v-else class="text-sub">—</span>
          </template>
        </el-table-column>
        <el-table-column label="开始时间" min-width="160">
          <template #default="{ row }">
            <span class="text-sub">{{ formatTime(row.startedAt) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="110">
          <template #default="{ row }">
            <el-button link type="primary" @click="openMock(row)">
              {{ row.status === 'submitted' ? '查看结果' : '继续' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty
        v-else
        description="还没有模拟考试记录"
        :image-size="80"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import api from '../api';

const router = useRouter();

const loading = ref(false);
const creating = ref(false);
const levels = ref([]);
const history = ref([]);

const form = reactive({
  level: '',
  topic: '',
  count: 10,
  durationMin: 30,
});

const currentTopics = computed(() => {
  const level = levels.value.find((item) => item.name === form.level);
  return level ? level.topics : [];
});

function formatTime(timestamp) {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleString('zh-CN', { hour12: false });
}

async function loadLevels() {
  try {
    const result = await api.practice.levels();
    levels.value = result.items || [];
    if (!form.level && levels.value.length > 0) {
      form.level = levels.value[0].name;
    }
  } catch (error) {
    levels.value = [];
  }
}

async function loadHistory() {
  try {
    const result = await api.mock.list();
    history.value = result.items || [];
  } catch (error) {
    history.value = [];
  }
}

async function loadAll() {
  loading.value = true;
  try {
    await Promise.all([loadLevels(), loadHistory()]);
  } finally {
    loading.value = false;
  }
}

async function startMock() {
  if (!form.level) {
    ElMessage.warning('请先选择题库');
    return;
  }

  creating.value = true;
  try {
    const result = await api.mock.create({
      level: form.level,
      topic: form.topic || undefined,
      count: form.count,
      durationMin: form.durationMin,
    });
    router.push({
      name: 'mock-exam',
      params: { mockExamId: result.id },
    });
  } catch (error) {
    // 错误提示由拦截器处理
  } finally {
    creating.value = false;
  }
}

function openMock(row) {
  router.push({ name: 'mock-exam', params: { mockExamId: row.id } });
}

onMounted(loadAll);
</script>

<style scoped>
.setup-card,
.history-card {
  margin-bottom: 16px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 14px;
}

.setup-grid {
  display: grid;
  grid-template-columns: 1.2fr 1.2fr 0.8fr 0.8fr 0.8fr;
  gap: 12px;
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

.submit-field {
  justify-content: flex-end;
}

.hint {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px dashed var(--border);
  font-size: 12px;
  color: var(--text-sub);
  line-height: 1.7;
}

.score {
  font-weight: 700;
  color: var(--brand);
  font-size: 15px;
}

@media (max-width: 900px) {
  .setup-grid {
    grid-template-columns: 1fr 1fr;
  }

  .submit-field {
    grid-column: 1 / -1;
  }
}

@media (max-width: 560px) {
  .setup-grid {
    grid-template-columns: 1fr;
  }
}
</style>
