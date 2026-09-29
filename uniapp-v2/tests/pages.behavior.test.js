const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')

function deferred() {
  let resolve
  let reject
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

async function flushPromises() {
  await Promise.resolve()
  await Promise.resolve()
}

function loadPage(relativePath, injectedModules, uni = {}) {
  const absolutePath = path.join(root, relativePath)
  const source = fs.readFileSync(absolutePath, 'utf8')
  const match = source.match(/<script>([\s\S]*?)<\/script>/)
  assert.ok(match, `${relativePath} should contain a script block`)

  const localRequire = (request) => {
    if (Object.prototype.hasOwnProperty.call(injectedModules, request)) {
      return injectedModules[request]
    }
    return require(path.resolve(path.dirname(absolutePath), request))
  }
  const component = new Function('require', 'uni', match[1].replace(/export\s+default/, 'return'))(localRequire, uni)
  const instance = { ...component.data() }
  for (const [name, method] of Object.entries(component.methods || {})) {
    instance[name] = method.bind(instance)
  }
  return { component, instance }
}

function createSessionState(token, user) {
  const state = { token, user }
  const writes = []
  return {
    state,
    writes,
    module: {
      get() {
        return { token: state.token, user: state.user }
      },
      getToken() {
        return state.token
      },
      getUser() {
        return state.user
      },
      setUser(nextUser) {
        writes.push(nextUser)
        state.user = nextUser
      },
      clear() {
        state.token = ''
        state.user = null
      },
    },
  }
}

function rawArticle(id, title) {
  return {
    id,
    slug: `article-${id}`,
    title,
    description: `${title} summary`,
    body: `${title} body`,
    author: { author_id: id, username: `user-${id}` },
    tags: [],
    favorited: 0,
    favoritesCount: 0,
    createdAt: '2026-08-27T00:00:00.000Z',
  }
}

function rawComment(id, body) {
  return {
    id,
    article_id: 7,
    author_id: 1,
    author_username: 'alice',
    body,
    createdAt: '2026-08-27T00:00:00.000Z',
  }
}

test('article creation submits tag IDs and accepts a Java numeric article ID', async () => {
  const calls = []
  const toasts = []
  const urls = []
  const { instance } = loadPage('pages/article/create.vue', {
    '../../api/article': { create: async (body) => { calls.push(body); return 42 } },
    '../../api/tag': {},
    '../../common/session': {},
  }, {
    showToast: (toast) => toasts.push(toast),
    redirectTo: ({ url }) => urls.push(url),
  })
  instance.form = { title: ' Java ', description: 'Summary', body: 'Content' }
  instance.selectedTagIds = [1, 3]
  await instance.submitArticle()
  assert.deepEqual(calls, [{ title: 'Java', description: 'Summary', body: 'Content', tagsId: [1, 3] }])
  assert.deepEqual(urls, ['/pages/article/list?type=mine'])
  assert.equal(toasts.length, 1)
  assert.equal(toasts[0].icon, 'success')
  assert.equal(instance.submitting, false)
})

test('article creation requires a tag and accepts Java description length up to 255', async () => {
  let requests = 0
  const { instance } = loadPage('pages/article/create.vue', {
    '../../api/article': { create: async () => { requests += 1; return 42 } },
    '../../api/tag': {},
    '../../common/session': {},
  }, { showToast() {}, redirectTo() {} })
  instance.form = { title: 'Java', description: 'Summary', body: 'Content' }
  assert.match(instance.validateForm(), /标签/)
  await instance.submitArticle()
  assert.equal(requests, 0)
  instance.selectedTagIds = [1]
  instance.form.description = 'a'.repeat(255)
  assert.equal(instance.validateForm(), '')
  instance.form.description += 'a'
  assert.match(instance.validateForm(), /255/)
})

test('login page opens the registration page for users without an account', () => {
  const urls = []
  const { instance } = loadPage('pages/login/login.vue', {
    '../../api/user': {},
    '../../common/session': {},
  }, {
    navigateTo({ url }) {
      urls.push(url)
    },
  })

  instance.openRegister()

  assert.deepEqual(urls, ['/pages/register/register'])
})

test('registration creates the account then returns to login without signing in', async () => {
  const calls = []
  const destinations = []
  const toasts = []
  const { instance } = loadPage('pages/register/register.vue', {
    '../../api/user': {
      register(username, email, password) {
        calls.push({ method: 'register', username, email, password })
        return Promise.resolve({ id: 7, username, email })
      },
      login() {
        throw new Error('registration must not sign in automatically')
      },
    },
  }, {
    showToast(options) {
      toasts.push(options)
    },
    navigateBack() {
      destinations.push('login')
    },
  })
  instance.form = {
    username: ' alice ',
    email: ' alice@example.com ',
    password: 'secret',
    confirmPassword: 'secret',
  }

  await instance.handleRegister()

  assert.deepEqual(calls, [
    { method: 'register', username: 'alice', email: 'alice@example.com', password: 'secret' },
  ])
  assert.equal(toasts[0].title, '注册成功，请登录')
  assert.deepEqual(destinations, ['login'])
  assert.equal(instance.submitting, false)
})

test('registration rejects mismatched passwords before calling the API', async () => {
  let apiCalls = 0
  const toasts = []
  const { instance } = loadPage('pages/register/register.vue', {
    '../../api/user': {
      register() {
        apiCalls += 1
      },
      login() {
        apiCalls += 1
      },
    },
    '../../common/session': {},
  }, {
    showToast(options) {
      toasts.push(options)
    },
  })
  instance.form = {
    username: 'alice',
    email: 'alice@example.com',
    password: 'secret',
    confirmPassword: 'different',
  }

  await instance.handleRegister()

  assert.equal(apiCalls, 0)
  assert.equal(toasts[0].title, '两次输入的密码不一致')
})

test('registration rejects usernames over 20 characters and backend-invalid emails', async () => {
  let apiCalls = 0
  const toasts = []
  const { instance } = loadPage('pages/register/register.vue', {
    '../../api/user': {
      register() {
        apiCalls += 1
      },
      login() {
        apiCalls += 1
      },
    },
    '../../common/session': {},
  }, {
    showToast(options) {
      toasts.push(options)
    },
  })

  instance.form = {
    username: 'a'.repeat(21),
    email: 'alice@example.com',
    password: 'secret',
    confirmPassword: 'secret',
  }
  await instance.handleRegister()
  assert.equal(toasts[0].title, '用户名长度不能超过 20 个字符')

  instance.form.username = 'alice'
  instance.form.email = 'a..b@example.com'
  await instance.handleRegister()
  assert.equal(toasts[1].title, '邮箱格式错误')
  assert.equal(apiCalls, 0)
})

test('registration failure keeps the page and displays the backend error', async () => {
  const toasts = []
  const { instance } = loadPage('pages/register/register.vue', {
    '../../api/user': {
      register: () => Promise.reject(new Error('用户名已被使用')),
      login() {
        throw new Error('registration must not sign in automatically')
      },
    },
    '../../common/session': {},
  }, {
    showToast(options) {
      toasts.push(options)
    },
    navigateBack() {
      throw new Error('must not navigate')
    },
  })
  instance.form = {
    username: 'alice',
    email: 'alice@example.com',
    password: 'secret',
    confirmPassword: 'secret',
  }

  await instance.handleRegister()

  assert.equal(toasts[0].title, '用户名已被使用')
  assert.equal(instance.submitting, false)
})

test('registration page falls back to login when there is no page to navigate back to', () => {
  const destinations = []
  const { instance } = loadPage('pages/register/register.vue', {
    '../../api/user': {},
    '../../common/session': {},
  }, {
    navigateBack(options) {
      options.fail()
    },
    reLaunch({ url }) {
      destinations.push(url)
    },
  })

  instance.openLogin()

  assert.deepEqual(destinations, ['/pages/login/login'])
})

test('my page ignores a getUser response that resolves after logout', async () => {
  const request = deferred()
  const session = createSessionState('token-a', { id: 1, username: 'alice' })
  const { instance } = loadPage('pages/my/my.vue', {
    '../../api/user': { getUser: () => request.promise },
    '../../common/session': session.module,
  }, { reLaunch() {}, showToast() {} })

  const refresh = instance.restoreAndRefresh()
  instance.handleLogout()
  request.resolve({ id: 1, username: 'alice-new' })
  await refresh

  assert.deepEqual(session.state, { token: '', user: null })
  assert.deepEqual(session.writes, [])
  assert.deepEqual(instance.userInfo, {})
})

test('my page starts a new generation for a changed token and ignores the old account response', async () => {
  const requestA = deferred()
  const requestB = deferred()
  let requestCount = 0
  const session = createSessionState('token-a', { id: 1, username: 'alice' })
  const { instance } = loadPage('pages/my/my.vue', {
    '../../api/user': {
      getUser() {
        requestCount += 1
        return requestCount === 1 ? requestA.promise : requestB.promise
      },
    },
    '../../common/session': session.module,
  }, { reLaunch() {}, showToast() {} })

  const refreshA = instance.restoreAndRefresh()
  session.state.token = 'token-b'
  session.state.user = { id: 2, username: 'bob-cached' }
  const refreshB = instance.restoreAndRefresh()
  requestA.resolve({ id: 1, username: 'alice-new' })
  requestB.resolve({ id: 2, username: 'bob-new' })
  await Promise.all([refreshA, refreshB])

  assert.equal(requestCount, 2)
  assert.deepEqual(session.writes, [{ id: 2, username: 'bob-new' }])
  assert.deepEqual(instance.userInfo, { id: 2, username: 'bob-new' })
})

test('my page refreshes all four user-center counts from real APIs', async () => {
  const session = createSessionState('token-a', { id: 7, username: 'alice' })
  const { instance } = loadPage('pages/my/my.vue', {
    '../../api/user': { getUser: async () => ({ id: 7, username: 'alice' }) },
    '../../api/profile': {
      followingList: async (userId) => userId === 7 ? [{ id: 2 }, { id: 3 }] : [],
      followedList: async (userId) => userId === 7 ? [{ id: 4 }] : [],
    },
    '../../api/article': {
      getArticleListByUserId: async (userId) => userId === 7 ? [rawArticle(1, 'mine'), rawArticle(2, 'mine')] : [],
      getFavoriteArticleListByUserId: async (userId) => userId === 7 ? [rawArticle(3, 'favorite')] : [],
    },
    '../../common/session': session.module,
  }, { reLaunch() {}, showToast() {} })

  await instance.restoreAndRefresh()

  assert.equal(instance.stats.followingCount, 2)
  assert.equal(instance.stats.followersCount, 1)
  assert.equal(instance.stats.articlesCount, 2)
  assert.equal(instance.stats.favoritesCount, 1)
  assert.equal(instance.relationStatsLoading, false)
  assert.equal(instance.relationStatsError, '')
})

test('my page clears old relation counts when a new account profile refresh fails', async () => {
  const session = createSessionState('token-b', { id: 8, username: 'bob' })
  const { instance } = loadPage('pages/my/my.vue', {
    '../../api/user': { getUser: async () => { throw new Error('资料加载失败') } },
    '../../api/profile': { followingList: async () => [], followedList: async () => [] },
    '../../common/session': session.module,
  }, { reLaunch() {}, showToast() {} })
  instance.activeSessionToken = 'token-a'
  instance.stats.followingCount = 9
  instance.stats.followersCount = 6

  await instance.restoreAndRefresh()

  assert.equal(instance.stats.followingCount, '--')
  assert.equal(instance.stats.followersCount, '--')
  assert.equal(instance.relationStatsLoading, false)
  assert.ok(instance.relationStatsError)
})

test('comment creation queues a fresh list request behind an in-flight list request', async () => {
  const firstList = deferred()
  const secondList = deferred()
  let listCalls = 0
  const { instance } = loadPage('pages/article/detail.vue', {
    '../../api/article': {
      listComments() {
        listCalls += 1
        return listCalls === 1 ? firstList.promise : secondList.promise
      },
      createComment: async () => rawComment(2, 'new comment'),
    },
    '../../common/session': {},
  }, { showToast() {} })
  instance.article = rawArticle(7, 'Article')
  instance.commentBody = 'new comment'

  const initialLoad = instance.loadComments()
  const creation = instance.submitComment()
  await flushPromises()
  assert.equal(listCalls, 1)

  firstList.resolve([rawComment(1, 'stale')])
  await flushPromises()
  assert.equal(listCalls, 2)

  secondList.resolve([rawComment(1, 'stale'), rawComment(2, 'new comment')])
  await Promise.all([initialLoad, creation])
  assert.equal(instance.commentBody, '')
  assert.deepEqual(instance.comments.map((comment) => comment.id), [1, 2])
})

test('comment deletion queues a fresh list request and blocks concurrent creation', async () => {
  const firstList = deferred()
  const secondList = deferred()
  const deletion = deferred()
  let listCalls = 0
  let createCalls = 0
  const { instance } = loadPage('pages/article/detail.vue', {
    '../../api/article': {
      listComments() {
        listCalls += 1
        return listCalls === 1 ? firstList.promise : secondList.promise
      },
      deleteComment: () => deletion.promise,
      createComment: async () => {
        createCalls += 1
      },
    },
    '../../common/session': {},
  }, { showToast() {} })
  instance.article = rawArticle(7, 'Article')
  instance.currentUser = { id: 1 }
  instance.commentBody = 'must wait'
  const ownComment = { ...rawComment(1, 'delete me'), author: { id: 1, username: 'alice' } }

  const initialLoad = instance.loadComments()
  const remove = instance.deleteComment(ownComment)
  const create = instance.submitComment()
  await flushPromises()
  assert.equal(createCalls, 0)

  deletion.resolve(true)
  await flushPromises()
  firstList.resolve([rawComment(1, 'stale')])
  await flushPromises()
  assert.equal(listCalls, 2)

  secondList.resolve([])
  await Promise.all([initialLoad, remove, create])
  assert.deepEqual(instance.comments, [])
})

test('home page queues reset during append and discards the invalidated append response', async () => {
  const appendRequest = deferred()
  const resetRequest = deferred()
  const calls = []
  const session = createSessionState('token-a', { id: 1 })
  const { instance } = loadPage('pages/index/index.vue', {
    '../../api/article': {
      list(input) {
        calls.push(input)
        return calls.length === 1 ? appendRequest.promise : resetRequest.promise
      },
    },
    '../../common/session': session.module,
  })
  instance.isLoggedIn = true
  instance.activeToken = 'token-a'
  instance.articles = [rawArticle(1, 'existing')]
  instance.page = 2

  const append = instance.loadArticles(false)
  const reset = instance.loadArticles(true)
  appendRequest.resolve({ items: [rawArticle(2, 'stale append')], totalPages: 2 })
  await flushPromises()
  assert.equal(calls.length, 2)
  assert.deepEqual(calls.map((call) => call.page), [2, 1])
  assert.deepEqual(instance.articles.map((article) => article.id), [1])

  resetRequest.resolve({ items: [rawArticle(3, 'fresh reset')], totalPages: 1 })
  await Promise.all([append, reset])
  assert.deepEqual(instance.articles.map((article) => article.id), [3])
})

test('home page retries the failed request mode instead of always resetting', async () => {
  const calls = []
  const session = createSessionState('token-a', { id: 1 })
  const { instance } = loadPage('pages/index/index.vue', {
    '../../api/article': {
      list(input) {
        calls.push(input)
        return calls.length === 1
          ? Promise.reject(new Error('append failed'))
          : Promise.resolve({ items: [rawArticle(3, 'page three')], totalPages: 3 })
      },
    },
    '../../common/session': session.module,
  })
  instance.isLoggedIn = true
  instance.activeToken = 'token-a'
  instance.articles = [rawArticle(1, 'existing')]
  instance.page = 3

  await instance.loadArticles(false)
  await instance.retryLoad()

  assert.deepEqual(calls.map((call) => call.page), [3, 3])
})

test('home page ignores an old-token response and then installs the queued new-token reset', async () => {
  const requestA = deferred()
  const requestB = deferred()
  const calls = []
  const session = createSessionState('token-a', { id: 1 })
  const { instance } = loadPage('pages/index/index.vue', {
    '../../api/article': {
      list(input) {
        calls.push({ ...input, token: session.state.token })
        return calls.length === 1 ? requestA.promise : requestB.promise
      },
    },
    '../../common/session': session.module,
  })
  instance.isLoggedIn = true
  instance.activeToken = 'token-a'

  const refreshA = instance.loadArticles(true)
  session.state.token = 'token-b'
  session.state.user = { id: 2 }
  const refreshB = instance.loadArticles(true)
  requestA.resolve({ items: [rawArticle(1, 'account A')], totalPages: 1 })
  await flushPromises()
  assert.equal(calls.length, 2)
  assert.deepEqual(instance.articles, [])

  requestB.resolve({ items: [rawArticle(2, 'account B')], totalPages: 1 })
  await Promise.all([refreshA, refreshB])
  assert.deepEqual(calls.map((call) => call.token), ['token-a', 'token-b'])
  assert.deepEqual(instance.articles.map((article) => article.id), [2])
})

test('relation page loads the current user following list from the profile API', async () => {
  const calls = []
  const session = createSessionState('token-a', { id: 7, username: 'alice' })
  const { component, instance } = loadPage('pages/profile/relation.vue', {
    '../../api/profile': {
      followingList(userId) {
        calls.push({ method: 'followingList', userId })
        return Promise.resolve([{ id: 2, username: 'bob', bio: null }])
      },
      followedList() {
        throw new Error('wrong endpoint')
      },
    },
    '../../common/session': session.module,
  }, { setNavigationBarTitle() {}, reLaunch() {}, showToast() {} })

  await component.onLoad.call(instance, { type: 'following' })

  assert.deepEqual(calls, [{ method: 'followingList', userId: 7 }])
  assert.deepEqual(instance.users.map((user) => user.username), ['bob'])
  assert.equal(instance.loading, false)
  assert.equal(instance.errorMessage, '')
})

test('relation page loads another user relation list from the route user id', async () => {
  const calls = []
  const session = createSessionState('token-a', { id: 7, username: 'alice' })
  const { component, instance } = loadPage('pages/profile/relation.vue', {
    '../../api/profile': {
      followingList() {
        throw new Error('wrong endpoint')
      },
      followedList(userId) {
        calls.push(userId)
        return Promise.resolve([{ id: 3, username: 'carol' }])
      },
    },
    '../../common/session': session.module,
  }, { setNavigationBarTitle() {}, reLaunch() {}, showToast() {} })

  await component.onLoad.call(instance, { type: 'followers', userId: '8', username: 'bob' })

  assert.deepEqual(calls, [8])
  assert.equal(instance.userId, 8)
  assert.equal(instance.pageTitle, 'bob的粉丝')
})

test('relation page loads followers and exposes a retryable error state', async () => {
  let attempts = 0
  const session = createSessionState('token-a', { id: 7, username: 'alice' })
  const { component, instance } = loadPage('pages/profile/relation.vue', {
    '../../api/profile': {
      followingList() {
        throw new Error('wrong endpoint')
      },
      followedList() {
        attempts += 1
        return attempts === 1
          ? Promise.reject(new Error('粉丝加载失败'))
          : Promise.resolve([{ id: 3, username: 'carol', bio: 'hello' }])
      },
    },
    '../../common/session': session.module,
  }, { setNavigationBarTitle() {}, reLaunch() {}, showToast() {} })

  await component.onLoad.call(instance, { type: 'followers' })
  assert.equal(instance.errorMessage, '粉丝加载失败')
  assert.deepEqual(instance.users, [])

  await instance.loadUsers()
  assert.equal(attempts, 2)
  assert.equal(instance.errorMessage, '')
  assert.deepEqual(instance.users.map((user) => user.username), ['carol'])
})

test('relation page discards an old-account response and reloads with the new session user', async () => {
  const requestA = deferred()
  const requestB = deferred()
  const calls = []
  const session = createSessionState('token-a', { id: 7, username: 'alice' })
  const { component, instance } = loadPage('pages/profile/relation.vue', {
    '../../api/profile': {
      followingList(userId) {
        calls.push(userId)
        return userId === 7 ? requestA.promise : requestB.promise
      },
      followedList() {
        throw new Error('wrong endpoint')
      },
    },
    '../../common/session': session.module,
  }, { setNavigationBarTitle() {}, reLaunch() {}, showToast() {} })

  const loadA = component.onLoad.call(instance, { type: 'following' })
  session.state.token = 'token-b'
  session.state.user = { id: 8, username: 'bob' }
  const loadB = instance.loadUsers()
  assert.deepEqual(calls, [7, 8])

  requestA.resolve([{ id: 2, username: 'old-user' }])
  await flushPromises()
  assert.deepEqual(instance.users, [])

  requestB.resolve([{ id: 3, username: 'new-user' }])
  await Promise.all([loadA, loadB])
  assert.deepEqual(instance.users.map((user) => user.username), ['new-user'])
  assert.equal(instance.userId, 8)
})

test('article list page loads and normalizes the selected real user article list', async () => {
  const calls = []
  const session = createSessionState('token-a', { id: 7, username: 'alice' })
  const raw = rawArticle(11, '收藏文章')
  raw.author = undefined
  raw.author_id = 2
  raw.author_username = 'bob'
  delete raw.favoritesCount
  raw.favorites_count = 5
  const { component, instance } = loadPage('pages/article/list.vue', {
    '../../api/article': {
      getArticleListByUserId() {
        throw new Error('wrong endpoint')
      },
      getFavoriteArticleListByUserId(userId) {
        calls.push(userId)
        return Promise.resolve([raw])
      },
    },
    '../../common/session': session.module,
  }, { setNavigationBarTitle() {}, reLaunch() {}, navigateTo() {} })

  await component.onLoad.call(instance, { type: 'favorites' })

  assert.deepEqual(calls, [7])
  assert.equal(instance.articles[0].author.username, 'bob')
  assert.equal(instance.articles[0].favoritesCount, 5)
  assert.equal(instance.loading, false)
  assert.equal(instance.errorMessage, '')
  assert.equal(instance.canDelete, false)
})

test('article list page loads another user articles from the route user id', async () => {
  const calls = []
  const session = createSessionState('token-a', { id: 7, username: 'alice' })
  const { component, instance } = loadPage('pages/article/list.vue', {
    '../../api/article': {
      getArticleListByUserId(userId) {
        calls.push(userId)
        return Promise.resolve([rawArticle(12, '他的文章')])
      },
      getFavoriteArticleListByUserId() {
        throw new Error('wrong endpoint')
      },
    },
    '../../common/session': session.module,
  }, { setNavigationBarTitle() {}, reLaunch() {}, navigateTo() {} })

  await component.onLoad.call(instance, { type: 'mine', userId: '8', username: 'bob' })

  assert.deepEqual(calls, [8])
  assert.equal(instance.userId, 8)
  assert.equal(instance.pageTitle, 'bob的文章')
  assert.equal(instance.canDelete, false)
})

test('my article list confirms deletion and removes the deleted article', async () => {
  const deleteCalls = []
  const toasts = []
  const session = createSessionState('token-a', { id: 7, username: 'alice' })
  const { component, instance } = loadPage('pages/article/list.vue', {
    '../../api/article': {
      getArticleListByUserId: async () => [rawArticle(11, '我的文章')],
      getFavoriteArticleListByUserId() {
        throw new Error('wrong endpoint')
      },
      deleteArticle(articleId) {
        deleteCalls.push(articleId)
        return Promise.resolve()
      },
    },
    '../../common/session': session.module,
  }, {
    setNavigationBarTitle() {},
    reLaunch() {},
    showModal(options) {
      options.success({ confirm: true, cancel: false })
    },
    showToast(options) {
      toasts.push(options)
    },
  })

  await component.onLoad.call(instance, { type: 'mine' })
  assert.equal(instance.canDelete, true)

  await instance.confirmDelete(instance.articles[0])

  assert.deepEqual(deleteCalls, [11])
  assert.deepEqual(instance.articles, [])
  assert.equal(toasts[0].title, '文章已删除')
})

test('another user article list cannot invoke article deletion', async () => {
  let modalCalls = 0
  let deleteCalls = 0
  const session = createSessionState('token-a', { id: 7, username: 'alice' })
  const { component, instance } = loadPage('pages/article/list.vue', {
    '../../api/article': {
      getArticleListByUserId: async () => [rawArticle(12, '他的文章')],
      deleteArticle() {
        deleteCalls += 1
      },
    },
    '../../common/session': session.module,
  }, {
    setNavigationBarTitle() {},
    reLaunch() {},
    showModal() {
      modalCalls += 1
    },
  })

  await component.onLoad.call(instance, { type: 'mine', userId: '8', username: 'bob' })
  await instance.confirmDelete(instance.articles[0])

  assert.equal(instance.canDelete, false)
  assert.equal(modalCalls, 0)
  assert.equal(deleteCalls, 0)
})

test('article deletion locks before confirmation and cancel never calls the API', async () => {
  const modalRequests = []
  let deleteCalls = 0
  const session = createSessionState('token-a', { id: 7, username: 'alice' })
  const { component, instance } = loadPage('pages/article/list.vue', {
    '../../api/article': {
      getArticleListByUserId: async () => [rawArticle(13, '待删除文章')],
      deleteArticle() {
        deleteCalls += 1
      },
    },
    '../../common/session': session.module,
  }, {
    setNavigationBarTitle() {},
    reLaunch() {},
    showModal(options) {
      modalRequests.push(options)
    },
  })
  await component.onLoad.call(instance, { type: 'mine' })

  const first = instance.confirmDelete(instance.articles[0])
  const second = instance.confirmDelete(instance.articles[0])
  assert.equal(modalRequests.length, 1)

  modalRequests[0].success({ confirm: false, cancel: true })
  await Promise.all([first, second])

  assert.equal(deleteCalls, 0)
  assert.equal(instance.deletingArticleId, 0)
  assert.equal(instance.articles.length, 1)
})

test('failed article deletion keeps the article and releases the deletion state', async () => {
  const toasts = []
  const session = createSessionState('token-a', { id: 7, username: 'alice' })
  const { component, instance } = loadPage('pages/article/list.vue', {
    '../../api/article': {
      getArticleListByUserId: async () => [rawArticle(14, '删除失败文章')],
      deleteArticle: async () => {
        throw new Error('删除接口失败')
      },
    },
    '../../common/session': session.module,
  }, {
    setNavigationBarTitle() {},
    reLaunch() {},
    showModal(options) {
      options.success({ confirm: true })
    },
    showToast(options) {
      toasts.push(options)
    },
  })
  await component.onLoad.call(instance, { type: 'mine' })

  await instance.confirmDelete(instance.articles[0])

  assert.deepEqual(instance.articles.map((article) => article.id), [14])
  assert.equal(instance.deletingArticleId, 0)
  assert.equal(toasts[0].title, '删除接口失败')
})

test('refresh cannot invalidate an in-flight article deletion', async () => {
  const deleteRequest = deferred()
  let listCalls = 0
  const session = createSessionState('token-a', { id: 7, username: 'alice' })
  const { component, instance } = loadPage('pages/article/list.vue', {
    '../../api/article': {
      getArticleListByUserId: async () => {
        listCalls += 1
        return [rawArticle(15, '正在删除文章')]
      },
      deleteArticle: () => deleteRequest.promise,
    },
    '../../common/session': session.module,
  }, {
    setNavigationBarTitle() {},
    reLaunch() {},
    showModal(options) {
      options.success({ confirm: true })
    },
    showToast() {},
  })
  await component.onLoad.call(instance, { type: 'mine' })

  const deletion = instance.confirmDelete(instance.articles[0])
  await flushPromises()
  await instance.loadArticles()
  assert.equal(listCalls, 1)

  deleteRequest.resolve()
  await deletion
  assert.deepEqual(instance.articles, [])
  assert.equal(instance.deletingArticleId, 0)
})

test('old article deletion response cannot modify a newly signed-in account list', async () => {
  const deleteRequest = deferred()
  const session = createSessionState('token-a', { id: 7, username: 'alice' })
  const { component, instance } = loadPage('pages/article/list.vue', {
    '../../api/article': {
      getArticleListByUserId: async (userId) => userId === 7
        ? [rawArticle(16, '旧账号文章')]
        : [rawArticle(17, '新账号文章')],
      deleteArticle: () => deleteRequest.promise,
    },
    '../../common/session': session.module,
  }, {
    setNavigationBarTitle() {},
    reLaunch() {},
    showModal(options) {
      options.success({ confirm: true })
    },
    showToast() {},
  })
  await component.onLoad.call(instance, { type: 'mine' })

  const deletion = instance.confirmDelete(instance.articles[0])
  await flushPromises()
  session.state.token = 'token-b'
  session.state.user = { id: 8, username: 'bob' }
  await instance.loadArticles()

  deleteRequest.resolve()
  await deletion
  assert.deepEqual(instance.articles.map((article) => article.id), [17])
  assert.equal(instance.deletingArticleId, 0)
})

test('real author profile loads counts and follows through profile APIs', async () => {
  const followCalls = []
  const session = createSessionState('token-a', { id: 7, username: 'alice' })
  const { component, instance } = loadPage('pages/profile/detail.vue', {
    '../../api/profile': {
      get: async () => ({ id: 8, username: 'bob', bio: 'hello', following: 0 }),
      followingList: async () => [{ id: 1 }, { id: 2 }],
      followedList: async () => [{ id: 3 }],
      follow: async (userId) => {
        followCalls.push(userId)
        return { following: true }
      },
      unfollow: async () => ({ following: false }),
    },
    '../../api/article': {
      getArticleListByUserId: async () => [rawArticle(1, 'one'), rawArticle(2, 'two')],
    },
    '../../common/session': session.module,
  }, { setNavigationBarTitle() {}, reLaunch() {}, showToast() {} })

  await component.onLoad.call(instance, { username: 'bob' })
  assert.equal(instance.profile.username, 'bob')
  assert.equal(instance.followingCount, 2)
  assert.equal(instance.followersCount, 1)
  assert.equal(instance.articleCount, 2)

  await instance.toggleFollow()
  assert.deepEqual(followCalls, [8])
  assert.equal(instance.profile.following, true)
  assert.equal(instance.followersCount, 2)
})

test('author profile stats navigate to that author relation and article lists', () => {
  const urls = []
  const session = createSessionState('token-a', { id: 7, username: 'alice' })
  const { instance } = loadPage('pages/profile/detail.vue', {
    '../../api/profile': {},
    '../../api/article': {},
    '../../common/session': session.module,
  }, {
    navigateTo({ url }) {
      urls.push(url)
    },
  })
  instance.profile = { id: 8, username: 'bob' }

  instance.openRelation('following')
  instance.openRelation('followers')
  instance.openArticles()

  assert.deepEqual(urls, [
    '/pages/profile/relation?type=following&userId=8&username=bob',
    '/pages/profile/relation?type=followers&userId=8&username=bob',
    '/pages/article/list?type=mine&userId=8&username=bob',
  ])
})

test('author profile ignores a follow response after the signed-in account changes', async () => {
  const followRequest = deferred()
  const session = createSessionState('token-a', { id: 7, username: 'alice' })
  const { instance } = loadPage('pages/profile/detail.vue', {
    '../../api/profile': {
      follow: () => followRequest.promise,
      unfollow: async () => ({ following: false }),
    },
    '../../api/article': {},
    '../../common/session': session.module,
  }, { showToast() {} })
  instance.profile = { id: 8, username: 'bob', following: false }
  instance.followersCount = 3

  const follow = instance.toggleFollow()
  session.state.token = 'token-b'
  session.state.user = { id: 9, username: 'carol' }
  followRequest.resolve({ following: true })
  await follow

  assert.equal(instance.profile.following, false)
  assert.equal(instance.followersCount, 3)
  assert.equal(instance.followSubmitting, false)
})

test('author profile ignores profile data when the session user changes with the same token', async () => {
  const profileRequest = deferred()
  const session = createSessionState('shared-token', { id: 7, username: 'alice' })
  const { component, instance } = loadPage('pages/profile/detail.vue', {
    '../../api/profile': {
      get: () => profileRequest.promise,
      followingList: async () => [],
      followedList: async () => [],
    },
    '../../api/article': {
      getArticleListByUserId: async () => [],
    },
    '../../common/session': session.module,
  }, { setNavigationBarTitle() {}, reLaunch() {}, showToast() {} })

  const load = component.onLoad.call(instance, { username: 'bob' })
  session.state.user = { id: 9, username: 'carol' }
  profileRequest.resolve({ id: 8, username: 'bob', following: true })
  await load

  assert.equal(instance.profile, null)
})

test('author profile suppresses an old follow error after the session user changes', async () => {
  const followRequest = deferred()
  const toasts = []
  const session = createSessionState('shared-token', { id: 7, username: 'alice' })
  const { instance } = loadPage('pages/profile/detail.vue', {
    '../../api/profile': {
      follow: () => followRequest.promise,
      unfollow: async () => ({ following: false }),
    },
    '../../api/article': {},
    '../../common/session': session.module,
  }, {
    showToast(options) {
      toasts.push(options)
    },
  })
  instance.profile = { id: 8, username: 'bob', following: false }

  const follow = instance.toggleFollow()
  session.state.user = { id: 9, username: 'carol' }
  followRequest.reject(new Error('旧账号关注失败'))
  await follow

  assert.deepEqual(toasts, [])
  assert.equal(instance.followSubmitting, false)
})
