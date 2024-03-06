import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { BASE_URL } from '../../../data/config';

export const GET: RequestHandler = async ({ url }) => {
	const dataset = url.searchParams.get('dataset');
	const ids = url.searchParams.get('ids');

	const idsQuery = ids
		.split(',')
		.map((id) => `ids=${id}`)
		.join('&');

	const rest = await fetch(`${BASE_URL}/embeddings/${dataset}?${idsQuery}`);

	const data = await rest.json();

	return json(data);
};
