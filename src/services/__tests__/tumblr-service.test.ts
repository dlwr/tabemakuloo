import {
	describe, it, expect, vi, beforeEach,
} from 'vitest';
import {TumblrService, parseTumblrSession} from '../tumblr-service.js';
import type {PostData} from '@/types';

const dashboardHtml = `<html><head>
<script type="application/json" id="___INITIAL_STATE___">{"csrfToken":"test-csrf","apiUrl":"https://www.tumblr.com/api","apiFetchStore":{"API_TOKEN":"test-api-token","extraHeaders":"{}"}}</script>
</head></html>`;

const userInfo = {
	response: {
		user: {
			name: 'test-user',
			blogs: [
				{name: 'side-blog', primary: false},
				{name: 'main-blog', primary: true},
			],
		},
	},
};

type Route = {ok: boolean; status?: number; body?: unknown; text?: string};

function mockTumblr(routes: Record<string, Route>) {
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
			text: async () => route.text ?? '',
		};
	});
	global.fetch = fetchMock as unknown as typeof fetch;
	return fetchMock;
}

const loggedInRoutes: Record<string, Route> = {
	'GET https://www.tumblr.com/': {ok: true, text: dashboardHtml},
	'GET https://www.tumblr.com/api/v2/user/info': {ok: true, body: userInfo},
};

function requestHeaders(fetchMock: ReturnType<typeof mockTumblr>, url: string): Record<string, string> {
	const call = fetchMock.mock.calls.find(([input]) => input === url);
	return call![1]!.headers as Record<string, string>;
}

function postRequestBody(fetchMock: ReturnType<typeof mockTumblr>): Record<string, unknown> {
	const call = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
	const body = call![1]!.body;
	return JSON.parse(body instanceof FormData ? body.get('json') as string : body as string) as Record<string, unknown>;
}

describe('parseTumblrSession', () => {
	it('extracts the API token from the initial state', () => {
		expect(parseTumblrSession(dashboardHtml).apiToken).toBe('test-api-token');
	});

	it('extracts the CSRF token from the initial state', () => {
		expect(parseTumblrSession(dashboardHtml).csrfToken).toBe('test-csrf');
	});

	it('throws when the initial state is missing', () => {
		expect(() => parseTumblrSession('<html></html>')).toThrow('Tumblr session not found');
	});
});

describe('TumblrService', () => {
	let service: TumblrService;
	beforeEach(() => {
		service = new TumblrService();
	});

	describe('Basic functionality', () => {
		it('should have correct service name', () => {
			expect(service.name).toBe('Tumblr');
		});

		it.each(['text', 'link', 'photo', 'quote'] as const)('supports %s posts', type => {
			expect(service.supports(type)).toBe(true);
		});

		it('does not support video posts', () => {
			expect(service.supports('video')).toBe(false);
		});
	});

	describe('Authentication', () => {
		it('is authenticated when user info can be fetched with the session token', async () => {
			const fetchMock = mockTumblr(loggedInRoutes);

			expect(await service.authenticate()).toBe(true);
			expect(requestHeaders(fetchMock, 'https://www.tumblr.com/api/v2/user/info')).toMatchObject({authorization: 'Bearer test-api-token'});
		});

		it('is not authenticated when user info is rejected', async () => {
			mockTumblr({
				...loggedInRoutes,
				'GET https://www.tumblr.com/api/v2/user/info': {ok: false, status: 401},
			});

			expect(await service.authenticate()).toBe(false);
		});
	});

	describe('Posting', () => {
		const postUrl = 'POST https://www.tumblr.com/api/v2/blog/main-blog/posts';
		const created: Route = {
			ok: true, status: 201,
			body: {response: {id: '12345', state: 'published'}},
		};

		const linkData: PostData = {
			title: 'Test Post',
			url: 'https://example.com',
			description: 'Test description',
			tags: ['test', 'example'],
		};

		it('returns the URL of the created post', async () => {
			mockTumblr({...loggedInRoutes, [postUrl]: created});

			const result = await service.post(linkData);

			expect(result).toEqual({service: 'Tumblr', success: true, url: 'https://www.tumblr.com/main-blog/12345'});
		});

		it('sends the API token and CSRF token', async () => {
			const fetchMock = mockTumblr({...loggedInRoutes, [postUrl]: created});

			await service.post(linkData);

			expect(requestHeaders(fetchMock, 'https://www.tumblr.com/api/v2/blog/main-blog/posts')).toMatchObject({authorization: 'Bearer test-api-token', 'x-csrf': 'test-csrf'});
		});

		it('posts a link block for link posts', async () => {
			const fetchMock = mockTumblr({...loggedInRoutes, [postUrl]: created});

			await service.post(linkData);

			expect(postRequestBody(fetchMock).content).toEqual([
				{
					type: 'link', url: 'https://example.com', title: 'Test Post', description: 'Test description',
				},
			]);
		});

		it('posts tags as a comma separated string', async () => {
			const fetchMock = mockTumblr({...loggedInRoutes, [postUrl]: created});

			await service.post(linkData);

			expect(postRequestBody(fetchMock).tags).toBe('test,example');
		});

		it('publishes the post immediately', async () => {
			const fetchMock = mockTumblr({...loggedInRoutes, [postUrl]: created});

			await service.post(linkData);

			expect(postRequestBody(fetchMock).state).toBe('published');
		});

		describe('photo posts', () => {
			const photoData: PostData = {...linkData, description: '', image: 'https://example.com/image.png'};
			const image = new Blob(['png'], {type: 'image/png'});

			const failedDownload = async (_url: string, _referrer: string): Promise<Blob> => {
				throw new Error('Failed to download image (404)');
			};

			function photoService(download = vi.fn(async (_url: string, _referrer: string) => image)) {
				return {service: new TumblrService({downloadImage: download}), download};
			}

			it('downloads the image with the page as the referrer', async () => {
				mockTumblr({...loggedInRoutes, [postUrl]: created});
				const {service, download} = photoService();

				await service.post(photoData);

				expect(download).toHaveBeenCalledWith('https://example.com/image.png', 'https://example.com');
			});

			it('uploads the downloaded image', async () => {
				const fetchMock = mockTumblr({...loggedInRoutes, [postUrl]: created});

				await photoService().service.post(photoData);

				const call = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
				expect((call![1]!.body as FormData).get('image0')).toBeInstanceOf(Blob);
			});

			it('posts an image block referring to the upload followed by a source link', async () => {
				const fetchMock = mockTumblr({...loggedInRoutes, [postUrl]: created});

				await photoService().service.post(photoData);

				expect(postRequestBody(fetchMock).content).toEqual([
					{type: 'image', media: [{type: 'image/png', identifier: 'image0'}]},
					{
						type: 'text',
						text: 'Test Post',
						formatting: [{
							type: 'link', start: 0, end: 9, url: 'https://example.com',
						}],
					},
				]);
			});

			it('adds the description after the source link', async () => {
				const fetchMock = mockTumblr({...loggedInRoutes, [postUrl]: created});

				await photoService().service.post({...photoData, description: 'nice'});

				expect((postRequestBody(fetchMock).content as unknown[]).at(-1)).toEqual({type: 'text', text: 'nice'});
			});

			it('fails when the image cannot be downloaded', async () => {
				mockTumblr({...loggedInRoutes, [postUrl]: created});
				const {service} = photoService(vi.fn(failedDownload));

				const result = await service.post(photoData);

				expect(result.error).toBe('Failed to download image (404)');
			});
		});

		describe('reblogs', () => {
			const parentRoute = 'GET https://www.tumblr.com/api/v2/blog/staff/posts?id=111';
			const parent: Route = {
				ok: true,
				body: {
					response: {
						blog: {name: 'staff', uuid: 't:staff-uuid'},
						// eslint-disable-next-line @typescript-eslint/naming-convention
						posts: [{id_string: '111', reblog_key: 'the-key'}],
					},
				},
			};
			const reblogData: PostData = {
				title: 'staff',
				url: 'https://www.tumblr.com/staff/111',
				reblogOf: {blog: 'staff', id: '111'},
				description: '',
				tags: ['foo'],
			};

			it('reblogs the parent post', async () => {
				const fetchMock = mockTumblr({...loggedInRoutes, [parentRoute]: parent, [postUrl]: created});

				await service.post(reblogData);

				expect(postRequestBody(fetchMock)).toMatchObject({
					// eslint-disable-next-line @typescript-eslint/naming-convention
					parent_tumblelog_uuid: 't:staff-uuid', parent_post_id: '111', reblog_key: 'the-key',
				});
			});

			it('adds nothing when there is no comment', async () => {
				const fetchMock = mockTumblr({...loggedInRoutes, [parentRoute]: parent, [postUrl]: created});

				await service.post(reblogData);

				expect(postRequestBody(fetchMock).content).toEqual([]);
			});

			it('adds the comment', async () => {
				const fetchMock = mockTumblr({...loggedInRoutes, [parentRoute]: parent, [postUrl]: created});

				await service.post({...reblogData, description: 'nice'});

				expect(postRequestBody(fetchMock).content).toEqual([{type: 'text', text: 'nice'}]);
			});

			it('tags the reblog', async () => {
				const fetchMock = mockTumblr({...loggedInRoutes, [parentRoute]: parent, [postUrl]: created});

				await service.post(reblogData);

				expect(postRequestBody(fetchMock).tags).toBe('foo');
			});

			it('fails when the parent post cannot be found', async () => {
				mockTumblr({...loggedInRoutes, [parentRoute]: {ok: false, status: 404}});

				const result = await service.post(reblogData);

				expect(result.error).toBe('Tumblr post to reblog not found (404)');
			});
		});

		it('posts a quote followed by an attributed source link and the description', async () => {
			const fetchMock = mockTumblr({...loggedInRoutes, [postUrl]: created});

			await service.post({...linkData, quote: 'short quote'});

			expect(postRequestBody(fetchMock).content).toEqual([
				{type: 'text', subtype: 'quote', text: 'short quote'},
				{
					type: 'text',
					text: '— Test Post',
					formatting: [{
						type: 'link', start: 2, end: 11, url: 'https://example.com',
					}],
				},
				{type: 'text', text: 'Test description'},
			]);
		});

		it('posts a long quote as quote blocks', async () => {
			const fetchMock = mockTumblr({...loggedInRoutes, [postUrl]: created});

			await service.post({...linkData, quote: `${'あ'.repeat(100)}\n\n${'い'.repeat(100)}`});

			const quoteBlocks = (postRequestBody(fetchMock).content as Array<{subtype?: string}>).filter(block => block.subtype);
			expect(quoteBlocks.every(block => block.subtype === 'quote')).toBe(true);
		});

		it('posts each quoted line as a separate block', async () => {
			const fetchMock = mockTumblr({...loggedInRoutes, [postUrl]: created});

			await service.post({...linkData, quote: 'first line\n\nsecond line'});

			const texts = (postRequestBody(fetchMock).content as Array<{subtype?: string; text: string}>)
				.filter(block => block.subtype)
				.map(block => block.text);
			expect(texts).toEqual(['first line', 'second line']);
		});

		it('fails with the HTTP status when Tumblr rejects the post', async () => {
			mockTumblr({...loggedInRoutes, [postUrl]: {ok: false, status: 403}});

			const result = await service.post(linkData);

			expect(result.error).toBe('Failed to post to Tumblr (403)');
		});

		it('fails when not logged in to Tumblr', async () => {
			mockTumblr({
				...loggedInRoutes,
				'GET https://www.tumblr.com/api/v2/user/info': {ok: false, status: 401},
			});

			const result = await service.post(linkData);

			expect(result.error).toBe('Not logged in to Tumblr');
		});

		it('should validate post data', async () => {
			const invalidData: PostData = {
				title: '',
				url: 'invalid-url',
				description: '',
				tags: [],
			};

			const result = await service.post(invalidData);

			expect(result.success).toBe(false);
			expect(result.error).toContain('Title is required');
		});
	});

	describe('Post type detection', () => {
		it('detects quote posts when text is quoted, even with an image', () => {
			const quoteData: PostData = {
				title: 'Quote Post',
				url: 'https://example.com',
				image: 'https://example.com/image.jpg',
				quote: 'quoted text',
			};

			expect(service.detectPostType(quoteData)).toBe('quote');
		});

		it('does not detect quote posts for whitespace-only quotes', () => {
			const data: PostData = {
				title: 'Link Post',
				url: 'https://example.com',
				quote: '  ',
			};

			expect(service.detectPostType(data)).toBe('link');
		});

		it('should detect link posts', () => {
			const linkData: PostData = {
				title: 'Link Post',
				url: 'https://example.com',
				description: 'A link post',
			};

			expect(service.detectPostType(linkData)).toBe('link');
		});

		it('should detect text posts', () => {
			const textData: PostData = {
				title: 'Text Post',
				url: '',
				description: 'Just some text content',
			};

			expect(service.detectPostType(textData)).toBe('text');
		});

		it('detects reblogs', () => {
			expect(service.detectPostType({title: '', url: 'https://www.tumblr.com/staff/1', reblogOf: {blog: 'staff', id: '1'}})).toBe('reblog');
		});

		it('should detect image posts', () => {
			const imageData: PostData = {
				title: 'Image Post',
				url: 'https://example.com',
				image: 'https://example.com/image.jpg',
			};

			expect(service.detectPostType(imageData)).toBe('photo');
		});
	});
});
