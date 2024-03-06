import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { BASE_URL } from '../../../data/config';

export const GET: RequestHandler = async ({ url }) => {
	const dataset = url.searchParams.get('dataset');
	const embedding = url.searchParams.get('embedding');

	const rest = await fetch(`${BASE_URL}/dataset-entry/${dataset}/${embedding}`);

	const data = await rest.json();

	return json(data);
};
