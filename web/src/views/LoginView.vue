<template>
  <div class="login-page">
    <div class="login-card">
      <div class="brand">
        <div class="brand-mark">考</div>
        <div>
          <h1>在线考试系统</h1>
          <p>Online Examination Platform</p>
        </div>
      </div>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        size="large"
        @submit.prevent="submit"
      >
        <el-form-item label="用户名" prop="username">
          <el-input
            v-model="form.username"
            placeholder="请输入用户名"
            autocomplete="username"
            clearable
          />
        </el-form-item>

        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            autocomplete="current-password"
            show-password
            @keyup.enter="submit"
          />
        </el-form-item>

        <el-button
          type="primary"
          class="login-button"
          :loading="loading"
          native-type="submit"
          @click="submit"
        >
          登 录
        </el-button>
      </el-form>

      <div class="demo-block">
        <div class="demo-title">演示账号（点击自动填充）</div>
        <div class="demo-list">
          <button
            v-for="account in demoAccounts"
            :key="account.username"
            type="button"
            class="demo-chip"
            @click="fill(account)"
          >
            <span class="demo-role">{{ account.label }}</span>
            <span class="demo-user">{{ account.username }}</span>
          </button>
        </div>
      </div>
    </div>

    <div class="footer">Vue3 + Node.js + SQLite · 课程作业演示系统</div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

const formRef = ref(null);
const loading = ref(false);

const form = reactive({
  username: '',
  password: '',
});

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
};

const demoAccounts = [
  { label: '管理员', username: 'admin', password: 'Admin@123' },
  { label: '教师', username: 'teacher1', password: 'Teach@123' },
  { label: '学生', username: 'student01', password: 'Stud@123' },
];

function fill(account) {
  form.username = account.username;
  form.password = account.password;
}

async function submit() {
  if (loading.value) return;

  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;

  loading.value = true;
  try {
    await auth.login({ username: form.username, password: form.password });
    ElMessage.success('登录成功');
    const redirect = typeof route.query.redirect === 'string'
      ? route.query.redirect
      : '/dashboard';
    await router.replace(redirect);
  } catch (error) {
    // 错误提示由请求拦截器统一处理
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  background:
    radial-gradient(circle at 15% 20%, rgba(76, 132, 189, 0.5), transparent 45%),
    radial-gradient(circle at 85% 80%, rgba(31, 78, 121, 0.65), transparent 50%),
    linear-gradient(135deg, #16283c 0%, #1f4e79 55%, #2f6fa8 100%);
}

.login-card {
  width: 100%;
  max-width: 420px;
  background: rgba(255, 255, 255, 0.97);
  border-radius: 18px;
  padding: 32px 28px 24px;
  box-shadow: 0 24px 60px rgba(8, 20, 34, 0.35);
}

.brand {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 26px;
}

.brand-mark {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: linear-gradient(135deg, #1f4e79, #3d84c6);
  color: #fff;
  font-size: 26px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 18px rgba(31, 78, 121, 0.35);
}

.brand h1 {
  font-size: 21px;
  margin: 0;
  color: #16283c;
}

.brand p {
  margin: 4px 0 0;
  font-size: 12px;
  color: #7b8794;
  letter-spacing: 0.4px;
}

.login-button {
  width: 100%;
  margin-top: 6px;
  height: 46px;
  font-size: 16px;
  letter-spacing: 4px;
  background: linear-gradient(135deg, #1f4e79, #2f6fa8);
  border: none;
}

.demo-block {
  margin-top: 22px;
  padding-top: 18px;
  border-top: 1px dashed #e2e8f0;
}

.demo-title {
  font-size: 12px;
  color: #8b97a5;
  margin-bottom: 10px;
}

.demo-list {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.demo-chip {
  flex: 1;
  min-width: 92px;
  border: 1px solid #dbe4ee;
  background: #f7fafc;
  border-radius: 10px;
  padding: 8px 6px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 2px;
  transition: all 0.18s ease;
}

.demo-chip:hover {
  border-color: #2f6fa8;
  background: #eef5fc;
  transform: translateY(-1px);
}

.demo-role {
  font-size: 13px;
  color: #1f4e79;
  font-weight: 600;
}

.demo-user {
  font-size: 11px;
  color: #8b97a5;
}

.footer {
  margin-top: 22px;
  color: rgba(255, 255, 255, 0.65);
  font-size: 12px;
}

@media (max-width: 480px) {
  .login-card {
    padding: 26px 20px 20px;
  }
}
</style>
