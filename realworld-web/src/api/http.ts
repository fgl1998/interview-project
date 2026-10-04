import axios, { type AxiosAdapter } from 'axios'
import type { ApiResult, Request, RequestOptions } from './types'

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code: number | string = 0,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '操作失败，请稍后重试'
}

export function createHttpClient(options: {
  getToken: () => string
  onUnauthorized: () => void
  adapter?: AxiosAdapter
  timeout?: number
}) {
  const client = axios.create({ timeout: options.timeout ?? 20000, adapter: options.adapter })
  const request: Request = async <T>(
    url: string,
    data?: unknown,
    method: 'POST' | 'GET' = 'POST',
    requestOptions?: RequestOptions,
  ): Promise<T> => {
    const token = options.getToken()
    const unauthorized = () => {
      if (token && token === options.getToken()) options.onUnauthorized()
    }
    try {
      const response = await client.request<ApiResult<T>>({
        url,
        method,
        data: method === 'GET' ? undefined : (data ?? {}),
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        timeout: requestOptions?.timeout,
      })
      if (response.status === 401) {
        unauthorized()
        throw new ApiError('登录已过期，请重新登录', 401)
      }
      const result = response.data
      if (response.status >= 400)
        throw new ApiError(
          result?.error?.message || result?.message || `服务器请求失败（${response.status}）`,
          result?.error?.code ?? result?.code ?? response.status,
        )
      if (!result || typeof result !== 'object' || typeof result.success !== 'boolean') {
        throw new ApiError('服务器返回了无法识别的数据，请检查接口地址')
      }
      if (!result.success) {
        const code = result.error?.code ?? result.code
        if (Number(code) === 401) unauthorized()
        throw new ApiError(result.error?.message || result.message || '操作失败，请稍后重试', code)
      }
      return result.data
    } catch (error) {
      if (error instanceof ApiError) throw error
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          unauthorized()
          throw new ApiError('登录已过期，请重新登录', 401)
        }
        const result = error.response?.data as Partial<ApiResult<unknown>> | undefined
        const message = result?.error?.message || result?.message
        if (message)
          throw new ApiError(message, result?.error?.code ?? result?.code ?? error.response?.status)
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT')
          throw new ApiError('请求超时，请稍后重试')
        if (error.response)
          throw new ApiError(`服务器请求失败（${error.response.status}）`, error.response.status)
        throw new ApiError('无法连接服务器，请检查后台服务或网络')
      }
      throw error
    }
  }
  return { request }
}
