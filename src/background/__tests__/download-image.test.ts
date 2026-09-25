import {describe, it, expect} from 'vitest';
import {refererRule} from '../download-image.js';

describe('refererRule', () => {
	const rule = refererRule(7, 'https://i.example.com/a.png?x=1', 'https://example.com/page');

	it('sets the Referer header to the page', () => {
		expect(rule.action.requestHeaders).toEqual([{header: 'referer', operation: 'set', value: 'https://example.com/page'}]);
	});

	it('only applies to the image URL', () => {
		expect(rule.condition.regexFilter).toBe(String.raw`^https://i\.example\.com/a\.png\?x=1$`);
	});

	it('only applies to requests from the extension', () => {
		expect(rule.condition.tabIds).toEqual([-1]);
	});
});
