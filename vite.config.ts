import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {defineConfig} from 'vite';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
	resolve: {
		alias: {
			// eslint-disable-next-line @typescript-eslint/naming-convention
			'@': resolve(__dirname, 'src'),
			// eslint-disable-next-line @typescript-eslint/naming-convention
			'@/types': resolve(__dirname, 'src/types'),
			// eslint-disable-next-line @typescript-eslint/naming-convention
			'@/utils': resolve(__dirname, 'src/utils'),
			// eslint-disable-next-line @typescript-eslint/naming-convention
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
						const name = assetInfo.name.replace('.html', '');
						return `${name}/index.html`;
					}

					return 'assets/[name].[hash][extname]';
				},
			},
		},
	},
});
