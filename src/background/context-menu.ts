import browser, {type Menus, type Tabs} from 'webextension-polyfill';
import {quickPost, notificationFor} from './quick-post.js';
import {extractPageData} from '@/content/page-data.js';
import {loadDefaultDestinations, type PostKind, type ServiceId} from '@/settings/destinations.js';
import type {PostData, PostResult} from '@/types';
import {saveFormDraft, type Draft} from '@/utils/draft.js';

type Mode = 'quick' | 'form';

const menus: Array<{mode: Mode; kind: PostKind; title: string; contexts: Menus.ContextType[]}> = [
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

export function registerContextMenu(post: (postData: PostData, services: ServiceId[]) => Promise<PostResult[]>): void {
	browser.runtime.onInstalled.addListener(async () => {
		await browser.contextMenus.removeAll();
		for (const {mode, kind, title, contexts} of menus) {
			browser.contextMenus.create({id: `${mode}:${kind}`, title, contexts});
		}
	});

	browser.contextMenus.onClicked.addListener(async (info, tab) => {
		const [mode, kind] = String(info.menuItemId).split(':') as [Mode, PostKind];
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

		await quickPost(draft, {
			loadDestinations: async () => loadDefaultDestinations(browser.storage.sync),
			post,
			notify,
			openForm,
		});
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
