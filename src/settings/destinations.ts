export type PostKind = 'quote' | 'photo' | 'link';
export type ServiceId = 'tumblr' | 'hatena';
export type DefaultDestinations = Record<PostKind, ServiceId[]>;

export type StorageArea = {
	get(key: string): Promise<Record<string, unknown>>;
	set(items: Record<string, unknown>): Promise<void>;
};

export const postKinds: PostKind[] = ['quote', 'photo', 'link'];

export const serviceNames: Record<ServiceId, string> = {
	tumblr: 'Tumblr',
	hatena: 'はてなブックマーク',
};

const serviceKinds: Record<ServiceId, PostKind[]> = {
	tumblr: ['quote', 'photo', 'link'],
	hatena: ['quote', 'photo', 'link'],
};

const initialDefaultDestinations: DefaultDestinations = {
	quote: ['tumblr'],
	photo: ['tumblr'],
	link: ['hatena'],
};

const storageKey = 'defaultDestinations';

export function servicesSupporting(kind: PostKind): ServiceId[] {
	return (Object.keys(serviceKinds) as ServiceId[]).filter(service => serviceKinds[service].includes(kind));
}

export async function loadDefaultDestinations(storage: StorageArea): Promise<DefaultDestinations> {
	const items = await storage.get(storageKey);
	const stored = items[storageKey] as Partial<Record<PostKind, string[]>> | undefined;
	const supportedOnly = (kind: PostKind): ServiceId[] => {
		const supported = servicesSupporting(kind);
		return (stored?.[kind] ?? initialDefaultDestinations[kind]).filter((service): service is ServiceId => supported.includes(service as ServiceId));
	};

	return {quote: supportedOnly('quote'), photo: supportedOnly('photo'), link: supportedOnly('link')};
}

export async function saveDefaultDestinations(storage: StorageArea, destinations: DefaultDestinations): Promise<void> {
	await storage.set({[storageKey]: destinations});
}
