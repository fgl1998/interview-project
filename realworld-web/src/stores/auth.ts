import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { api } from '@/api/client'
import type { User, LoginResult, Credentials } from '@/api/types'
import { clearSession, cleanUser, readSession, saveSession } from '@/utils/session'

export const useAuthStore = defineStore('auth', () => {
  const saved = readSession()
  const token = ref(saved?.token ?? '')
  const user = ref<User | null>(saved?.user ?? null)
  const authenticated = computed(() => !!token.value && !!user.value)
  let revision = 0

  function setSession(session: LoginResult) {
    revision++
    token.value = session.token
    user.value = cleanUser(session.user)
    saveSession({ token: token.value, user: user.value })
  }
  async function login(credentials: Credentials) {
    const version = ++revision
    const result = await api.user.login(credentials)
    if (version !== revision) return false
    setSession(result)
    return true
  }
  function cancelLogin() {
    revision++
  }
  function updateUser(updated: User, ownerToken: string) {
    if (token.value !== ownerToken || user.value?.id !== updated.id) return
    user.value = cleanUser(updated)
    saveSession({ token: token.value, user: user.value })
  }
  function logout() {
    revision++
    token.value = ''
    user.value = null
    clearSession()
  }
  function sync() {
    revision++
    const session = readSession()
    token.value = session?.token ?? ''
    user.value = session?.user ?? null
  }
  return { token, user, authenticated, setSession, login, cancelLogin, updateUser, logout, sync }
})
