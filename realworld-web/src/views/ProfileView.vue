<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Plus, Check, Setting, ArrowRight } from '@element-plus/icons-vue'
import { api } from '@/api/client'
import type { Article, Profile } from '@/api/types'
import { useAuthStore } from '@/stores/auth'
import { useLatestTask } from '@/composables/useLatestTask'
import { useAction } from '@/composables/useAction'
import AsyncState from '@/components/AsyncState.vue'
import ArticleList from '@/components/ArticleList.vue'
import UserAvatar from '@/components/UserAvatar.vue'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const profile = ref<Profile | null>(null)
const articles = ref<Article[]>([])
const relations = ref<Profile[]>([])
const task = useLatestTask()
const { loading, error } = task
const contentTask = useLatestTask()
const { loading: contentLoading, error: contentError } = contentTask
const action = useAction()
const { busy, error: followError } = action
const own = computed(() => !!profile.value && profile.value.id === auth.user?.id)
const tab = computed(() => {
  const value = route.query.tab
  if (value === 'following' || value === 'followers' || (value === 'favorites' && own.value))
    return value
  return 'articles'
})
const tabs = computed(() => [
  { key: 'articles', title: own.value ? '我的文章' : '他的文章' },
  ...(own.value ? [{ key: 'favorites', title: '我的收藏' }] : []),
  { key: 'following', title: '关注' },
  { key: 'followers', title: '粉丝' },
])
function loadContent() {
  if (!profile.value) return
  const id = profile.value.id
  articles.value = []
  relations.value = []
  if (tab.value === 'following' || tab.value === 'followers') {
    return contentTask.run(
      () => (tab.value === 'following' ? api.profile.following(id) : api.profile.followers(id)),
      (data) => {
        relations.value = data
      },
    )
  }
  return contentTask.run(
    () => (tab.value === 'favorites' ? api.articles.favorites() : api.articles.byAuthor(id)),
    (data) => {
      articles.value = data
    },
  )
}
function load() {
  profile.value = null
  articles.value = []
  relations.value = []
  return task.run(
    () => api.profile.get(String(route.params.username)),
    (data) => {
      profile.value = data
      if (data) {
        document.title = `${data.username} 的主页 · RealWorld`
        void loadContent()
      }
    },
  )
}
watch(() => route.params.username, load, { immediate: true })
watch(() => route.query.tab, loadContent)
function switchTab(key: string) {
  void router.replace({
    name: 'profile',
    params: { username: String(route.params.username) },
    query: key === 'articles' ? {} : { tab: key },
  })
}
async function toggleFollow() {
  const target = profile.value
  if (!target || own.value) return
  const following = !!target.following
  await action.run(
    () => (following ? api.profile.unfollow(target.id) : api.profile.follow(target.id)),
    () => {
      target.following = !following
      ElMessage.success(following ? '已取消关注' : '关注成功')
      if (tab.value === 'followers') void loadContent()
    },
  )
}
</script>

<template>
  <div class="container page-space">
    <AsyncState
      :loading="loading"
      :error="error"
      :empty="!profile"
      empty-title="用户不存在"
      empty-text="暂时找不到这个用户，去社区发现其他作者吧。"
      @retry="load"
      ><template v-if="profile"
        ><header class="profile-header">
          <UserAvatar :username="profile.username" :image="profile.image" :size="96" />
          <div class="profile-heading">
            <span class="eyebrow" style="margin-bottom: 9px">{{
              own ? 'YOUR LITTLE CORNER' : 'MEET THE WRITER'
            }}</span>
            <h1>{{ profile.username }}</h1>
            <p>{{ profile.bio || '还没有写下简介，但已经有故事在发生。' }}</p>
          </div>
          <div class="profile-header-actions">
            <RouterLink v-if="own" to="/settings"
              ><el-button :icon="Setting">编辑个人信息</el-button></RouterLink
            ><el-button
              v-else
              data-testid="follow"
              :type="profile.following ? 'default' : 'primary'"
              :icon="profile.following ? Check : Plus"
              :loading="busy"
              @click="toggleFollow"
              >{{ profile.following ? '已关注 · 取消关注' : '关注作者' }}</el-button
            >
          </div>
        </header>
        <el-alert
          v-if="followError"
          style="margin-top: 20px"
          :title="followError"
          type="error"
          :closable="false"
          show-icon
        />
        <nav class="profile-tabs" aria-label="个人主页内容">
          <button
            v-for="item in tabs"
            :key="item.key"
            :data-testid="`tab-${item.key}`"
            :class="{ active: tab === item.key }"
            :aria-current="tab === item.key ? 'page' : undefined"
            @click="switchTab(item.key)"
          >
            {{ item.title }}
          </button>
        </nav>
        <ArticleList
          v-if="tab === 'articles' || tab === 'favorites'"
          :articles="articles"
          :loading="contentLoading"
          :error="contentError"
          :empty-title="tab === 'favorites' ? '还没有收藏文章' : '还没有发布文章'"
          :empty-text="
            tab === 'favorites'
              ? '在阅读页收藏喜欢的文章，随时回来重读。'
              : '每一次分享，都可以从一个小小的想法开始。'
          "
          @retry="loadContent"
        />
        <AsyncState
          v-else
          :loading="contentLoading"
          :error="contentError"
          :empty="!relations.length"
          :empty-title="tab === 'following' ? '还没有关注其他作者' : '暂时还没有粉丝'"
          empty-text="在社区阅读、交流，与更多有趣的人建立连接。"
          @retry="loadContent"
          ><div class="relation-list">
            <RouterLink
              v-for="person in relations"
              :key="person.id"
              :to="{ name: 'profile', params: { username: person.username } }"
              class="relation-card"
              ><UserAvatar :username="person.username" :image="person.image" :size="44" />
              <div class="relation-text">
                <strong>{{ person.username }}</strong>
                <p>{{ person.bio || '去看看他的故事。' }}</p>
              </div>
              <el-icon color="#8ca183"><ArrowRight /></el-icon
            ></RouterLink></div
        ></AsyncState> </template
    ></AsyncState>
  </div>
</template>
