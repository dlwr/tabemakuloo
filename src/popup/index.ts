import browser from 'webextension-polyfill';
import type {PostData} from '@/types';

// eslint-disable-next-line @typescript-eslint/naming-convention
class PopupUI {
	private readonly titleInput: HTMLInputElement;
	private readonly descriptionTextarea: HTMLTextAreaElement;
	private readonly tagsInput: HTMLInputElement;
	private readonly postButton: HTMLButtonElement;

	constructor() {
		this.titleInput = document.querySelector('#title')!;
		this.descriptionTextarea = document.querySelector('#description')!;
		this.tagsInput = document.querySelector('#tags')!;
		this.postButton = document.querySelector('#postBtn')!;

		void this.init();
	}

	private async init(): Promise<void> {
		await this.loadCurrentPageData();
		this.setupEventListeners();
	}

	private async loadCurrentPageData(): Promise<void> {
		try {
			const tabs = await browser.tabs.query({active: true, currentWindow: true});
			const tab = tabs[0];

			if (tab?.id) {
				const response = await browser.tabs.sendMessage(tab.id, {type: 'GET_PAGE_DATA'}) as PostData;
				if (response) {
					this.populateForm(response);
				}
			}
		} catch (error) {
			console.error('Failed to load page data:', error);
			// Fallback to tab info
			const tabs = await browser.tabs.query({active: true, currentWindow: true});
			const tab = tabs[0];
			if (tab) {
				this.titleInput.value = tab.title ?? '';
			}
		}
	}

	private populateForm(data: PostData): void {
		this.titleInput.value = data.title ?? '';
		this.descriptionTextarea.value = data.description ?? '';
	}

	private setupEventListeners(): void {
		this.postButton.addEventListener('click', this.handlePost.bind(this));
	}

	private async handlePost(): Promise<void> {
		this.postButton.disabled = true;
		this.postButton.textContent = '投稿中...';

		try {
			const postData = await this.collectFormData();
			const selectedServices = this.getSelectedServices();

			console.log('Posting to services:', selectedServices, postData);

			const response = await browser.runtime.sendMessage({
				type: 'POST_TO_SERVICES',
				data: {postData, services: selectedServices},
			}) as {results: Array<{service: string; success: boolean; error?: string; url?: string}>};

			if (response?.results) {
				const successCount = response.results.filter(r => r.success).length;
				const totalCount = response.results.length;

				if (successCount === totalCount) {
					this.postButton.textContent = '投稿完了！';
					setTimeout(() => {
						window.close();
					}, 1000);
				} else if (successCount > 0) {
					this.postButton.textContent = `一部成功 (${successCount}/${totalCount})`;
					setTimeout(() => {
						this.resetPostButton();
					}, 3000);
				} else {
					const errorMessage = response.results[0]?.error ?? 'Unknown error';
					this.postButton.textContent = `投稿失敗: ${errorMessage}`;
					setTimeout(() => {
						this.resetPostButton();
					}, 3000);
				}
			} else {
				throw new Error('Invalid response from background script');
			}
		} catch (error) {
			console.error('Post failed:', error);
			this.postButton.textContent = '投稿失敗';
			setTimeout(() => {
				this.resetPostButton();
			}, 2000);
		}
	}

	private resetPostButton(): void {
		this.postButton.disabled = false;
		this.postButton.textContent = '投稿する';
	}

	private async collectFormData(): Promise<PostData> {
		// Get current tab URL
		const tabs = await browser.tabs.query({active: true, currentWindow: true});
		const currentUrl = tabs[0]?.url ?? '';

		return {
			title: this.titleInput.value,
			url: currentUrl,
			description: this.descriptionTextarea.value,
			tags: this.tagsInput.value.split(',').map(tag => tag.trim()).filter(Boolean),
		};
	}

	private getSelectedServices(): string[] {
		const checkboxes = document.querySelectorAll('.services input[type="checkbox"]:checked');
		return Array.from(checkboxes).map(checkbox => (checkbox as HTMLInputElement).id);
	}
}

void new PopupUI();
