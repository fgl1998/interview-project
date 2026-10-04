export interface ApiResult<T> {
  success: boolean
  code?: number | string
  message?: string
  error?: { code?: number | string; message?: string }
  data: T
}
export interface User {
  id: number
  username: string
  email: string
  bio?: string | null
  image?: string | null
}
export interface LoginResult {
  token: string
  user: User
}
export interface Profile extends User {
  following?: boolean
}
export interface Article {
  id: number
  slug: string
  title: string
  description: string
  body: string
  createdAt: string
  updatedAt: string
  authorId: number
  authorUsername: string
  authorBio?: string | null
  authorImage?: string | null
  favorited: boolean
  favoritesCount: number
  tags: string[]
}
export interface Comment {
  id: number
  articleId: number
  authorId: number
  body: string
  createdAt: string
  authorUsername: string
  authorImage?: string | null
}
export interface Tag {
  id: number
  name: string
}
export interface PageResult<T> {
  list: T[]
  total: number
  pageNumber: number
  pageSize: number
  totalPages: number
}
export interface ArticleInput {
  title: string
  description: string
  body: string
  tagsId: number[]
}
export interface ProfileInput {
  email: string
  bio: string
  image: string
  password?: string
}
export interface Credentials {
  username: string
  password: string
}
export interface RequestOptions {
  timeout?: number
}
export type Request = <T>(
  url: string,
  data?: unknown,
  method?: 'POST' | 'GET',
  options?: RequestOptions,
) => Promise<T>
