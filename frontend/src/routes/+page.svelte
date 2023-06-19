<script lang="ts">
	// ----- Components -----
	import Plot from '$lib/plot/Plot.svelte';
	import Dataset from '$lib/settings/Dataset.svelte';

	// ----- Data -----
	import type { PageData } from './$types';

	export let data: PageData;
	let embeddings: Array<Array<number>> = Object.values(data.embeddings);
</script>

<main>
	<aside class="grid">
		<Dataset />
	</aside>
	<Plot {embeddings} />
</main>

<style>
	main {
		width: 100vw;
		height: 100vh;

		background-color: var(--bg);
		z-index: 0;
	}
	aside {
		position: absolute;
		width: 100vw;
		height: 100vh;
		z-index: 1;
	}
</style>
