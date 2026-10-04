<script setup lang="ts">
import { nextTick, onMounted, onScopeDispose, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ChatDotRound,
  Promotion,
  Delete,
  ArrowDown,
  ArrowUp,
  Search,
  Collection,
  Document,
} from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { useAgentChat } from '@/composables/useAgentChat'
import AsyncState from '@/components/AsyncState.vue'
import MarkdownBody from '@/components/MarkdownBody.vue'
import UserAvatar from '@/components/UserAvatar.vue'

const auth = useAuthStore()
const chat = useAgentChat()
const {
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
} = chat
const scroller = ref<HTMLElement | null>(null)
const input = ref<HTMLTextAreaElement | null>(null)
const confirming = ref(false)
let active = true
onScopeDispose(() => {
  active = false
})
const suggestions = [
  { icon: Search, title: '发现好文章', question: '帮我找 Vue 相关的文章' },
  { icon: Collection, title: '回顾我的收藏', question: '看看我收藏了哪些文章' },
  { icon: Document, title: '整理我的创作', question: '总结我最近发布的文章' },
]

async function scrollToBottom() {
  await nextTick()
  if (scroller.value)
    scroller.value.scrollTop =
      messages.value.length || sending.value ? scroller.value.scrollHeight : 0
}
watch(() => [messages.value.length, sending.value, loading.value], scrollToBottom)
onMounted(() => {
  void chat.loadHistory()
})

function suggest(question: string) {
  if (busy.value || !loaded.value) return
  draft.value = question
  input.value?.focus()
}
function keydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return
  event.preventDefault()
  void chat.send()
}
async function confirmClear() {
  if (!canClear.value || confirming.value) return
  const token = auth.token
  confirming.value = true
  try {
    await ElMessageBox.confirm(
      '将删除当前账号的全部助手对话，且无法恢复。确定继续吗？',
      '清除对话历史',
      {
        confirmButtonText: '清除',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )
    if (active && token === auth.token && (await chat.clearHistory()))
      ElMessage.success('对话历史已清除')
  } catch {
    // 取消确认时保留当前对话。
  } finally {
    confirming.value = false
  }
}
</script>

<template>
  <div class="container agent-page">
    <aside class="agent-aside">
      <span class="eyebrow">REALWORLD ASSISTANT</span>
      <h1>智能助手<span class="brand-dot">.</span></h1>
      <p>从一个问题开始，<br />发现社区里的更多可能。</p>
      <div class="agent-intro-mark">
        <el-icon><ChatDotRound /></el-icon><span>让灵感，有回应。</span>
      </div>
      <div class="agent-capabilities">
        <div v-for="suggestion in suggestions" :key="suggestion.title">
          <el-icon><component :is="suggestion.icon" /></el-icon><span>{{ suggestion.title }}</span>
        </div>
      </div>
      <div class="agent-aside-note">
        <span class="agent-status-dot" />
        <p>对话随账号保存，<br />下次回来，可以接着聊。</p>
      </div>
      <RouterLink to="/" class="text-link">← 回到社区</RouterLink>
    </aside>

    <section class="surface agent-chat" aria-label="智能助手对话">
      <header class="agent-toolbar">
        <div class="agent-toolbar-title">
          <span class="agent-avatar">AI</span>
          <div><strong>RealWorld 助手</strong><span>查找、阅读，一起整理想法</span></div>
        </div>
        <el-button
          :icon="Delete"
          :disabled="!canClear || confirming"
          :loading="clearing"
          @click="confirmClear"
          >清除历史</el-button
        >
      </header>

      <div ref="scroller" class="agent-messages" :aria-busy="loading || sending">
        <AsyncState :loading="loading && !loaded" :error="historyError" @retry="chat.loadHistory">
          <div v-if="loaded && !messages.length" class="agent-welcome">
            <div class="agent-welcome-icon">
              <el-icon><ChatDotRound /></el-icon>
            </div>
            <span class="eyebrow">A LITTLE HELP, A NEW DISCOVERY</span>
            <h2>今天，想发现什么？</h2>
            <p>找一篇好文章，回顾收藏，或梳理自己的创作。<br />把问题交给我，我们一起找到答案。</p>
            <div class="agent-suggestions">
              <button
                v-for="suggestion in suggestions"
                :key="suggestion.question"
                type="button"
                @click="suggest(suggestion.question)"
              >
                <el-icon><component :is="suggestion.icon" /></el-icon
                ><strong>{{ suggestion.title }}</strong
                ><span>{{ suggestion.question }}</span
                ><span class="suggestion-arrow">↗</span>
              </button>
            </div>
          </div>

          <article
            v-for="message in messages"
            :id="message.id"
            :key="message.id"
            class="agent-message"
            :class="{
              'agent-message-user': message.role === 'user',
              'agent-message-process': message.type !== 'human' && message.label !== '智能助手',
            }"
          >
            <UserAvatar
              v-if="message.role === 'user'"
              :username="auth.user?.username || '你'"
              :image="auth.user?.image"
              :size="30"
            />
            <span v-else class="agent-avatar agent-message-avatar">{{
              message.type === 'tool' ? '↗' : 'AI'
            }}</span>
            <div class="agent-message-main">
              <button
                type="button"
                class="agent-message-heading"
                :aria-expanded="!message.collapsed"
                :aria-controls="`${message.id}-content`"
                @click="message.collapsed = !message.collapsed"
              >
                <strong>{{ message.label }}</strong
                ><span v-if="message.name || message.toolNames" class="agent-tool-name">{{
                  message.name || message.toolNames
                }}</span
                ><el-icon><ArrowDown v-if="message.collapsed" /><ArrowUp v-else /></el-icon>
              </button>
              <div
                v-if="!message.collapsed"
                :id="`${message.id}-content`"
                class="agent-message-body"
              >
                <p v-if="message.toolCallId" class="agent-message-meta">
                  调用 ID：{{ message.toolCallId }}
                </p>
                <MarkdownBody v-if="message.role === 'assistant'" :body="message.content" />
                <p v-else-if="message.role === 'user'" class="agent-user-text">
                  {{ message.content }}
                </p>
                <pre v-else class="agent-process-text">{{ message.content }}</pre>
                <div v-if="message.toolCallsText" class="agent-tool-calls">
                  <span>工具调用与参数</span>
                  <pre>{{ message.toolCallsText }}</pre>
                </div>
              </div>
              <div v-if="message.status === 'failed'" class="agent-send-error" role="alert">
                <span>{{ message.error }}</span
                ><el-button size="small" :disabled="busy" @click="chat.retry(message)"
                  >重试</el-button
                >
              </div>
            </div>
          </article>

          <div v-if="sending" class="agent-pending" role="status">
            <span class="agent-avatar">AI</span
            ><span class="agent-thinking-dots"><i /><i /><i /></span
            ><span>正在查找和整理，请稍候…</span>
          </div>
          <div v-if="processError" class="agent-process-error" role="alert">
            <strong>完整过程暂未加载</strong>
            <p>{{ processError }}</p>
            <el-button size="small" :disabled="busy" @click="chat.reloadProcess"
              >重新加载过程</el-button
            >
          </div>
          <div v-if="loading && loaded" class="agent-process-loading" role="status">
            正在加载执行过程…
          </div>
        </AsyncState>
      </div>

      <div class="agent-composer-wrap">
        <el-alert
          v-if="clearError"
          class="agent-clear-error"
          :title="clearError"
          type="error"
          :closable="false"
          show-icon
        />
        <form class="agent-composer" @submit.prevent="chat.send">
          <label for="agent-question">你的问题</label>
          <textarea
            id="agent-question"
            ref="input"
            v-model="draft"
            rows="3"
            maxlength="2000"
            :disabled="busy || !loaded || confirming"
            placeholder="输入你想查询的文章或关键词…"
            @keydown="keydown"
          />
          <div class="agent-composer-actions">
            <span
              >{{ draft.length }} / 2000<span class="agent-keyboard-hint">
                · Enter 发送，Shift + Enter 换行</span
              ></span
            ><el-button
              type="primary"
              native-type="submit"
              :icon="Promotion"
              :loading="sending"
              :disabled="!canSend || confirming"
              >{{ sending ? '等待回答' : '发送' }}</el-button
            >
          </div>
        </form>
        <p class="agent-composer-note">工具与执行过程默认收起，点击消息标题可查看完整内容。</p>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
.agent-page {
  display: grid;
  grid-template-columns: 245px minmax(0, 1fr);
  gap: 44px;
  padding-block: 38px 48px;
}
.agent-aside {
  padding-top: 20px;
}
.agent-aside h1 {
  margin-block: 12px 16px;
  font-size: 34px;
  letter-spacing: -1px;
}
.agent-aside > p {
  color: var(--muted);
  font-size: 14px;
  line-height: 1.9;
}
.agent-intro-mark {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-block: 38px 28px;
  color: var(--accent);
}
.agent-intro-mark > .el-icon {
  font-size: 52px;
  transform: rotate(-10deg);
}
.agent-intro-mark > span {
  font-size: 14px;
  font-weight: 600;
}
.agent-capabilities {
  display: grid;
  gap: 16px;
  padding-block: 24px;
  border-block: 1px solid var(--line);
}
.agent-capabilities > div {
  display: flex;
  gap: 12px;
  align-items: center;
  color: #556b60;
  font-size: 13px;
}
.agent-capabilities .el-icon {
  font-size: 18px;
  color: var(--accent);
}
.agent-aside-note {
  display: flex;
  align-items: baseline;
  gap: 9px;
  margin-top: 24px;
}
.agent-status-dot {
  flex-shrink: 0;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
}
.agent-aside-note p {
  font-size: 12px;
  color: var(--muted);
  line-height: 1.8;
  margin-bottom: 24px;
}
.agent-chat {
  display: flex;
  flex-direction: column;
  height: clamp(620px, calc(100dvh - 200px), 880px);
  min-width: 0;
  overflow: hidden;
  box-shadow: 0 12px 40px #23332f05;
}
.agent-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 18px 26px;
  border-bottom: 1px solid var(--line);
}
.agent-toolbar-title {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.agent-toolbar-title > div {
  display: grid;
  gap: 5px;
}
.agent-toolbar-title strong {
  font-size: 14px;
}
.agent-toolbar-title div > span {
  font-size: 11px;
  color: var(--muted);
}
.agent-toolbar .el-button {
  font-size: 12px;
}
.agent-avatar {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  background: #e8f0ee;
  color: var(--accent);
  border-radius: 10px 10px 10px 3px;
  font-size: 12px;
  font-weight: 750;
}
.agent-messages {
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  padding: 26px;
  scroll-behavior: smooth;
  scrollbar-width: thin;
  scrollbar-color: #cfdbd4 transparent;
}
.agent-welcome {
  padding-block: 0 8px;
  text-align: center;
}
.agent-welcome-icon {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  margin: 0 auto 10px;
  background: #edf4ec;
  color: var(--accent);
  font-size: 26px;
  border-radius: 16px 16px 16px 4px;
}
.agent-welcome .eyebrow {
  font-size: 9px;
  letter-spacing: 1.7px;
}
.agent-welcome h2 {
  font-size: 26px;
  letter-spacing: -0.6px;
  margin-block: 8px;
}
.agent-welcome > p {
  color: var(--muted);
  line-height: 1.8;
  font-size: 12px;
  margin-bottom: 0;
}
.agent-suggestions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
  text-align: left;
}
.agent-suggestions button {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 11px;
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #fbfcfa;
  color: var(--ink);
  text-align: left;
  transition:
    border-color 0.2s,
    background 0.2s;
}
.agent-suggestions button:hover {
  border-color: #99b5a0;
  background: #f3f8f2;
}
.agent-suggestions .el-icon {
  color: var(--accent);
  font-size: 20px;
}
.agent-suggestions strong {
  font-size: 12px;
}
.agent-suggestions button > span {
  font-size: 11px;
  color: var(--muted);
  line-height: 1.7;
}
.agent-suggestions .suggestion-arrow {
  position: absolute;
  right: 14px;
  top: 17px;
  color: var(--accent);
  font-size: 16px;
}
.agent-message {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 25px;
  min-width: 0;
}
.agent-message-avatar {
  width: 30px;
  height: 30px;
  font-size: 10px;
}
.agent-message-main {
  flex: 1;
  min-width: 0;
}
.agent-message-heading {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  min-height: 30px;
  padding: 4px 0;
  border: 0;
  background: transparent;
  color: var(--ink);
  text-align: left;
}
.agent-message-heading strong {
  font-size: 12px;
  flex-shrink: 0;
}
.agent-message-heading > .el-icon {
  margin-left: auto;
  font-size: 11px;
  color: var(--muted);
}
.agent-tool-name {
  font-size: 11px;
  color: var(--muted);
  overflow-wrap: anywhere;
}
.agent-message-body {
  margin-top: 8px;
  padding: 0 0 0 1px;
}
.agent-user-text {
  padding: 13px 17px;
  margin: 0;
  width: fit-content;
  max-width: 100%;
  background: #eff5ef;
  border-radius: 0 12px 12px 12px;
  font-size: 14px;
  line-height: 1.8;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.agent-message-process {
  margin-bottom: 14px;
}
.agent-message-process .agent-message-heading {
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 8px 12px;
  background: #fbfcfa;
}
.agent-message-process .agent-message-heading strong {
  color: #65776b;
}
.agent-message-meta {
  color: var(--muted);
  font-size: 11px;
  overflow-wrap: anywhere;
}
.agent-process-text,
.agent-tool-calls pre {
  margin: 0;
  padding: 13px;
  background: #f6f8f5;
  border: 1px solid var(--line);
  border-radius: 8px;
  font:
    12px/1.8 Consolas,
    monospace;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.agent-tool-calls {
  margin-top: 13px;
}
.agent-tool-calls > span {
  display: block;
  color: var(--muted);
  font-size: 11px;
  margin-bottom: 8px;
}
.agent-send-error {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #b54e44;
  font-size: 12px;
  margin-top: 10px;
}
.agent-pending {
  display: flex;
  gap: 12px;
  align-items: center;
  font-size: 12px;
  color: var(--muted);
  margin-top: 12px;
}
.agent-thinking-dots {
  display: flex;
  gap: 4px;
}
.agent-thinking-dots i {
  width: 4px;
  height: 4px;
  background: #85a38d;
  border-radius: 50%;
  animation: thinking 1.2s infinite;
}
.agent-thinking-dots i:nth-child(2) {
  animation-delay: 0.2s;
}
.agent-thinking-dots i:nth-child(3) {
  animation-delay: 0.4s;
}
.agent-process-error {
  margin-top: 18px;
  padding: 16px;
  border-radius: 10px;
  background: #fff8eb;
  border: 1px solid #eee3c7;
}
.agent-process-error strong {
  font-size: 12px;
  color: #836b31;
}
.agent-process-error p {
  color: #897e62;
  font-size: 12px;
  line-height: 1.7;
  margin-block: 9px;
}
.agent-process-loading {
  margin-top: 18px;
  color: var(--muted);
  font-size: 12px;
}
.agent-composer-wrap {
  padding: 16px 24px 12px;
  border-top: 1px solid var(--line);
  background: #fdfefc;
}
.agent-clear-error {
  margin-bottom: 12px;
}
.agent-composer {
  border: 1px solid #d8e3da;
  border-radius: 12px;
  padding: 13px 16px 12px;
  background: white;
  transition: border-color 0.2s;
}
.agent-composer:focus-within {
  border-color: #6b9b7c;
  box-shadow: 0 0 0 3px #176b5b08;
}
.agent-composer > label {
  display: block;
  color: #526c5a;
  font-size: 11px;
  font-weight: 600;
  margin-bottom: 9px;
}
.agent-composer textarea {
  width: 100%;
  display: block;
  resize: none;
  border: 0;
  outline: none;
  background: transparent;
  font-size: 13px;
  color: var(--ink);
  line-height: 1.7;
}
.agent-composer textarea::placeholder {
  color: #a2ada5;
}
.agent-composer textarea:disabled {
  opacity: 0.6;
}
.agent-composer-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
}
.agent-composer-actions > span {
  color: #98a69b;
  font-size: 10px;
}
.agent-composer-actions .el-button {
  padding-inline: 18px;
}
.agent-composer-note {
  margin: 10px 0 0;
  color: #97a499;
  font-size: 10px;
  text-align: center;
  line-height: 1.6;
}
:deep(.markdown-body) {
  font-size: 14px;
  line-height: 1.85;
  overflow-wrap: anywhere;
}
:deep(.markdown-body h1) {
  font-size: 24px;
}
:deep(.markdown-body h2) {
  font-size: 20px;
}
:deep(.markdown-body h3) {
  font-size: 17px;
}
:deep(.markdown-body > :last-child) {
  margin-bottom: 0;
}
:deep(.markdown-body table) {
  display: block;
  max-width: 100%;
  overflow-x: auto;
}
@keyframes thinking {
  0%,
  70%,
  100% {
    opacity: 0.3;
  }
  35% {
    opacity: 1;
  }
}
@media (max-width: 1050px) {
  .agent-page {
    grid-template-columns: 190px minmax(0, 1fr);
    gap: 25px;
  }
  .agent-aside h1 {
    font-size: 30px;
  }
  .agent-suggestions {
    gap: 8px;
  }
  .agent-keyboard-hint {
    display: none;
  }
}
@media (max-width: 760px) {
  .agent-page {
    display: block;
    padding-block: 22px 28px;
  }
  .agent-aside {
    padding-top: 0;
  }
  .agent-aside h1 {
    font-size: 27px;
    margin-block: 6px 18px;
  }
  .agent-aside > p,
  .agent-intro-mark,
  .agent-capabilities,
  .agent-aside-note,
  .agent-aside > a {
    display: none;
  }
  .agent-chat {
    height: max(620px, calc(100dvh - 210px));
    border-radius: 12px;
  }
  .agent-toolbar {
    padding: 14px 16px;
    gap: 8px;
  }
  .agent-toolbar-title {
    gap: 8px;
  }
  .agent-toolbar-title div > span {
    display: none;
  }
  .agent-toolbar .el-button {
    padding-inline: 10px;
  }
  .agent-messages {
    padding: 20px 16px;
  }
  .agent-welcome {
    padding-block: 10px;
  }
  .agent-welcome h2 {
    font-size: 23px;
  }
  .agent-welcome > p {
    font-size: 12px;
  }
  .agent-suggestions {
    grid-template-columns: 1fr;
    margin-top: 22px;
    gap: 8px;
  }
  .agent-suggestions button {
    display: grid;
    grid-template-columns: 24px 1fr;
    gap: 4px 10px;
    padding: 12px 14px;
  }
  .agent-suggestions button > .el-icon {
    grid-row: span 2;
    align-self: center;
  }
  .agent-suggestions button > span:not(.suggestion-arrow) {
    grid-column: 2;
  }
  .agent-composer-wrap {
    padding: 12px;
  }
  .agent-composer {
    padding: 12px;
  }
  .agent-message {
    gap: 8px;
  }
  .agent-tool-name {
    font-size: 10px;
  }
  .agent-pending {
    flex-wrap: wrap;
    gap: 8px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .agent-messages {
    scroll-behavior: auto;
  }
  .agent-thinking-dots i {
    animation: none;
  }
}
</style>
