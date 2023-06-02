<script lang="ts">
	// ----- Components -----
	import Plot from '$lib/Plot.svelte';

	// ----- Data -----
	// import type { PageData } from './$types';

	// export let data: PageData;
</script>

<main>
	<!-- if data is loaded display it else display a simple loading state -->
	<!-- {#if data}
	<h1>{data['0']}</h1>
{:else}
	<p>Loading...</p>
{/if} -->

	<p>Hello World!</p>

	<Plot data={data.embeddings} />
</main>

<style>
	main {
		width: 100vw;
		height: 100vh;
	}
</style>
