<script setup lang="ts">
import { Star, ArrowRight } from '@element-plus/icons-vue'
import type { Article } from '@/api/types'
import { formatDate, readingMinutes } from '@/utils/format'
import UserAvatar from './UserAvatar.vue'
defineProps<{ article: Article; index?: number }>()
</script>

<template>
  <article class="article-card">
    <span v-if="index !== undefined" class="article-number" aria-hidden="true">{{
      String(index + 1).padStart(2, '0')
    }}</span>
    <div class="article-card-content">
      <div class="article-byline">
        <RouterLink
          :to="{ name: 'profile', params: { username: article.authorUsername } }"
          class="author-link"
          ><UserAvatar
            :username="article.authorUsername"
            :image="article.authorImage"
            :size="28"
          /><span>{{ article.authorUsername }}</span></RouterLink
        ><span class="byline-dot">·</span
        ><time :datetime="article.createdAt">{{ formatDate(article.createdAt) }}</time>
      </div>
      <RouterLink
        :to="{ name: 'article', params: { slug: article.slug } }"
        class="article-main-link"
        ><h2>{{ article.title }}</h2>
        <p>{{ article.description }}</p></RouterLink
      >
      <div class="article-card-footer">
        <div class="tag-list">
          <span v-for="tag in article.tags" :key="tag" class="topic-tag">{{ tag }}</span
          ><span v-if="!article.tags?.length" class="muted">随笔</span>
        </div>
        <div class="article-card-meta">
          <span>{{ readingMinutes(article.body) }} 分钟阅读</span
          ><span :class="{ 'is-favorited': article.favorited }"
            ><el-icon><Star /></el-icon>{{ article.favoritesCount || 0 }}</span
          ><RouterLink
            :to="{ name: 'article', params: { slug: article.slug } }"
            class="read-arrow"
            aria-label="阅读文章"
            ><el-icon><ArrowRight /></el-icon
          ></RouterLink>
        </div>
      </div>
    </div>
  </article>
</template>
