const errorMessages: Record<string, string> = {
	'Not logged in to Tumblr': 'Tumblr にログインしていません',
	'Not logged in to Hatena': 'はてなにログインしていません',
	'Not logged in to X': 'X にログインしていません',
	'X post was not confirmed': 'X への投稿を確認できませんでした。開いたタブを確認してください',
};

export function localizeError(error: string): string {
	return errorMessages[error] ?? error;
}
