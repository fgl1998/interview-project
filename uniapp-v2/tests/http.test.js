const test = require('node:test')
const assert = require('node:assert/strict')

const { createHttpClient, createUnauthorizedHandler } = require('../common/http')

test('Java HTTP 200 business 401 expires the current session', async () => {
  let unauthorizedCount = 0
  const client = createHttpClient({
    getToken: () => 'expired-token',
    requestAdapter: async () => ({ statusCode: 200, data: { success: false, code: 401, message: '登录已过期', data: null } }),
    onUnauthorized: () => { unauthorizedCount += 1 },
  })
  await assert.rejects(client.request('/api/articles/queryArticles'), { message: '登录已过期', code: 401, statusCode: 200 })
  assert.equal(unauthorizedCount, 1)
})

test('a delayed Java business 401 cannot clear a newer session', async () => {
  let token = 'old-token'
  let unauthorizedCount = 0
  const client = createHttpClient({
    getToken: () => token,
    requestAdapter: async () => {
      token = 'new-token'
      return { statusCode: 200, data: { success: false, code: 401, message: '登录已过期', data: null } }
    },
    onUnauthorized: () => { unauthorizedCount += 1 },
  })
  await assert.rejects(client.request('/api/users/7'), /登录已过期/)
  assert.equal(unauthorizedCount, 0)
})

test('GET user lookup supports a same-origin H5 base URL and authorization', async () => {
  let received
  const client = createHttpClient({
    baseUrl: '',
    getToken: () => 'java-token',
    requestAdapter: async (options) => {
      received = options
      return { statusCode: 200, data: { success: true, code: 200, message: 'success', data: { id: 7 } } }
    },
  })
  assert.deepEqual(await client.request('/api/users/7', {}, { method: 'GET' }), { id: 7 })
  assert.equal(received.method, 'GET')
  assert.equal(received.url, '/api/users/7')
  assert.equal(received.header.Authorization, 'Bearer java-token')
})

test('request forwards an explicit timeout without changing default requests', async () => {
  let received
  const client = createHttpClient({
    requestAdapter: async (options) => {
      received = options
      return { statusCode: 200, data: { success: true, data: { answer: 'ok' } } }
    },
  })
  await client.request('/api/agent/chat', { message: '你好' }, { timeout: 120000 })
  assert.equal(received.timeout, 120000)
})

test('request preserves nested Agent HTTP and business error messages and codes', async () => {
  for (const statusCode of [502, 200]) {
    const client = createHttpClient({
      requestAdapter: async () => ({
        statusCode,
        data: { success: false, error: { code: 'AGENT_EXECUTION_FAILED', message: 'Agent暂时无法完成请求' } },
      }),
    })
    await assert.rejects(client.request('/api/agent/chat'), (error) => {
      assert.equal(error.message, 'Agent暂时无法完成请求')
      assert.equal(error.code, 'AGENT_EXECUTION_FAILED')
      return true
    })
  }
})

test('request gives a readable uni timeout error', async () => {
  const client = createHttpClient({
    requestAdapter: async () => { throw { errMsg: 'request:fail timeout' } },
  })
  await assert.rejects(client.request('/api/agent/chat'), /超时/)
})

test('an old request returning 401 cannot clear a newly logged-in session', async () => {
  let token = 'old-token'
  let unauthorizedCount = 0
  const client = createHttpClient({
    getToken: () => token,
    requestAdapter: async () => {
      token = 'new-token'
      return { statusCode: 401, data: { success: false, error: { message: '登录已过期' } } }
    },
    onUnauthorized: () => { unauthorizedCount += 1 },
  })
  await assert.rejects(client.request('/api/agent/chat'), /登录已过期/)
  assert.equal(unauthorizedCount, 0)
})

test('request posts to injected base URL with Bearer token and returns response data', async () => {
  let received
  const client = createHttpClient({
    baseUrl: 'http://api.example.test',
    getToken: () => 'jwt-token',
    requestAdapter: async (options) => {
      received = options
      return { statusCode: 200, data: { success: true, code: 0, message: 'ok', data: { id: 1 } } }
    },
  })

  const data = await client.request('/articles', { title: 'Hello' })

  assert.deepEqual(data, { id: 1 })
  assert.deepEqual(received, {
    url: 'http://api.example.test/articles',
    method: 'POST',
    data: { title: 'Hello' },
    header: { Authorization: 'Bearer jwt-token' },
  })
})

test('request omits Authorization header when no token is available', async () => {
  let received
  const client = createHttpClient({
    baseUrl: 'http://api.example.test/',
    getToken: () => '',
    requestAdapter: async (options) => {
      received = options
      return { statusCode: 200, data: { success: true, data: [] } }
    },
  })

  await client.request('/tags')

  assert.equal(received.url, 'http://api.example.test/tags')
  assert.deepEqual(received.header, {})
})

test('request rejects readable business errors', async () => {
  const client = createHttpClient({
    requestAdapter: async () => ({ statusCode: 200, data: { success: false, code: 422, message: '标题不能为空' } }),
  })

  await assert.rejects(client.request('/articles'), /标题不能为空/)
})

test('request rejects readable HTTP errors', async () => {
  const client = createHttpClient({
    requestAdapter: async () => ({ statusCode: 500, data: { message: '服务暂不可用' } }),
  })

  await assert.rejects(client.request('/articles'), /服务暂不可用/)
})

test('401 calls injected unauthorized handler once before rejecting', async () => {
  let unauthorizedCount = 0
  const client = createHttpClient({
    requestAdapter: async () => ({ statusCode: 401, data: { message: '登录已过期' } }),
    onUnauthorized: () => {
      unauthorizedCount += 1
    },
  })

  await assert.rejects(client.request('/me'), /登录已过期/)
  assert.equal(unauthorizedCount, 1)
})

test('default unauthorized handler clears session and redirects when outside login page', () => {
  let cleared = 0
  let destination
  const handleUnauthorized = createUnauthorizedHandler({
    clearSession: () => {
      cleared += 1
    },
    getCurrentRoute: () => 'pages/articles/index',
    navigateToLogin: (url) => {
      destination = url
    },
  })

  handleUnauthorized()

  assert.equal(cleared, 1)
  assert.equal(destination, '/pages/login/login')
})

test('default unauthorized handler does not redirect again from login page', () => {
  let navigated = false
  const handleUnauthorized = createUnauthorizedHandler({
    clearSession: () => {},
    getCurrentRoute: () => 'pages/login/login',
    navigateToLogin: () => {
      navigated = true
    },
  })

  handleUnauthorized()

  assert.equal(navigated, false)
})
