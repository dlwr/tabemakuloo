import browser from 'webextension-polyfill';
import {
	loadDefaultDestinations,
	postKinds,
	saveDefaultDestinations,
	serviceNames,
	servicesSupporting,
	type DefaultDestinations,
	type PostKind,
	type ServiceId,
} from '@/settings/destinations.js';

const kindLabels: Record<PostKind, string> = {
	quote: '引用',
	photo: '画像',
	reblog: 'reblog',
	link: 'リンク',
};

const table = document.querySelector<HTMLTableElement>('#destinations')!;
const status = document.querySelector<HTMLElement>('#status')!;

function render(destinations: DefaultDestinations): void {
	const services = Object.keys(serviceNames) as ServiceId[];
	const head = table.createTHead().insertRow();
	head.append(document.createElement('th'));
	for (const kind of postKinds) {
		const th = document.createElement('th');
		th.textContent = kindLabels[kind];
		head.append(th);
	}

	const body = table.createTBody();
	for (const service of services) {
		const row = body.insertRow();
		const name = document.createElement('th');
		name.scope = 'row';
		name.textContent = serviceNames[service];
		row.append(name);
		for (const kind of postKinds) {
			const cell = row.insertCell();
			if (!servicesSupporting(kind).includes(service)) {
				continue;
			}

			const input = document.createElement('input');
			input.type = 'checkbox';
			input.dataset.kind = kind;
			input.value = service;
			input.checked = destinations[kind].includes(service);
			input.setAttribute('aria-label', `${serviceNames[service]} ${kindLabels[kind]}`);
			input.addEventListener('change', save);
			cell.append(input);
		}
	}
}

async function save(): Promise<void> {
	const destinations = Object.fromEntries(postKinds.map(kind => [kind, []])) as unknown as DefaultDestinations;
	for (const input of table.querySelectorAll<HTMLInputElement>('input:checked')) {
		destinations[input.dataset.kind as PostKind].push(input.value as ServiceId);
	}

	try {
		await saveDefaultDestinations(browser.storage.sync, destinations);
		status.textContent = '保存しました';
	} catch (error) {
		console.error('Failed to save settings:', error);
		status.textContent = '保存できませんでした';
	}
}

render(await loadDefaultDestinations(browser.storage.sync));
