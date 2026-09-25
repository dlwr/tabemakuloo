import {describe, it, expect} from 'vitest';
import {findPostHref} from '../tumblr-post.js';

function render(html: string): Element {
	document.body.innerHTML = html;
	return document.querySelector('#target')!;
}

describe('findPostHref', () => {
	it('returns the permalink of the post that contains the element', () => {
		const target = render(`<article>
			<a href="/staff/111">パーマリンク</a>
			<a href="/staff">staff</a>
			<a href="/changes/222">パーマリンク</a>
			<p id="target">text</p>
		</article>`);
		expect(findPostHref(target)).toBe('http://localhost:3000/staff/111');
	});

	it('picks the post under the element among many posts', () => {
		const target = render(`<article><a href="/a/1">p</a></article>
			<article><a href="/b/2">p</a><img id="target"></article>`);
		expect(findPostHref(target)).toBe('http://localhost:3000/b/2');
	});

	it('skips links that are not posts', () => {
		const target = render(`<article>
			<a href="/staff">staff</a>
			<a href="/staff/tagged/tumblr">#tumblr</a>
			<a href="/staff/333">パーマリンク</a>
			<span id="target"></span>
		</article>`);
		expect(findPostHref(target)).toBe('http://localhost:3000/staff/333');
	});

	it('returns nothing outside a post', () => {
		const target = render('<div><a href="/staff/111">p</a><span id="target"></span></div>');
		expect(findPostHref(target)).toBeUndefined();
	});
});
