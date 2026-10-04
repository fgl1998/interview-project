import { createHttpClient } from './http'
import { authenticatedHttpOptions } from './client'

export interface AgentHistoryMessage {
  index: number
  id: string | null
  type: string
  name: string | null
  content: unknown
  toolCalls: unknown[]
  toolCallId: string | null
  isFinalAnswer: boolean
}
export interface AgentHistory {
  messages: AgentHistoryMessage[]
}

const http = createHttpClient({ ...authenticatedHttpOptions, timeout: 120000 })

export const agentApi = {
  chat(message: string) {
    return http.request<{ answer: string }>('/api/agent/chat', { message })
  },
  history() {
    return http.request<AgentHistory>('/api/agent/history', {}, 'POST', { timeout: 30000 })
  },
  clearHistory() {
    return http.request<void>('/api/agent/clear_history', {}, 'POST', { timeout: 30000 })
  },
}
