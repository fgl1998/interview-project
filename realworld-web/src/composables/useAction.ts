import { onScopeDispose, ref } from 'vue'
import { errorMessage } from '@/api/http'
import { useAuthStore } from '@/stores/auth'

export function useAction() {
  const busy = ref(false)
  const error = ref('')
  const auth = useAuthStore()
  let active = true
  onScopeDispose(() => {
    active = false
  })
  async function run<T>(action: () => Promise<T>, success: (result: T) => void | Promise<void>) {
    if (busy.value) return false
    busy.value = true
    error.value = ''
    const token = auth.token
    try {
      const result = await action()
      if (active && token === auth.token) {
        await success(result)
        return true
      }
    } catch (cause) {
      if (active && token === auth.token) error.value = errorMessage(cause)
    } finally {
      busy.value = false
    }
    return false
  }
  return { busy, error, run }
}
