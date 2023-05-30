<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<!-- if data is loaded display it else display a simple loading state -->
{#if data}
	<h1>{data["0"]}</h1>
{:else}
	<p>Loading...</p>
{/if}

<p>Test</p>
