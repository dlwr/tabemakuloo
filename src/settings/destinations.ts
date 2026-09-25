export type PostKind = 'quote' | 'link';
export type ServiceId = 'tumblr';
export type DefaultDestinations = Record<PostKind, ServiceId[]>;

export type StorageArea = {
	get(key: string): Promise<Record<string, unknown>>;
	set(items: Record<string, unknown>): Promise<void>;
};

export const postKinds: PostKind[] = ['quote', 'link'];

export const serviceNames: Record<ServiceId, string> = {
	tumblr: 'Tumblr',
};

const serviceKinds: Record<ServiceId, PostKind[]> = {
	tumblr: ['quote', 'link'],
};

const initialDefaultDestinations: DefaultDestinations = {
	quote: ['tumblr'],
	link: [],
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

	return {quote: supportedOnly('quote'), link: supportedOnly('link')};
}

export async function saveDefaultDestinations(storage: StorageArea, destinations: DefaultDestinations): Promise<void> {
	await storage.set({[storageKey]: destinations});
}
