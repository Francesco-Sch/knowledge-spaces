<script lang="ts">
	// ----- Components -----
	import Plot from '$lib/plot/Plot.svelte';

	// ----- Data -----
	import type { PageData } from './$types';

	export let data: PageData;
	let embeddings: Array<Array<number>> = Object.values(data.embeddings);
</script>

<main>
	<Plot {embeddings} />
</main>

<style>
	main {
		width: 100vw;
		height: 100vh;

		background-color: var(--bg);
	}
</style>
