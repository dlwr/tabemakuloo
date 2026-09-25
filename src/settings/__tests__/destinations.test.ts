import {describe, it, expect} from 'vitest';
import {
	loadDefaultDestinations,
	saveDefaultDestinations,
	servicesSupporting,
	type StorageArea,
} from '../destinations.js';

function memoryStorage(initial: Record<string, unknown> = {}): StorageArea & {data: Record<string, unknown>} {
	const data = {...initial};
	return {
		data,
		async get(key: string) {
			return key in data ? {[key]: data[key]} : {};
		},
		async set(items: Record<string, unknown>) {
			Object.assign(data, items);
		},
	};
}

describe('servicesSupporting', () => {
	it('lists Tumblr for quote posts', () => {
		expect(servicesSupporting('quote')).toEqual(['tumblr']);
	});

	it('lists Tumblr for link posts', () => {
		expect(servicesSupporting('link')).toEqual(['tumblr']);
	});
});

describe('loadDefaultDestinations', () => {
	it('posts quotes to Tumblr by default', async () => {
		const destinations = await loadDefaultDestinations(memoryStorage());
		expect(destinations.quote).toEqual(['tumblr']);
	});

	it('posts links nowhere by default', async () => {
		const destinations = await loadDefaultDestinations(memoryStorage());
		expect(destinations.link).toEqual([]);
	});

	it('returns saved destinations', async () => {
		const storage = memoryStorage({defaultDestinations: {quote: [], link: ['tumblr']}});
		const destinations = await loadDefaultDestinations(storage);
		expect(destinations.link).toEqual(['tumblr']);
	});

	it('falls back to the default for kinds that were never saved', async () => {
		const storage = memoryStorage({defaultDestinations: {link: ['tumblr']}});
		const destinations = await loadDefaultDestinations(storage);
		expect(destinations.quote).toEqual(['tumblr']);
	});

	it('drops services that do not support the kind', async () => {
		const storage = memoryStorage({defaultDestinations: {quote: ['tumblr', 'pocket'], link: []}});
		const destinations = await loadDefaultDestinations(storage);
		expect(destinations.quote).toEqual(['tumblr']);
	});
});

describe('saveDefaultDestinations', () => {
	it('can be loaded back', async () => {
		const storage = memoryStorage();
		await saveDefaultDestinations(storage, {quote: [], link: ['tumblr']});
		expect(await loadDefaultDestinations(storage)).toEqual({quote: [], link: ['tumblr']});
	});
});
