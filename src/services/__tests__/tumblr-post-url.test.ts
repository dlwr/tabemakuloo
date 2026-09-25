import {describe, it, expect} from 'vitest';
import {parseTumblrPostUrl} from '../tumblr-post-url.js';

describe('parseTumblrPostUrl', () => {
	it('reads a post on www.tumblr.com', () => {
		expect(parseTumblrPostUrl('https://www.tumblr.com/staff/822057428507049984/in-case')).toEqual({blog: 'staff', id: '822057428507049984'});
	});

	it('reads a post on www.tumblr.com without a slug', () => {
		expect(parseTumblrPostUrl('https://www.tumblr.com/staff/822057428507049984')).toEqual({blog: 'staff', id: '822057428507049984'});
	});

	it('reads a post on a blog subdomain', () => {
		expect(parseTumblrPostUrl('https://staff.tumblr.com/post/822057428507049984/in-case')).toEqual({blog: 'staff', id: '822057428507049984'});
	});

	it('reads a post opened from the blog view', () => {
		expect(parseTumblrPostUrl('https://www.tumblr.com/blog/view/staff/822057428507049984')).toEqual({blog: 'staff', id: '822057428507049984'});
	});

	it('ignores the dashboard', () => {
		expect(parseTumblrPostUrl('https://www.tumblr.com/dashboard')).toBeUndefined();
	});

	it('ignores a blog top page', () => {
		expect(parseTumblrPostUrl('https://staff.tumblr.com/')).toBeUndefined();
	});

	it('ignores other sites', () => {
		expect(parseTumblrPostUrl('https://example.com/staff/822057428507049984')).toBeUndefined();
	});
});
