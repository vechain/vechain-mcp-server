import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/stdio.ts', 'src/http.ts'],
  format: ['esm'],
  target: 'node18',
  outDir: 'dist',
  clean: true,
  sourcemap: false,
  splitting: false,
  bundle: true,
  external: ['@modelcontextprotocol/sdk', '@vechain/sdk-network', 'express', 'zod', 'tslog'],
})
