function escapeRegex(text: string): string {
	return text.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

export function refererRule(id: number, url: string, referrer: string) {
	return {
		id,
		priority: 1,
		action: {
			type: 'modifyHeaders' as const,
			requestHeaders: [{header: 'referer', operation: 'set' as const, value: referrer}],
		},
		condition: {
			regexFilter: `^${escapeRegex(url)}$`,
			tabIds: [-1],
		},
	};
}

let nextRuleId = 1;

export async function downloadImage(url: string, referrer: string): Promise<Blob> {
	const rule = refererRule(nextRuleId++, url, referrer);
	await chrome.declarativeNetRequest.updateSessionRules({removeRuleIds: [rule.id], addRules: [rule as chrome.declarativeNetRequest.Rule]});
	try {
		const response = await fetch(url, {credentials: 'include'});
		if (!response.ok) {
			throw new Error(`Failed to download image (${response.status})`);
		}

		return await response.blob();
	} finally {
		await chrome.declarativeNetRequest.updateSessionRules({removeRuleIds: [rule.id]});
	}
}
