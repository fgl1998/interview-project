import { computed, onScopeDispose, ref } from 'vue'
import { agentApi } from '@/api/agent'
import { errorMessage } from '@/api/http'
import { useAuthStore } from '@/stores/auth'
import { normalizeAgentHistory, type ChatMessage } from '@/utils/agentHistory'

export function useAgentChat() {
  const auth = useAuthStore()
  const ownerToken = auth.token
  const messages = ref<ChatMessage[]>([])
  const draft = ref('')
  const loading = ref(false)
  const loaded = ref(false)
  const sending = ref(false)
  const clearing = ref(false)
  const historyError = ref('')
  const processError = ref('')
  const clearError = ref('')
  let active = true
  let generation = 0
  let sequence = 0
  const busy = computed(() => loading.value || sending.value || clearing.value)
  const canSend = computed(
    () => loaded.value && !busy.value && !!draft.value.trim() && draft.value.trim().length <= 2000,
  )
  const canClear = computed(() => loaded.value && !busy.value && messages.value.length > 0)
  const current = (version: number) =>
    active && version === generation && !!ownerToken && auth.token === ownerToken
  onScopeDispose(() => {
    active = false
    generation++
  })

  async function loadHistory() {
    if (!active || busy.value || auth.token !== ownerToken) return
    const version = ++generation
    loading.value = true
    historyError.value = ''
    try {
      const result = await agentApi.history()
      if (!current(version)) return
      messages.value = normalizeAgentHistory(result)
      loaded.value = true
    } catch (error) {
      if (current(version)) historyError.value = errorMessage(error)
    } finally {
      if (current(version)) loading.value = false
    }
  }

  async function fetchProcess(version: number) {
    processError.value = ''
    try {
      const history = normalizeAgentHistory(await agentApi.history())
      if (!current(version)) return
      if (!history.length) throw new Error('服务端暂未返回本次过程，请稍后重新加载')
      const failed = messages.value.filter((message) => message.status === 'failed')
      messages.value = history.concat(failed)
    } catch (error) {
      if (current(version)) processError.value = errorMessage(error)
    }
  }

  async function reloadProcess() {
    if (!active || busy.value || !loaded.value || auth.token !== ownerToken) return
    const version = ++generation
    loading.value = true
    try {
      await fetchProcess(version)
    } finally {
      if (current(version)) loading.value = false
    }
  }

  function localMessage(content: string, role: 'user' | 'assistant'): ChatMessage {
    return {
      id: `local-${++sequence}`,
      role,
      type: role === 'user' ? 'human' : 'ai',
      label: role === 'user' ? '你' : '智能助手',
      name: '',
      content,
      toolNames: '',
      toolCallsText: '',
      toolCallId: '',
      collapsed: false,
      status: 'sent',
      error: '',
    }
  }

  async function requestAnswer(question: ChatMessage) {
    const version = ++generation
    sending.value = true
    question.status = 'pending'
    question.error = ''
    try {
      const result = await agentApi.chat(question.content)
      if (!current(version)) return
      const answer = typeof result?.answer === 'string' ? result.answer.trim() : ''
      if (!answer) throw new Error('助手暂时没有返回回答，请重试')
      question.status = 'sent'
      messages.value.splice(
        messages.value.indexOf(question) + 1,
        0,
        localMessage(answer, 'assistant'),
      )
      await fetchProcess(version)
    } catch (error) {
      if (!current(version)) return
      question.status = 'failed'
      question.error = errorMessage(error)
    } finally {
      if (current(version)) sending.value = false
    }
  }

  async function send() {
    if (!canSend.value || !active || auth.token !== ownerToken) return
    const question = localMessage(draft.value.trim(), 'user')
    messages.value.push(question)
    draft.value = ''
    // 使用列表中的响应式对象，保证失败状态立即呈现在页面上。
    await requestAnswer(messages.value[messages.value.length - 1]!)
  }

  async function retry(question: ChatMessage) {
    if (
      !active ||
      busy.value ||
      !loaded.value ||
      auth.token !== ownerToken ||
      question.status !== 'failed' ||
      !messages.value.includes(question)
    )
      return
    await requestAnswer(question)
  }

  async function clearHistory() {
    if (!canClear.value || !active || auth.token !== ownerToken) return false
    const version = ++generation
    clearing.value = true
    clearError.value = ''
    try {
      await agentApi.clearHistory()
      if (!current(version)) return false
      messages.value = []
      draft.value = ''
      processError.value = ''
      historyError.value = ''
      return true
    } catch (error) {
      if (current(version)) clearError.value = errorMessage(error)
      return false
    } finally {
      if (current(version)) clearing.value = false
    }
  }

  return {
    messages,
    draft,
    loading,
    loaded,
    sending,
    clearing,
    busy,
    canSend,
    canClear,
    historyError,
    processError,
    clearError,
    loadHistory,
    reloadProcess,
    send,
    retry,
    clearHistory,
  }
}
