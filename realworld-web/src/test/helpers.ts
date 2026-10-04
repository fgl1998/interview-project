import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { Article } from '@/api/types'

export const demoArticle: Article = {
  id: 10,
  slug: 'vue-thinking',
  title: '从 Vue 3 开始的工程实践',
  description: '记录一次完整的实践。',
  body: '# Vue 3\n一起学习。',
  createdAt: '2026-09-29T10:30:00',
  updatedAt: '2026-09-29T10:30:00',
  authorId: 12,
  authorUsername: 'writer',
  authorImage: '',
  favorited: false,
  favoritesCount: 2,
  tags: ['Vue'],
}

export async function pageContext(path = '/', loggedIn = true) {
  localStorage.clear()
  const pinia = createPinia()
  setActivePinia(pinia)
  const auth = useAuthStore()
  if (loggedIn)
    auth.setSession({ token: 'jwt', user: { id: 7, username: 'fang', email: 'f@example.org' } })
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<div />' } },
      { path: '/login', name: 'login', component: { template: '<div />' } },
      { path: '/register', name: 'register', component: { template: '<div />' } },
      { path: '/settings', name: 'settings', component: { template: '<div />' } },
      { path: '/editor', name: 'editor', component: { template: '<div />' } },
      { path: '/articles/:slug', name: 'article', component: { template: '<div />' } },
      { path: '/profiles/:username', name: 'profile', component: { template: '<div />' } },
    ],
  })
  await router.push(path)
  await router.isReady()
  return { pinia, router, auth }
}
