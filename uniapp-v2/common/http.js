const { BASE_URL } = require('../config/env')
const session = require('./session')

const LOGIN_PATH = '/pages/login/login'

function createRequestAdapter() {
  return function requestAdapter(options) {
    if (typeof uni === 'undefined' || !uni || typeof uni.request !== 'function') {
      return Promise.reject(new Error('当前环境不可用：请注入 requestAdapter'))
    }

    return new Promise((resolve, reject) => {
      uni.request({
        ...options,
        success: resolve,
        fail: reject,
      })
    })
  }
}

function getCurrentRoute() {
  if (typeof getCurrentPages !== 'function') {
    return ''
  }
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  return (currentPage && currentPage.route) || ''
}

function navigateToLogin(url) {
  if (typeof uni !== 'undefined' && uni && typeof uni.reLaunch === 'function') {
    uni.reLaunch({ url })
  }
}

function createUnauthorizedHandler(options) {
  const settings = options || {}
  const clearSession = settings.clearSession || session.clear
  const currentRoute = settings.getCurrentRoute || getCurrentRoute
  const redirect = settings.navigateToLogin || navigateToLogin
  const loginPath = settings.loginPath || LOGIN_PATH

  return function handleUnauthorized() {
    clearSession()
    if (currentRoute().replace(/^\//, '') === loginPath.replace(/^\//, '')) {
      return
    }
    redirect(loginPath)
  }
}

function joinUrl(baseUrl, path) {
  if (/^https?:\/\//.test(path)) {
    return path
  }
  return `${baseUrl.replace(/\/$/, '')}/${String(path || '').replace(/^\//, '')}`
}

function createError(message, details) {
  const error = new Error(message || '请求失败')
  if (details) {
    Object.assign(error, details)
  }
  return error
}

function createHttpClient(options) {
  const settings = options || {}
  const requestAdapter = settings.requestAdapter || createRequestAdapter()
  const getToken = settings.getToken || session.getToken
  const onUnauthorized = settings.onUnauthorized || createUnauthorizedHandler()
  const baseUrl = settings.baseUrl === undefined ? BASE_URL : settings.baseUrl

  async function request(path, data, requestOptions) {
    const extraOptions = requestOptions || {}
    const token = getToken()
    const header = { ...(extraOptions.header || {}) }
    if (token) {
      header.Authorization = `Bearer ${token}`
    }

    let response
    try {
      response = await requestAdapter({
        url: joinUrl(baseUrl, path),
        method: extraOptions.method || 'POST',
        data: data || {},
        header,
        ...(extraOptions.timeout === undefined ? {} : { timeout: extraOptions.timeout }),
      })
    } catch (error) {
      const message = (error && (error.message || error.errMsg)) || ''
      const errorMessage = /timeout/i.test(message)
        ? '请求超时，请稍后重试'
        : (error && error.message) || '网络请求失败，请检查网络连接'
      throw createError(errorMessage)
    }

    const body = (response && response.data) || {}
    const statusCode = response && response.statusCode
    const errorBody = body.error || body
    if (statusCode < 200 || statusCode >= 300) {
      if (statusCode === 401 && getToken() === token) {
        await onUnauthorized()
      }
      throw createError(errorBody.message || `HTTP 请求失败（${statusCode || '未知状态'}）`, {
        code: errorBody.code,
        statusCode,
      })
    }

    if (body.success === false) {
      // Java 后台的认证异常也使用 HTTP 200，由业务码表示登录过期。
      if (Number(errorBody.code) === 401 && getToken() === token) {
        await onUnauthorized()
      }
      throw createError(errorBody.message || '业务请求失败', { code: errorBody.code, statusCode })
    }

    return body.data
  }

  return { request }
}

const http = createHttpClient()

module.exports = {
  LOGIN_PATH,
  createHttpClient,
  createUnauthorizedHandler,
  request: http.request,
}
