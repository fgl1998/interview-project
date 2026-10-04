import { tool } from 'langchain'
import { z } from 'zod'

import type { RealWorldClient } from '../../../clients/realworld.client.js'

const ToolInputSchema = z.object({
  slug: z.string(),
})
export interface SecureToolContext {
  token: string
  currentUserId: number
}
const ArticleDetailSchema = z.object({
  id: z.number(),
  slug: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  body: z.string(),
  authorId: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  authorUsername: z.string(),
  authorBio: z.string().nullable(),
  authorImage: z.string().nullable(),
  favorited: z.boolean(),
  favoritesCount: z.number(),
  tags: z.array(z.string()),
})

const GetArticleDetailToolResponssSchema = z.union([
  ArticleDetailSchema,

  z
    .object({
      data: ArticleDetailSchema,
    })
    .transform((response) => response.data),
])

export interface CreateGetArticleDetailTool extends SecureToolContext {
  realWorldClient: RealWorldClient
}
export function createGetArticleDetailTool(
  options: CreateGetArticleDetailTool
) {
  const { realWorldClient, token } = options

  return tool(
    async ({ slug }) => {
      const response = await realWorldClient.request({
        path: '/api/articles/getArticleDetailBySlug',
        method: 'POST',
        token,
        body: {
          slug
        }
      })
      const detail = GetArticleDetailToolResponssSchema.parse(response)
      return JSON.stringify(detail)
    },
    {
      name: 'get-article-detail',
      schema: ToolInputSchema,
      description: `
        获取一篇已经确定的文章的完整内容。

        只有在已经通过其他工具获得准确 slug 后使用。
        适合读取标题、简介、正文、标签和文章统计信息。
        不要使用该工具搜索文章，也不要猜测 slug。
        `.trim()
    }
  )
}