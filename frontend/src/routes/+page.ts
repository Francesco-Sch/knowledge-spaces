/** @type {import('./$types').PageLoad} */

export async function load({ fetch }) {
	const res = await fetch(`http://localhost:7100/newsgroups`);
	const embeddings = await res.json();

	return { embeddings };
}
