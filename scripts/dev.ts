import {build} from 'vite';
import {WebSocketServer} from 'ws';
import {reloadServerPort} from '../src/background/reload-server.ts';

const server = new WebSocketServer({port: reloadServerPort});

function broadcast(message: string): void {
	for (const client of server.clients) {
		client.send(message);
	}
}

// A service worker is stopped after 30s without events; WebSocket traffic keeps it alive.
setInterval(() => {
	broadcast('ping');
}, 20_000);

await build({
	mode: 'development',
	build: {watch: {}},
	plugins: [{
		name: 'reload-extension',
		closeBundle() {
			console.log(`[dev] built, reloading ${server.clients.size} extension(s)`);
			broadcast('reload');
		},
	}],
});
