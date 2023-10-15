import type { PageLoad } from './$types';

const BASE_URL = import.meta.env.PROD
	? 'https://api.knowledge-spaces.com'
	: 'http://localhost:7100';

export const load = (async ({ fetch }) => {
	const url = `${BASE_URL}/embeddings/20newsgroups`;
	const res = await fetch(url);
	const embeddings: object = await res.json();

	return { embeddings: embeddings };
}) satisfies PageLoad;
