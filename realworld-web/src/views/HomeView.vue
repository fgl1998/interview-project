<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Search, ArrowRight, EditPen } from '@element-plus/icons-vue'
import { api } from '@/api/client'
import type { Article, Tag } from '@/api/types'
import { useAuthStore } from '@/stores/auth'
import { useLatestTask } from '@/composables/useLatestTask'
import ArticleList from '@/components/ArticleList.vue'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const articles = ref<Article[]>([])
const tags = ref<Tag[]>([])
const total = ref(0)
const search = ref('')
const task = useLatestTask()
const { loading, error } = task
const tagTask = useLatestTask()
const { loading: tagsLoading, error: tagsError } = tagTask
const page = computed(() => Math.max(1, Math.floor(Number(route.query.page) || 1)))
const keyword = computed(() => (typeof route.query.q === 'string' ? route.query.q : ''))
function load() {
  search.value = keyword.value
  if (!auth.authenticated) return
  return task.run(
    () => api.articles.list({ pageNumber: page.value, pageSize: 10, keyWord: keyword.value }),
    (data) => {
      articles.value = data.list
      total.value = data.total
    },
  )
}
function loadTags() {
  if (auth.authenticated)
    return tagTask.run(
      () => api.tags(),
      (data) => {
        tags.value = data
      },
    )
}
watch([keyword, page, () => auth.token], load, { immediate: true })
watch(() => auth.token, loadTags, { immediate: true })
function submitSearch() {
  void router.push({ path: '/', query: search.value.trim() ? { q: search.value.trim() } : {} })
}
function changePage(value: number) {
  void router.push({
    path: '/',
    query: {
      ...(keyword.value ? { q: keyword.value } : {}),
      ...(value > 1 ? { page: String(value) } : {}),
    },
  })
}
</script>

<template>
  <div class="container home-page">
    <section class="community-hero">
      <div class="hero-copy">
        <span class="eyebrow">READ. WRITE. CONNECT.</span>
        <h1>让想法在这里发生<span>。</span></h1>
        <p>一些经验，一点灵感，一种新的视角。<br />在真实的分享中，发现更大的世界。</p>
        <RouterLink to="/editor" class="hero-cta"
          >分享你的第一篇文章 <el-icon><ArrowRight /></el-icon
        ></RouterLink>
      </div>
      <div class="hero-art" aria-hidden="true">
        <div class="hero-orbit" />
        <div class="hero-art-word">Ideas<br /><em>into</em><br />stories.</div>
        <span class="hero-art-star">✳</span
        ><span class="hero-art-caption">EVERY VOICE MATTERS</span>
      </div>
    </section>
    <div class="feed-layout">
      <section class="feed-main">
        <div class="section-heading">
          <div>
            <span class="eyebrow">THE COMMUNITY FEED</span>
            <h2>
              发现好文章<span v-if="auth.authenticated" class="count-label">{{ total }}</span>
            </h2>
          </div>
          <span class="subtle-label">新鲜观点 · 最新发布</span>
        </div>
        <template v-if="auth.authenticated"
          ><form role="search" class="search-form" @submit.prevent="submitSearch">
            <el-input
              id="article-search"
              v-model="search"
              :prefix-icon="Search"
              placeholder="搜索标题、摘要或正文…"
              clearable
              aria-label="搜索文章"
            /><el-button native-type="submit">搜索</el-button>
          </form>
          <div v-if="keyword" class="search-summary">
            “{{ keyword }}” 的搜索结果<el-button link type="primary" @click="router.push('/')"
              >清除搜索</el-button
            >
          </div>
          <ArticleList
            :articles="articles"
            :loading="loading"
            :error="error"
            :offset="(page - 1) * 10"
            @retry="load" /><el-pagination
            v-if="!loading && !error && total > 10"
            class="feed-pagination"
            background
            layout="prev, pager, next"
            :total="total"
            :page-size="10"
            :current-page="page"
            @current-change="changePage"
        /></template>
        <div v-else class="welcome-gate">
          <span class="gate-symbol" aria-hidden="true">↗</span>
          <h3>你的下一次发现，从这里开始。</h3>
          <p>登录后阅读社区文章、收藏喜欢的内容，<br />也让你的想法被更多人看见。</p>
          <RouterLink to="/login"
            ><el-button type="primary" size="large">登录，开始探索</el-button></RouterLink
          ><RouterLink to="/register" class="text-link">创建新账户 →</RouterLink>
        </div>
      </section>
      <aside class="feed-sidebar">
        <section class="sidebar-block">
          <span class="eyebrow">TOPICS</span>
          <h3>话题标签</h3>
          <template v-if="auth.authenticated"
            ><el-skeleton v-if="tagsLoading" :rows="2" animated />
            <div v-else-if="tagsError" class="sidebar-error">
              <p>{{ tagsError }}</p>
              <el-button link type="primary" @click="loadTags">重试</el-button>
            </div>
            <div v-else class="sidebar-tags">
              <span v-for="tag in tags" :key="tag.id" class="topic-tag">{{ tag.name }}</span
              ><span v-if="!tags.length" class="muted">暂时没有标签</span>
            </div></template
          >
          <p v-else class="muted">登录后，发现社区正在讨论的话题。</p>
        </section>
        <section class="writing-note">
          <el-icon><EditPen /></el-icon>
          <h3>你也有故事值得分享</h3>
          <p>一次踩坑、一份心得、一个新发现。<br />写下它，可能正好帮助某个人。</p>
          <RouterLink to="/editor">开始写作 <span>↗</span></RouterLink>
        </section>
        <div class="sidebar-footnote">
          <span class="tiny-line" />
          <p>保持好奇，持续表达。</p>
          <strong>RealWorld.</strong>
        </div>
      </aside>
    </div>
  </div>
</template>
