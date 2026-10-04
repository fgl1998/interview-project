import type { User } from '@/api/types'

export const SESSION_KEY = 'realworld.web.session'
export interface Session {
  token: string
  user: User
}

export function readSession(): Session | null {
  try {
    const value = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null') as Session | null
    if (
      !value ||
      typeof value.token !== 'string' ||
      !value.token.trim() ||
      !value.user ||
      !Number.isSafeInteger(value.user.id) ||
      value.user.id <= 0 ||
      typeof value.user.username !== 'string' ||
      !value.user.username ||
      typeof value.user.email !== 'string'
    )
      return null
    return { token: value.token, user: cleanUser(value.user) }
  } catch {
    return null
  }
}

export function cleanUser(user: User): User {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    bio: typeof user.bio === 'string' ? user.bio : '',
    image: typeof user.image === 'string' ? user.image : '',
  }
}
export function saveSession(session: Session) {
  try {
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ token: session.token, user: cleanUser(session.user) }),
    )
  } catch {
    /* 存储不可用时保留内存会话。 */
  }
}
export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    /* 隐私模式可能禁用存储。 */
  }
}
