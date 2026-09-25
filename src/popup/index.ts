import browser from 'webextension-polyfill';
import {extractPageData} from '@/content/page-data.js';
import {
	loadDefaultDestinations,
	serviceNames,
	servicesSupporting,
	type DefaultDestinations,
	type PostKind,
	type ServiceId,
} from '@/settings/destinations.js';
import type {PostData, PostResult} from '@/types';

const errorMessages: Record<string, string> = {
	'Not logged in to Tumblr': 'Tumblr にログインしていません',
};

// eslint-disable-next-line @typescript-eslint/naming-convention
class PopupUI {
	private readonly titleInput = document.querySelector<HTMLInputElement>('#title')!;
	private readonly urlText = document.querySelector<HTMLElement>('#url')!;
	private readonly kindInputs = document.querySelectorAll<HTMLInputElement>('input[name="kind"]');
	private readonly serviceList = document.querySelector<HTMLFieldSetElement>('#services')!;
	private readonly quoteField = document.querySelector<HTMLElement>('#quoteField')!;
	private readonly quoteTextarea = document.querySelector<HTMLTextAreaElement>('#quote')!;
	private readonly descriptionTextarea = document.querySelector<HTMLTextAreaElement>('#description')!;
	private readonly tagsInput = document.querySelector<HTMLInputElement>('#tags')!;
	private readonly postButton = document.querySelector<HTMLButtonElement>('#postBtn')!;
	private readonly status = document.querySelector<HTMLElement>('#status')!;
	private defaultDestinations?: DefaultDestinations;
	private url = '';

	constructor() {
		void this.init();
	}

	private async init(): Promise<void> {
		this.postButton.addEventListener('click', this.handlePost.bind(this));
		for (const input of this.kindInputs) {
			input.addEventListener('change', () => {
				this.selectKind(input.value as PostKind);
			});
		}

		document.addEventListener('keydown', event => {
			if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
				void this.handlePost();
			}
		});

		const [destinations] = await Promise.all([loadDefaultDestinations(browser.storage.sync), this.loadCurrentPageData()]);
		this.defaultDestinations = destinations;
		this.selectKind(this.quoteTextarea.value.trim() ? 'quote' : 'link');
		(this.quoteTextarea.value ? this.descriptionTextarea : this.quoteTextarea).focus();
	}

	private async loadCurrentPageData(): Promise<void> {
		const [tab] = await browser.tabs.query({active: true, currentWindow: true});
		this.setPage(tab?.title ?? '', tab?.url ?? '');

		if (!tab?.id) {
			return;
		}

		try {
			const [injection] = await browser.scripting.executeScript({target: {tabId: tab.id}, func: extractPageData});
			const data = injection?.result as PostData | undefined;
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

	private selectKind(kind: PostKind): void {
		for (const input of this.kindInputs) {
			input.checked = input.value === kind;
		}

		this.quoteField.hidden = kind !== 'quote';
		this.renderServices(kind);
	}

	private renderServices(kind: PostKind): void {
		const checked = this.defaultDestinations?.[kind] ?? [];
		const labels = servicesSupporting(kind).map(service => {
			const input = document.createElement('input');
			input.type = 'checkbox';
			input.value = service;
			input.checked = checked.includes(service);
			const label = document.createElement('label');
			label.append(input, serviceNames[service]);
			return label;
		});
		this.serviceList.replaceChildren(this.serviceList.querySelector('legend')!, ...labels);
	}

	private selectedKind(): PostKind {
		return ([...this.kindInputs].find(input => input.checked)?.value ?? 'link') as PostKind;
	}

	private selectedServices(): ServiceId[] {
		return [...this.serviceList.querySelectorAll<HTMLInputElement>('input:checked')].map(input => input.value as ServiceId);
	}

	private async handlePost(): Promise<void> {
		if (this.postButton.disabled) {
			return;
		}

		const services = this.selectedServices();
		if (services.length === 0) {
			this.showStatus('投稿先を選んでください', 'error');
			return;
		}

		if (this.selectedKind() === 'quote' && !this.quoteTextarea.value.trim()) {
			this.showStatus('引用が空です', 'error');
			return;
		}

		this.postButton.disabled = true;
		this.showStatus('投稿中…');

		try {
			const response = await browser.runtime.sendMessage({
				type: 'POST_TO_SERVICES',
				data: {postData: this.collectFormData(), services},
			}) as {results?: PostResult[]} | undefined;
			const results = response?.results ?? [];

			if (results.length > 0 && results.every(result => result.success)) {
				this.showSuccess(results);
				return;
			}

			this.showResults(results);
		} catch (error) {
			console.error('Post failed:', error);
			this.showStatus('投稿できませんでした', 'error');
		}

		this.postButton.disabled = false;
	}

	private showSuccess(results: PostResult[]): void {
		this.showStatus('投稿しました', 'success');
		for (const result of results) {
			if (result.url) {
				const link = document.createElement('a');
				link.href = result.url;
				link.target = '_blank';
				link.textContent = results.length > 1 ? `${result.service} を開く` : '開く';
				this.status.append(' ', link);
			}
		}
	}

	private showResults(results: PostResult[]): void {
		const failures = results.filter(result => !result.success);
		const message = failures.map(result => errorMessages[result.error ?? ''] ?? `${result.service}: ${result.error ?? 'Unknown error'}`).join(' / ');
		const succeeded = results.filter(result => result.success).map(result => result.service);
		this.showStatus(succeeded.length > 0 ? `${succeeded.join('・')} には投稿しました。${message}` : `投稿できませんでした: ${message}`, 'error');
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
			quote: this.selectedKind() === 'quote' ? this.quoteTextarea.value : '',
			tags: this.tagsInput.value.split(',').map(tag => tag.trim()).filter(Boolean),
		};
	}
}

void new PopupUI();
