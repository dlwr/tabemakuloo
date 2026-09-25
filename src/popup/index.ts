import browser from 'webextension-polyfill';
import {TumblrService} from '@/services/tumblr-service.js';
import type {PostData, PostResult, PostTypeString} from '@/types';

const postButtonLabels: Partial<Record<PostTypeString, string>> = {
	quote: 'Tumblr に引用を投稿',
	link: 'Tumblr にリンクを投稿',
	photo: 'Tumblr に画像を投稿',
	text: 'Tumblr に投稿',
};

const errorMessages: Record<string, string> = {
	'Not logged in to Tumblr': 'Tumblr にログインしていません',
};

// eslint-disable-next-line @typescript-eslint/naming-convention
class PopupUI {
	private readonly titleInput = document.querySelector<HTMLInputElement>('#title')!;
	private readonly urlText = document.querySelector<HTMLElement>('#url')!;
	private readonly quoteTextarea = document.querySelector<HTMLTextAreaElement>('#quote')!;
	private readonly descriptionTextarea = document.querySelector<HTMLTextAreaElement>('#description')!;
	private readonly tagsInput = document.querySelector<HTMLInputElement>('#tags')!;
	private readonly postButton = document.querySelector<HTMLButtonElement>('#postBtn')!;
	private readonly status = document.querySelector<HTMLElement>('#status')!;
	private readonly tumblr = new TumblrService();
	private url = '';

	constructor() {
		void this.init();
	}

	private async init(): Promise<void> {
		this.postButton.addEventListener('click', this.handlePost.bind(this));
		this.quoteTextarea.addEventListener('input', this.updatePostButton.bind(this));
		document.addEventListener('keydown', event => {
			if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
				void this.handlePost();
			}
		});

		await this.loadCurrentPageData();
		this.updatePostButton();
		(this.quoteTextarea.value ? this.descriptionTextarea : this.quoteTextarea).focus();
	}

	private async loadCurrentPageData(): Promise<void> {
		const [tab] = await browser.tabs.query({active: true, currentWindow: true});
		this.setPage(tab?.title ?? '', tab?.url ?? '');

		if (!tab?.id) {
			return;
		}

		try {
			const data = await browser.tabs.sendMessage(tab.id, {type: 'GET_PAGE_DATA'}) as PostData | undefined;
			if (data) {
				this.setPage(data.title, data.url);
				this.quoteTextarea.value = data.quote ?? '';
				this.descriptionTextarea.value = data.description ?? '';
			}
		} catch (error) {
			console.error('Failed to load page data:', error);
		}
	}

	private setPage(title: string, url: string): void {
		this.titleInput.value = title;
		this.url = url;
		this.urlText.textContent = url;
		this.urlText.title = url;
	}

	private updatePostButton(): void {
		this.postButton.textContent = postButtonLabels[this.tumblr.detectPostType(this.collectFormData())] ?? 'Tumblr に投稿';
	}

	private async handlePost(): Promise<void> {
		if (this.postButton.disabled) {
			return;
		}

		this.postButton.disabled = true;
		this.showStatus('投稿中…');

		try {
			const response = await browser.runtime.sendMessage({
				type: 'POST_TO_SERVICES',
				data: {postData: this.collectFormData(), services: ['tumblr']},
			}) as {results?: PostResult[]} | undefined;
			const result = response?.results?.[0];

			if (result?.success) {
				this.showSuccess(result.url);
				return;
			}

			const error = result?.error ?? 'Unknown error';
			this.showStatus(errorMessages[error] ?? `投稿できませんでした: ${error}`, 'error');
		} catch (error) {
			console.error('Post failed:', error);
			this.showStatus('投稿できませんでした', 'error');
		}

		this.postButton.disabled = false;
	}

	private showSuccess(postUrl?: string): void {
		this.showStatus('投稿しました', 'success');
		if (postUrl) {
			const link = document.createElement('a');
			link.href = postUrl;
			link.target = '_blank';
			link.textContent = '開く';
			this.status.append(' ', link);
		}
	}

	private showStatus(message: string, kind?: 'error' | 'success'): void {
		this.status.textContent = message;
		this.status.className = kind ?? '';
	}

	private collectFormData(): PostData {
		return {
			title: this.titleInput.value,
			url: this.url,
			description: this.descriptionTextarea.value,
			quote: this.quoteTextarea.value,
			tags: this.tagsInput.value.split(',').map(tag => tag.trim()).filter(Boolean),
		};
	}
}

void new PopupUI();
