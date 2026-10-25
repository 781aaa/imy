<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h2 class="page-title">知识点管理</h2>
        <div class="page-subtitle">树形知识点，供题库筛选与统计使用</div>
      </div>
      <div class="header-actions">
        <el-button type="primary" @click="openCreate(null)">
          添加根知识点
        </el-button>
        <el-button :loading="loading" @click="loadTree">刷新</el-button>
      </div>
    </div>

    <div class="card" v-loading="loading">
      <el-tree
        :data="tree"
        node-key="id"
        default-expand-all
        :expand-on-click-node="false"
        empty-text="还没有知识点"
      >
        <template #default="{ data }">
          <div class="tree-node">
            <span class="node-name">{{ data.name }}</span>
            <el-tag size="small" effect="plain">
              {{ subtreeCount(data) }} 题
            </el-tag>
            <span class="node-desc text-sub" v-if="data.description">
              {{ data.description }}
            </span>
            <span class="node-actions">
              <el-button link type="primary" @click.stop="openCreate(data.id)">
                添加子级
              </el-button>
              <el-button link type="primary" @click.stop="openEdit(data)">
                编辑
              </el-button>
              <el-button link type="danger" @click.stop="removeNode(data)">
                删除
              </el-button>
            </span>
          </div>
        </template>
      </el-tree>
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="460px"
    >
      <el-form label-position="top">
        <el-form-item label="名称" required>
          <el-input v-model="form.name" maxlength="50" />
        </el-form-item>
        <el-form-item label="说明">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="2"
            maxlength="500"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveNode">
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import api from '../api';

const loading = ref(false);
const saving = ref(false);
const tree = ref([]);

const dialogVisible = ref(false);
const editingId = ref(null);
const parentId = ref(null);
const form = reactive({ name: '', description: '' });

const dialogTitle = computed(() => {
  if (editingId.value) return '编辑知识点';
  return parentId.value ? '添加子知识点' : '添加根知识点';
});

function subtreeCount(node) {
  const own = Number(node.questionCount || 0);
  const children = Array.isArray(node.children) ? node.children : [];
  return own + children.reduce((sum, child) => sum + subtreeCount(child), 0);
}

async function loadTree() {
  loading.value = true;
  try {
    const result = await api.knowledge.tree();
    tree.value = result.items || [];
  } catch (error) {
    tree.value = [];
  } finally {
    loading.value = false;
  }
}

function openCreate(parent) {
  editingId.value = null;
  parentId.value = parent;
  form.name = '';
  form.description = '';
  dialogVisible.value = true;
}

function openEdit(node) {
  editingId.value = node.id;
  parentId.value = node.parentId;
  form.name = node.name;
  form.description = node.description || '';
  dialogVisible.value = true;
}

async function saveNode() {
  if (!form.name.trim()) {
    ElMessage.warning('请输入知识点名称');
    return;
  }

  saving.value = true;
  try {
    if (editingId.value) {
      await api.knowledge.update(editingId.value, {
        name: form.name,
        description: form.description,
      });
      ElMessage.success('知识点已更新');
    } else {
      await api.knowledge.create({
        name: form.name,
        description: form.description,
        parentId: parentId.value,
      });
      ElMessage.success('知识点已创建');
    }
    dialogVisible.value = false;
    await loadTree();
  } catch (error) {
    // 错误提示由拦截器处理
  } finally {
    saving.value = false;
  }
}

async function removeNode(node) {
  try {
    await ElMessageBox.confirm(
      `确定删除知识点「${node.name}」吗？有子级或已关联题目时不能删除。`,
      '删除知识点',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' },
    );
  } catch (error) {
    return;
  }

  try {
    await api.knowledge.remove(node.id);
    ElMessage.success('知识点已删除');
    await loadTree();
  } catch (error) {
    // 错误提示由拦截器处理
  }
}

onMounted(loadTree);
</script>

<style scoped>
.header-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 5px 0;
}

.node-name {
  font-size: 14px;
}

.node-desc {
  font-size: 11px;
}

.node-actions {
  margin-left: auto;
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.tree-node:hover .node-actions {
  opacity: 1;
}
</style>
