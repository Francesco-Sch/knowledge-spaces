<script lang="ts">
	// ----- Components -----
	import Plot from '$lib/Plot.svelte';

	// ----- Data -----
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<main>
	<Plot embeddings={data.embeddings} />
</main>

<style>
	main {
		width: 100vw;
		height: 100vh;
	}
</style>
