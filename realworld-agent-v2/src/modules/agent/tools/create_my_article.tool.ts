import { tool } from 'langchain'
import { z } from 'zod'
import type { RealWorldClient } from '../../../clients/realworld.client.js'

const ToolInput = z.object({
  title: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(100),
  body: z.string().trim().min(1),
  tagsId: z.array(z.number().int().positive()).describe(
    '从 list_available_tags 返回结果中选择的标签 ID'
  ),
})

const CreateResponseSchema = z.object({
  success: z.boolean(),
  code: z.number(),
  data: z.number().int().positive(),
})

export interface CreateMyArticleTool {
  realWorldClient: RealWorldClient
  token: string
  currentUserId: number
}

export function createMyArticleTool(
  options: CreateMyArticleTool
) {
  const { realWorldClient, token, currentUserId } = options

  return tool(
    async (input) => {
      const response = await realWorldClient.request({
        path: '/api/articles/create',
        method: 'POST',
        token,
        body: {
          // userId:currentUserId,
          ...input
        }
      })

      const detail = CreateResponseSchema.parse(response)
      return JSON.stringify(detail)
    },
    {
      name: 'create_my_article',
      schema: ToolInput,
      description: `
发布当前登录用户的一篇全新文章。

调用该工具会立即创建文章，不会中断流程，也不会自动等待用户确认。

只有同时满足以下条件时才能调用：
1. 上一轮已经向用户展示完整草稿，包括标题、摘要、正文和标签；
2. 用户在当前消息中明确表示“确认发布”“同意发布”或“按这个发布”；
3. 用户确认后没有提出任何修改要求。

“继续”“可以”“看看”“还行”等模糊表达不属于发布确认。

不得自行生成、请求或传递 userId、JWT、身份证号等身份信息。
tags 必须来自 list_available_tags，并以 JSON 数组字符串传入，例如 "[1,2]"。
同一次用户确认只能调用一次，禁止重复发布。
`.trim()
    }
  )
}