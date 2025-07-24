import {BaseService} from './base-service.js';
import type {PostData, PostResult, PostTypeString} from '@/types';

export class TumblrService extends BaseService {
	get name(): string {
		return 'Tumblr';
	}

	async authenticate(): Promise<boolean> {
		try {
			const response = await fetch('https://www.tumblr.com/api/v2/user/info', {
				credentials: 'include',
			});
			return response.ok;
		} catch {
			return false;
		}
	}

	async post(data: PostData): Promise<PostResult> {
		try {
			this.validatePostData(data);

			const formKey = await this.getFormKey();
			const postType = this.detectPostType(data);
			const postData = this.preparePostData(data, postType, formKey);

			const response = await fetch('https://www.tumblr.com/svc/post/update', {
				method: 'POST',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: new URLSearchParams(postData).toString(),
			});

			if (!response.ok) {
				return this.createErrorResult('Failed to post to Tumblr');
			}

			const result = await response.json() as {response?: {id?: string}};
			const postId = result.response?.id;

			return this.createSuccessResult(postId ? `https://www.tumblr.com/posts/${postId}` : undefined);
		} catch (error) {
			return this.createErrorResult(error instanceof Error ? error.message : 'Unknown error');
		}
	}

	supports(type: PostTypeString): boolean {
		return ['text', 'link', 'image', 'video', 'photo', 'quote'].includes(type);
	}

	detectPostType(data: PostData): PostTypeString {
		if (data.image) {
			return 'photo';
		}

		if (data.url && data.url.trim() !== '') {
			return 'link';
		}

		return 'text';
	}

	private async getFormKey(): Promise<string> {
		const response = await fetch('https://www.tumblr.com/svc/secure/post_form_key', {
			credentials: 'include',
		});

		if (!response.ok) {
			throw new Error('Failed to get form key');
		}

		const data = await response.json() as {
			response: {
				form_key: string;
			};
		};
		// eslint-disable-next-line @typescript-eslint/naming-convention
		const {form_key} = data.response;
		return form_key;
	}

	private preparePostData(
		data: PostData,
		postType: PostTypeString,
		formKey: string,
	): Record<string, string> {
		const baseData = {
			// eslint-disable-next-line @typescript-eslint/naming-convention
			form_key: formKey,
			// eslint-disable-next-line @typescript-eslint/naming-convention
			post_type: postType,
			// eslint-disable-next-line @typescript-eslint/naming-convention
			channel_id: 'main',
			context: 'channel',
			tags: data.tags?.join(',') ?? '',
		};

		switch (postType) {
			case 'text': {
				return {
					...baseData,
					// eslint-disable-next-line @typescript-eslint/naming-convention
					'post[one]': data.title,
					// eslint-disable-next-line @typescript-eslint/naming-convention
					'post[two]': data.description ?? '',
				};
			}

			case 'link': {
				return {
					...baseData,
					// eslint-disable-next-line @typescript-eslint/naming-convention
					'post[one]': data.url,
					// eslint-disable-next-line @typescript-eslint/naming-convention
					'post[two]': data.title,
					// eslint-disable-next-line @typescript-eslint/naming-convention
					'post[three]': data.description ?? '',
				};
			}

			case 'photo': {
				return {
					...baseData,
					// eslint-disable-next-line @typescript-eslint/naming-convention
					'post[photoset_layout]': '',
					// eslint-disable-next-line @typescript-eslint/naming-convention
					'post[one]': data.image ?? '',
					// eslint-disable-next-line @typescript-eslint/naming-convention
					'post[two]': data.description ?? '',
				};
			}

			case 'image':
			case 'video':
			case 'quote': {
				// これらのタイプは現在基本データのみを送信
				return baseData;
			}
		}
	}
}
