import {describe, it, expect} from 'vitest';
import {buildTextForX, weightedLength} from '../x-text.js';

describe('weightedLength', () => {
	it('counts ASCII characters as 1', () => {
		expect(weightedLength('hello')).toBe(5);
	});

	it('counts Japanese characters as 2', () => {
		expect(weightedLength('こんにちは')).toBe(10);
	});

	it('counts an emoji as 2', () => {
		expect(weightedLength('👍🏽')).toBe(2);
	});

	it('counts a URL as 23 regardless of its length', () => {
		expect(weightedLength('see https://example.com/a/very/long/path/that/goes/on/and/on')).toBe(4 + 23);
	});
});

describe('buildTextForX', () => {
	const page = {title: 'Example', url: 'https://example.com/'};

	it('joins the comment, the quoted text, the title and the URL', () => {
		expect(buildTextForX({...page, description: 'nice', quote: 'hello'})).toBe('nice "hello" Example https://example.com/');
	});

	it('leaves out an empty comment', () => {
		expect(buildTextForX({...page, quote: 'hello'})).toBe('"hello" Example https://example.com/');
	});

	it('posts a link as the comment, the title and the URL', () => {
		expect(buildTextForX({...page, description: 'nice'})).toBe('nice Example https://example.com/');
	});

	it('truncates the quote to fit in 280', () => {
		const text = buildTextForX({...page, quote: 'あ'.repeat(200)});
		expect(weightedLength(text)).toBe(280);
	});

	it('marks a truncated quote with an ellipsis', () => {
		expect(buildTextForX({...page, quote: 'あ'.repeat(200)})).toMatch(/あ…" Example https:\/\/example\.com\/$/);
	});

	it('does not truncate a quote that fits', () => {
		expect(buildTextForX({...page, quote: 'a'.repeat(240)})).toBe(`"${'a'.repeat(240)}" Example https://example.com/`);
	});
});
