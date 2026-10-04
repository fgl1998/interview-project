import type { AgentHistory, AgentHistoryMessage } from '@/api/agent'

export interface ChatMessage {
  id: string
  role: string
  type: string
  label: string
  name: string
  content: string
  toolNames: string
  toolCallsText: string
  toolCallId: string
  collapsed: boolean
  status: 'pending' | 'sent' | 'failed'
  error: string
}

function formatContent(content: unknown): string {
  if (typeof content === 'string') return content.trim()
  if (content == null) return ''
  if (!Array.isArray(content)) return JSON.stringify(content, null, 2)
  return content
    .map((block: unknown) => {
      if (block && typeof block === 'object' && 'type' in block && block.type === 'text') {
        if ('text' in block && typeof block.text === 'string') return block.text
      }
      return formatContent(block)
    })
    .filter(Boolean)
    .join('\n')
    .trim()
}

function label(message: AgentHistoryMessage) {
  if (message.type === 'human') return '你'
  if (message.type === 'tool') return '工具结果'
  if (message.type === 'system') return '系统消息'
  if (message.type === 'ai') {
    if (message.toolCalls?.length) return '工具调用'
    return message.isFinalAnswer ? '智能助手' : '执行过程'
  }
  return `消息 · ${message.type || 'unknown'}`
}

export function normalizeAgentHistory(result: AgentHistory): ChatMessage[] {
  if (!result || !Array.isArray(result.messages)) throw new Error('历史记录格式异常，请重试')
  return result.messages
    .map((message, position) => ({ message, position }))
    .filter(({ message }) => message && typeof message === 'object')
    .sort((a, b) => {
      const left = Number.isFinite(a.message.index) ? a.message.index : a.position
      const right = Number.isFinite(b.message.index) ? b.message.index : b.position
      return left - right || a.position - b.position
    })
    .map(({ message, position }) => {
      const calls = Array.isArray(message.toolCalls) ? message.toolCalls : []
      return {
        id: `history-${position}`,
        role:
          message.type === 'human' ? 'user' : message.type === 'ai' ? 'assistant' : message.type,
        type: message.type || 'unknown',
        label: label(message),
        name: message.name || '',
        content: formatContent(message.content) || '（无文本内容）',
        toolNames: calls
          .map((call) => {
            if (!call || typeof call !== 'object') return ''
            const data = call as { name?: string; function?: { name?: string } }
            return data.name || data.function?.name || ''
          })
          .filter(Boolean)
          .join('、'),
        toolCallsText: calls.length ? JSON.stringify(calls, null, 2) : '',
        toolCallId: message.toolCallId || '',
        collapsed:
          message.type !== 'human' &&
          !(message.type === 'ai' && message.isFinalAnswer && !calls.length),
        status: 'sent',
        error: '',
      }
    })
}
