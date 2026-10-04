import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { safeRedirect } from '@/utils/validation'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
      meta: { title: '发现' },
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/AuthView.vue'),
      meta: { title: '登录' },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/AuthView.vue'),
      meta: { title: '注册' },
    },
    {
      path: '/agent',
      name: 'agent',
      component: () => import('@/views/AgentView.vue'),
      meta: { title: '智能助手', requiresAuth: true },
    },
    {
      path: '/editor',
      name: 'editor',
      component: () => import('@/views/EditorView.vue'),
      meta: { title: '写文章', requiresAuth: true },
    },
    {
      path: '/articles/:slug',
      name: 'article',
      component: () => import('@/views/ArticleView.vue'),
      meta: { title: '文章', requiresAuth: true },
    },
    {
      path: '/profiles/:username',
      name: 'profile',
      component: () => import('@/views/ProfileView.vue'),
      meta: { title: '个人主页', requiresAuth: true },
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/SettingsView.vue'),
      meta: { title: '编辑个人信息', requiresAuth: true },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue'),
      meta: { title: '页面不存在' },
    },
  ],
  scrollBehavior(to, from, saved) {
    if (saved) return saved
    if (to.path === from.path && to.name === 'profile') return undefined
    return { top: 0 }
  },
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.authenticated)
    return { name: 'login', query: { redirect: to.fullPath } }
  if (auth.authenticated && (to.name === 'login' || to.name === 'register'))
    return safeRedirect(to.query.redirect)
})
router.afterEach((to) => {
  document.title = `${String(to.meta.title || '社区')} · RealWorld`
})
export default router
