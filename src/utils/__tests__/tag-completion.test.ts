import {describe, it, expect} from 'vitest';
import {applyTagCompletion, mergeTagCounts, suggestTags} from '../tag-completion.js';

const counts = {
	javascript: 10, java: 3, typescript: 7, design: 1,
};

describe('suggestTags', () => {
	it('suggests tags starting with the tag being typed', () => {
		expect(suggestTags('ja', counts)).toEqual(['javascript', 'java']);
	});

	it('orders suggestions by how often they were used', () => {
		expect(suggestTags('t', {tb: 1, ta: 5, tc: 3})).toEqual(['ta', 'tc', 'tb']);
	});

	it('completes the last tag after a comma', () => {
		expect(suggestTags('design, ty', counts)).toEqual(['typescript']);
	});

	it('ignores case', () => {
		expect(suggestTags('JA', counts)).toEqual(['javascript', 'java']);
	});

	it('suggests nothing for an empty tag', () => {
		expect(suggestTags('design, ', counts)).toEqual([]);
	});

	it('does not suggest tags that are already entered', () => {
		expect(suggestTags('java, ja', counts)).toEqual(['javascript']);
	});

	it('does not suggest the tag exactly as typed', () => {
		expect(suggestTags('java', {java: 3})).toEqual([]);
	});

	it('limits the number of suggestions', () => {
		const many = Object.fromEntries(Array.from({length: 20}, (_, index) => [`t${index}`, index]));
		expect(suggestTags('t', many)).toHaveLength(8);
	});
});

describe('applyTagCompletion', () => {
	it('replaces the tag being typed', () => {
		expect(applyTagCompletion('design, ty', 'typescript')).toBe('design, typescript, ');
	});

	it('completes the first tag', () => {
		expect(applyTagCompletion('ja', 'javascript')).toBe('javascript, ');
	});
});

describe('mergeTagCounts', () => {
	it('adds up the counts of the same tag', () => {
		expect(mergeTagCounts({a: 1, b: 2}, {b: 3, c: 1})).toEqual({a: 1, b: 5, c: 1});
	});
});
