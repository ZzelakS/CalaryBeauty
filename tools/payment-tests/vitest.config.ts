import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
const root = fileURLToPath(new URL('../../', import.meta.url))
export default defineConfig({
  root,
  resolve:{alias:{'@':fileURLToPath(new URL('../../src',import.meta.url)),'vitest':fileURLToPath(new URL('./node_modules/vitest',import.meta.url)), 'convex-test':fileURLToPath(new URL('./node_modules/convex-test',import.meta.url))}},
  test:{environment:'edge-runtime',include:['convex/**/*.test.ts']},
})
