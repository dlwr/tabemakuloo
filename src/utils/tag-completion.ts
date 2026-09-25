const maxSuggestions = 8;

function splitTags(input: string): {entered: string[]; typing: string} {
	const parts = input.split(',').map(part => part.trim());
	return {entered: parts.slice(0, -1), typing: parts.at(-1) ?? ''};
}

export function suggestTags(input: string, counts: Record<string, number>): string[] {
	const {entered, typing} = splitTags(input);
	const prefix = typing.toLowerCase();
	if (!prefix) {
		return [];
	}

	return Object.entries(counts)
		.filter(([tag]) => tag.toLowerCase().startsWith(prefix) && tag !== typing && !entered.includes(tag))
		.sort(([, a], [, b]) => b - a)
		.slice(0, maxSuggestions)
		.map(([tag]) => tag);
}

export function applyTagCompletion(input: string, tag: string): string {
	const {entered} = splitTags(input);
	return [...entered, tag].join(', ') + ', ';
}

export function mergeTagCounts(...sources: Array<Record<string, number>>): Record<string, number> {
	const merged: Record<string, number> = {};
	for (const source of sources) {
		for (const [tag, count] of Object.entries(source)) {
			merged[tag] = (merged[tag] ?? 0) + count;
		}
	}

	return merged;
}
