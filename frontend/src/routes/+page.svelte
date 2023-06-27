<script lang="ts">
	// ----- Components -----
	import Plot from '$lib/plot/Plot.svelte';
	import Dataset from '$lib/settings/Dataset.svelte';
	import NearestNeighbors from '$lib/settings/NearestNeighbors.svelte';

	// ----- Data -----
	import type { PageData } from './$types';

	export let data: PageData;
	let embeddings: Array<Array<number>> = Object.values(data.embeddings);
</script>

<main class="grid">
	<div class="settings">
		<Dataset />
		<NearestNeighbors />
	</div>

	<div class="plot">
		<Plot {embeddings} />
	</div>
</main>

<style>
	main {
		width: 100vw;
		height: 100vh;

		background-color: var(--bg);
		z-index: 0;
	}

	.settings {
		grid-column: 1 / 3;
		grid-row: 1 / end;
		height: max-content;
		padding: 1rem 0 0 1rem;
		z-index: 1;
		pointer-events: none;
		box-sizing: border-box;
	}

	.plot {
		grid-column: 1 / end;
		grid-row: 1 / end;
	}
</style>
