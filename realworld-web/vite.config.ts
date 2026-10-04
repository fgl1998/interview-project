import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    base: env.VITE_BASE_PATH || '/',
    cacheDir: `node_modules/.vite-${mode}`,
    plugins: [
      vue(),
      Components({
        resolvers: [ElementPlusResolver({ importStyle: mode === 'test' ? false : 'css' })],
        dts: false,
      }),
    ],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api/agent': {
          target: env.AGENT_PROXY_TARGET || 'http://127.0.0.1:3002',
          changeOrigin: true,
          proxyTimeout: 130000,
          timeout: 130000,
        },
        // '/api': { target: env.API_PROXY_TARGET || 'http://118.24.53.49:8080', changeOrigin: true },
        '/api': { target: env.API_PROXY_TARGET || 'http://127.0.0.1:8080', changeOrigin: true },
      },
    },
    test: {
      environment: 'jsdom',
      include: ['src/**/*.test.ts'],
      clearMocks: true,
      setupFiles: ['./src/test/setup.ts'],
    },
  }
})
