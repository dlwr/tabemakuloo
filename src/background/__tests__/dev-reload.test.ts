import {
	describe, it, expect, vi, beforeEach, afterEach,
} from 'vitest';
import {connectDevReloader} from '../dev-reload.js';

class FakeWebSocket extends EventTarget {
	static instances: FakeWebSocket[] = [];

	constructor(readonly url: string) {
		super();
		FakeWebSocket.instances.push(this);
	}

	receive(data: string): void {
		this.dispatchEvent(new MessageEvent('message', {data}));
	}
}

describe('connectDevReloader', () => {
	const reload = vi.fn();

	beforeEach(() => {
		vi.useFakeTimers();
		FakeWebSocket.instances = [];
		reload.mockClear();
		vi.stubGlobal('WebSocket', FakeWebSocket);
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	it('connects to the dev server', () => {
		connectDevReloader(reload);

		expect(FakeWebSocket.instances[0].url).toBe('ws://localhost:35729');
	});

	it('reloads the extension when the dev server says reload', () => {
		connectDevReloader(reload);

		FakeWebSocket.instances[0].receive('reload');

		expect(reload).toHaveBeenCalledOnce();
	});

	it('ignores keepalive pings', () => {
		connectDevReloader(reload);

		FakeWebSocket.instances[0].receive('ping');

		expect(reload).not.toHaveBeenCalled();
	});

	it('reconnects after the connection closes', () => {
		connectDevReloader(reload);

		FakeWebSocket.instances[0].dispatchEvent(new Event('close'));
		vi.advanceTimersByTime(1000);

		expect(FakeWebSocket.instances).toHaveLength(2);
	});
});
