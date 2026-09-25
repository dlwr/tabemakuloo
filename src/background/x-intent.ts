import browser from 'webextension-polyfill';

type IntentOutcome = {status: 'posted'; url?: string} | {status: 'login' | 'timeout'};

// Serialized and run in the page by chrome.scripting.executeScript, so it must not reference anything outside itself.
/* eslint-disable no-await-in-loop */
async function clickPostButton(): Promise<IntentOutcome> {
	const wait = async (milliseconds: number) => new Promise(resolve => {
		setTimeout(resolve, milliseconds);
	});
	const isLoginPage = () => !window.location.pathname.startsWith('/intent/');

	let button: HTMLElement | undefined;
	for (let attempt = 0; attempt < 60 && !button; attempt++) {
		if (isLoginPage()) {
			return {status: 'login'};
		}

		const candidate = document.querySelector<HTMLElement>('[data-testid="tweetButton"]');
		if (candidate && candidate.getAttribute('aria-disabled') !== 'true') {
			button = candidate;
		} else {
			await wait(250);
		}
	}

	if (!button) {
		return {status: isLoginPage() ? 'login' : 'timeout'};
	}

	button.click();
	for (let attempt = 0; attempt < 60; attempt++) {
		await wait(250);
		const link = document.querySelector<HTMLAnchorElement>('[data-testid="toast"] a[href*="/status/"]');
		if (link) {
			return {status: 'posted', url: link.href};
		}

		if (!window.location.pathname.startsWith('/intent/')) {
			return {status: 'posted'};
		}
	}

	return {status: 'timeout'};
}
/* eslint-enable no-await-in-loop */

async function waitForLoad(tabId: number): Promise<void> {
	return new Promise(resolve => {
		const listener = (updatedTabId: number, change: {status?: string}) => {
			if (updatedTabId === tabId && change.status === 'complete') {
				browser.tabs.onUpdated.removeListener(listener);
				resolve();
			}
		};

		browser.tabs.onUpdated.addListener(listener);
	});
}

export async function postTextViaIntent(text: string): Promise<{url?: string}> {
	const tab = await browser.tabs.create({url: `https://x.com/intent/post?text=${encodeURIComponent(text)}`, active: false});
	const tabId = tab.id!;
	await waitForLoad(tabId);
	const [injection] = await browser.scripting.executeScript({target: {tabId}, func: clickPostButton});
	const outcome = injection?.result as IntentOutcome | undefined;

	if (outcome?.status === 'posted') {
		await browser.tabs.remove(tabId);
		return {url: outcome.url};
	}

	await browser.tabs.update(tabId, {active: true});
	throw new Error(outcome?.status === 'login' ? 'Not logged in to X' : 'X post was not confirmed');
}
