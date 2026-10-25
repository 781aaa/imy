<template>
  <div class="not-found">
    <div class="code">404</div>
    <h2>页面不存在</h2>
    <p>你访问的页面可能已被移除，或者地址输入有误。</p>
    <el-button type="primary" @click="goHome">返回首页</el-button>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';

const router = useRouter();

function goHome() {
  router.replace({ name: 'dashboard' });
}
</script>

<style scoped>
.not-found {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 40px 20px;
  text-align: center;
}

.code {
  font-size: 76px;
  font-weight: 800;
  color: #dbe6f1;
  letter-spacing: 4px;
}

h2 {
  margin: 0;
  font-size: 20px;
}

p {
  color: var(--text-sub);
  font-size: 13px;
  margin: 4px 0 16px;
}
</style>
