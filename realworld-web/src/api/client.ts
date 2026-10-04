import { createApi } from './index'
import { createHttpClient } from './http'
import { useAuthStore } from '@/stores/auth'

export const authenticatedHttpOptions = {
  getToken: () => useAuthStore().token,
  onUnauthorized: () => {
    useAuthStore().logout()
    window.dispatchEvent(new CustomEvent('auth:expired'))
  },
}
const http = createHttpClient(authenticatedHttpOptions)
export const api = createApi(http.request, () => useAuthStore().user?.id)
