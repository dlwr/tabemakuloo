import browser from 'webextension-polyfill';
import {connectReloadServer} from './reload-server.js';
import {postToServices} from './post-to-services.js';
import {downloadImage} from './download-image.js';
import {postTextViaIntent} from './x-intent.js';
import {registerContextMenu} from './context-menu.js';
import {HatenaBookmarkService} from '@/services/hatena-bookmark-service.js';
import {TumblrService} from '@/services/tumblr-service.js';
import {XService} from '@/services/x-service.js';
import {loadUsedTags, recordUsedTags} from '@/settings/used-tags.js';
import {mergeTagCounts} from '@/utils/tag-completion.js';
import type {PostData, PostResult} from '@/types';

class BackgroundService {
	private readonly tumblrService: TumblrService;
	private readonly hatenaService = new HatenaBookmarkService();
	private readonly xService = new XService({postText: postTextViaIntent});

	constructor() {
		this.tumblrService = new TumblrService({downloadImage});
		this.init();
	}

	private init(): void {
		browser.runtime.onMessage.addListener(this.handleMessage.bind(this));
		registerContextMenu(this.post.bind(this));
	}

	private async handleMessage(message: unknown): Promise<unknown> {
		try {
			const message_ = message as {type: string; data?: unknown};

			switch (message_.type) {
				case 'POST_TO_SERVICES': {
					return await this.handlePostToServices(message_.data as {postData: PostData; services: string[]});
				}

				case 'GET_TAG_CANDIDATES': {
					return await this.tagCandidates();
				}

				case 'CHECK_AUTH': {
					return await this.handleCheckAuth(message_.data as {service: string});
				}

				default: {
					console.log('Unknown message type:', message_.type);
					return {success: false, error: 'Unknown message type'};
				}
			}
		} catch (error) {
			console.error('Background message handler error:', error);
			return {success: false, error: 'Internal error'};
		}
	}

	private async handlePostToServices(data: {postData: PostData; services: string[]}): Promise<{results: PostResult[]}> {
		return {results: await this.post(data.postData, data.services)};
	}

	private async post(postData: PostData, services: string[]): Promise<PostResult[]> {
		const results = await postToServices(postData, services, {tumblr: this.tumblrService, hatena: this.hatenaService, x: this.xService});
		if (results.some(result => result.success) && postData.tags?.length) {
			await recordUsedTags(browser.storage.local, postData.tags);
		}

		return results;
	}

	private async tagCandidates(): Promise<Record<string, number>> {
		return mergeTagCounts(await this.hatenaTags(), await loadUsedTags(browser.storage.local));
	}

	private async hatenaTags(): Promise<Record<string, number>> {
		const cacheKey = 'hatenaTags';
		const cached = await browser.storage.session.get(cacheKey);
		if (cached[cacheKey]) {
			return cached[cacheKey] as Record<string, number>;
		}

		try {
			const tags = await this.hatenaService.getTags();
			await browser.storage.session.set({[cacheKey]: tags});
			return tags;
		} catch (error) {
			console.error('Failed to load Hatena tags:', error);
			return {};
		}
	}

	private async handleCheckAuth(data: {service: string}): Promise<{authenticated: boolean}> {
		const {service} = data;

		if (service === 'tumblr') {
			const authenticated = await this.tumblrService.authenticate();
			return {authenticated};
		}

		return {authenticated: false};
	}
}

void new BackgroundService();

if (import.meta.env.MODE === 'development') {
	connectReloadServer(() => {
		chrome.runtime.reload();
	});
}
