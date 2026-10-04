# RealWorld Agent - 文章优化 Workflow 开发文档

## 1. 文档目标

本阶段的目标不是继续增加 Agent 功能数量，而是完整实现一个具有明确边界的 Workflow，用来训练：

- 多 Tool 协作
- LangGraph State 管理
- LLM 与确定性代码的职责划分
- Structured Output
- Human-in-the-loop
- interrupt / resume
- Checkpoint 持久化
- 副作用操作控制
- Workflow 停止条件
- Tool 权限边界

本阶段暂不加入：

- RAG
- Multi-Agent
- 邮件能力
- 评论分析
- 相似文章推荐
- 自动发布
- 自动删除
- 复杂 Agent Router

先把一条 Workflow 做透。

---

# 2. Workflow 业务目标

用户可以通过自然语言要求 Agent 优化自己的一篇文章。

典型用户输入：

```text
帮我优化一下我最近那篇 Vue 文章。
```

或者：

```text
帮我看看 slug 为 vue-composition-api 的文章有什么问题，帮我修改一下，但是修改前让我确认。
```

最终目标：

```text
用户提出优化文章
        ↓
Agent 找到目标文章
        ↓
获取文章完整内容
        ↓
分析文章问题
        ↓
生成修改稿
        ↓
展示给用户
        ↓
等待用户确认
        ↓
用户确认
        ↓
真正修改数据库中的文章
        ↓
任务结束
```

---

# 3. Agent 边界设计

开发前先回答以下 5 个问题。

---

## 3.1 这个 Agent 能做什么？

本 Workflow 只允许完成：

```text
查询文章
分析文章
生成修改稿
用户确认后更新文章
```

不允许：

```text
删除文章
修改其他用户文章
任意执行 SQL
访问数据库连接
修改用户信息
自动发布其他内容
```

---

## 3.2 Agent 能看到什么？

第一版仅允许获取当前登录用户自己的文章数据：

```text
id
slug
title
description
body
tags
createdAt
updatedAt
```

以后如有需要再增加：

```text
favoritesCount
comments
```

当前 Workflow 不需要看到：

```text
其他用户敏感数据
密码
JWT
数据库连接
数据库完整表结构
任意 HTTP API
```

---

# 4. AI 与程序职责划分

本 Workflow 的核心原则：

```text
确定性问题
→ Code

语义判断
→ LLM

真实数据查询
→ Tool

产生副作用
→ Human Approval
```

---

## 4.1 AI 可以自主决定

AI 可以：

```text
判断标题是否需要优化
判断 description 是否准确
判断正文结构是否合理
判断哪些段落冗余
判断是否缺少示例
判断文章表达是否清晰
提出优化建议
生成新的标题
生成新的 description
生成新的 body
```

这些操作不会直接修改数据库。

---

## 4.2 AI 不能自主决定

以下操作不能直接交给 AI：

```text
覆盖原文章
提交 updateArticle
删除文章
修改其他用户文章
绕过权限校验
```

其中：

```text
updateArticle
```

必须经过用户明确确认。

---

# 5. 为什么“生成修改稿”和“修改文章”必须拆开

错误设计：

```text
AI 分析
↓
AI 直接调用 updateArticle
↓
修改数据库
↓
再问用户是否满意
```

问题：

```text
数据库已经发生副作用
用户已经失去选择权
```

正确设计：

```text
AI 分析
↓
生成 revision
↓
保存到 Agent State
↓
interrupt
↓
用户确认
↓
updateArticle
```

因此：

```text
generateRevision
```

只是生成候选修改稿。

而：

```text
updateArticle
```

才是真正产生业务副作用的操作。

---

# 6. Workflow 总体流程

```text
START
  ↓
understandTask
  ↓
findArticle
  ↓
getArticleDetail
  ↓
analyzeArticle
  ↓
generateRevision
  ↓
approval
  │
  ├── rejected
  │      ↓
  │     END
  │
  ├── feedback
  │      ↓
  │  regenerateRevision
  │      ↓
  │   approval
  │
  └── approved
         ↓
     updateArticle
         ↓
        END
```

---

# 7. 第一版最小 Workflow

第一版不要一开始实现所有分支。

建议先完成：

```text
START
 ↓
findArticle
 ↓
getArticleDetail
 ↓
analyzeArticle
 ↓
generateRevision
 ↓
approval
 ├─ rejected → END
 └─ approved
       ↓
   updateArticle
       ↓
      END
```

等完整跑通后，再增加：

```text
用户提出修改意见
↓
重新生成 revision
↓
再次 approval
```

---

# 8. Tool 设计

第一版只需要 3 个 Tool。

---

## 8.1 searchArticles

职责：

```text
根据用户提供的条件查找文章
```

例如：

```ts
type SearchArticlesInput = {
  keyword?: string
  tag?: string
  slug?: string
  limit?: number
}
```

注意：

不要让 LLM 传：

```ts
userId
```

错误：

```ts
searchArticles({
  userId: 35,
  keyword: "vue"
})
```

应该由 Agent 服务从认证上下文获取：

```ts
const currentUserId = authContext.userId
```

Tool 内部：

```ts
searchArticles({
  keyword,
  tag,
  slug,
  limit
}, currentUserId)
```

保证：

```text
LLM 无法指定其他用户 ID
```

---

## 8.2 getArticleDetail

职责：

```text
根据 slug 获取完整文章
```

输入：

```ts
type GetArticleDetailInput = {
  slug: string
}
```

后端实际查询条件：

```text
slug
+
currentUserId
```

而不是只有：

```text
slug
```

目的是防止 Agent 读取其他用户的文章。

返回：

```ts
type ArticleDetail = {
  id: number
  slug: string
  title: string
  description: string
  body: string
  tags: string[]
  createdAt: string
  updatedAt: string
}
```

---

## 8.3 updateArticle

职责：

```text
真正修改文章
```

输入：

```ts
type UpdateArticleInput = {
  slug: string
  title?: string
  description?: string
  body?: string
  tags?: string[]
}
```

注意：

这个 Tool 属于副作用 Tool。

不能在普通 Agent Loop 中让模型随意调用。

正确流程：

```text
generateRevision
↓
approval
↓
approved
↓
updateArticle
```

---

# 9. State 设计

以前的 Agent 可能只有：

```ts
{
  messages: BaseMessage[]
}
```

本 Workflow 开始要建立真正的业务 State。

建议：

```ts
type OptimizeArticleState = {
  messages: BaseMessage[]

  task?: {
    keyword?: string
    tag?: string
    slug?: string
  }

  candidates?: ArticleSummary[]

  targetArticle?: {
    id: number
    slug: string
    title: string
    description: string
    body: string
    tags: string[]
  }

  analysis?: {
    problems: ArticleProblem[]
    suggestions: string[]
  }

  revision?: {
    title: string
    description: string
    body: string
    tags?: string[]
  }

  approvalStatus?:
    | 'pending'
    | 'approved'
    | 'rejected'

  userFeedback?: string

  result?: {
    success: boolean
    message: string
  }

  error?: {
    code: string
    message: string
  }
}
```

---

# 10. Analysis Structured Output

`analyzeArticle` 不应该让 LLM 随便输出一大段自然语言。

建议使用 Zod。

```ts
import { z } from 'zod'

export const ArticleAnalysisSchema = z.object({
  problems: z.array(
    z.object({
      type: z.enum([
        'title',
        'description',
        'structure',
        'content',
        'example',
        'readability'
      ]),
      description: z.string()
    })
  ),

  suggestions: z.array(z.string())
})
```

最终：

```ts
type ArticleAnalysis =
  z.infer<typeof ArticleAnalysisSchema>
```

例如：

```json
{
  "problems": [
    {
      "type": "title",
      "description": "标题过于宽泛，无法体现文章核心内容"
    },
    {
      "type": "example",
      "description": "正文缺少实际代码示例"
    }
  ],
  "suggestions": [
    "让标题直接体现 Composition API",
    "增加一个完整 Vue3 示例"
  ]
}
```

---

# 11. Revision Structured Output

修改稿也应该结构化。

```ts
export const ArticleRevisionSchema = z.object({
  title: z.string(),
  description: z.string(),
  body: z.string(),
  tags: z.array(z.string()).optional()
})
```

这样：

```text
LLM
↓
Structured Output
↓
state.revision
```

而不是从自然语言里再解析修改结果。

---

# 12. Node 设计

---

## 12.1 understandTask

职责：

```text
理解用户想优化哪篇文章
```

例如用户：

```text
帮我优化一下最近那篇 Vue 文章
```

可以抽取：

```ts
{
  keyword: 'Vue'
}
```

第一版不需要设计复杂的模糊意图系统。

先支持：

```text
slug
keyword
tag
```

即可。

---

## 12.2 findArticle

调用：

```text
searchArticles
```

可能产生三种结果。

### 情况 A：0 篇

```text
没有找到文章
↓
END
```

### 情况 B：1 篇

```text
直接作为 targetArticle
```

### 情况 C：多篇

第一版可以简单选择：

```text
最近更新的一篇
```

后续再升级为：

```text
让用户选择
```

不要第一版就把问题做复杂。

---

## 12.3 getArticleDetail

根据：

```ts
state.targetArticle.slug
```

调用：

```text
getArticleDetail
```

获得完整正文。

然后：

```ts
state.targetArticle = articleDetail
```

---

## 12.4 analyzeArticle

输入：

```text
title
description
body
tags
```

由 LLM 分析：

```text
问题
+
建议
```

结果写入：

```ts
state.analysis
```

---

## 12.5 generateRevision

输入：

```text
原文章
+
analysis
```

生成：

```ts
state.revision
```

此时：

```text
不能调用 updateArticle
```

---

## 12.6 approval

展示：

```text
原标题
新标题

原 description
新 description

主要修改说明
```

然后：

```ts
interrupt(...)
```

例如：

```ts
const approval = interrupt({
  type: 'article_revision_approval',

  article: {
    slug: state.targetArticle.slug,
    title: state.targetArticle.title
  },

  revision: state.revision,

  analysis: state.analysis
})
```

Workflow 暂停。

Checkpoint 保存当前 State。

---

# 13. 用户恢复 Workflow

用户下一次请求可能是：

```text
确认
```

或者：

```text
不要修改
```

使用：

```ts
new Command({
  resume: {
    approved: true
  }
})
```

或者：

```ts
new Command({
  resume: {
    approved: false
  }
})
```

---

# 14. updateArticle

只有：

```ts
approvalStatus === 'approved'
```

才能进入这个 Node。

调用：

```text
updateArticle
```

参数来自：

```ts
state.revision
```

不是重新让 LLM 生成。

这样可以保证：

```text
用户看到的版本
=
真正写入数据库的版本
```

这一点很重要。

错误做法：

```text
用户看到 revision A
↓
用户确认
↓
LLM 再生成一次 revision B
↓
写入 B
```

这是不允许的。

---

# 15. Human-in-the-loop 规则

第一版采用：

```text
查询
→ 自动

分析
→ 自动

生成修改稿
→ 自动

真正修改数据库
→ 必须确认
```

未来如果增加：

```text
删除文章
发布文章
批量修改
```

都应该考虑：

```text
Human Approval
```

---

# 16. Workflow 停止条件

必须明确什么时候结束。

---

## 16.1 正常结束

```text
用户确认
↓
updateArticle 成功
↓
END
```

---

## 16.2 用户拒绝

```text
approval
↓
rejected
↓
END
```

---

## 16.3 找不到文章

```text
searchArticles
↓
[]
↓
END
```

---

## 16.4 无权限

例如：

```text
ARTICLE_FORBIDDEN
```

立即停止：

```text
END
```

不要让 LLM 尝试绕过权限。

---

## 16.5 Tool 连续失败

例如：

```text
getArticleDetail
```

网络失败。

允许：

```text
retry 1~2 次
```

超过：

```text
MAX_RETRY
```

停止 Workflow。

---

## 16.6 Agent 最大循环次数

即使第一版没有复杂 Tool Loop，也建议设置：

```ts
const MAX_ITERATIONS = 6
```

防止未来出现：

```text
LLM
↓
Tool
↓
LLM
↓
Tool
↓
……
```

无限执行。

---

# 17. 权限边界

这一点不能交给 Prompt。

错误：

```text
System Prompt：

你只能查询当前用户自己的文章。
```

Prompt 只是辅助约束。

真正安全边界必须在 Tool / Backend。

例如：

```ts
articleService.getArticleDetail(
  currentUserId,
  slug
)
```

数据库：

```sql
SELECT *
FROM articles
WHERE slug = ?
AND author_id = ?
LIMIT 1;
```

这样即使 LLM 参数异常：

```text
也拿不到其他用户文章
```

---

# 18. 推荐目录结构

可以参考：

```text
src/
└── modules/
    └── agent/
        │
        ├── workflows/
        │   └── optimize-article/
        │       │
        │       ├── optimize-article.graph.ts
        │       ├── optimize-article.state.ts
        │       │
        │       ├── nodes/
        │       │   ├── understand-task.node.ts
        │       │   ├── find-article.node.ts
        │       │   ├── get-article-detail.node.ts
        │       │   ├── analyze-article.node.ts
        │       │   ├── generate-revision.node.ts
        │       │   ├── approval.node.ts
        │       │   └── update-article.node.ts
        │       │
        │       ├── schemas/
        │       │   ├── article-analysis.schema.ts
        │       │   └── article-revision.schema.ts
        │       │
        │       └── types/
        │           └── optimize-article.types.ts
        │
        ├── tools/
        │   ├── search-articles.tool.ts
        │   ├── get-article-detail.tool.ts
        │   └── update-article.tool.ts
        │
        ├── runtime/
        │   └── agent-runtime.ts
        │
        └── service/
            └── agent.service.ts
```

如果当前项目还比较小，可以适当减少目录。

不要为了架构而架构。

---

# 19. Graph 伪代码

目标结构：

```ts
const workflow = new StateGraph(OptimizeArticleState)

  .addNode(
    'understandTask',
    understandTaskNode
  )

  .addNode(
    'findArticle',
    findArticleNode
  )

  .addNode(
    'getArticleDetail',
    getArticleDetailNode
  )

  .addNode(
    'analyzeArticle',
    analyzeArticleNode
  )

  .addNode(
    'generateRevision',
    generateRevisionNode
  )

  .addNode(
    'approval',
    approvalNode
  )

  .addNode(
    'updateArticle',
    updateArticleNode
  )

  .addEdge(
    START,
    'understandTask'
  )

  .addEdge(
    'understandTask',
    'findArticle'
  )

  .addConditionalEdges(
    'findArticle',
    routeAfterFindArticle
  )

  .addEdge(
    'getArticleDetail',
    'analyzeArticle'
  )

  .addEdge(
    'analyzeArticle',
    'generateRevision'
  )

  .addEdge(
    'generateRevision',
    'approval'
  )

  .addConditionalEdges(
    'approval',
    routeAfterApproval
  )

  .addEdge(
    'updateArticle',
    END
  )
```

---

# 20. routeAfterFindArticle

例如：

```ts
function routeAfterFindArticle(
  state: OptimizeArticleState
) {
  if (!state.targetArticle) {
    return END
  }

  return 'getArticleDetail'
}
```

后续可以升级：

```text
0 篇
→ END

1 篇
→ getArticleDetail

多篇
→ askUserToChoose
```

---

# 21. routeAfterApproval

逻辑：

```ts
function routeAfterApproval(
  state: OptimizeArticleState
) {
  if (
    state.approvalStatus === 'approved'
  ) {
    return 'updateArticle'
  }

  return END
}
```

以后增加用户反馈后：

```text
approved
→ updateArticle

rejected
→ END

feedback
→ regenerateRevision
```

---

# 22. Checkpoint

因为存在：

```text
interrupt
```

所以必须使用 Checkpointer。

你目前已经完成 PostgreSQL 持久化，可以继续复用。

Checkpoint 必须保存：

```text
targetArticle
analysis
revision
approvalStatus
messages
当前 node
```

用户第二次回来：

```text
确认
```

不应该重新：

```text
searchArticles
getArticleDetail
analyzeArticle
generateRevision
```

而应该：

```text
恢复 checkpoint
↓
approval
↓
updateArticle
```

---

# 23. threadId

如果当前继续采用：

```text
realworld-user:${userId}
```

可以先复用。

但是以后一个用户支持多个 Agent 任务时，更推荐：

```text
conversation:${conversationId}
```

或者：

```text
workflow:${workflowRunId}
```

第一版暂时不用改。

---

# 24. 日志与 Trace

建议至少记录：

```text
workflow
node
tool
input
output
duration
status
error
```

例如：

```text
[Workflow]
optimizeArticle

[Node]
findArticle

[Tool]
searchArticles

[Input]
{
  keyword: "Vue"
}

[Output]
3 articles

[Duration]
231ms
```

注意：

以后如果进入真实业务项目：

```text
敏感字段不能直接写日志
```

当前 RealWorld Demo 暂时主要关注执行链路。

---

# 25. 第一阶段开发顺序

不要一次写完整。

---

## Step 1

实现：

```text
searchArticles
↓
findArticle
```

目标：

```text
可以根据用户需求找到目标文章
```

---

## Step 2

增加：

```text
getArticleDetail
```

目标：

```text
Tool A 返回 slug
↓
Tool B 使用 slug
```

训练 Tool 数据依赖。

---

## Step 3

增加：

```text
analyzeArticle
```

目标：

```text
Tool 数据
↓
LLM
↓
Structured Output
```

---

## Step 4

增加：

```text
generateRevision
```

目标：

```text
analysis
+
article
↓
revision
```

---

## Step 5

增加：

```text
interrupt
```

目标：

```text
生成 revision
↓
Workflow 暂停
```

---

## Step 6

增加：

```text
Command resume
```

目标：

```text
用户确认
↓
恢复 Workflow
```

---

## Step 7

增加：

```text
updateArticle
```

目标：

```text
approved
↓
真正修改数据库
```

---

# 26. 第一版测试 Case

至少测试以下情况。

---

## Case 1：正常修改

用户：

```text
帮我优化 slug 为 vue-basic 的文章。
```

预期：

```text
查询
↓
分析
↓
生成 revision
↓
等待确认
↓
用户确认
↓
更新成功
```

---

## Case 2：用户拒绝

```text
生成 revision
↓
用户：不用改了
```

预期：

```text
不调用 updateArticle
↓
END
```

---

## Case 3：文章不存在

用户：

```text
优化 abc-not-found
```

预期：

```text
search / detail
↓
NOT_FOUND
↓
END
```

---

## Case 4：其他用户文章

用户尝试优化不属于自己的文章。

预期：

```text
Tool / Backend
↓
FORBIDDEN
↓
END
```

不能依靠 LLM 自己拒绝。

---

## Case 5：用户确认后服务重启

```text
generateRevision
↓
interrupt
↓
服务器重启
↓
用户确认
```

预期：

```text
从 PostgreSQL Checkpoint 恢复
↓
updateArticle
```

不能重新生成 revision。

---

## Case 6：updateArticle 失败

预期：

```text
retry
↓
超过上限
↓
error
↓
END
```

---

# 27. 第二版扩展：用户反馈修改稿

第一版完成后再增加：

```text
Agent生成：
标题A
正文A

用户：
标题别改，正文按照这个方向调整。
```

Workflow：

```text
approval
   ↓
feedback
   ↓
regenerateRevision
   ↓
approval
```

形成：

```text
generateRevision
       ↓
    approval
   ↙    ↓    ↘
接受   拒绝   提意见
 ↓      ↓       ↓
update  END   regenerate
                 ↓
              approval
```

这个阶段能很好训练：

```text
Human feedback
+
State update
+
Workflow loop
```

---

# 28. 第三版扩展

完成前两版后，可以逐步增加：

```text
getArticleComments

getArticleStats

searchSimilarArticles
```

Workflow：

```text
查询文章
↓
获取正文
↓
获取评论
↓
获取表现数据
↓
获取参考文章
↓
综合分析
↓
生成 revision
↓
用户确认
↓
更新
```

不要第一版直接实现。

---

# 29. 本阶段不要做的事情

暂时不要：

```text
加 RAG

加 Multi-Agent

一次增加十几个 Tool

设计万能 Router

让 Agent 管理所有 RealWorld 功能

搞复杂 Prompt Engineering

为了使用 LangGraph 而增加无意义 Node
```

当前训练目标非常明确：

```text
一条 Workflow
+
三个 Tool
+
真实 State
+
一次 Human Approval
+
一次 Checkpoint Resume
```

---

# 30. 完成标准

当下面这句话可以稳定跑通：

```text
帮我找到我的 Vue 文章，
分析文章有什么问题，
给我生成一个修改版本，
但是修改原文章之前必须先让我确认。
```

并且系统完成：

```text
✓ 找到文章

✓ 获取详情

✓ LLM 分析

✓ Structured Output

✓ 生成 revision

✓ revision 保存到 State

✓ interrupt

✓ checkpoint 持久化

✓ 用户确认

✓ resume

✓ updateArticle

✓ 权限校验

✓ 正常 END

✓ 拒绝时不修改数据库
```

本 Workflow 即完成。

---

# 31. 本阶段最重要的认知

这个 Workflow 要帮助你真正建立以下理解：

```text
Workflow
决定 Agent 能走到哪里

State
决定 Agent 当前在哪里

Tool
决定 Agent 能做什么

LLM
决定边界内如何判断

Human Approval
控制高风险副作用
```

最终核心原则：

> Agent 不是没有流程的 AI，而是在明确业务边界内拥有一定自主决策能力的 Workflow。

本阶段先把这一条 Workflow 完整做透，再进入下一个 Workflow。
