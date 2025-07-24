import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {defineConfig} from 'vitest/config';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
	test: {
		environment: 'jsdom',
	},
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
});
