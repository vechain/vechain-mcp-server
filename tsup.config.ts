import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node18',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  splitting: false,
  bundle: true,
  external: ['@modelcontextprotocol/sdk', '@vechain/sdk-network', 'express', 'zod', 'tslog'],
})
