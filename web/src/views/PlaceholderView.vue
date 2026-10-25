<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h2 class="page-title">{{ title }}</h2>
        <div class="page-subtitle">该模块正在开发中</div>
      </div>
    </div>

    <div class="card placeholder">
      <div class="placeholder-icon">
        <el-icon size="34"><Tools /></el-icon>
      </div>
      <h3>{{ title }}</h3>
      <p>
        后端接口与页面正在按开发计划推进，当前模块将在后续阶段上线。
      </p>
      <el-tag effect="plain" type="info">开发计划中</el-tag>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { Tools } from '@element-plus/icons-vue';

const route = useRoute();
const title = computed(() => route.meta.title || '功能模块');
</script>

<style scoped>
.placeholder {
  min-height: 340px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  text-align: center;
  color: var(--text-sub);
}

.placeholder-icon {
  width: 68px;
  height: 68px;
  border-radius: 20px;
  background: var(--brand-soft);
  color: var(--brand);
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder h3 {
  margin: 6px 0 0;
  color: var(--text-main);
  font-size: 17px;
}

.placeholder p {
  max-width: 380px;
  font-size: 13px;
  line-height: 1.7;
  margin: 0 0 6px;
}
</style>
