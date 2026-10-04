<script setup lang="ts">
import { Warning, Document } from '@element-plus/icons-vue'
withDefaults(
  defineProps<{
    loading?: boolean
    error?: string
    empty?: boolean
    emptyTitle?: string
    emptyText?: string
  }>(),
  {
    loading: false,
    error: '',
    empty: false,
    emptyTitle: '这里还没有内容',
    emptyText: '新的想法，正在路上。',
  },
)
defineEmits<{ retry: [] }>()
</script>

<template>
  <div v-if="loading" class="loading-state" role="status" aria-label="正在加载">
    <el-skeleton :rows="4" animated />
  </div>
  <div v-else-if="error" class="content-state" role="alert">
    <el-icon class="state-icon"><Warning /></el-icon>
    <h3>暂时无法加载</h3>
    <p>{{ error }}</p>
    <el-button @click="$emit('retry')">重新加载</el-button>
  </div>
  <div v-else-if="empty" class="content-state">
    <el-icon class="state-icon"><Document /></el-icon>
    <h3>{{ emptyTitle }}</h3>
    <p>{{ emptyText }}</p>
    <slot name="empty-action" />
  </div>
  <slot v-else />
</template>
