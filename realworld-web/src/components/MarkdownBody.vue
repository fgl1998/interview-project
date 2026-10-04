<script setup lang="ts">
import { computed } from 'vue'
import { renderMarkdown } from '@/utils/markdown'
const props = defineProps<{ body: string }>()
const content = computed(() => renderMarkdown(props.body))
</script>

<template>
  <!-- Markdown 渲染器禁用 HTML，并检查链接协议。 -->
  <!-- eslint-disable-next-line vue/no-v-html -->
  <div class="markdown-body" v-html="content" />
</template>
