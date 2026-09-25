import {
	describe, it, expect, beforeEach,
} from 'vitest';
import {extractPageData} from '../page-data.js';

describe('extractPageData', () => {
	beforeEach(() => {
		document.head.innerHTML = '<meta name="description" content="Meta description">';
		document.title = 'Page Title';
		document.body.innerHTML = '<p id="text">Selected words here</p>';
		window.getSelection()?.removeAllRanges();
	});

	function select(node: Node): void {
		const range = document.createRange();
		range.selectNodeContents(node);
		window.getSelection()?.addRange(range);
	}

	it('uses the document title', () => {
		expect(extractPageData().title).toBe('Page Title');
	});

	it('uses the current URL', () => {
		expect(extractPageData().url).toBe(window.location.href);
	});

	it('uses the selected text as the quote', () => {
		select(document.querySelector('#text')!);

		expect(extractPageData().quote).toBe('Selected words here');
	});

	it('has no quote when nothing is selected', () => {
		expect(extractPageData().quote).toBeUndefined();
	});

	it('uses the meta description when nothing is selected', () => {
		expect(extractPageData().description).toBe('Meta description');
	});

	it('leaves the description empty when quoting', () => {
		select(document.querySelector('#text')!);

		expect(extractPageData().description).toBe('');
	});
});
