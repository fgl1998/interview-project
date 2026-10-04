import { tool } from 'langchain'
import { z } from 'zod'
import type { RealWorldClient } from '../../../clients/realworld.client.js'


const ArticleSchema = z.object({
  id: z.number().int().positive(),
  title: z.string(),
  description: z.string(),
  body: z.string(),
  slug: z.string(),
  favoritesCount: z
    .number()
    .int()
    .nonnegative(),
  updatedAt: z.string(),
  // author_id: z.number().int().positive(),
  // author_username: z.string(),
  // author_bio: z.string().nullable(),
  // author_image: z.string().nullable(),
})


const ArticleListResponseSchema = z.object({
  success: z.boolean(),
  code: z.number(),
  data: z.array(ArticleSchema).nullable(),
})

export interface CreateGetArticleByUserIdTool {
  realWorldClient: RealWorldClient
  token: string
  currentUserId: number
}

export function createGetArticleByUserIdTool(
  options: CreateGetArticleByUserIdTool
) {
  const { realWorldClient, token, currentUserId } = options

  return tool(
    async () => {
      const response = await realWorldClient.request({
        path: '/api/articles/queryArticlesByAuthorId',
        method: 'POST',
        token,
        body: {
          authorId: currentUserId
        }
      })


      const detail = ArticleListResponseSchema.parse(response)
      return JSON.stringify(detail)
    },
    {
      name: 'get_my_articles',
      description: `
        查询当前登录用户自己发布的文章摘要。

        当用户提到“我的文章”“我发布的文章”“分析我写的文章”时使用。
        可以根据 keyword 筛选，并按发布时间从新到旧返回最多 limit 篇。

        该工具只查询当前登录用户，不接收 userId。
        不要用它查询其他用户或全站文章。
        返回文章 id、slug、标题、简介、发布时间、收藏数等摘要数据。
        `.trim()
    }
  )
}