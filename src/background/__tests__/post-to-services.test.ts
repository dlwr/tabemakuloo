import {describe, it, expect} from 'vitest';
import {postToServices} from '../post-to-services.js';
import {BaseService} from '@/services/base-service.js';
import type {PostData, PostResult, PostTypeString} from '@/types';

class FakeService extends BaseService {
	readonly posted: PostData[] = [];

	constructor(readonly name: string, private readonly outcome: 'success' | 'throw' = 'success') {
		super();
	}

	async authenticate(): Promise<boolean> {
		return true;
	}

	async post(data: PostData): Promise<PostResult> {
		if (this.outcome === 'throw') {
			throw new Error('boom');
		}

		this.posted.push(data);
		return this.createSuccessResult(`https://example.com/${this.name}`);
	}

	supports(_type: PostTypeString): boolean {
		return true;
	}
}

const postData: PostData = {title: 'Example', url: 'https://example.com/'};

describe('postToServices', () => {
	it('posts to the first requested service', async () => {
		const a = new FakeService('A');
		await postToServices(postData, ['a', 'b'], {a, b: new FakeService('B')});
		expect(a.posted).toEqual([postData]);
	});

	it('posts to the second requested service', async () => {
		const b = new FakeService('B');
		await postToServices(postData, ['a', 'b'], {a: new FakeService('A'), b});
		expect(b.posted).toEqual([postData]);
	});

	it('does not post to services that were not requested', async () => {
		const a = new FakeService('A');
		const b = new FakeService('B');
		await postToServices(postData, ['a'], {a, b});
		expect(b.posted).toEqual([]);
	});

	it('returns a result per service in the requested order', async () => {
		const results = await postToServices(postData, ['b', 'c', 'a'], {a: new FakeService('A'), b: new FakeService('B'), c: new FakeService('C')});
		expect(results.map(result => result.service)).toEqual(['B', 'C', 'A']);
	});

	it('turns a thrown error into a failed result', async () => {
		const [result] = await postToServices(postData, ['a'], {a: new FakeService('A', 'throw')});
		expect(result).toEqual({service: 'A', success: false, error: 'boom'});
	});

	it('fails for unknown services', async () => {
		const [result] = await postToServices(postData, ['nope'], {});
		expect(result).toEqual({service: 'nope', success: false, error: 'Unknown service'});
	});
});
