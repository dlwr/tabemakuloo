import {
	describe, it, expect, vi, beforeEach,
} from 'vitest';
import {HatenaBookmarkService} from '../hatena-bookmark-service.js';
import type {PostData} from '@/types';

type Route = {ok: boolean; status?: number; body?: unknown};

function mockHatena(routes: Record<string, Route>) {
	const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
		const key = `${init?.method ?? 'GET'} ${input}`;
		const route = routes[key];
		if (!route) {
			throw new Error(`Unexpected request: ${key}`);
		}

		return {
			ok: route.ok,
			status: route.status ?? (route.ok ? 200 : 500),
			json: async () => route.body,
		};
	});
	global.fetch = fetchMock as unknown as typeof fetch;
	return fetchMock;
}

const loggedIn: Record<string, Route> = {
	'GET https://b.hatena.ne.jp/my.name': {ok: true, body: {login: 1, name: 'test-user', rks: 'test-rks'}},
};

const addUrl = 'POST https://b.hatena.ne.jp/test-user/add.edit.json';

function postedForm(fetchMock: ReturnType<typeof mockHatena>): URLSearchParams {
	const call = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
	return new URLSearchParams(call![1]!.body as string);
}

const quoteData: PostData = {
	title: 'Example',
	url: 'https://example.com/article',
	quote: 'quoted text',
	description: 'my comment',
	tags: ['foo', 'bar'],
};

describe('HatenaBookmarkService', () => {
	let service: HatenaBookmarkService;
	beforeEach(() => {
		service = new HatenaBookmarkService();
	});

	it('is named はてなブックマーク', () => {
		expect(service.name).toBe('はてなブックマーク');
	});

	describe('Authentication', () => {
		it('is authenticated when logged in', async () => {
			mockHatena(loggedIn);
			expect(await service.authenticate()).toBe(true);
		});

		it('is not authenticated when not logged in', async () => {
			mockHatena({'GET https://b.hatena.ne.jp/my.name': {ok: true, body: {login: 0}}});
			expect(await service.authenticate()).toBe(false);
		});
	});

	describe('Posting', () => {
		const added: Route = {ok: true, body: {}};

		it('bookmarks the page URL', async () => {
			const fetchMock = mockHatena({...loggedIn, [addUrl]: added});
			await service.post(quoteData);
			expect(postedForm(fetchMock).get('url')).toBe('https://example.com/article');
		});

		it('sends the rks token', async () => {
			const fetchMock = mockHatena({...loggedIn, [addUrl]: added});
			await service.post(quoteData);
			expect(postedForm(fetchMock).get('rks')).toBe('test-rks');
		});

		it('puts the tags in front of the comment, leaving out the quote', async () => {
			const fetchMock = mockHatena({...loggedIn, [addUrl]: added});
			await service.post(quoteData);
			expect(postedForm(fetchMock).get('comment')).toBe('[foo][bar]my comment');
		});

		it('joins comment lines with spaces', async () => {
			const fetchMock = mockHatena({...loggedIn, [addUrl]: added});
			await service.post({...quoteData, description: 'line1\nline2'});
			expect(postedForm(fetchMock).get('comment')).toBe('[foo][bar]line1 line2');
		});

		it('returns the URL of the bookmarked entry', async () => {
			mockHatena({...loggedIn, [addUrl]: added});
			const result = await service.post(quoteData);
			expect(result).toEqual({service: 'はてなブックマーク', success: true, url: 'https://b.hatena.ne.jp/entry?url=https%3A%2F%2Fexample.com%2Farticle'});
		});

		it('fails with the HTTP status when Hatena rejects the bookmark', async () => {
			mockHatena({...loggedIn, [addUrl]: {ok: false, status: 403}});
			const result = await service.post(quoteData);
			expect(result.error).toBe('Failed to bookmark on Hatena (403)');
		});

		it('fails when not logged in', async () => {
			mockHatena({'GET https://b.hatena.ne.jp/my.name': {ok: true, body: {login: 0}}});
			const result = await service.post(quoteData);
			expect(result.error).toBe('Not logged in to Hatena');
		});
	});

	describe('Tags', () => {
		it('returns the user tags with their counts', async () => {
			mockHatena({
				...loggedIn,
				'GET https://b.hatena.ne.jp/test-user/tags.json': {ok: true, body: {tags: {foo: {count: 3}, bar: {count: 1}}}},
			});
			expect(await service.getTags()).toEqual({foo: 3, bar: 1});
		});
	});
});
