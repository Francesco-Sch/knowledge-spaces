import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { BASE_URL } from '../../../data/config';

export const GET: RequestHandler = async ({ url }) => {
	const dataset = url.searchParams.get('dataset');
	const query = url.searchParams.get('query');
	const k = url.searchParams.get('k');

	const res = await fetch(`${BASE_URL}/search/${dataset}?query=${query}&k=${k}`);
	console.log(res);

	const data = await res.json();

	return json(data);
};
