import { vi } from 'vitest'
import { config } from '@vue/test-utils'

config.global.stubs = { transition: false, 'transition-group': false }
window.matchMedia = vi.fn().mockImplementation(() => ({
  matches: false,
  addListener() {},
  removeListener() {},
  addEventListener() {},
  removeEventListener() {},
}))
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
}
