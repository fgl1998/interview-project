const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const { createUserApi } = require('../api/user')
const { createArticleApi } = require('../api/article')
const { createTagApi } = require('../api/tag')
const currentSession = { getUser: () => ({ id: 7, username: 'alice' }) }

function createClient() {
  const calls = []
  return {
    calls,
    request(path, data, options) {
      calls.push({ path, data, ...(options ? { options } : {}) })
      if (path === '/api/users/7') return Promise.resolve({ id: 7, username: 'alice', email: 'alice@example.com' })
      if (path === '/api/profile/findProfile') return Promise.resolve({ id: 7, username: 'alice', bio: 'Writer', image: '' })
      return Promise.resolve({ path, data })
    },
  }
}

test('user API describes login and current-user request bodies through the shared client', async () => {
  const client = createClient()
  const userApi = createUserApi(client, currentSession)

  await userApi.register('alice', 'alice@example.com', 'secret')
  await userApi.login('alice', 'secret')
  const user = await userApi.getUser()
  assert.equal(user.bio, 'Writer')
  assert.equal(user.email, 'alice@example.com')

  assert.deepEqual(client.calls, [
    {
      path: '/api/users/register',
      data: { username: 'alice', email: 'alice@example.com', password: 'secret' },
    },
    { path: '/api/users/login', data: { username: 'alice', password: 'secret' } },
    { path: '/api/users/7', data: {}, options: { method: 'GET' } },
    { path: '/api/profile/findProfile', data: { username: 'alice', userId: 7 } },
  ])
})

test('article API describes every article and comment request through the shared client', async () => {
  const client = createClient()
  const articleApi = createArticleApi(client, currentSession)

  await articleApi.create({
    title: 'Hello',
    description: 'Summary',
    body: 'Body',
    tagsId: [1, 2],
  })
  await articleApi.list({ page: 2, pageSize: 20 })
  await articleApi.detail('hello-world')
  await articleApi.favorite(12)
  await articleApi.unfavorite(12)
  await articleApi.listComments(12)
  await articleApi.createComment(12, 'Useful post')
  await articleApi.deleteComment(31)
  await articleApi.deleteArticle(12)
  await articleApi.getArticleListByUserId(7)
  await articleApi.getFavoriteArticleListByUserId(7)

  assert.deepEqual(client.calls, [
    {
      path: '/api/articles/create',
      data: { title: 'Hello', description: 'Summary', body: 'Body', tagsId: [1, 2] },
    },
    { path: '/api/articles/queryArticles', data: { pageNumber: 2, pageSize: 20, keyWord: '' } },
    { path: '/api/articles/getArticleDetailBySlug', data: { slug: 'hello-world' } },
    { path: '/api/articles/favorite', data: { articleId: 12 } },
    { path: '/api/articles/unfavorite', data: { articleId: 12 } },
    { path: '/api/articles/comment/queryComments', data: { articleId: 12 } },
    { path: '/api/articles/comment/create', data: { articleId: 12, body: 'Useful post' } },
    { path: '/api/articles/comment/delete', data: { commentId: 31 } },
    { path: '/api/articles/deleteArticle', data: { articleId: 12 } },
    { path: '/api/articles/queryArticlesByAuthorId', data: { authorId: 7 } },
    { path: '/api/articles/queryArticlesByFavoriteUser', data: {} },
  ])
})

test('tag API loads the selectable tag list through the shared client', async () => {
  const client = createClient()
  const tagApi = createTagApi(client)

  await tagApi.list()

  assert.deepEqual(client.calls, [
    { path: '/api/tags/list', data: {} },
  ])
})

test('profile API loads following and follower lists with the current user id', async () => {
  const profileApiPath = path.resolve(__dirname, '../api/profile.js')
  assert.ok(fs.existsSync(profileApiPath), 'api/profile.js should exist')
  const { createProfileApi } = require(profileApiPath)
  const client = createClient()
  const profileApi = createProfileApi(client, currentSession)

  await profileApi.followingList(7)
  await profileApi.followedList(7)
  await profileApi.get('alice')
  await profileApi.follow(8)
  await profileApi.unfollow(8)

  assert.deepEqual(client.calls, [
    { path: '/api/profile/followingList', data: { userId: 7 } },
    { path: '/api/profile/followerList', data: { userId: 7 } },
    { path: '/api/profile/findProfile', data: { username: 'alice', userId: 7 } },
    { path: '/api/profile/follow', data: { followingId: 8, userId: 7 } },
    { path: '/api/profile/unfollow', data: { followingId: 8, userId: 7 } },
  ])
})

test('Java pagination maps list to page items and supplies valid default pagination', async () => {
  const calls = []
  const api = createArticleApi({ request: async (path, data) => {
    calls.push({ path, data })
    return { list: [{ id: 12, authorId: 7 }], total: 1, totalPages: 1, pageNumber: 1, pageSize: 10 }
  } })
  const result = await api.list()
  assert.deepEqual(result.items, [{ id: 12, authorId: 7 }])
  assert.equal(result.totalPages, 1)
  await api.list({ page: 2, pageSize: 5, keyWord: 'Java' })
  assert.deepEqual(calls, [
    { path: '/api/articles/queryArticles', data: { pageNumber: 1, pageSize: 10, keyWord: '' } },
    { path: '/api/articles/queryArticles', data: { pageNumber: 2, pageSize: 5, keyWord: 'Java' } },
  ])
})

test('author queries pass the selected author while favorites stay scoped to the session', async () => {
  const client = createClient()
  const api = createArticleApi(client, currentSession)
  await api.getArticleListByUserId(8)
  await assert.rejects(async () => api.getFavoriteArticleListByUserId(8), /其他用户/)
  assert.deepEqual(client.calls, [{ path: '/api/articles/queryArticlesByAuthorId', data: { authorId: 8 } }])
})

test('user and profile APIs reject missing session identity without sending invalid user IDs', async () => {
  const client = createClient()
  const missingSession = { getUser: () => null }
  const { createProfileApi } = require('../api/profile')
  await assert.rejects(async () => createUserApi(client, missingSession).getUser(), /登录/)
  await assert.rejects(async () => createProfileApi(client, missingSession).follow(8), /登录/)
  assert.deepEqual(client.calls, [])
})

test('profile updates use session ID, exclude username and omit an unchanged password', async () => {
  const client = createClient()
  const api = createUserApi(client, currentSession)
  await api.update({ id: 99, username: 'changed', email: 'new@example.com', bio: '', image: '', password: '' })
  await api.update({ email: 'new@example.com', password: 'new-secret', confirmPassword: 'new-secret' })
  assert.deepEqual(client.calls, [
    { path: '/api/users/update', data: { id: 7, email: 'new@example.com', bio: '', image: '' } },
    { path: '/api/users/update', data: { id: 7, email: 'new@example.com', password: 'new-secret' } },
  ])
})

test('profile updates cannot run without a session user', async () => {
  const client = createClient()
  await assert.rejects(async () => createUserApi(client, { getUser: () => null }).update({ email: 'a@example.com' }), /登录/)
  assert.deepEqual(client.calls, [])
})
