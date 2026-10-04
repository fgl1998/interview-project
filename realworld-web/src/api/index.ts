import type {
  Request,
  User,
  LoginResult,
  Profile,
  Article,
  PageResult,
  Comment,
  Tag,
  ArticleInput,
  ProfileInput,
  Credentials,
} from './types'

export function createApi(request: Request, getUserId: () => number | undefined) {
  const currentId = () => {
    const id = getUserId()
    if (!id) throw new Error('登录信息不完整，请重新登录')
    return id
  }
  return {
    user: {
      login: (input: Credentials) => request<LoginResult>('/api/users/login', input),
      register: (input: Credentials & { email: string }) =>
        request<User>('/api/users/register', input),
      async current() {
        const id = currentId()
        const user = await request<User>(`/api/users/${id}`, undefined, 'GET')
        const profile = await request<Profile | null>('/api/profile/findProfile', {
          username: user.username,
          userId: id,
        })
        return { ...profile, ...user }
      },
      update(input: ProfileInput) {
        const data: Record<string, unknown> = { id: currentId() }
        for (const field of ['email', 'bio', 'image'] as const) {
          if (typeof input[field] === 'string') data[field] = input[field]
        }
        if (typeof input.password === 'string' && input.password.length > 0)
          data.password = input.password
        return request<null>('/api/users/update', data)
      },
    },
    articles: {
      list: (query: { pageNumber: number; pageSize: number; keyWord: string }) =>
        request<PageResult<Article>>('/api/articles/queryArticles', query),
      detail: (slug: string) =>
        request<Article | null>('/api/articles/getArticleDetailBySlug', { slug }),
      byAuthor: (authorId: number) =>
        request<Article[]>('/api/articles/queryArticlesByAuthorId', { authorId }),
      favorites: () => request<Article[]>('/api/articles/queryArticlesByFavoriteUser'),
      create: (input: ArticleInput) => request<number>('/api/articles/create', input),
      delete: (articleId: number) => request<null>('/api/articles/deleteArticle', { articleId }),
      favorite: (articleId: number) => request<null>('/api/articles/favorite', { articleId }),
      unfavorite: (articleId: number) => request<null>('/api/articles/unfavorite', { articleId }),
      comments: (articleId: number) =>
        request<Comment[]>('/api/articles/comment/queryComments', { articleId }),
      comment: (articleId: number, body: string) =>
        request<null>('/api/articles/comment/create', { articleId, body }),
      deleteComment: (commentId: number) =>
        request<null>('/api/articles/comment/delete', { commentId }),
    },
    profile: {
      get: (username: string) =>
        request<Profile | null>('/api/profile/findProfile', { username, userId: currentId() }),
      follow: (followingId: number) =>
        request<null>('/api/profile/follow', { userId: currentId(), followingId }),
      unfollow: (followingId: number) =>
        request<null>('/api/profile/unfollow', { userId: currentId(), followingId }),
      following: (userId: number) => request<Profile[]>('/api/profile/followingList', { userId }),
      followers: (userId: number) => request<Profile[]>('/api/profile/followerList', { userId }),
    },
    tags: () => request<Tag[]>('/api/tags/list'),
  }
}
