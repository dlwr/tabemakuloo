import type {PostData, PostResult, PostTypeString} from '@/types';

export abstract class BaseService {
	abstract readonly name: string;

	abstract authenticate(): Promise<boolean>;
	abstract post(data: PostData): Promise<PostResult>;
	abstract supports(type: PostTypeString): boolean;

	protected validatePostData(data: PostData): void {
		if (!data.title?.trim()) {
			throw new Error('Title is required');
		}

		if (!data.url?.trim()) {
			throw new Error('URL is required');
		}

		try {
			// eslint-disable-next-line no-new
			new URL(data.url);
		} catch {
			throw new Error('Invalid URL format');
		}
	}

	protected createErrorResult(error: string): PostResult {
		return {
			service: this.name,
			success: false,
			error,
		};
	}

	protected createSuccessResult(url?: string): PostResult {
		return {
			service: this.name,
			success: true,
			url,
		};
	}
}
