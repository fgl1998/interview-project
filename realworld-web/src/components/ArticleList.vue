<script setup lang="ts">
import type { Article } from '@/api/types'
import AsyncState from './AsyncState.vue'
import ArticleCard from './ArticleCard.vue'
withDefaults(
  defineProps<{
    articles: Article[]
    loading: boolean
    error: string
    offset?: number
    emptyTitle?: string
    emptyText?: string
  }>(),
  { offset: 0, emptyTitle: '暂时没有文章', emptyText: '换一个关键词，或分享你的第一篇文章。' },
)
defineEmits<{ retry: [] }>()
</script>

<template>
  <AsyncState
    :loading="loading"
    :error="error"
    :empty="!articles.length"
    :empty-title="emptyTitle"
    :empty-text="emptyText"
    @retry="$emit('retry')"
    ><div class="article-list">
      <ArticleCard
        v-for="(article, i) in articles"
        :key="article.id"
        :article="article"
        :index="offset + i"
      /></div
  ></AsyncState>
</template>
