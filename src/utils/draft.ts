import type {PostKind, StorageArea} from '@/settings/destinations.js';
import type {PostData} from '@/types';

export type Draft = {
	kind: PostKind;
	postData: PostData;
};

const formDraftKey = 'formDraft';

export async function saveFormDraft(storage: StorageArea, draft: Draft): Promise<void> {
	await storage.set({[formDraftKey]: draft});
}

export async function takeFormDraft(storage: StorageArea & {remove(key: string): Promise<void>}): Promise<Draft | undefined> {
	const items = await storage.get(formDraftKey);
	await storage.remove(formDraftKey);
	return items[formDraftKey] as Draft | undefined;
}
