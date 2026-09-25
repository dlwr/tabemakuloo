export const reloadServerPort = 35_729;

export function connectReloadServer(reload: () => void): void {
	const socket = new WebSocket(`ws://localhost:${reloadServerPort}`);
	socket.addEventListener('message', (event: MessageEvent) => {
		if (event.data === 'reload') {
			reload();
		}
	});
	socket.addEventListener('close', () => {
		setTimeout(() => {
			connectReloadServer(reload);
		}, 1000);
	});
}
