export type PostData = {
	title: string;
	url: string;
	description?: string;
	tags?: string[];
	image?: string;
	quote?: string;
	reblogOf?: {blog: string; id: string};
	xText?: string;
};

export type Service = {
	id: string;
	name: string;
	enabled: boolean;
	config: Record<string, unknown>;
};

export type ServiceConfig = {
	[key: string]: unknown;
	apiKey?: string;
	apiSecret?: string;
	accessToken?: string;
	username?: string;
};

export type PostResult = {
	service: string;
	success: boolean;
	error?: string;
	url?: string;
};

export type ExtensionSettings = {
	services: Service[];
	defaultTags: string[];
	autoPost: boolean;
};

export enum PostType {
	LINK = 'link',
	TEXT = 'text',
	IMAGE = 'image',
	VIDEO = 'video',
}

export type PostTypeString = 'link' | 'text' | 'image' | 'video' | 'photo' | 'quote' | 'reblog';
