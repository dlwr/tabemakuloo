const errorMessages: Record<string, string> = {
	'Not logged in to Tumblr': 'Tumblr にログインしていません',
	'Not logged in to Hatena': 'はてなにログインしていません',
};

export function localizeError(error: string): string {
	return errorMessages[error] ?? error;
}
