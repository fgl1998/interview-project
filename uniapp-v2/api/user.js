const http = require('../common/http')
const session = require('../common/session')

function createUserApi(client, sessionStore = session) {
  const request = client.request

  return {
    register(username, email, password) {
      const input = typeof username === 'object' ? username : { username, email, password }
      return request('/api/users/register', {
        username: input.username,
        email: input.email,
        password: input.password,
      })
    },
    login(username, password) {
      const credentials = typeof username === 'object' ? username : { username, password }
      return request('/api/users/login', {
        username: credentials.username,
        password: credentials.password,
      })
    },
    async update(input) {
      const currentUser = sessionStore.getUser()
      if (!currentUser || !currentUser.id) throw new Error('登录信息不完整，请重新登录')
      const data = { id: currentUser.id }
      // 只允许更新资料字段，身份来自会话，用户名不参与更新。
      for (const field of ['email', 'bio', 'image']) {
        if (typeof input[field] === 'string') data[field] = input[field]
      }
      // 后台只要收到 password 就会重新加密，空密码必须省略。
      if (typeof input.password === 'string' && input.password.length > 0) data.password = input.password
      return request('/api/users/update', data)
    },
    async getUser() {
      const cachedUser = sessionStore.getUser()
      if (!cachedUser || !cachedUser.id) throw new Error('登录信息不完整，请重新登录')
      const user = await request(`/api/users/${encodeURIComponent(cachedUser.id)}`, {}, { method: 'GET' })
      // UserResponse 只有 id/username/email，简介和头像从 profile 补充。
      const profile = await request('/api/profile/findProfile', { username: user.username, userId: user.id })
      return { ...profile, ...user }
    },
  }
}

const userApi = createUserApi(http)

module.exports = {
  createUserApi,
  ...userApi,
}
