import browser, {type Menus, type Tabs} from 'webextension-polyfill';
import {quickPost, notificationFor} from './quick-post.js';
import {extractPageData} from '@/content/page-data.js';
import {parseTumblrPostUrl} from '@/services/tumblr-post-url.js';
import {loadDefaultDestinations, type PostKind, type ServiceId} from '@/settings/destinations.js';
import type {PostData, PostResult} from '@/types';
import {saveFormDraft, type Draft} from '@/utils/draft.js';

type Mode = 'quick' | 'form';

const tumblrPages = ['https://*.tumblr.com/*'];

const menus: Array<{mode: Mode; kind: PostKind; title: string; contexts: Menus.ContextType[]; documentUrlPatterns?: string[]}> = [
	{
		mode: 'quick', kind: 'reblog', title: 'Quick - reblog', contexts: ['all'], documentUrlPatterns: tumblrPages,
	},
	{
		mode: 'form', kind: 'reblog', title: 'Form - reblog', contexts: ['all'], documentUrlPatterns: tumblrPages,
	},
	{
		mode: 'quick', kind: 'quote', title: 'Quick - 引用', contexts: ['selection'],
	},
	{
		mode: 'form', kind: 'quote', title: 'Form - 引用', contexts: ['selection'],
	},
	{
		mode: 'quick', kind: 'photo', title: 'Quick - 画像', contexts: ['image'],
	},
	{
		mode: 'form', kind: 'photo', title: 'Form - 画像', contexts: ['image'],
	},
	{
		mode: 'quick', kind: 'link', title: 'Quick - リンク', contexts: ['page'],
	},
	{
		mode: 'form', kind: 'link', title: 'Form - リンク', contexts: ['page'],
	},
];

const failedNotificationPrefix = 'failed:';

type Poster = (postData: PostData, services: ServiceId[]) => Promise<PostResult[]>;

export function registerContextMenu(post: Poster): void {
	browser.runtime.onInstalled.addListener(async () => {
		await browser.contextMenus.removeAll();
		for (const {mode, kind, title, contexts, documentUrlPatterns} of menus) {
			browser.contextMenus.create({
				id: `${mode}:${kind}`, title, contexts, documentUrlPatterns,
			});
		}
	});

	browser.contextMenus.onClicked.addListener(async (info, tab) => {
		const [mode, kind] = String(info.menuItemId).split(':') as [Mode, PostKind];
		if (kind === 'reblog') {
			await reblog(mode, tab, info, post);
			return;
		}

		const draft: Draft = {kind, postData: await extractFromTab(tab, info)};
		if (kind !== 'quote') {
			draft.postData.quote = '';
		}

		if (kind === 'photo') {
			draft.postData.image = info.srcUrl;
		}

		if (mode === 'form') {
			await openForm(draft);
			return;
		}

		await runQuickPost(draft, post);
	});

	browser.notifications.onClicked.addListener(async notificationId => {
		if (!notificationId.startsWith(failedNotificationPrefix)) {
			return;
		}

		const items = await browser.storage.session.get(notificationId);
		await browser.storage.session.remove(notificationId);
		await browser.notifications.clear(notificationId);
		const draft = items[notificationId] as Draft | undefined;
		if (draft) {
			await openForm(draft);
		}
	});
}

async function reblog(mode: Mode, tab: Tabs.Tab | undefined, info: Menus.OnClickData, post: Poster): Promise<void> {
	const reference = parseTumblrPostUrl(await postHrefUnderCursor(tab) ?? info.pageUrl ?? '');
	if (!reference) {
		await browser.notifications.create({
			type: 'basic',
			iconUrl: browser.runtime.getURL('icons/icon128.png'),
			title: 'reblog できませんでした',
			message: 'reblog する投稿が見つかりません',
		});
		return;
	}

	const draft: Draft = {
		kind: 'reblog',
		postData: {
			title: `${reference.blog} の投稿`, url: `https://www.tumblr.com/${reference.blog}/${reference.id}`, reblogOf: reference,
		},
	};
	await (mode === 'form' ? openForm(draft) : runQuickPost(draft, post));
}

async function postHrefUnderCursor(tab: Tabs.Tab | undefined): Promise<string | undefined> {
	if (tab?.id === undefined) {
		return undefined;
	}

	try {
		const [injection] = await browser.scripting.executeScript({target: {tabId: tab.id}, func: () => (globalThis as {tabemakulooPostHref?: string}).tabemakulooPostHref});
		return injection?.result as string | undefined;
	} catch (error) {
		console.error('Failed to find the post under the cursor:', error);
		return undefined;
	}
}

async function extractFromTab(tab: Tabs.Tab | undefined, info: Menus.OnClickData): Promise<PostData> {
	const fallback: PostData = {title: tab?.title ?? '', url: info.pageUrl ?? tab?.url ?? '', quote: info.selectionText};
	if (tab?.id === undefined) {
		return fallback;
	}

	try {
		const [injection] = await browser.scripting.executeScript({target: {tabId: tab.id}, func: extractPageData});
		return (injection?.result as PostData | undefined) ?? fallback;
	} catch (error) {
		console.error('Failed to extract page data:', error);
		return fallback;
	}
}

async function runQuickPost(draft: Draft, post: Poster): Promise<void> {
	await quickPost(draft, {
		loadDestinations: async () => loadDefaultDestinations(browser.storage.sync),
		post,
		notify,
		openForm,
	});
}

async function notify(result: PostResult, draft: Draft): Promise<void> {
	const id = `${result.success ? 'posted:' : failedNotificationPrefix}${crypto.randomUUID()}`;
	if (!result.success) {
		await browser.storage.session.set({[id]: draft});
	}

	await browser.notifications.create(id, {
		type: 'basic',
		iconUrl: browser.runtime.getURL('icons/icon128.png'),
		...notificationFor(result, draft),
	});
}

async function openForm(draft: Draft): Promise<void> {
	await saveFormDraft(browser.storage.session, draft);
	try {
		await chrome.action.openPopup();
	} catch {
		await browser.windows.create({
			url: browser.runtime.getURL('popup/index.html'), type: 'popup', width: 400, height: 560,
		});
	}
}
