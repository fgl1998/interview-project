import { tool } from 'langchain'
import { z } from 'zod'
import type { RealWorldClient } from '../../../clients/realworld.client.js'

const EmptyInputSchema = z
  .object({})
  .strict()

const TagSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
})

const TagListResponseSchema = z.object({
  success: z.boolean(),
  code: z.number(),
  data: z.array(TagSchema),
})

export function createListAvailableTagsTool(
  options: {
    realWorldClient: RealWorldClient
    token: string
  }
) {
  const {
    realWorldClient,
    token,
  } = options

  return tool(
    async () => {
      const response =
        await realWorldClient.request({
          path: '/api/tags/list',
          method: 'POST',
          token,
          body: {},
        })

      const { data } =
        TagListResponseSchema.parse(response)

      // 只给模型必要字段
      return JSON.stringify(
        data.map(tag => ({
          id: tag.id,
          name: tag.name,
        }))
      )
    },
    {
      name: 'list_available_tags',

      description: `
        查询发布文章时可以使用的标签列表。

        发布新文章之前必须调用该工具。
        返回标签 ID 和标签名称。
        模型只能从返回结果中选择标签，不得编造标签 ID。
        该工具只查询标签，不创建或修改标签。
        `.trim(),

      schema: EmptyInputSchema,
    }
  )
}