<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { EditPen, Promotion } from '@element-plus/icons-vue'
import { api } from '@/api/client'
import type { Tag } from '@/api/types'
import { useAuthStore } from '@/stores/auth'
import { useLatestTask } from '@/composables/useLatestTask'
import { useAction } from '@/composables/useAction'
import { validateArticle } from '@/utils/validation'
import AsyncState from '@/components/AsyncState.vue'
import MarkdownBody from '@/components/MarkdownBody.vue'

const auth = useAuthStore()
const router = useRouter()
const form = reactive({ title: '', description: '', body: '', tagsId: [] as number[] })
const tags = ref<Tag[]>([])
const preview = ref(false)
const validation = ref('')
const tagTask = useLatestTask()
const { loading, error } = tagTask
const action = useAction()
const { busy, error: saveError } = action
function loadTags() {
  return tagTask.run(
    () => api.tags(),
    (data) => {
      tags.value = data
    },
  )
}
onMounted(loadTags)
async function submit() {
  if (busy.value || loading.value || !auth.user) return
  validation.value = validateArticle(form)
  if (validation.value) return
  const username = auth.user.username
  const input = {
    title: form.title.trim(),
    description: form.description.trim(),
    body: form.body,
    tagsId: [...form.tagsId],
  }
  await action.run(
    () => api.articles.create(input),
    async () => {
      ElMessage.success('文章已发布')
      await router.push({ name: 'profile', params: { username } })
    },
  )
}
</script>

<template>
  <div class="container page-space editor-layout">
    <section>
      <div class="editor-heading">
        <div>
          <span class="eyebrow">SHARE YOUR STORY</span>
          <h1>写一篇新文章</h1>
        </div>
        <el-icon size="28" color="#89a67a"><EditPen /></el-icon>
      </div>
      <form class="surface stack-form editor-form" novalidate @submit.prevent="submit">
        <el-alert
          v-if="validation || saveError"
          :title="validation || saveError"
          type="error"
          :closable="false"
          show-icon
        />
        <div class="form-field">
          <label for="title">文章标题</label
          ><el-input
            id="title"
            v-model="form.title"
            maxlength="100"
            show-word-limit
            placeholder="一个让人想读下去的标题"
            :disabled="busy"
          />
        </div>
        <div class="form-field">
          <label for="description">文章摘要</label
          ><el-input
            id="description"
            v-model="form.description"
            type="textarea"
            :rows="2"
            maxlength="255"
            show-word-limit
            placeholder="用一两句话，介绍这篇文章。"
            :disabled="busy"
          />
        </div>
        <div class="form-field">
          <label id="tag-label">话题标签</label
          ><AsyncState
            :loading="loading"
            :error="error"
            :empty="!tags.length"
            empty-title="暂时没有可选标签"
            empty-text="请先在后台配置文章标签，再发布文章。"
            @retry="loadTags"
            ><el-checkbox-group v-model="form.tagsId" aria-labelledby="tag-label" :disabled="busy"
              ><el-checkbox-button v-for="tag in tags" :key="tag.id" :value="tag.id">{{
                tag.name
              }}</el-checkbox-button></el-checkbox-group
            ></AsyncState
          ><span class="field-help">至少选择一个，让感兴趣的人找到你的文章。</span>
        </div>
        <div class="form-field">
          <div class="editor-mode">
            <label for="body">文章正文</label
            ><el-radio-group v-model="preview" size="small" :disabled="busy"
              ><el-radio-button :value="false">编辑</el-radio-button
              ><el-radio-button :value="true">预览</el-radio-button></el-radio-group
            >
          </div>
          <div v-if="preview" class="editor-preview">
            <MarkdownBody v-if="form.body" :body="form.body" />
            <p v-else class="muted">写下正文后，即可在这里预览。</p>
          </div>
          <el-input
            v-else
            id="body"
            v-model="form.body"
            class="editor-textarea"
            type="textarea"
            :rows="15"
            placeholder="从你的第一个想法开始…&#10;&#10;支持 Markdown，例如 ## 标题、**粗体** 和代码块。"
            :disabled="busy"
          /><span class="field-help">支持 Markdown 格式 · {{ form.body.length }} 字符</span>
        </div>
        <div class="form-actions">
          <RouterLink to="/" class="text-link">← 返回发现</RouterLink
          ><el-button
            type="primary"
            native-type="submit"
            size="large"
            :icon="Promotion"
            :loading="busy"
            :disabled="loading || !!error || !tags.length"
            >发布文章</el-button
          >
        </div>
      </form>
    </section>
    <aside class="editor-side">
      <span class="eyebrow">A LITTLE INSPIRATION</span>
      <div class="writing-note">
        <h3>好的分享，来自真实的经历</h3>
        <p>不必追求完美。一个解决问题的过程、一段值得记录的经验，都值得写下来。</p>
      </div>
      <div class="sidebar-block" style="padding-top: 26px">
        <h3>让文章更好读</h3>
        <ul>
          <li>用简短的摘要说明主题。</li>
          <li>为长文章添加段落标题。</li>
          <li>使用代码块分享代码。</li>
          <li>选好标签，让读者找到你。</li>
        </ul>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.editor-mode {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
</style>
