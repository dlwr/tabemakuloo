import {describe, it, expect} from 'vitest';
import {
	notificationFor, quickPost, type Draft, type QuickPostDeps,
} from '../quick-post.js';
import type {DefaultDestinations} from '@/settings/destinations.js';
import type {PostResult} from '@/types';

const draft: Draft = {kind: 'quote', postData: {title: 'Example', url: 'https://example.com/', quote: 'hello'}};

function fakeDeps(destinations: DefaultDestinations, results: PostResult[] = []) {
	const calls = {
		posted: [] as string[][],
		notified: [] as PostResult[],
		opened: [] as Draft[],
	};
	const deps: QuickPostDeps = {
		loadDestinations: async () => destinations,
		async post(_postData, services) {
			calls.posted.push(services);
			return results;
		},
		async notify(result) {
			calls.notified.push(result);
		},
		async openForm(openedDraft) {
			calls.opened.push(openedDraft);
		},
	};
	return {deps, calls};
}

describe('quickPost', () => {
	it('posts to the default destinations of the kind', async () => {
		const {deps, calls} = fakeDeps({
			quote: ['tumblr'], photo: [], reblog: [], link: [],
		});
		await quickPost(draft, deps);
		expect(calls.posted).toEqual([['tumblr']]);
	});

	it('notifies every result', async () => {
		const results = [{service: 'Tumblr', success: true}];
		const {deps, calls} = fakeDeps({
			quote: ['tumblr'], photo: [], reblog: [], link: [],
		}, results);
		await quickPost(draft, deps);
		expect(calls.notified).toEqual(results);
	});

	it('opens the form instead of posting when the kind has no default destinations', async () => {
		const {deps, calls} = fakeDeps({
			quote: [], photo: [], reblog: [], link: [],
		});
		await quickPost(draft, deps);
		expect(calls.opened).toEqual([draft]);
	});

	it('does not post when the kind has no default destinations', async () => {
		const {deps, calls} = fakeDeps({
			quote: [], photo: [], reblog: [], link: [],
		});
		await quickPost(draft, deps);
		expect(calls.posted).toEqual([]);
	});
});

describe('notificationFor', () => {
	it('tells which service the post succeeded on', () => {
		expect(notificationFor({service: 'Tumblr', success: true}, draft).title).toBe('Tumblr に投稿しました');
	});

	it('shows the page title on success', () => {
		expect(notificationFor({service: 'Tumblr', success: true}, draft).message).toBe('Example');
	});

	it('tells which service the post failed on', () => {
		expect(notificationFor({service: 'Tumblr', success: false, error: 'boom'}, draft).title).toBe('Tumblr に投稿できませんでした');
	});

	it('shows the error and how to retry on failure', () => {
		expect(notificationFor({service: 'Tumblr', success: false, error: 'boom'}, draft).message).toBe('boom（クリックでフォームを開きます）');
	});

	it('translates the not logged in error', () => {
		expect(notificationFor({service: 'Tumblr', success: false, error: 'Not logged in to Tumblr'}, draft).message).toBe('Tumblr にログインしていません（クリックでフォームを開きます）');
	});
});
