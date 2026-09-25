import type {PostData} from '@/types';

// Weights from twitter-text config/v3.json.
const maxWeightedLength = 280;
const urlLength = 23;
const lightRanges: Array<[number, number]> = [[0, 4351], [8192, 8205], [8208, 8223], [8242, 8247]];
const urlPattern = /https?:\/\/\S+/g;
const segmenter = new Intl.Segmenter();

function graphemeWeight(grapheme: string): number {
	if (/\p{Extended_Pictographic}/u.test(grapheme)) {
		return 2;
	}

	let weight = 0;
	for (const character of grapheme) {
		const code = character.codePointAt(0)!;
		weight += lightRanges.some(([start, end]) => code >= start && code <= end) ? 1 : 2;
	}

	return weight;
}

export function weightedLength(text: string): number {
	const urls = text.match(urlPattern) ?? [];
	const rest = text.replaceAll(urlPattern, '');
	let length = urls.length * urlLength;
	for (const {segment} of segmenter.segment(rest)) {
		length += graphemeWeight(segment);
	}

	return length;
}

function join(data: PostData, quote: string): string {
	return [data.description?.trim(), quote ? `"${quote}"` : '', data.title, data.url].filter(Boolean).join(' ');
}

export function buildTextForX(data: PostData): string {
	const quote = data.quote?.trim() ?? '';
	const full = join(data, quote);
	if (weightedLength(full) <= maxWeightedLength) {
		return full;
	}

	const graphemes = [...segmenter.segment(quote)].map(({segment}) => segment);
	while (graphemes.length > 0) {
		graphemes.pop();
		const text = join(data, `${graphemes.join('')}…`);
		if (weightedLength(text) <= maxWeightedLength) {
			return text;
		}
	}

	return join(data, '');
}
