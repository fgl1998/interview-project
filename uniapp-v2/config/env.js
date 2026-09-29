const SERVER_BASE_URL = 'http://127.0.0.1:8080'
let BASE_URL = SERVER_BASE_URL
// H5 开发通过 vue.config.js 代理，部署时也需将 /api 转发到 Java 服务。
// #ifdef H5
if (typeof window !== 'undefined') BASE_URL = ''
// #endif
const AGENT_BASE_URL = 'http://127.0.0.1:3002'

// 小程序/App 真机联调时改为开发机局域网 IP，Java 默认端口为 8080。
// Agent 是独立服务，需要另行适配 Java 的 JWT 和接口后才能联调。
module.exports = {
  SERVER_BASE_URL,
  BASE_URL,
  AGENT_BASE_URL,
}
