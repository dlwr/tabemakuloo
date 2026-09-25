import browser from 'webextension-polyfill';
import {connectReloadServer} from './reload-server.js';
import {postToServices} from './post-to-services.js';
import {TumblrService} from '@/services/tumblr-service.js';
import type {PostData, PostResult} from '@/types';

class BackgroundService {
	private readonly tumblrService: TumblrService;

	constructor() {
		this.tumblrService = new TumblrService();
		this.init();
	}

	private init(): void {
		browser.runtime.onMessage.addListener(this.handleMessage.bind(this));
	}

	private async handleMessage(message: unknown): Promise<unknown> {
		try {
			const message_ = message as {type: string; data?: unknown};

			switch (message_.type) {
				case 'POST_TO_SERVICES': {
					return await this.handlePostToServices(message_.data as {postData: PostData; services: string[]});
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
		return {results: await postToServices(data.postData, data.services, {tumblr: this.tumblrService})};
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
