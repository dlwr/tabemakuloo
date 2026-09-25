import type {PostData} from '@/types';

// Serialized and run in the page by chrome.scripting.executeScript, so it must not reference anything outside itself.
export function extractPageData(): PostData {
	const selection = window.getSelection()?.toString().trim() ?? '';
	const quote = selection === '' ? undefined : selection;
	const metaDescription = document.querySelector('meta[name="description"], meta[property="og:description"]')?.getAttribute('content');

	return {
		title: document.title,
		url: window.location.href,
		description: quote ? '' : metaDescription ?? '',
		quote,
	};
}
