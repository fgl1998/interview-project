import type { RequestHandler } from 'express'
import jwt from 'jsonwebtoken'
import { z } from 'zod'

import { UnauthorizedError } from '../errors/agent.error.js'
import { AppError } from '../errors/app.error.js'

const JwtPayloadSchema = z.object({
  id: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional(),
  sub: z
    .string()
    .regex(/^[1-9]\d*$/)
    .optional(),

  exp: z.number().int().positive(),
})

export interface AuthMiddlewareOptions {
  /** 与签发登录 Token 的 Java 服务保持一致，由它验证签名及有效期。 */
  realWorldApiUrl?: string
  timeoutMs?: number
}

function readUserId(payload: unknown, requireSubject: boolean): number {
  const parsed = JwtPayloadSchema.safeParse(payload)
  if (!parsed.success || (requireSubject && !parsed.data.sub))
    throw new UnauthorizedError()
  const userId = parsed.data.sub ? Number(parsed.data.sub) : parsed.data.id
  if (!Number.isSafeInteger(userId) || !userId || userId <= 0)
    throw new UnauthorizedError()
  if (
    parsed.data.id !== undefined &&
    parsed.data.sub &&
    parsed.data.id !== userId
  )
    throw new UnauthorizedError()
  return userId
}

function authServiceUnavailable(cause?: unknown): AppError {
  return new AppError({
    statusCode: 503,
    code: 'AUTH_SERVICE_UNAVAILABLE',
    message: '暂时无法验证登录状态，请稍后重试',
    cause,
  })
}

async function verifyWithJava(
  token: string,
  userId: number,
  options: AuthMiddlewareOptions,
) {
  try {
    const baseUrl = options.realWorldApiUrl!.replace(/\/+$/, '')
    const response = await fetch(`${baseUrl}/api/users/${userId}`, {
      method: 'GET',
      headers: { accept: 'application/json', authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(options.timeoutMs ?? 10000),
      redirect: 'error',
    })
    if (response.status === 401) throw new UnauthorizedError()
    if (!response.ok) throw authServiceUnavailable()
    const result = (await response.json()) as {
      success?: boolean
      code?: number | string
      data?: { id?: number }
    }
    // Java 认证错误通常仍返回 HTTP 200，需要同时检查业务码。
    if (result?.success === false && [401, 404].includes(Number(result.code)))
      throw new UnauthorizedError()
    if (result?.success !== true || result.data?.id !== userId)
      throw authServiceUnavailable()
  } catch (error) {
    if (error instanceof AppError) throw error
    throw authServiceUnavailable(error)
  }
}

function extractBearerToken(authorizationHeader: string | undefined): string {
  if (!authorizationHeader) {
    throw new UnauthorizedError()
  }

  const parts = authorizationHeader.trim().split(/\s+/)

  if (parts.length !== 2) {
    throw new UnauthorizedError()
  }

  const [scheme, token] = parts

  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    throw new UnauthorizedError()
  }

  return token
}

export function createAuthMiddleware(
  jwtSecret: string,
  options: AuthMiddlewareOptions = {},
): RequestHandler {
  return async (request, _response, next) => {
    try {
      const token = extractBearerToken(request.headers.authorization)
      let userId: number
      if (options.realWorldApiUrl) {
        // decode 仅用于定位受保护的用户接口；Java 验证成功之前不建立身份。
        userId = readUserId(jwt.decode(token), true)
        await verifyWithJava(token, userId, options)
      } else {
        // 保留原 Express 共享密钥方式供独立调用方使用。
        const payload = jwt.verify(token, jwtSecret, {
          algorithms: ['HS256', 'HS384', 'HS512'],
        })
        userId = readUserId(payload, false)
      }
      request.auth = {
        userId,
        token,
      }

      next()
    } catch (error) {
      next(error instanceof AppError ? error : new UnauthorizedError())
    }
  }
}
