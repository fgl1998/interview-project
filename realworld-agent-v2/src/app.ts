import express from 'express'
import cors from 'cors'

import {env } from './config/env.js'
import { createSqliteCheckpointer } from './config/checkpointer.js'

import { RealWorldClient } from './clients/realworld.client.js'

import { createAuthMiddleware } from './common/middlewares/auth.middleware.js'
import { errorMiddleware } from './common/middlewares/error.middleware.js'
import { notFoundMiddleware } from './common/middlewares/not-found.middleware.js'

import { createDeepSeekModel } from './modules/agent/runtime/model.js'
import { AgentRuntime } from './modules/agent/runtime/agent.runtime.js'

import { AgentService } from './modules/agent/agent.service.js'
import { AgentController } from './modules/agent/agent.controller.js'
import { createAgentRouter } from './modules/agent/agent.route.js'

import { AgentTraceLogger } from './common/logging/agent-trace.logger.js'

import { MemorySaver } from '@langchain/langgraph'
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres'
import { agentCheckpointer } from './config/agent-checkpointer.js'

export function createApp() {
  const app = express()

  /*
   * 一、创建共享依赖
   *
   * 这些对象在整个 Agent 后台运行期间只创建一次。
   */

  const deepSeekModel = createDeepSeekModel(env)

  const realWorldClient = new RealWorldClient({
    baseUrl: env.REALWORLD_API_URL,
    timeoutMs: env.REALWORLD_API_TIMEOUT_MS
  })

  const authMiddleware = createAuthMiddleware(
    env.JWT_SECRET,
    {
      realWorldApiUrl: env.REALWORLD_API_URL,
      timeoutMs: env.REALWORLD_API_TIMEOUT_MS,
    }
  )

  const agentTraceLogger = new AgentTraceLogger({
    enabled: env.AGENT_TRACE_ENABLED,
  })

  // const checkpointer = new MemorySaver()
   /*
   * 使用 SQLite 持久化 Agent 状态。
   *
   * 原来：
   * const checkpointer = new MemorySaver()
   *
   * 现在：
   * checkpoint 会保存到 SQLite 文件。
   */
  // const checkpointer =
  //   createSqliteCheckpointer(
  //     env.AGENT_CHECKPOINT_DB_PATH
  //   )



  /*
   * 二、组装 Agent 模块
   */

  const agentRuntime = new AgentRuntime({
    model: deepSeekModel,
    realWorldClient,
    traceLogger: agentTraceLogger,
    checkpointer: agentCheckpointer
  })

  const agentService = new AgentService({
    agentRuntime
  })

  const agentController = new AgentController({
    agentService
  })

  const agentRouter = createAgentRouter({
    authMiddleware,
    agentController
  })

  /*
   * 三、注册全局中间件
   */

  app.use(cors())

  app.use(
    express.json({
      limit: '1mb'
    })
  )

  /*
   * 四、健康检查
   */

  app.get('/health', (_request, response) => {
    response.status(200).json({
      success: true,
      data: {
        status: 'ok'
      }
    })
  })

  /*
   * 五、注册业务路由
   */

  app.use('/api/agent', agentRouter)

  /*
   * 六、404 和全局错误处理中间件
   *
   * 必须放在所有正常路由后面。
   */

  app.use(notFoundMiddleware)

  app.use(errorMiddleware)

  return app
}

export const app = createApp()
