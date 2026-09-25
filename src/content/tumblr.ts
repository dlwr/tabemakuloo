import {findPostHref} from './tumblr-post.js';

declare global {
	// eslint-disable-next-line no-var
	var tabemakulooPostHref: string | undefined;
}

document.addEventListener('contextmenu', event => {
	globalThis.tabemakulooPostHref = event.target instanceof Element ? findPostHref(event.target) : undefined;
}, {capture: true});
