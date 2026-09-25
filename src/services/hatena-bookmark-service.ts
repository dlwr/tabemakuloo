import {BaseService} from './base-service.js';
import type {PostData, PostResult, PostTypeString} from '@/types';

const origin = 'https://b.hatena.ne.jp';

type HatenaAccount = {
	name: string;
	rks: string;
};

type MyNameResponse = {login: 0} | ({login: 1} & HatenaAccount);

type TagsResponse = {
	tags: Record<string, {count: number}>;
};

export class HatenaBookmarkService extends BaseService {
	get name(): string {
		return 'はてなブックマーク';
	}

	async authenticate(): Promise<boolean> {
		try {
			await this.getAccount();
			return true;
		} catch {
			return false;
		}
	}

	async post(data: PostData): Promise<PostResult> {
		try {
			this.validatePostData(data);
			const account = await this.getAccount();
			const tags = (data.tags ?? []).map(tag => `[${tag}]`).join('');
			const comment = (data.description ?? '').replaceAll(/[\n\r]+/g, ' ');

			const response = await fetch(`${origin}/${account.name}/add.edit.json`, {
				method: 'POST',
				credentials: 'include',
				headers: {'content-type': 'application/x-www-form-urlencoded'},
				body: new URLSearchParams({url: data.url, comment: tags + comment, rks: account.rks}).toString(),
			});
			if (!response.ok) {
				return this.createErrorResult(`Failed to bookmark on Hatena (${response.status})`);
			}

			return this.createSuccessResult(`${origin}/entry?url=${encodeURIComponent(data.url)}`);
		} catch (error) {
			return this.createErrorResult(error instanceof Error ? error.message : 'Unknown error');
		}
	}

	supports(type: PostTypeString): boolean {
		return ['link', 'quote'].includes(type);
	}

	async getTags(): Promise<Record<string, number>> {
		const account = await this.getAccount();
		const response = await fetch(`${origin}/${account.name}/tags.json`, {credentials: 'include'});
		if (!response.ok) {
			throw new Error(`Failed to load Hatena tags (${response.status})`);
		}

		const {tags} = await response.json() as TagsResponse;
		return Object.fromEntries(Object.entries(tags).map(([tag, {count}]) => [tag, count]));
	}

	private async getAccount(): Promise<HatenaAccount> {
		const response = await fetch(`${origin}/my.name`, {credentials: 'include'});
		const data: MyNameResponse = response.ok ? await response.json() as MyNameResponse : {login: 0};
		if (data.login !== 1) {
			throw new Error('Not logged in to Hatena');
		}

		return {name: data.name, rks: data.rks};
	}
}
