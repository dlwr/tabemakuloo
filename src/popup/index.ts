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
import {takeFormDraft} from '@/utils/draft.js';
import {localizeError} from '@/utils/error-messages.js';
import {applyTagCompletion, suggestTags} from '@/utils/tag-completion.js';

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
	private readonly tagSuggestions = document.querySelector<HTMLUListElement>('#tagSuggestions')!;
	private tagCandidates: Record<string, number> = {};
	private suggestions: string[] = [];
	private highlighted = -1;
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

		this.tagsInput.addEventListener('input', () => {
			this.showSuggestions(suggestTags(this.tagsInput.value, this.tagCandidates));
		});
		this.tagsInput.addEventListener('keydown', this.handleTagKeydown.bind(this));
		this.tagsInput.addEventListener('blur', () => {
			this.showSuggestions([]);
		});
		void this.loadTagCandidates();

		document.addEventListener('keydown', event => {
			if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
				void this.handlePost();
			}
		});

		const [destinations, draft] = await Promise.all([loadDefaultDestinations(browser.storage.sync), takeFormDraft(browser.storage.session)]);
		this.defaultDestinations = destinations;
		if (draft) {
			this.fill(draft.postData);
			this.selectKind(draft.kind);
		} else {
			await this.loadCurrentPageData();
			this.selectKind(this.quoteTextarea.value.trim() ? 'quote' : 'link');
		}

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
				this.fill(data);
			}
		} catch (error) {
			console.error('Failed to load page data:', error);
		}
	}

	private fill(data: PostData): void {
		this.setPage(data.title, data.url);
		this.quoteTextarea.value = data.quote ?? '';
		this.descriptionTextarea.value = data.description ?? '';
		this.tagsInput.value = data.tags?.join(', ') ?? '';
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

	private async loadTagCandidates(): Promise<void> {
		try {
			this.tagCandidates = await browser.runtime.sendMessage({type: 'GET_TAG_CANDIDATES'}) as Record<string, number>;
		} catch (error) {
			console.error('Failed to load tag candidates:', error);
		}
	}

	private handleTagKeydown(event: KeyboardEvent): void {
		if (this.suggestions.length === 0 || event.metaKey || event.ctrlKey) {
			return;
		}

		switch (event.key) {
			case 'ArrowDown':
			case 'ArrowUp': {
				event.preventDefault();
				const step = event.key === 'ArrowDown' ? 1 : -1;
				this.highlight((this.highlighted + step + this.suggestions.length) % this.suggestions.length);
				break;
			}

			case 'Tab':
			case 'Enter': {
				event.preventDefault();
				this.completeTag(this.suggestions[Math.max(this.highlighted, 0)]);
				break;
			}

			case 'Escape': {
				event.preventDefault();
				this.showSuggestions([]);
				break;
			}

			default:
		}
	}

	private showSuggestions(suggestions: string[]): void {
		this.suggestions = suggestions;
		this.highlighted = -1;
		this.tagSuggestions.replaceChildren(...suggestions.map(tag => {
			const item = document.createElement('li');
			item.role = 'option';
			item.textContent = tag;
			item.addEventListener('mousedown', event => {
				event.preventDefault();
				this.completeTag(tag);
			});
			return item;
		}));
		this.tagSuggestions.hidden = suggestions.length === 0;
		this.tagsInput.setAttribute('aria-expanded', String(suggestions.length > 0));
	}

	private highlight(index: number): void {
		this.highlighted = index;
		for (const [itemIndex, item] of [...this.tagSuggestions.children].entries()) {
			item.setAttribute('aria-selected', String(itemIndex === index));
		}
	}

	private completeTag(tag: string): void {
		this.tagsInput.value = applyTagCompletion(this.tagsInput.value, tag);
		this.showSuggestions([]);
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
		const message = failures.map(result => `${result.service}: ${localizeError(result.error ?? 'Unknown error')}`).join(' / ');
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
