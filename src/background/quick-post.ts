import type {DefaultDestinations, ServiceId} from '@/settings/destinations.js';
import type {PostData, PostResult} from '@/types';
import type {Draft} from '@/utils/draft.js';
import {localizeError} from '@/utils/error-messages.js';

export type {Draft} from '@/utils/draft.js';

export type QuickPostDeps = {
	loadDestinations(): Promise<DefaultDestinations>;
	post(postData: PostData, services: ServiceId[]): Promise<PostResult[]>;
	notify(result: PostResult, draft: Draft): Promise<void>;
	openForm(draft: Draft): Promise<void>;
};

export async function quickPost(draft: Draft, deps: QuickPostDeps): Promise<void> {
	const destinations = await deps.loadDestinations();
	const services = destinations[draft.kind];
	if (services.length === 0) {
		await deps.openForm(draft);
		return;
	}

	const results = await deps.post(draft.postData, services);
	await Promise.all(results.map(async result => deps.notify(result, draft)));
}

export function notificationFor(result: PostResult, draft: Draft): {title: string; message: string} {
	if (result.success) {
		return {title: `${result.service} に投稿しました`, message: draft.postData.title};
	}

	return {
		title: `${result.service} に投稿できませんでした`,
		message: `${localizeError(result.error ?? 'Unknown error')}（クリックでフォームを開きます）`,
	};
}
