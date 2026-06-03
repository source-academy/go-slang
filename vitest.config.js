import path from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  resolve: {
    // Mirror tsconfig's `baseUrl: "./"` so root-relative imports like
    // `src/go-virtual-machine-main/...` resolve under Vitest 4 / Vite 8.
    alias: {
      src: path.resolve(process.cwd(), 'src'),
    },
  },
  test: {
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportOnFailure: true,
      exclude: ['./build/**', './src/frontend/**'],
    },
    setupFiles: ['./src/go-virtual-machine-main/tests-mt/setup.ts'],
    include: [
      // './src/go-virtual-machine-main/tests/**',
      './src/go-virtual-machine-main/tests-mt/**',
    ],
    exclude: [
      // './src/go-virtual-machine-main/tests/utility.ts',
      './src/go-virtual-machine-main/tests-mt/utility.ts',
      './src/go-virtual-machine-main/tests-mt/setup.ts',
    ],
  },
})
