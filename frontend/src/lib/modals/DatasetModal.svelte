<script lang="ts">
	import { fly } from 'svelte/transition';
	import { selectedDataset } from '../../stores/store';
	import datasets from '../../data/datasets';

	// provided by <Modals />
	export let isOpen: boolean = false;

	$: dataset =
		datasets.length === 1
			? datasets[0]
			: datasets.filter((dataset) => dataset.name === $selectedDataset)[0];
</script>

{#if isOpen}
	<div role="dialog" class="modal" transition:fly|global={{ y: -10, duration: 500 }}>
		<div class="contents">
			<h2 class="times-400">{@html dataset.label}</h2>

			<p>
				{@html dataset.about}
			</p>
		</div>
	</div>
{/if}

<style>
	.contents {
		flex-direction: column;
		width: 40vw;
		max-height: 70vh;
	}
	.contents h2 {
		width: 100%;
		margin: 0 0 5rem 0;
		font-size: 4rem;
	}
	.contents p {
		width: 100%;
		margin: 0;
		font-size: 2rem;
	}
</style>
