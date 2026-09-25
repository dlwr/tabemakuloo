import browser from 'webextension-polyfill';
import {extractPageData} from './page-data.js';

browser.runtime.onMessage.addListener(async (message: unknown) => {
	if ((message as {type?: string}).type === 'GET_PAGE_DATA') {
		return extractPageData();
	}

	return undefined;
});
