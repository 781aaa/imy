<template>
  <el-container class="layout">
    <el-aside width="220px" class="aside desktop-aside">
      <div class="brand">
        <div class="brand-mark">考</div>
        <div class="brand-text">
          <div class="brand-title">在线考试系统</div>
          <div class="brand-sub">Exam Platform</div>
        </div>
      </div>

      <el-menu :default-active="activeMenu" router class="menu">
        <el-menu-item
          v-for="item in menus"
          :key="item.name"
          :index="item.name"
        >
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.label }}</span>
        </el-menu-item>
      </el-menu>

      <div class="aside-footer">
        <span class="dot" />
        <span>系统运行中</span>
      </div>
    </el-aside>

    <el-container class="content">
      <el-header class="header">
        <el-button
          text
          class="mobile-only menu-button"
          @click="drawerVisible = true"
        >
          <el-icon size="20"><Menu /></el-icon>
        </el-button>

        <div class="header-title">{{ currentTitle }}</div>
        <div class="spacer" />

        <el-dropdown trigger="click" @command="handleCommand">
          <span class="user-chip">
            <el-avatar :size="28" class="avatar">{{ initial }}</el-avatar>
            <span class="user-name">{{ auth.displayName }}</span>
            <el-tag size="small" effect="plain" class="role-tag">
              {{ auth.roleLabel }}
            </el-tag>
            <el-icon class="arrow"><ArrowDown /></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="password">
                修改密码
              </el-dropdown-item>
              <el-dropdown-item command="logout" divided>
                退出登录
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </el-header>

      <el-main class="main">
        <router-view />
      </el-main>
    </el-container>

    <el-drawer
      v-model="drawerVisible"
      direction="ltr"
      size="240px"
      :with-header="false"
      class="mobile-drawer"
    >
      <div class="brand drawer-brand">
        <div class="brand-mark">考</div>
        <div class="brand-text">
          <div class="brand-title">在线考试系统</div>
          <div class="brand-sub">Exam Platform</div>
        </div>
      </div>
      <el-menu
        :default-active="activeMenu"
        router
        class="menu"
        @select="drawerVisible = false"
      >
        <el-menu-item
          v-for="item in menus"
          :key="item.name"
          :index="item.name"
        >
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.label }}</span>
        </el-menu-item>
      </el-menu>
    </el-drawer>

    <el-dialog
      v-model="passwordVisible"
      title="修改密码"
      width="420px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="passwordFormRef"
        :model="passwordForm"
        :rules="passwordRules"
        label-position="top"
      >
        <el-form-item label="原密码" prop="oldPassword">
          <el-input
            v-model="passwordForm.oldPassword"
            type="password"
            show-password
          />
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input
            v-model="passwordForm.newPassword"
            type="password"
            show-password
          />
        </el-form-item>
        <el-form-item label="确认新密码" prop="confirmPassword">
          <el-input
            v-model="passwordForm.confirmPassword"
            type="password"
            show-password
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="passwordVisible = false">取消</el-button>
        <el-button type="primary" :loading="passwordSaving" @click="savePassword">
          确认修改
        </el-button>
      </template>
    </el-dialog>
  </el-container>
</template>

<script setup>
import { computed, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  ArrowDown,
  Calendar,
  Collection,
  DataAnalysis,
  Document,
  EditPen,
  HomeFilled,
  List,
  Menu,
  Notebook,
  School,
  User,
} from '@element-plus/icons-vue';
import { useAuthStore } from '../stores/auth';
import api from '../api';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const drawerVisible = ref(false);
const passwordVisible = ref(false);
const passwordSaving = ref(false);
const passwordFormRef = ref(null);

const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
});

const passwordRules = {
  oldPassword: [{ required: true, message: '请输入原密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '新密码至少 6 位', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== passwordForm.newPassword) {
          callback(new Error('两次输入的密码不一致'));
        } else {
          callback();
        }
      },
      trigger: 'blur',
    },
  ],
};

const ALL_MENUS = {
  admin: [
    { name: 'dashboard', label: '概览', icon: HomeFilled },
    { name: 'users', label: '用户管理', icon: User },
    { name: 'classes', label: '班级管理', icon: School },
    { name: 'knowledge', label: '知识点管理', icon: Collection },
    { name: 'questions', label: '题库管理', icon: Notebook },
    { name: 'papers', label: '试卷管理', icon: Document },
    { name: 'exams', label: '考试管理', icon: Calendar },
    { name: 'grading', label: '阅卷中心', icon: EditPen },
    { name: 'stats', label: '统计分析', icon: DataAnalysis },
    { name: 'audit', label: '审计日志', icon: List },
  ],
  teacher: [
    { name: 'dashboard', label: '概览', icon: HomeFilled },
    { name: 'classes', label: '我的班级', icon: School },
    { name: 'knowledge', label: '知识点管理', icon: Collection },
    { name: 'questions', label: '题库管理', icon: Notebook },
    { name: 'papers', label: '试卷管理', icon: Document },
    { name: 'exams', label: '考试管理', icon: Calendar },
    { name: 'grading', label: '阅卷中心', icon: EditPen },
    { name: 'stats', label: '统计分析', icon: DataAnalysis },
  ],
  student: [
    { name: 'dashboard', label: '概览', icon: HomeFilled },
    { name: 'my-exams', label: '我的考试', icon: Calendar },
    { name: 'my-results', label: '我的成绩', icon: DataAnalysis },
  ],
};

const menus = computed(() => ALL_MENUS[auth.role] || ALL_MENUS.student);

const activeMenu = computed(() => route.name);

const currentTitle = computed(() => route.meta.title || '在线考试系统');

const initial = computed(() => {
  const name = auth.displayName || '?';
  return name.slice(0, 1).toUpperCase();
});

async function handleCommand(command) {
  if (command === 'password') {
    passwordForm.oldPassword = '';
    passwordForm.newPassword = '';
    passwordForm.confirmPassword = '';
    passwordVisible.value = true;
    return;
  }

  if (command === 'logout') {
    try {
      await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
        confirmButtonText: '退出',
        cancelButtonText: '取消',
        type: 'warning',
      });
    } catch (error) {
      return;
    }

    await auth.logout();
    ElMessage.success('已退出登录');
    router.replace({ name: 'login' });
  }
}

async function savePassword() {
  const valid = await passwordFormRef.value.validate().catch(() => false);
  if (!valid) return;

  passwordSaving.value = true;
  try {
    await api.auth.changePassword({
      oldPassword: passwordForm.oldPassword,
      newPassword: passwordForm.newPassword,
    });
    passwordVisible.value = false;
    ElMessage.success('密码已修改，请重新登录');
    auth.clear();
    router.replace({ name: 'login' });
  } catch (error) {
    // 错误提示由拦截器处理
  } finally {
    passwordSaving.value = false;
  }
}
</script>

<style scoped>
.layout {
  height: 100%;
}

.aside {
  background: linear-gradient(180deg, #16283c 0%, #1f4e79 100%);
  color: #fff;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 18px 16px;
}

.brand-mark {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  background: linear-gradient(135deg, #3d84c6, #6db0e8);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 19px;
  font-weight: 700;
  flex-shrink: 0;
}

.brand-title {
  font-size: 15px;
  font-weight: 600;
  white-space: nowrap;
}

.brand-sub {
  font-size: 10px;
  opacity: 0.6;
  letter-spacing: 0.5px;
}

.menu {
  border-right: none;
  background: transparent;
  flex: 1;
  padding: 6px 10px;
  overflow-y: auto;
}

.menu :deep(.el-menu-item) {
  color: rgba(255, 255, 255, 0.72);
  border-radius: 9px;
  margin-bottom: 3px;
  height: 42px;
}

.menu :deep(.el-menu-item:hover) {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.menu :deep(.el-menu-item.is-active) {
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
  font-weight: 600;
}

.aside-footer {
  padding: 14px 20px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.55);
  display: flex;
  align-items: center;
  gap: 6px;
}

.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #4ade80;
  box-shadow: 0 0 6px #4ade80;
}

.content {
  min-width: 0;
}

.header {
  background: #fff;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 12px;
  height: 58px;
  padding: 0 20px;
}

.header-title {
  font-size: 16px;
  font-weight: 600;
}

.user-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 8px;
  outline: none;
}

.user-chip:hover {
  background: #f3f6fa;
}

.avatar {
  background: linear-gradient(135deg, #1f4e79, #3d84c6);
  font-size: 13px;
}

.user-name {
  font-size: 14px;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.role-tag {
  transform: scale(0.92);
}

.arrow {
  color: #9aa5b1;
  font-size: 12px;
}

.main {
  padding: 0;
  overflow-y: auto;
  background: var(--page-bg);
}

.mobile-only {
  display: none;
}

.drawer-brand {
  background: #16283c;
  color: #fff;
  padding: 18px;
}

.mobile-drawer :deep(.el-drawer__body) {
  padding: 0;
  background: #1f4e79;
}

@media (max-width: 767px) {
  .desktop-aside {
    display: none;
  }

  .mobile-only {
    display: inline-flex;
  }

  .header {
    padding: 0 12px;
    gap: 6px;
  }

  .user-name {
    display: none;
  }

  .role-tag {
    display: none;
  }
}
</style>
