import {describe, it, expect, vi} from 'vitest';
import {XService} from '../x-service.js';
import type {PostData} from '@/types';

const data: PostData = {
	title: 'Example', url: 'https://example.com/', quote: 'hello', description: 'nice',
};

describe('XService', () => {
	it('is named X', () => {
		expect(new XService({postText: vi.fn()}).name).toBe('X');
	});

	it('posts the text built from the page', async () => {
		const postText = vi.fn(async () => ({url: 'https://x.com/me/status/1'}));
		await new XService({postText}).post(data);
		expect(postText).toHaveBeenCalledWith('nice "hello" Example https://example.com/');
	});

	it('posts the text edited in the form instead', async () => {
		const postText = vi.fn(async () => ({}));
		await new XService({postText}).post({...data, xText: 'edited'});
		expect(postText).toHaveBeenCalledWith('edited');
	});

	it('returns the URL of the post', async () => {
		const result = await new XService({postText: async () => ({url: 'https://x.com/me/status/1'})}).post(data);
		expect(result).toEqual({service: 'X', success: true, url: 'https://x.com/me/status/1'});
	});

	it('fails with the error from posting', async () => {
		const result = await new XService({
			async postText() {
				throw new Error('Not logged in to X');
			},
		}).post(data);
		expect(result).toEqual({service: 'X', success: false, error: 'Not logged in to X'});
	});

	it.each(['quote', 'link'] as const)('supports %s posts', type => {
		expect(new XService({postText: vi.fn()}).supports(type)).toBe(true);
	});

	it.each(['photo', 'reblog'] as const)('does not support %s posts', type => {
		expect(new XService({postText: vi.fn()}).supports(type)).toBe(false);
	});
});
