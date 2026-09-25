import type {StorageArea} from './destinations.js';
import {mergeTagCounts} from '@/utils/tag-completion.js';

const storageKey = 'usedTags';

export async function loadUsedTags(storage: StorageArea): Promise<Record<string, number>> {
	const items = await storage.get(storageKey);
	return (items[storageKey] as Record<string, number> | undefined) ?? {};
}

export async function recordUsedTags(storage: StorageArea, tags: string[]): Promise<void> {
	const used = await loadUsedTags(storage);
	await storage.set({[storageKey]: mergeTagCounts(used, Object.fromEntries(tags.map(tag => [tag, 1])))});
}
