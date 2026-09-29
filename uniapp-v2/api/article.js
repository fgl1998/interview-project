const http = require('../common/http')
const session = require('../common/session')

function createArticleApi(client, sessionStore = session) {
  const request = client.request

  return {
    create(input) {
      return request('/api/articles/create', {
        title: input.title,
        description: input.description,
        body: input.body,
        tagsId: input.tagsId,
      })
    },
    async list({ page = 1, pageSize = 10, keyWord = '' } = {}) {
      const result = await request('/api/articles/queryArticles', { pageNumber: page, pageSize, keyWord })
      return { ...result, items: (result && result.list) || [] }
    },
    detail(slug) {
      return request('/api/articles/getArticleDetailBySlug', { slug })
    },
    favorite(articleId) {
      return request('/api/articles/favorite', { articleId })
    },
    unfavorite(articleId) {
      return request('/api/articles/unfavorite', { articleId })
    },
    listComments(articleId) {
      return request('/api/articles/comment/queryComments', { articleId })
    },
    createComment(articleId, body) {
      return request('/api/articles/comment/create', { articleId, body })
    },
    deleteComment(commentId) {
      return request('/api/articles/comment/delete', { commentId })
    },
    deleteArticle(articleId) {
      return request('/api/articles/deleteArticle', { articleId })
    },
    getArticleListByUserId(userId) {
      return request('/api/articles/queryArticlesByAuthorId', { authorId: userId })
    },
    async getFavoriteArticleListByUserId(userId) {
      const currentUser = sessionStore.getUser()
      if (!currentUser || !currentUser.id) throw new Error('登录信息不完整，请重新登录')
      if (userId != null && String(userId) !== String(currentUser.id)) {
        throw new Error('暂不支持查看其他用户的收藏')
      }
      return request('/api/articles/queryArticlesByFavoriteUser', {})
    },
  }
}

const articleApi = createArticleApi(http)

module.exports = {
  createArticleApi,
  ...articleApi,
}
