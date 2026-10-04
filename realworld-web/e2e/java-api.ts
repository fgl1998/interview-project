import type { Page } from '@playwright/test'
import type { Article, Comment, Profile, User } from '../src/api/types'

export async function mockJavaApi(page: Page) {
  const user: User = {
    id: 7,
    username: 'fang',
    email: 'fang@example.org',
    bio: '持续学习，记录成长。',
    image: '',
  }
  const writer: Profile = {
    id: 12,
    username: 'writer',
    email: '',
    bio: '分享前端工程与日常思考。',
    image: '',
    following: false,
  }
  const articles: Article[] = Array.from({ length: 11 }, (_, i) => ({
    id: 10 + i,
    slug: `article-${i + 1}`,
    title: i ? `工程实践笔记 ${i + 1}` : '从 Vue 3 开始，构建更清晰的前端',
    description: '从一个真实的问题出发，聊聊组件、状态和工程里的那些取舍。',
    body: '## 从问题出发\n好的结构，让每次修改都有清晰的方向。\n\n> 写代码之前，先理解要解决的问题。\n\n```ts\nconst idea = "keep learning"\n```\n\n<script>window.injected = true</script>',
    authorId: i === 1 ? 7 : 12,
    authorUsername: i === 1 ? 'fang' : 'writer',
    authorBio: writer.bio,
    authorImage: '',
    createdAt: '2026-09-29T10:30:00',
    updatedAt: '2026-09-29T10:30:00',
    favorited: false,
    favoritesCount: 2,
    tags: i % 2 ? ['Java', '工程实践'] : ['Vue', 'TypeScript'],
  }))
  const comments: Comment[] = []
  const requests: { path: string; method: string; body: Record<string, unknown> }[] = []
  let expire = false
  let failUpdate = false
  let failFeed = false
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const body = request.method() === 'GET' ? {} : request.postDataJSON() || {}
    requests.push({ path, method: request.method(), body })
    const success = (data: unknown) =>
      route.fulfill({ json: { code: 200, success: true, message: 'success', data } })
    const failure = (code: number, message: string) =>
      route.fulfill({ json: { code, success: false, message, data: null } })
    if (!['/api/users/login', '/api/users/register'].includes(path)) {
      if (expire || request.headers().authorization !== 'Bearer test-jwt')
        return failure(401, '登录已过期')
    }
    switch (path) {
      case '/api/users/login':
        return body.username === 'fang' && body.password === '123456'
          ? success({ token: 'test-jwt', user })
          : failure(400, '用户名或密码错误')
      case '/api/users/register':
        return success({ id: 20, username: body.username, email: body.email })
      case '/api/users/7':
        return success({ id: user.id, username: user.username, email: user.email })
      case '/api/users/update':
        if (failUpdate) return failure(409, '邮箱已被使用')
        Object.assign(user, { email: body.email, bio: body.bio, image: body.image })
        return success(null)
      case '/api/profile/findProfile':
        return success(body.username === 'fang' ? user : body.username === 'writer' ? writer : null)
      case '/api/profile/follow':
        writer.following = true
        return success(null)
      case '/api/profile/unfollow':
        writer.following = false
        return success(null)
      case '/api/profile/followingList':
        return success(body.userId === 7 && writer.following ? [writer] : [])
      case '/api/profile/followerList':
        return success(body.userId === 12 && writer.following ? [user] : [])
      case '/api/tags/list':
        return success([
          { id: 1, name: 'Vue' },
          { id: 2, name: 'TypeScript' },
          { id: 3, name: 'Java' },
        ])
      case '/api/articles/queryArticles': {
        if (failFeed) return failure(500, '暂时无法查询文章')
        const results = articles.filter((a) =>
          `${a.title}${a.description}${a.body}`
            .toLowerCase()
            .includes(String(body.keyWord || '').toLowerCase()),
        )
        const pageNumber = Number(body.pageNumber)
        const pageSize = Number(body.pageSize)
        return success({
          list: results.slice((pageNumber - 1) * pageSize, pageNumber * pageSize),
          total: results.length,
          pageNumber,
          pageSize,
          totalPages: Math.ceil(results.length / pageSize),
        })
      }
      case '/api/articles/getArticleDetailBySlug':
        return success(articles.find((a) => a.slug === body.slug) || null)
      case '/api/articles/queryArticlesByAuthorId':
        return success(articles.filter((a) => a.authorId === body.authorId))
      case '/api/articles/queryArticlesByFavoriteUser':
        return success(articles.filter((a) => a.favorited))
      case '/api/articles/create': {
        const id = 100 + articles.length
        articles.unshift({
          ...articles[0]!,
          id,
          slug: `created-${id}`,
          title: body.title,
          description: body.description,
          body: body.body,
          authorId: 7,
          authorUsername: 'fang',
          tags: ['Vue'],
          favoritesCount: 0,
          favorited: false,
        } as Article)
        return success(id)
      }
      case '/api/articles/deleteArticle': {
        const index = articles.findIndex((a) => a.id === body.articleId)
        if (index >= 0) articles.splice(index, 1)
        return success(null)
      }
      case '/api/articles/favorite':
      case '/api/articles/unfavorite': {
        const article = articles.find((a) => a.id === body.articleId)
        if (article) {
          article.favorited = path.endsWith('/favorite')
          article.favoritesCount += article.favorited ? 1 : -1
        }
        return success(null)
      }
      case '/api/articles/comment/queryComments':
        return success(comments.filter((c) => c.articleId === body.articleId))
      case '/api/articles/comment/create':
        comments.push({
          id: 200 + comments.length,
          articleId: body.articleId,
          authorId: 7,
          authorUsername: 'fang',
          body: body.body,
          createdAt: '2026-09-30T12:00:00',
        } as Comment)
        return success(null)
      case '/api/articles/comment/delete': {
        const index = comments.findIndex((c) => c.id === body.commentId)
        if (index >= 0) comments.splice(index, 1)
        return success(null)
      }
      default:
        return failure(404, `Unhandled mock API: ${path}`)
    }
  })
  return {
    requests,
    user,
    articles,
    writer,
    expire: () => {
      expire = true
    },
    failUpdate: () => {
      failUpdate = true
    },
    failFeed: (value: boolean) => {
      failFeed = value
    },
  }
}

export async function login(page: Page, redirect = '/') {
  await page.goto(`/login?redirect=${encodeURIComponent(redirect)}`)
  await page.getByLabel('用户名', { exact: true }).fill('fang')
  await page.getByLabel('密码', { exact: true }).fill('123456')
  await page.getByRole('button', { name: '登录', exact: true }).click()
  await page.waitForURL((url) => url.pathname === redirect.split('?')[0])
}
