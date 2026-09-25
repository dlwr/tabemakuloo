export type TumblrPost = {
	blog: string;
	id: string;
};

export function parseTumblrPostUrl(url: string): TumblrPost | undefined {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		return undefined;
	}

	const {hostname, pathname} = parsed;
	if (hostname === 'www.tumblr.com') {
		const match = /^\/(?:blog\/view\/)?([\w-]+)\/(\d+)(?:\/|$)/.exec(pathname);
		return match ? {blog: match[1], id: match[2]} : undefined;
	}

	const subdomain = /^([\w-]+)\.tumblr\.com$/.exec(hostname);
	const match = /^\/post\/(\d+)(?:\/|$)/.exec(pathname);
	return subdomain && match ? {blog: subdomain[1], id: match[1]} : undefined;
}
