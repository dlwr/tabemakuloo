import type {PostData} from '@/types';

export function extractPageData(): PostData {
	const selection = window.getSelection()?.toString().trim() ?? '';
	const quote = selection === '' ? undefined : selection;

	return {
		title: document.title,
		url: window.location.href,
		description: quote ? '' : getMetaContent('description') ?? '',
		quote,
	};
}

function getMetaContent(name: string): string | undefined {
	const meta = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
	return meta?.getAttribute('content') ?? undefined;
}
