const errorMessages: Record<string, string> = {
	'Not logged in to Tumblr': 'Tumblr にログインしていません',
};

export function localizeError(error: string): string {
	return errorMessages[error] ?? error;
}
