const { SERVER_BASE_URL } = require('./config/env')

module.exports = {
  // uni_modules 不在 node_modules 下，正则可同时覆盖两种安装方式。
  transpileDependencies: [/uview-ui/],
  devServer: {
    proxy: {
      '/api': {
        target: SERVER_BASE_URL,
        changeOrigin: true,
      },
    },
  },
}
