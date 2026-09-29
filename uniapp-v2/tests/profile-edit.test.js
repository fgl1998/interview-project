const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const savedUser = { id: 7, username: 'alice', email: 'alice@example.com', bio: 'Old bio', image: '' }

function deferred() {
  let resolve
  let reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

function setup(api = {}, relativePath = 'pages/my/edit.vue') {
  const state = { token: 'token-a', user: { ...savedUser } }
  const writes = []
  const requests = []
  const toasts = []
  const navigation = []
  const userApi = {
    getUser: async () => ({ ...savedUser }),
    update: async (input) => { requests.push(input); return null },
    ...api,
  }
  const session = {
    getToken: () => state.token,
    getUser: () => state.user,
    get: () => ({ ...state }),
    setUser: (user) => { state.user = user; writes.push(user) },
  }
  const uni = {
    showToast: (value) => toasts.push(value),
    reLaunch: ({ url }) => navigation.push(url),
    navigateTo: ({ url }) => navigation.push(url),
    navigateBack: () => navigation.push('back'),
    switchTab: ({ url }) => navigation.push(url),
  }
  const file = path.resolve(__dirname, '..', relativePath)
  const script = fs.readFileSync(file, 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1]
  const modules = { '../../api/user': userApi, '../../common/session': session }
  const component = new Function('require', 'uni', script.replace(/export\s+default/, 'return'))(
    (name) => modules[name] || require(path.resolve(path.dirname(file), name)), uni,
  )
  const page = { ...component.data() }
  for (const [name, method] of Object.entries(component.methods)) page[name] = method.bind(page)
  return { page, component, state, writes, requests, toasts, navigation }
}

test('my page opens a registered profile editor', () => {
  const { page, navigation } = setup({}, 'pages/my/my.vue')
  page.openEditProfile()
  assert.deepEqual(navigation, ['/pages/my/edit'])
  const pages = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../pages.json'), 'utf8'))
  assert.ok(pages.pages.some((page) => page.path === 'pages/my/edit'))
})

test('editor loads full user information with password fields empty', async () => {
  const { page, component } = setup()
  await component.onLoad.call(page)
  assert.equal(page.username, 'alice')
  assert.equal(page.loaded, true)
  assert.deepEqual(page.form, { email: 'alice@example.com', bio: 'Old bio', image: '', password: '', confirmPassword: '' })
})

test('editor sends editable fields, updates cache after success and keeps password out of storage', async () => {
  const { page, component, requests, writes, state, navigation } = setup()
  await component.onLoad.call(page)
  page.form.email = ' NEW@EXAMPLE.COM '
  page.form.bio = ''
  page.form.image = ' https://example.com/avatar.png '
  page.form.password = 'new-secret'
  page.form.confirmPassword = 'new-secret'
  await page.saveProfile()
  assert.deepEqual(requests, [{ email: 'new@example.com', bio: '', image: 'https://example.com/avatar.png', password: 'new-secret' }])
  assert.deepEqual(state.user, { ...savedUser, email: 'new@example.com', bio: '', image: 'https://example.com/avatar.png' })
  assert.ok(writes.every((user) => !('password' in user) && !('confirmPassword' in user)))
  assert.equal(page.form.password, '')
  assert.equal(page.form.confirmPassword, '')
  assert.deepEqual(navigation, ['back'])
})

test('empty password is left out when saving profile information', async () => {
  const { page, component, requests } = setup()
  await component.onLoad.call(page)
  await page.saveProfile()
  assert.equal(Object.hasOwn(requests[0], 'password'), false)
})

test('invalid email, avatar URL, short password and confirmation block saving', async () => {
  const { page, component, requests, toasts } = setup()
  await component.onLoad.call(page)
  for (const invalid of [
    { email: '' }, { email: 'invalid' }, { image: 'javascript:alert(1)' },
    { password: '123', confirmPassword: '123' },
    { password: '123456', confirmPassword: '654321' },
    { confirmPassword: '123456' },
  ]) {
    page.form = { email: savedUser.email, bio: '', image: '', password: '', confirmPassword: '', ...invalid }
    await page.saveProfile()
  }
  assert.equal(requests.length, 0)
  assert.equal(toasts.length, 6)
})

test('save failure preserves the form and cached user and allows retry', async () => {
  const { page, component, state, navigation, toasts } = setup({ update: async () => { throw new Error('邮箱已被使用') } })
  await component.onLoad.call(page)
  page.form.email = 'taken@example.com'
  await page.saveProfile()
  assert.equal(page.form.email, 'taken@example.com')
  assert.equal(state.user.email, savedUser.email)
  assert.equal(page.submitting, false)
  assert.deepEqual(navigation, [])
  assert.equal(toasts.at(-1).title, '邮箱已被使用')
})

test('loading failure never enables saving incomplete profile data', async () => {
  const { page, component, requests } = setup({ getUser: async () => { throw new Error('网络错误') } })
  await component.onLoad.call(page)
  await page.saveProfile()
  assert.equal(page.loaded, false)
  assert.match(page.errorMessage, /网络错误/)
  assert.deepEqual(requests, [])
})

test('guests are redirected before fetching or saving profile data', async () => {
  let fetches = 0
  const { page, component, state, requests, navigation } = setup({ getUser: async () => { fetches += 1 } })
  state.token = ''
  await component.onLoad.call(page)
  await page.saveProfile()
  assert.equal(fetches, 0)
  assert.deepEqual(requests, [])
  assert.deepEqual(navigation, ['/pages/login/login'])
})

test('concurrent save clicks send one request', async () => {
  const saving = deferred()
  let requests = 0
  const { page, component } = setup({ update: () => { requests += 1; return saving.promise } })
  await component.onLoad.call(page)
  const first = page.saveProfile()
  await page.saveProfile()
  assert.equal(requests, 1)
  saving.resolve(null)
  await first
  assert.equal(page.submitting, false)
})

test('an account switch before saving cannot apply the old form to the new user', async () => {
  const { page, component, state, requests } = setup()
  await component.onLoad.call(page)
  state.user = { id: 8, username: 'bob' }
  await page.saveProfile()
  assert.deepEqual(requests, [])
  assert.equal(state.user.username, 'bob')
})

test('late save success after logout or account switch does not write cache or navigate', async () => {
  const saving = deferred()
  const { page, component, state, writes, navigation } = setup({ update: () => saving.promise })
  await component.onLoad.call(page)
  const count = writes.length
  const pending = page.saveProfile()
  state.token = 'token-b'
  state.user = { id: 8, username: 'bob' }
  saving.resolve(null)
  await pending
  assert.equal(writes.length, count)
  assert.equal(state.user.username, 'bob')
  assert.deepEqual(navigation, [])
})

test('unloading invalidates an in-flight load and clears password fields', async () => {
  const loading = deferred()
  const { page, component, writes } = setup({ getUser: () => loading.promise })
  const pending = component.onLoad.call(page)
  page.form.password = 'secret'
  component.onUnload.call(page)
  loading.resolve({ ...savedUser })
  await pending
  assert.equal(page.loaded, false)
  assert.equal(page.form.password, '')
  assert.equal(writes.length, 0)
})
