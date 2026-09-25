import {BaseService} from './base-service.js';
import type {PostData, PostResult, PostTypeString} from '@/types';

const origin = 'https://www.tumblr.com';

type TumblrSession = {
	apiToken: string;
	csrfToken: string;
};

type NpfBlock = Record<string, unknown>;

type UserInfoResponse = {
	response: {
		user: {
			blogs: Array<{name: string; primary: boolean}>;
		};
	};
};

type CreatePostResponse = {
	response: {
		id_string: string;
	};
};

class NotLoggedInError extends Error {
	constructor() {
		super('Not logged in to Tumblr');
	}
}

export function parseTumblrSession(html: string): TumblrSession {
	const match = /<script[^>]*id="___INITIAL_STATE___"[^>]*>([\s\S]*?)<\/script>/.exec(html);
	if (!match) {
		throw new Error('Tumblr session not found');
	}

	const state = JSON.parse(match[1]) as {
		csrfToken: string;
		apiFetchStore: {API_TOKEN: string};
	};
	return {apiToken: state.apiFetchStore.API_TOKEN, csrfToken: state.csrfToken};
}

export class TumblrService extends BaseService {
	get name(): string {
		return 'Tumblr';
	}

	async authenticate(): Promise<boolean> {
		try {
			await this.getPrimaryBlogName(await this.getSession());
			return true;
		} catch {
			return false;
		}
	}

	async post(data: PostData): Promise<PostResult> {
		try {
			this.validatePostData(data);

			const session = await this.getSession();
			const blogName = await this.getPrimaryBlogName(session);

			const response = await fetch(`${origin}/api/v2/blog/${blogName}/posts`, {
				method: 'POST',
				credentials: 'include',
				headers: {
					...this.apiHeaders(session),
					'content-type': 'application/json',
					'x-csrf': session.csrfToken,
				},
				body: JSON.stringify({
					content: this.buildContent(data),
					tags: data.tags?.join(',') ?? '',
					state: 'published',
				}),
			});

			if (!response.ok) {
				return this.createErrorResult(`Failed to post to Tumblr (${response.status})`);
			}

			const result = await response.json() as CreatePostResponse;
			return this.createSuccessResult(`${origin}/${blogName}/${result.response.id_string}`);
		} catch (error) {
			return this.createErrorResult(error instanceof Error ? error.message : 'Unknown error');
		}
	}

	supports(type: PostTypeString): boolean {
		return ['text', 'link', 'photo', 'quote'].includes(type);
	}

	detectPostType(data: PostData): PostTypeString {
		if (data.quote?.trim()) {
			return 'quote';
		}

		if (data.image) {
			return 'photo';
		}

		if (data.url && data.url.trim() !== '') {
			return 'link';
		}

		return 'text';
	}

	private async getSession(): Promise<TumblrSession> {
		const response = await fetch(`${origin}/`, {credentials: 'include'});
		if (!response.ok) {
			throw new Error(`Failed to load Tumblr (${response.status})`);
		}

		return parseTumblrSession(await response.text());
	}

	private async getPrimaryBlogName(session: TumblrSession): Promise<string> {
		const response = await fetch(`${origin}/api/v2/user/info`, {
			credentials: 'include',
			headers: this.apiHeaders(session),
		});
		if (!response.ok) {
			throw new NotLoggedInError();
		}

		const {blogs} = (await response.json() as UserInfoResponse).response.user;
		const primary = blogs.find(blog => blog.primary) ?? blogs[0];
		if (!primary) {
			throw new Error('No Tumblr blog found');
		}

		return primary.name;
	}

	private apiHeaders(session: TumblrSession): Record<string, string> {
		return {authorization: `Bearer ${session.apiToken}`};
	}

	private buildContent(data: PostData): NpfBlock[] {
		switch (this.detectPostType(data)) {
			case 'quote': {
				const lines = data.quote!.split('\n').map(line => line.trim()).filter(Boolean);
				return [
					...lines.map(text => ({type: 'text', subtype: 'quote', text})),
					this.sourceLinkBlock(data),
					...(data.description ? [{type: 'text', text: data.description}] : []),
				];
			}

			case 'photo': {
				return [
					{type: 'image', media: [{url: data.image}]},
					this.sourceLinkBlock(data),
				];
			}

			case 'link': {
				return [{
					type: 'link', url: data.url, title: data.title, description: data.description ?? '',
				}];
			}

			default: {
				return [
					{type: 'text', subtype: 'heading1', text: data.title},
					{type: 'text', text: data.description ?? ''},
				];
			}
		}
	}

	private sourceLinkBlock(data: PostData): NpfBlock {
		return {
			type: 'text',
			text: data.title,
			formatting: [{
				type: 'link', start: 0, end: [...data.title].length, url: data.url,
			}],
		};
	}
}
