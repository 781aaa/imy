<template>
  <div class="page">
    <div class="hero">
      <div>
        <h2 class="hero-title">
          {{ greeting }}，{{ auth.displayName }}
        </h2>
        <p class="hero-sub">
          当前身份：{{ auth.roleLabel }} · {{ today }}
        </p>
      </div>
      <div class="hero-badge">
        <span class="hero-dot" />
        系统正常
      </div>
    </div>

    <div v-if="auth.role === 'admin'" class="stat-grid">
      <div class="stat-card" v-for="item in adminStats" :key="item.label">
        <div class="stat-label">{{ item.label }}</div>
        <div class="stat-value">{{ item.value }}</div>
        <div class="stat-hint">{{ item.hint }}</div>
      </div>
    </div>

    <div v-if="auth.role === 'teacher'" class="stat-grid">
      <div class="stat-card" v-for="item in teacherStats" :key="item.label">
        <div class="stat-label">{{ item.label }}</div>
        <div class="stat-value">{{ item.value }}</div>
        <div class="stat-hint">{{ item.hint }}</div>
      </div>
    </div>

    <div v-if="auth.role === 'student'" class="stat-grid">
      <div class="stat-card" v-for="item in studentStats" :key="item.label">
        <div class="stat-label">{{ item.label }}</div>
        <div class="stat-value">{{ item.value }}</div>
        <div class="stat-hint">{{ item.hint }}</div>
      </div>
    </div>

    <div class="card quick-card">
      <div class="section-title">快捷入口</div>
      <div class="quick-grid">
        <button
          v-for="item in quickLinks"
          :key="item.name"
          type="button"
          class="quick-item"
          @click="router.push({ name: item.name })"
        >
          <el-icon size="20"><component :is="item.icon" /></el-icon>
          <div>
            <div class="quick-label">{{ item.label }}</div>
            <div class="quick-desc">{{ item.desc }}</div>
          </div>
        </button>
      </div>
    </div>

    <div class="card info-card">
      <div class="section-title">系统信息</div>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">前端框架</span>
          <span>Vue 3 + Vite + Element Plus</span>
        </div>
        <div class="info-item">
          <span class="info-label">后端服务</span>
          <span>Node.js + Express</span>
        </div>
        <div class="info-item">
          <span class="info-label">数据库</span>
          <span>SQLite（node:sqlite）</span>
        </div>
        <div class="info-item">
          <span class="info-label">登录状态</span>
          <span class="ok-text">已登录</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  Calendar,
  Collection,
  DataAnalysis,
  Document,
  EditPen,
  Notebook,
  School,
  User,
  Warning,
} from '@element-plus/icons-vue';
import { useAuthStore } from '../stores/auth';
import api from '../api';

const auth = useAuthStore();
const router = useRouter();

const stats = ref({ total: 0, admin: 0, teacher: 0, student: 0 });
const classes = ref([]);
const practiceStats = ref({
  totalAnswered: 0,
  correctCount: 0,
  accuracy: 0,
  todayAnswered: 0,
  streakDays: 0,
  daily: [],
  weakTopics: [],
});

const greeting = computed(() => {
  const hour = new Date().getHours();
  if (hour < 6) return '夜深了';
  if (hour < 12) return '早上好';
  if (hour < 14) return '中午好';
  if (hour < 18) return '下午好';
  return '晚上好';
});

const today = computed(() =>
  new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }),
);

const adminStats = computed(() => [
  { label: '用户总数', value: stats.value.total, hint: '全部账号' },
  { label: '教师', value: stats.value.teacher, hint: '可创建试卷' },
  { label: '学生', value: stats.value.student, hint: '可参加考试' },
  { label: '管理员', value: stats.value.admin, hint: '系统维护' },
]);

const teacherStats = computed(() => [
  { label: '我的班级', value: classes.value.length, hint: '所带班级' },
  {
    label: '班级学生',
    value: classes.value.reduce((sum, item) => sum + (item.memberCount || 0), 0),
    hint: '可指派考试',
  },
  { label: '题库', value: '—', hint: 'D2 上线' },
  { label: '待阅卷', value: '—', hint: 'D5 上线' },
]);

const studentStats = computed(() => [
  {
    label: '今日练习',
    value: practiceStats.value.todayAnswered,
    hint: '已做题目',
  },
  {
    label: '累计正确率',
    value: practiceStats.value.totalAnswered
      ? `${Math.round(practiceStats.value.accuracy * 100)}%`
      : '—',
    hint: `共练 ${practiceStats.value.totalAnswered} 题`,
  },
  {
    label: '连续练习',
    value: `${practiceStats.value.streakDays} 天`,
    hint: '保持节奏',
  },
  {
    label: '我的班级',
    value: classes.value.length,
    hint: '已加入',
  },
]);

const quickLinks = computed(() => {
  if (auth.role === 'admin') {
    return [
      { name: 'users', label: '用户管理', desc: '账号与角色', icon: User },
      { name: 'classes', label: '班级管理', desc: '班级与学生', icon: School },
      { name: 'knowledge', label: '知识点', desc: '知识体系', icon: Collection },
      { name: 'questions', label: '题库', desc: '五类题型', icon: Notebook },
    ];
  }
  if (auth.role === 'teacher') {
    return [
      { name: 'questions', label: '题库管理', desc: '录入与导入', icon: Notebook },
      { name: 'papers', label: '试卷管理', desc: '组卷与发布', icon: Document },
      { name: 'exams', label: '考试管理', desc: '排期与指派', icon: Calendar },
      { name: 'grading', label: '阅卷中心', desc: '主观题评分', icon: EditPen },
    ];
  }
  return [
    { name: 'practice', label: '练习中心', desc: '刷题与解析', icon: Notebook },
    { name: 'wrong-book', label: '错题本', desc: '复习错题', icon: Warning },
    { name: 'my-exams', label: '我的考试', desc: '参加考试', icon: Calendar },
    { name: 'my-results', label: '我的成绩', desc: '查看分数', icon: DataAnalysis },
  ];
});

onMounted(async () => {
  try {
    const classResult = await api.classes.list({ page: 1, pageSize: 100 });
    classes.value = classResult.items || [];
  } catch (error) {
    classes.value = [];
  }

  if (auth.role === 'admin') {
    try {
      stats.value = await api.users.statistics();
    } catch (error) {
      // 概览数据失败不影响页面
    }
  }

  if (auth.role === 'student') {
    try {
      practiceStats.value = await api.practice.stats();
    } catch (error) {
      // 练习统计失败不影响页面
    }
  }
});
</script>

<style scoped>
.hero {
  background: var(--brand-grad);
  border-radius: 16px;
  padding: 24px;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
  box-shadow: 0 12px 28px var(--brand-shadow);
}

.hero-title {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
}

.hero-sub {
  margin: 8px 0 0;
  font-size: 13px;
  opacity: 0.82;
}

.hero-badge {
  display: flex;
  align-items: center;
  gap: 7px;
  background: rgba(255, 255, 255, 0.16);
  padding: 7px 13px;
  border-radius: 999px;
  font-size: 12px;
  white-space: nowrap;
}

.hero-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #4ade80;
  box-shadow: 0 0 8px #4ade80;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 18px;
}

.stat-card {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 13px;
  padding: 16px 18px;
}

.stat-label {
  font-size: 12px;
  color: var(--text-sub);
}

.stat-value {
  font-size: 27px;
  font-weight: 700;
  margin: 6px 0 2px;
  color: var(--brand);
}

.stat-hint {
  font-size: 11px;
  color: #9aa5b1;
}

.quick-card,
.info-card {
  margin-bottom: 18px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 14px;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.quick-item {
  border: 1px solid var(--border);
  background: #fbfcfe;
  border-radius: 11px;
  padding: 14px;
  display: flex;
  align-items: center;
  gap: 11px;
  cursor: pointer;
  text-align: left;
  transition: all 0.18s ease;
  color: var(--brand);
}

.quick-item:hover {
  border-color: var(--brand-border-strong);
  background: #f1f7fd;
  transform: translateY(-1px);
}

.quick-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-main);
}

.quick-desc {
  font-size: 11px;
  color: var(--text-sub);
  margin-top: 2px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 24px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  padding-bottom: 10px;
  border-bottom: 1px dashed #edf1f6;
}

.info-label {
  color: var(--text-sub);
}

.ok-text {
  color: var(--success);
  font-weight: 600;
}

@media (max-width: 900px) {
  .stat-grid,
  .quick-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 560px) {
  .hero {
    flex-direction: column;
    align-items: flex-start;
    padding: 20px;
  }

  .hero-title {
    font-size: 18px;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }
}
</style>
