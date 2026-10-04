<script setup lang="ts">
import { useRouter } from 'vue-router'
import {
  EditPen,
  ArrowDown,
  User,
  Setting,
  SwitchButton,
  ChatDotRound,
} from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import UserAvatar from './UserAvatar.vue'
const auth = useAuthStore()
const router = useRouter()
function command(value: string) {
  if (value === 'logout') {
    auth.logout()
    void router.replace('/')
    return
  }
  if (value === 'agent') void router.push('/agent')
  else if (value === 'settings') void router.push('/settings')
  else if (auth.user)
    void router.push({ name: 'profile', params: { username: auth.user.username } })
}
</script>

<template>
  <header class="site-header">
    <div class="header-inner container">
      <RouterLink to="/" class="brand" aria-label="RealWorld 首页"
        ><span class="brand-mark">R</span
        ><span>RealWorld<span class="brand-dot">.</span></span></RouterLink
      >
      <nav class="main-nav" aria-label="主导航">
        <RouterLink to="/" exact-active-class="nav-active">发现</RouterLink
        ><RouterLink to="/agent" active-class="nav-active">智能助手</RouterLink
        ><RouterLink
          v-if="auth.user"
          :to="{ name: 'profile', params: { username: auth.user.username } }"
          active-class="nav-active"
          >我的主页</RouterLink
        >
      </nav>
      <div class="header-actions">
        <RouterLink to="/editor" class="write-link"
          ><el-button type="primary" :icon="EditPen">写文章</el-button></RouterLink
        >
        <el-dropdown v-if="auth.user" trigger="click" @command="command">
          <button class="account-button" aria-label="账户菜单" data-testid="account-menu">
            <UserAvatar :username="auth.user.username" :image="auth.user.image" :size="32" /><span
              class="account-name"
              >{{ auth.user.username }}</span
            ><el-icon><ArrowDown /></el-icon>
          </button>
          <template #dropdown
            ><el-dropdown-menu
              ><el-dropdown-item command="profile" :icon="User">我的主页</el-dropdown-item
              ><el-dropdown-item command="agent" :icon="ChatDotRound">智能助手</el-dropdown-item
              ><el-dropdown-item command="settings" :icon="Setting">编辑个人信息</el-dropdown-item
              ><el-dropdown-item command="logout" :icon="SwitchButton" divided
                >退出登录</el-dropdown-item
              ></el-dropdown-menu
            ></template
          >
        </el-dropdown>
        <RouterLink v-else to="/login" class="login-link">登录 / 注册</RouterLink>
      </div>
    </div>
  </header>
</template>
