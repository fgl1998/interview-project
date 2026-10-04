import type { ArticleInput, Credentials, ProfileInput } from '@/api/types'

export function validateEmail(email: string) {
  return email.length <= 255 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}
export function validateCredentials(input: Credentials, registering = false) {
  if (!input.username.trim()) return '请输入用户名'
  if (input.username.trim().length > 20) return '用户名不能超过 20 个字符'
  if (!input.password.trim()) return '请输入密码'
  if (registering && (input.password.length < 6 || input.password.length > 20))
    return '密码长度必须为 6–20 位'
  return ''
}
export function validateProfile(input: ProfileInput & { confirmPassword: string }) {
  if (!validateEmail(input.email.trim())) return '请输入有效邮箱，长度不能超过 255 个字符'
  if (input.image) {
    try {
      const url = new URL(input.image)
      if (!['http:', 'https:'].includes(url.protocol) || input.image.length > 255)
        return '头像地址须为 HTTP(S) 链接，长度不能超过 255 个字符'
    } catch {
      return '头像地址须为完整 HTTP(S) 链接'
    }
  }
  if (input.password && (input.password.length < 6 || input.password.length > 20))
    return '新密码长度必须为 6–20 位'
  if ((input.password ?? '') !== input.confirmPassword) return '两次输入的密码不一致'
  return ''
}
export function validateArticle(input: ArticleInput) {
  if (!input.title.trim()) return '请输入文章标题'
  if (input.title.trim().length > 100) return '标题不能超过 100 个字符'
  if (!input.description.trim()) return '请输入文章摘要'
  if (input.description.trim().length > 255) return '摘要不能超过 255 个字符'
  if (!input.body.trim()) return '请输入文章正文'
  if (!input.tagsId.length) return '请至少选择一个标签'
  return ''
}
export function safeRedirect(value: unknown): string {
  if (typeof value !== 'string') return '/'
  try {
    const decoded = decodeURIComponent(value)
    if (
      !decoded.startsWith('/') ||
      decoded.startsWith('//') ||
      decoded.includes('\\') ||
      [...decoded].some((character) => character.charCodeAt(0) < 32)
    )
      return '/'
    const url = new URL(decoded, 'https://local.invalid')
    if (url.origin !== 'https://local.invalid' || /^\/(login|register)(\/|$)/.test(url.pathname))
      return '/'
    return value
  } catch {
    return '/'
  }
}
