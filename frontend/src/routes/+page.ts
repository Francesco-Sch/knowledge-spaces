import type { PageLoad } from './$types';

export const load = (async ({ fetch }) => {
	const res = await fetch(`http://localhost:7100/newsgroups`);
	const embeddings: object = await res.json();

	return { embeddings };
}) satisfies PageLoad;
