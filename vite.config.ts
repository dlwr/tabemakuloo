import {resolve} from 'node:path'
import {defineConfig} from 'vite'

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@/types': resolve(__dirname, 'src/types'),
      '@/utils': resolve(__dirname, 'src/utils'),
      '@/services': resolve(__dirname, 'src/services'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'src/background/index.ts'),
        content: resolve(__dirname, 'src/content/index.ts'),
        popup: resolve(__dirname, 'src/popup/index.html'),
        options: resolve(__dirname, 'src/options/index.html'),
      },
      output: {
        entryFileNames: '[name]/index.js',
        chunkFileNames: 'chunks/[name].[hash].js',
        assetFileNames(assetInfo) {
          if (assetInfo.name?.endsWith('.html')) {
            const name = assetInfo.name.replace('.html', '')
            return `${name}/index.html`
          }

          return 'assets/[name].[hash][extname]'
        },
      },
    },
  },
})
