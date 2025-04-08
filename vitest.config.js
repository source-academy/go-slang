import { defineConfig } from 'vite'

export default defineConfig({
  test: {
    testTimeout: 300000,
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportOnFailure: true,
      exclude: ['./build/**', './src/frontend/**'],
    },
    include: ['./src/go-virtual-machine-main/tests/**'],
    exclude: ['./src/go-virtual-machine-main/tests/utility.ts'],
  },
})
