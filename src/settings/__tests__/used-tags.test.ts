import {describe, it, expect} from 'vitest';
import {loadUsedTags, recordUsedTags} from '../used-tags.js';
import type {StorageArea} from '../destinations.js';

function memoryStorage(): StorageArea {
	const data: Record<string, unknown> = {};
	return {
		async get(key: string) {
			return key in data ? {[key]: data[key]} : {};
		},
		async set(items: Record<string, unknown>) {
			Object.assign(data, items);
		},
	};
}

describe('usedTags', () => {
	it('is empty before any tag is used', async () => {
		expect(await loadUsedTags(memoryStorage())).toEqual({});
	});

	it('counts how many times each tag was used', async () => {
		const storage = memoryStorage();
		await recordUsedTags(storage, ['a', 'b']);
		await recordUsedTags(storage, ['a']);
		expect(await loadUsedTags(storage)).toEqual({a: 2, b: 1});
	});
});
