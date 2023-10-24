<script lang="ts">
	// ----- Assets -----
	import logo from '$lib/assets/knowledge-spaces_logo.png';

	// ----- Components -----
	import Plot from '$lib/plot/Plot.svelte';
	import Dataset from '$lib/settings/Dataset.svelte';
	import NearestNeighbors from '$lib/settings/NearestNeighbors.svelte';
	import StartSearch from '$lib/search/StartSearch.svelte';

	// ----- Data -----
	import type { PageData } from './$types';

	export let data: PageData;
	let embeddings: Array<Array<number>> = Object.values(data.embeddings);
</script>

<!-- Page content -->
<main class="grid">
	<div class="settings">
		<Dataset />
		<NearestNeighbors />
	</div>

	<div class="logo">
		<img src={logo} alt="Logo of the knowledge spaces project" />
	</div>

	<div class="actions">
		<StartSearch />
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

	.settings,
	.actions {
		height: max-content;
		z-index: 1;
		pointer-events: none;
		box-sizing: border-box;
	}

	.settings {
		grid-column: 1 / 3;
		grid-row: 1 / end;
		padding: 1rem 0 0 1rem;
	}

	.logo {
		grid-column: 5 / 7;
		grid-row: 1 / 2;

		display: flex;
		justify-content: center;
		align-items: flex-start;

		width: 100%;
		height: auto;
		margin: 1rem 0 0 0;
	}

	.logo img {
		width: 70%;
		height: auto;
		margin: 0 auto;

		z-index: 1000;
	}

	.actions {
		/* Align elements inside here from the right */
		display: flex;
		justify-content: flex-end;

		grid-column: -1 / -3;
		grid-row: 1 / end;
		padding: 1rem 0 0 0;
	}

	.plot {
		grid-column: 1 / end;
		grid-row: 1 / end;
	}
</style>
