import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {defineConfig} from 'vite';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Content scripts cannot be ES modules, so this entry is bundled separately as a single IIFE.
export default defineConfig({
	publicDir: false,
	build: {
		outDir: resolve(__dirname, 'dist'),
		emptyOutDir: false,
		sourcemap: true,
		lib: {
			entry: resolve(__dirname, 'src/content/index.ts'),
			formats: ['iife'],
			name: 'tabemakulooContent',
			fileName: () => 'content/index.js',
		},
	},
});
