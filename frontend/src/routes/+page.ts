import type { PageLoad } from './$types';
import { BASE_URL } from '../data/config';

export const load = (async ({ fetch }) => {
	const url = `${BASE_URL}/embeddings/20newsgroups`;
	const res = await fetch(url);
	const embeddings: object = await res.json();

	return { embeddings: embeddings };
}) satisfies PageLoad;
