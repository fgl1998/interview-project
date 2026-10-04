<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { api } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { useLatestTask } from '@/composables/useLatestTask'
import { useAction } from '@/composables/useAction'
import { validateProfile } from '@/utils/validation'
import AsyncState from '@/components/AsyncState.vue'
import UserAvatar from '@/components/UserAvatar.vue'

const auth = useAuthStore()
const task = useLatestTask()
const { loading, error } = task
const save = useAction()
const { busy, error: saveError } = save
const loaded = ref(false)
const username = ref('')
const form = reactive({ email: '', bio: '', image: '', password: '', confirmPassword: '' })
const validation = ref('')
function load() {
  loaded.value = false
  return task.run(
    () => api.user.current(),
    (user) => {
      username.value = user.username
      Object.assign(form, {
        email: user.email,
        bio: user.bio || '',
        image: user.image || '',
        password: '',
        confirmPassword: '',
      })
      loaded.value = true
      auth.updateUser(user, auth.token)
    },
  )
}
onMounted(load)
async function submit() {
  if (!loaded.value || busy.value || !auth.user) return
  validation.value = validateProfile(form)
  if (validation.value) return
  const owner = auth.user
  const token = auth.token
  const changes = {
    email: form.email.trim(),
    bio: form.bio,
    image: form.image.trim(),
    ...(form.password ? { password: form.password } : {}),
  }
  await save.run(
    () => api.user.update(changes),
    () => {
      auth.updateUser(
        { ...owner, email: changes.email, bio: changes.bio, image: changes.image },
        token,
      )
      form.password = ''
      form.confirmPassword = ''
      ElMessage.success('个人信息已保存')
    },
  )
}
</script>

<template>
  <div class="container page-space settings-layout">
    <aside class="settings-aside">
      <span class="eyebrow">YOUR ACCOUNT</span>
      <h1>个人信息</h1>
      <p>让大家更了解你。</p>
      <RouterLink
        v-if="auth.user"
        :to="{ name: 'profile', params: { username: auth.user.username } }"
        class="text-link"
        >← 返回我的主页</RouterLink
      >
      <div class="settings-preview">
        <UserAvatar
          :username="username || auth.user?.username || 'R'"
          :image="form.image"
          :size="88"
        /><strong>{{ username }}</strong
        ><span>{{ form.bio || '你的故事，由你来写。' }}</span>
      </div>
    </aside>
    <section class="surface settings-form">
      <AsyncState :loading="loading" :error="error" @retry="load"
        ><form v-if="loaded" class="stack-form" novalidate @submit.prevent="submit">
          <h2>编辑个人信息</h2>
          <el-alert
            v-if="validation || saveError"
            :title="validation || saveError"
            type="error"
            :closable="false"
            show-icon
          />
          <div class="form-field">
            <label for="username">用户名</label
            ><el-input id="username" :model-value="username" disabled /><span class="field-help"
              >用户名是你的唯一标识，不支持修改。</span
            >
          </div>
          <div class="form-field">
            <label for="email">邮箱</label
            ><el-input
              id="email"
              v-model="form.email"
              type="email"
              autocomplete="email"
              maxlength="255"
              :disabled="busy"
            />
          </div>
          <div class="form-field">
            <label for="bio">个人简介</label
            ><el-input
              id="bio"
              v-model="form.bio"
              type="textarea"
              :rows="3"
              placeholder="分享你的兴趣、工作或一句喜欢的话。"
              :disabled="busy"
            />
          </div>
          <div class="form-field">
            <label for="image">头像地址</label
            ><el-input
              id="image"
              v-model="form.image"
              maxlength="255"
              placeholder="https://example.com/avatar.jpg"
              :disabled="busy"
            /><span class="field-help">填写公开可访问的 HTTP(S) 图片链接，留空使用默认头像。</span>
          </div>
          <div class="form-divider" />
          <h3>修改密码 <span class="optional-label">可选</span></h3>
          <div class="form-row">
            <div class="form-field">
              <label for="password">新密码</label
              ><el-input
                id="password"
                v-model="form.password"
                type="password"
                show-password
                autocomplete="new-password"
                placeholder="留空保持原密码"
                :disabled="busy"
              />
            </div>
            <div class="form-field">
              <label for="confirmPassword">确认新密码</label
              ><el-input
                id="confirmPassword"
                v-model="form.confirmPassword"
                type="password"
                show-password
                autocomplete="new-password"
                placeholder="再次输入新密码"
                :disabled="busy"
              />
            </div>
          </div>
          <div class="form-actions">
            <span class="field-help">保存后立即更新个人主页。</span
            ><el-button type="primary" native-type="submit" size="large" :loading="busy"
              >保存修改</el-button
            >
          </div>
        </form></AsyncState
      >
    </section>
  </div>
</template>
