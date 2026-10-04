<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowRight } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { api } from '@/api/client'
import { errorMessage } from '@/api/http'
import { useAuthStore } from '@/stores/auth'
import { safeRedirect, validateCredentials, validateEmail } from '@/utils/validation'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const registering = computed(() => route.name === 'register')
const form = reactive({ username: '', email: '', password: '', confirmPassword: '' })
const busy = ref(false)
const error = ref('')
let active = true
watch(
  () => route.name,
  () => {
    error.value = ''
    form.password = ''
    form.confirmPassword = ''
    form.email = ''
    form.username = typeof route.query.username === 'string' ? route.query.username : ''
  },
  { immediate: true },
)
onBeforeUnmount(() => {
  active = false
  auth.cancelLogin()
  form.password = ''
  form.confirmPassword = ''
})

async function submit() {
  if (busy.value) return
  error.value = validateCredentials(form, registering.value)
  if (registering.value && !error.value && !validateEmail(form.email.trim()))
    error.value = '请输入有效邮箱'
  if (registering.value && !error.value && form.password !== form.confirmPassword)
    error.value = '两次输入的密码不一致'
  if (error.value) return
  busy.value = true
  const registerMode = registering.value
  const input = { username: form.username.trim(), password: form.password }
  try {
    if (registerMode) {
      await api.user.register({ ...input, email: form.email.trim() })
      if (!active) return
      ElMessage.success('注册成功，请登录')
      await router.replace({
        name: 'login',
        query: { username: input.username, redirect: safeRedirect(route.query.redirect) },
      })
    } else {
      const loggedIn = await auth.login(input)
      if (active && loggedIn) await router.replace(safeRedirect(route.query.redirect))
    }
  } catch (cause) {
    if (active) error.value = errorMessage(cause)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="auth-layout container">
    <aside class="auth-story">
      <span class="eyebrow">A PLACE FOR YOUR IDEAS</span>
      <h1>好的想法，<br />值得被看见<span class="accent-dot">。</span></h1>
      <p>分享你所热爱的，记录你所经历的。<br />从一篇文章开始，与世界产生连接。</p>
      <div class="story-graphic" aria-hidden="true">
        <div class="graphic-ring ring-one" />
        <div class="graphic-ring ring-two" />
        <div class="graphic-note">
          <span>今日灵感</span><strong>写下来，<br />就是一个开始。</strong><i>↗</i>
        </div>
      </div>
      <span class="story-bottom">REAL STORIES. REAL CONNECTIONS.</span>
    </aside>
    <section class="auth-panel">
      <div class="form-heading">
        <span class="eyebrow">{{ registering ? 'JOIN THE COMMUNITY' : 'WELCOME BACK' }}</span>
        <h2>{{ registering ? '创建你的账户' : '欢迎回来' }}</h2>
        <p>{{ registering ? '在这里，留下属于你的声音。' : '继续阅读，也继续表达。' }}</p>
      </div>
      <form class="stack-form" novalidate @submit.prevent="submit">
        <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon />
        <div class="form-field">
          <label for="username">用户名</label
          ><el-input
            id="username"
            v-model="form.username"
            autocomplete="username"
            maxlength="20"
            placeholder="你的用户名"
            :disabled="busy"
          />
        </div>
        <div v-if="registering" class="form-field">
          <label for="email">邮箱</label
          ><el-input
            id="email"
            v-model="form.email"
            type="email"
            autocomplete="email"
            maxlength="255"
            placeholder="you@example.com"
            :disabled="busy"
          />
        </div>
        <div class="form-field">
          <label for="password">密码</label
          ><el-input
            id="password"
            v-model="form.password"
            type="password"
            show-password
            :autocomplete="registering ? 'new-password' : 'current-password'"
            :placeholder="registering ? '6–20 位密码' : '输入你的密码'"
            :disabled="busy"
          />
        </div>
        <div v-if="registering" class="form-field">
          <label for="confirmPassword">确认密码</label
          ><el-input
            id="confirmPassword"
            v-model="form.confirmPassword"
            type="password"
            show-password
            autocomplete="new-password"
            placeholder="再次输入密码"
            :disabled="busy"
          />
        </div>
        <el-button
          type="primary"
          native-type="submit"
          size="large"
          :loading="busy"
          :icon="ArrowRight"
          class="full-width"
          >{{ registering ? '创建账户' : '登录' }}</el-button
        >
      </form>
      <p class="auth-switch">
        {{ registering ? '已经有账户？' : '还没有账户？'
        }}<RouterLink
          :to="{
            name: registering ? 'login' : 'register',
            query: { redirect: safeRedirect(route.query.redirect) },
          }"
          >{{ registering ? '去登录' : '立即注册' }}</RouterLink
        >
      </p>
    </section>
  </div>
</template>
