const postPath = /^\/[\w-]+\/\d+(?:\/|$)/;

export function findPostHref(target: Element): string | undefined {
	const article = target.closest('article');
	if (!article) {
		return undefined;
	}

	return [...article.querySelectorAll('a[href]')]
		.map(anchor => new URL(anchor.getAttribute('href')!, document.baseURI))
		.find(url => url.origin === window.location.origin && postPath.test(url.pathname))
		?.href;
}
