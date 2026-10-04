import { RealWorldApiError } from '../common/errors/agent.error.js'

type HttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'DELETE'

export interface RealWorldClientOptions {
  baseUrl: string
  timeoutMs: number
}

export interface RealWorldRequestOptions {
  path: string
  token: string
  method?: HttpMethod
  body?: unknown
}

export class RealWorldClient {
  private readonly baseUrl: string
  private readonly timeoutMs: number

  constructor(options: RealWorldClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '')
    this.timeoutMs = options.timeoutMs
  }

  async request(
    options: RealWorldRequestOptions,
  ): Promise<unknown> {
    const path = options.path.startsWith('/')
      ? options.path
      : `/${options.path}`

    const url = `${this.baseUrl}${path}`

    const method = options.method ?? 'POST'

    const headers: Record<string, string> = {
      accept: 'application/json',
      authorization: `Bearer ${options.token}`,
    }

    if (options.body !== undefined) {
      headers['content-type'] = 'application/json'
    }

    console.log(`RealWorldClient: ${method} ${url}`)
    console.log(`Body: ${JSON.stringify(options.body)}`)
    try {
      const response = await fetch(url, {
        method,
        headers,
        body:
          options.body === undefined
            ? undefined
            : JSON.stringify(options.body),

        signal: AbortSignal.timeout(this.timeoutMs),
      })

      const responseData = await this.readResponseData(
        response,
        options.path,
      )

      if (!response.ok) {
        throw new RealWorldApiError({
          type: 'REALWORLD_HTTP_ERROR',
          path: options.path,
          status: response.status,
          response: responseData,
        })
      }

      return responseData
    } catch (error) {
      if (error instanceof RealWorldApiError) {
        throw error
      }

      throw new RealWorldApiError(error)
    }
  }

  private async readResponseData(
    response: Response,
    path: string,
  ): Promise<unknown> {
    if (response.status === 204) {
      return null
    }

    const responseText = await response.text()

    if (!responseText) {
      return null
    }

    try {
      return JSON.parse(responseText)
    } catch (error) {
      throw new RealWorldApiError({
        type: 'INVALID_REALWORLD_RESPONSE',
        path,
        status: response.status,
        responseText,
        cause: error,
      })
    }
  }
}