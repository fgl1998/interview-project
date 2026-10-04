import { tool } from 'langchain'
import { z } from 'zod'

import type { RealWorldClient } from '../../../clients/realworld.client.js'

const SearchArticlesInputSchema = z.object({
  keyword: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .optional()
    .describe('文章搜索关键词，用于匹配文章内容'),

  page: z
    .number()
    .int()
    .min(1)
    .default(1)
    .describe('页码，从1开始'),

  pageSize: z
    .number()
    .int()
    .min(1)
    .max(20)
    .default(10)
    .describe('每页文章数量，最多20条'),
})

const AuthorSchema = z
  .object({
    username: z.string(),

    bio: z
      .string()
      .nullable()
      .optional(),

    image: z
      .string()
      .nullable()
      .optional(),
  })
  .passthrough()

const TagSchema = z
  .object({
    tag_name: z.string(),
    article_id: z.number().int(),
    tag_id: z.number().int(),

  })
  .passthrough()

const ArticleSchema = z.object({
  id: z.number().int().positive(),

  title: z.string(),

  description: z.string(),

  body: z.string(),

  slug: z.string(),

  authorUsername: z.string(),
  authorBio: z.string().nullable(),
  authorImage: z.string().nullable(),
  authorId: z.number(),


  tags: z.array(z.string()),

  favorited: z.boolean(),

  favoritesCount: z
    .number()
    .int()
    .nonnegative(),

  createdAt: z.string(),

  updatedAt: z.string(),
})

const ArticlePageSchema = z.object({
  items: z.array(ArticleSchema),

  total: z
    .number()
    .int()
    .nonnegative(),

  pageNumber: z
    .number()
    .int()
    .min(1),

  pageSize: z
    .number()
    .int()
    .min(1),

  totalPages: z
    .number()
    .int()
    .nonnegative(),
})

const ArticleListResponseSchema = z.union([
  ArticlePageSchema,

  z
    .object({
      data: ArticlePageSchema,
    })
    .transform((response) => response.data),
])

export interface CreateSearchArticlesToolOptions {
  realWorldClient: RealWorldClient
  token: string
}

// 为什么 Tool 是工厂函数
// 我们没有直接导出：
// export const searchArticlesTool = tool(...)
// 原因是不同 HTTP 请求对应不同用户：每次 Agent 请求都创建当前用户专属的一组 Tool，避免串 Token。
export function createSearchArticlesTool(
  options: CreateSearchArticlesToolOptions,
) {
  const { realWorldClient, token } = options

  return tool(
    async ({ keyword, page, pageSize }) => {
      const response = await realWorldClient.request({
        path: '/api/articles/queryArticles',
        method: 'POST',
        token,

        body: {
          pageNum: page,
          pageSize,

          // Agent内部使用keyword，
          // RealWorld接口使用keyWord。
          keyWord: keyword,
        },
      })
      console.log('response', response);


      const articlePage =
        ArticleListResponseSchema.parse(response)

      const result = {
        items: articlePage.items.map((article) => {
          return {
            id: article.id,
            slug: article.slug,
            title: article.title,
            description: article.description,

            author: {
              username: article.authorUsername,
              bio: article.authorBio,
              image: article.authorImage,
              id: article.authorId,
            },

            tags: article.tags,

            favorited: article.favorited,
            favoritesCount: article.favoritesCount,

            createdAt: article.createdAt,
            updatedAt: article.updatedAt,
          }
        }),

        pagination: {
          total: articlePage.total,
          page: articlePage.pageNumber,
          pageSize: articlePage.pageSize,
          totalPages: articlePage.totalPages,
        },
      }

      console.log(result, 'result');


      return JSON.stringify(result)
    },
    {
      name: 'search_articles',
      schema: SearchArticlesInputSchema,
      description: `
        搜索 RealWorld 中的公开文章。

        用于查找作者发布的相关文章，作为结构、选题和内容完整度的参考。
        不能用它代替 get_my_articles 查询当前用户自己的文章。
        只返回文章摘要，不返回完整正文。

        搜索结果仅作为分析参考，不得复制其他文章的大段内容。
        `.trim()
    },
  )
}