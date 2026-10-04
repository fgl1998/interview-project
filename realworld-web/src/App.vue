<script setup lang="ts">
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import { useAuthStore } from '@/stores/auth'
import AppHeader from '@/components/AppHeader.vue'
const auth = useAuthStore()
</script>

<template>
  <el-config-provider :locale="zhCn">
    <a class="skip-link" href="#main-content">跳到正文</a>
    <AppHeader />
    <main id="main-content" class="site-main">
      <RouterView v-slot="{ Component, route }">
        <component
          :is="Component"
          :key="route.meta.requiresAuth ? `${route.path}:${auth.token}` : route.path"
        />
      </RouterView>
    </main>
    <footer class="site-footer container">
      <RouterLink to="/" class="footer-brand">RealWorld<span class="brand-dot">.</span></RouterLink>
      <span>记录想法，分享经验，与有趣的人一起成长。</span>
      <span class="footer-note">每一篇，都有新的发现。</span>
    </footer>
  </el-config-provider>
</template>
