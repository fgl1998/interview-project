import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { ElMessage } from 'element-plus'
import 'element-plus/es/components/message/style/css'
import 'element-plus/es/components/message-box/style/css'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'
import { SESSION_KEY } from './utils/session'
import './styles/main.scss'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')

window.addEventListener('auth:expired', () => {
  ElMessage.warning('登录已过期，请重新登录')
  const route = router.currentRoute.value
  if (route.name !== 'login' && route.name !== 'register') {
    void router.replace({ name: 'login', query: { redirect: route.fullPath } })
  }
})
window.addEventListener('storage', (event) => {
  if (event.key !== SESSION_KEY && event.key !== null) return
  const auth = useAuthStore()
  auth.sync()
  if (!auth.authenticated && router.currentRoute.value.meta.requiresAuth) {
    void router.replace({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } })
  }
})
