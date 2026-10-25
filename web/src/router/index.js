import { createRouter, createWebHashHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
    meta: { public: true, title: '登录' },
  },
  {
    path: '/',
    component: () => import('../layouts/MainLayout.vue'),
    children: [
      { path: '', redirect: { name: 'dashboard' } },
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('../views/DashboardView.vue'),
        meta: { title: '概览' },
      },
      {
        path: 'users',
        name: 'users',
        component: () => import('../views/UsersView.vue'),
        meta: { title: '用户管理', roles: ['admin'] },
      },
      {
        path: 'classes',
        name: 'classes',
        component: () => import('../views/PlaceholderView.vue'),
        meta: { title: '班级管理', roles: ['admin', 'teacher'] },
      },
      {
        path: 'knowledge',
        name: 'knowledge',
        component: () => import('../views/PlaceholderView.vue'),
        meta: { title: '知识点管理', roles: ['admin', 'teacher'] },
      },
      {
        path: 'questions',
        name: 'questions',
        component: () => import('../views/QuestionsView.vue'),
        meta: { title: '题库管理', roles: ['admin', 'teacher'] },
      },
      {
        path: 'papers',
        name: 'papers',
        component: () => import('../views/PlaceholderView.vue'),
        meta: { title: '试卷管理', roles: ['admin', 'teacher'] },
      },
      {
        path: 'exams',
        name: 'exams',
        component: () => import('../views/PlaceholderView.vue'),
        meta: { title: '考试管理', roles: ['admin', 'teacher'] },
      },
      {
        path: 'grading',
        name: 'grading',
        component: () => import('../views/PlaceholderView.vue'),
        meta: { title: '阅卷中心', roles: ['admin', 'teacher'] },
      },
      {
        path: 'stats',
        name: 'stats',
        component: () => import('../views/PlaceholderView.vue'),
        meta: { title: '统计分析', roles: ['admin', 'teacher'] },
      },
      {
        path: 'audit',
        name: 'audit',
        component: () => import('../views/PlaceholderView.vue'),
        meta: { title: '审计日志', roles: ['admin'] },
      },
      {
        path: 'my-exams',
        name: 'my-exams',
        component: () => import('../views/PlaceholderView.vue'),
        meta: { title: '我的考试', roles: ['student'] },
      },
      {
        path: 'my-results',
        name: 'my-results',
        component: () => import('../views/PlaceholderView.vue'),
        meta: { title: '我的成绩', roles: ['student'] },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('../views/NotFoundView.vue'),
    meta: { public: true, title: '页面不存在' },
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();

  if (to.meta.public) {
    if (to.name === 'login' && auth.isLoggedIn) {
      return { name: 'dashboard' };
    }
    return true;
  }

  if (!auth.isLoggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }

  const user = await auth.ensureUser();
  if (!user) {
    return { name: 'login' };
  }

  if (Array.isArray(to.meta.roles) && !to.meta.roles.includes(user.role)) {
    return { name: 'dashboard' };
  }

  return true;
});

router.afterEach((to) => {
  document.title = to.meta.title
    ? `${to.meta.title} · 在线考试系统`
    : '在线考试系统';
});

export default router;
