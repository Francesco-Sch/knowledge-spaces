import type { PageLoad } from './$types';

export const load = (async ({ fetch }) => {
	const res = await fetch(`http://backend:7100/`);
	const embeddings: object = await res.json();

	console.log(embeddings);

	return { embeddings };
}) satisfies PageLoad;
