import type { PageLoad } from './$types';

export const load = (async ({ fetch }) => {
	const res = await fetch('http://localhost:7100/embeddings/20newsgroups');
	const embeddings: object = await res.json();

	return { embeddings: embeddings };
}) satisfies PageLoad;
