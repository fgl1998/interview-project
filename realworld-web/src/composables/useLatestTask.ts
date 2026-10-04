import { onScopeDispose, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { errorMessage } from '@/api/http'

export function useLatestTask() {
  const loading = ref(false)
  const error = ref('')
  const auth = useAuthStore()
  let generation = 0
  onScopeDispose(() => {
    generation++
  })
  async function run<T>(loader: () => Promise<T>, apply: (result: T) => void) {
    const current = ++generation
    const token = auth.token
    loading.value = true
    error.value = ''
    try {
      const result = await loader()
      if (current === generation && token === auth.token) {
        apply(result)
        return true
      }
    } catch (cause) {
      if (current === generation && token === auth.token) error.value = errorMessage(cause)
    } finally {
      if (current === generation) loading.value = false
    }
    return false
  }
  return { loading, error, run }
}
