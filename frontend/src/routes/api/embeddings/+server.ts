import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { BASE_URL } from '../../../data/config';

export const GET: RequestHandler = async ({ url }) => {
	const dataset = url.searchParams.get('dataset');
	const ids = url.searchParams.get('ids');

	console.log('ids', ids);

	const idds: number[] | null = [3824, 5391, 5085, 5272, 1703];

	const rest = await fetch(`${BASE_URL}/embeddings/${dataset}?ids=${idds}`);

	const data = await rest.json();
	console.log('data:', data);

	return json(data);
};
