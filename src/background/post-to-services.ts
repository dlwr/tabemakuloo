import type {BaseService} from '@/services/base-service.js';
import type {PostData, PostResult} from '@/types';

export async function postToServices(postData: PostData, serviceIds: string[], services: Record<string, BaseService>): Promise<PostResult[]> {
	return Promise.all(serviceIds.map(async id => {
		const service = services[id];
		if (!service) {
			return {service: id, success: false, error: 'Unknown service'};
		}

		try {
			return await service.post(postData);
		} catch (error) {
			return {service: service.name, success: false, error: error instanceof Error ? error.message : 'Unknown error'};
		}
	}));
}
