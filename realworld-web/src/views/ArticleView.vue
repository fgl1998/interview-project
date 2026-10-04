<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Star, StarFilled, Delete } from '@element-plus/icons-vue'
import { api } from '@/api/client'
import type { Article, Comment } from '@/api/types'
import { useAuthStore } from '@/stores/auth'
import { useLatestTask } from '@/composables/useLatestTask'
import { useAction } from '@/composables/useAction'
import { formatDate, readingMinutes } from '@/utils/format'
import AsyncState from '@/components/AsyncState.vue'
import MarkdownBody from '@/components/MarkdownBody.vue'
import UserAvatar from '@/components/UserAvatar.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const article = ref<Article | null>(null)
const comments = ref<Comment[]>([])
const draft = ref('')
const validation = ref('')
const task = useLatestTask()
const { loading, error } = task
const commentTask = useLatestTask()
const { loading: commentsLoading, error: commentsError } = commentTask
const mutation = useAction()
const { busy, error: mutationError } = mutation
const own = computed(() => article.value?.authorId === auth.user?.id)
function loadComments() {
  if (!article.value) return
  const id = article.value.id
  return commentTask.run(
    () => api.articles.comments(id),
    (data) => {
      if (article.value?.id === id) comments.value = data
    },
  )
}
function load() {
  article.value = null
  comments.value = []
  draft.value = ''
  return task.run(
    () => api.articles.detail(String(route.params.slug)),
    (data) => {
      article.value = data
      if (data) {
        document.title = `${data.title} · RealWorld`
        void loadComments()
      }
    },
  )
}
watch(() => route.params.slug, load, { immediate: true })
async function toggleFavorite() {
  const entry = article.value
  if (!entry) return
  const wasFavorited = entry.favorited
  await mutation.run(
    () => (wasFavorited ? api.articles.unfavorite(entry.id) : api.articles.favorite(entry.id)),
    () => {
      if (article.value?.id !== entry.id) return
      entry.favorited = !wasFavorited
      entry.favoritesCount = Math.max(0, (entry.favoritesCount || 0) + (wasFavorited ? -1 : 1))
    },
  )
}
async function postComment() {
  const entry = article.value
  if (!entry || busy.value) return
  validation.value = draft.value.trim() ? '' : '请先写下评论'
  if (validation.value) return
  await mutation.run(
    () => api.articles.comment(entry.id, draft.value.trim()),
    async () => {
      draft.value = ''
      ElMessage.success('评论已发表')
      await loadComments()
    },
  )
}
async function deleteArticle() {
  if (!article.value || !own.value) return
  await mutation.run(
    () => api.articles.delete(article.value!.id),
    async () => {
      ElMessage.success('文章已删除')
      await router.push('/')
    },
  )
}
async function deleteComment(comment: Comment) {
  if (comment.authorId !== auth.user?.id) return
  await mutation.run(
    () => api.articles.deleteComment(comment.id),
    () => {
      comments.value = comments.value.filter((item) => item.id !== comment.id)
      ElMessage.success('评论已删除')
    },
  )
}
</script>

<template>
  <div class="container page-space">
    <RouterLink to="/" class="text-link">← 返回发现</RouterLink
    ><AsyncState
      :loading="loading"
      :error="error"
      :empty="!article"
      empty-title="文章不存在"
      empty-text="这篇文章可能已被删除，去首页看看其他内容吧。"
      @retry="load"
      ><div v-if="article" class="article-detail-layout">
        <article class="article-detail-main">
          <header class="article-detail-head">
            <div class="tag-list">
              <span v-for="tag in article.tags" :key="tag" class="topic-tag">{{ tag }}</span>
            </div>
            <h1>{{ article.title }}</h1>
            <p class="article-description">{{ article.description }}</p>
            <div class="article-byline">
              <RouterLink
                :to="{ name: 'profile', params: { username: article.authorUsername } }"
                class="author-link"
                ><UserAvatar
                  :username="article.authorUsername"
                  :image="article.authorImage"
                  :size="32"
                /><span>{{ article.authorUsername }}</span></RouterLink
              ><span>·</span
              ><time :datetime="article.createdAt">{{ formatDate(article.createdAt) }}</time
              ><span>·</span><span>{{ readingMinutes(article.body) }} 分钟阅读</span>
            </div>
          </header>
          <el-alert
            v-if="mutationError"
            class="article-operation-error"
            :title="mutationError"
            type="error"
            :closable="false"
            show-icon
          /><MarkdownBody class="article-body" :body="article.body" />
          <section class="comments-section">
            <div class="comments-heading">
              <h2>一起聊聊</h2>
              <span class="count-label">{{ comments.length }}</span>
            </div>
            <form class="comment-form" @submit.prevent="postComment">
              <UserAvatar
                :username="auth.user?.username || 'R'"
                :image="auth.user?.image"
                :size="36"
              />
              <div class="comment-form-content">
                <el-input
                  id="comment-body"
                  v-model="draft"
                  type="textarea"
                  :rows="3"
                  placeholder="分享你的想法，认真交流，友善表达。"
                  aria-label="评论内容"
                  :disabled="busy"
                />
                <p v-if="validation" class="comment-validation" role="alert">{{ validation }}</p>
                <el-button type="primary" native-type="submit" :loading="busy">发表评论</el-button>
              </div>
            </form>
            <AsyncState
              :loading="commentsLoading"
              :error="commentsError"
              :empty="!comments.length"
              empty-title="来写第一条评论吧"
              empty-text="你的观点，让讨论更有意思。"
              @retry="loadComments"
              ><div class="comment-list">
                <article v-for="comment in comments" :key="comment.id" class="comment-item">
                  <UserAvatar
                    :username="comment.authorUsername"
                    :image="comment.authorImage"
                    :size="34"
                  />
                  <div class="comment-content">
                    <div class="comment-meta">
                      <div>
                        <RouterLink
                          :to="{ name: 'profile', params: { username: comment.authorUsername } }"
                          >{{ comment.authorUsername }}</RouterLink
                        ><time :datetime="comment.createdAt">{{
                          formatDate(comment.createdAt, true)
                        }}</time>
                      </div>
                      <el-popconfirm
                        v-if="comment.authorId === auth.user?.id"
                        title="确定删除这条评论吗？"
                        confirm-button-text="删除"
                        cancel-button-text="取消"
                        @confirm="deleteComment(comment)"
                        ><template #reference
                          ><el-button
                            link
                            type="danger"
                            :icon="Delete"
                            :disabled="busy"
                            aria-label="删除评论" /></template
                      ></el-popconfirm>
                    </div>
                    <p class="comment-body">{{ comment.body }}</p>
                  </div>
                </article>
              </div></AsyncState
            >
          </section>
        </article>
        <aside class="surface article-author-panel">
          <span class="eyebrow">ABOUT THE AUTHOR</span
          ><UserAvatar
            style="margin-top: 20px"
            :username="article.authorUsername"
            :image="article.authorImage"
            :size="64"
          />
          <h3>{{ article.authorUsername }}</h3>
          <p>{{ article.authorBio || '每一篇分享，都藏着一个有趣的灵魂。' }}</p>
          <RouterLink
            :to="{ name: 'profile', params: { username: article.authorUsername } }"
            class="author-panel-link"
            >查看作者主页 →</RouterLink
          >
          <div class="form-divider" style="margin-bottom: 24px" />
          <el-button
            data-testid="favorite"
            :type="article.favorited ? 'primary' : 'default'"
            :icon="article.favorited ? StarFilled : Star"
            :loading="busy"
            @click="toggleFavorite"
            >{{ article.favorited ? '已收藏' : '收藏文章' }} ·
            {{ article.favoritesCount || 0 }}</el-button
          ><span class="field-help">喜欢这篇文章？收藏起来慢慢读。</span
          ><el-popconfirm
            v-if="own"
            title="删除后无法恢复，确定删除文章吗？"
            confirm-button-text="删除"
            cancel-button-text="取消"
            @confirm="deleteArticle"
            ><template #reference
              ><el-button
                type="danger"
                plain
                style="margin-top: 22px"
                :icon="Delete"
                :disabled="busy"
                >删除我的文章</el-button
              ></template
            ></el-popconfirm
          >
        </aside>
      </div></AsyncState
    >
  </div>
</template>

<style scoped>
.comment-validation {
  font-size: 12px;
  color: #c45656;
  margin: 10px 0;
}
</style>
