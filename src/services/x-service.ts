import {BaseService} from './base-service.js';
import {buildTextForX} from './x-text.js';
import type {PostData, PostResult, PostTypeString} from '@/types';

export type PostText = (text: string) => Promise<{url?: string}>;

// eslint-disable-next-line @typescript-eslint/naming-convention
export class XService extends BaseService {
	private readonly postText: PostText;

	constructor(options: {postText: PostText}) {
		super();
		this.postText = options.postText;
	}

	get name(): string {
		return 'X';
	}

	async authenticate(): Promise<boolean> {
		return true;
	}

	async post(data: PostData): Promise<PostResult> {
		try {
			const {url} = await this.postText(data.xText ?? buildTextForX(data));
			return this.createSuccessResult(url);
		} catch (error) {
			return this.createErrorResult(error instanceof Error ? error.message : 'Unknown error');
		}
	}

	supports(type: PostTypeString): boolean {
		return ['link', 'quote'].includes(type);
	}
}
