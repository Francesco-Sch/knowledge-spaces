<script lang="ts">
	import { selectedDataset } from '../../stores/store';
	import datasets from '../../data/datasets.json';
	let open = false;

	// Filter dataset for the dataset that name is the same as selecetedDataset
	$: selected = datasets.filter((dataset) => dataset.name === $selectedDataset)[0].label;

	console.log(selected);
</script>

<div class="datasets">
	<div class="select_toggle">
		<button
			class="editorial-new-400"
			on:click={() => {
				open = !open;
			}}
		>
			{@html selected}

			<span class={open ? 'rotated' : ''}>▼</span>
		</button>
	</div>

	<div class="select_selection">
		{#if open}
			{#each datasets as dataset}
				<button
					class="editorial-new-400 {$selectedDataset === dataset.name ? 'selected' : ''}"
					on:click={() => {
						$selectedDataset = dataset.name;
						open = false;
					}}>{@html dataset.label}</button
				>
			{/each}
		{/if}
	</div>

	<p class="label">Dataset</p>
</div>

<style>
	.datasets {
		width: auto;
		height: max-content;
		padding: 1rem;
		background: white;
		pointer-events: all;
	}

	.select_toggle {
		width: 100%;
	}
	.select_toggle button {
		width: 100%;
		margin-top: 0.5rem;
		padding: 0;
		background: none;
		border: none;
		text-align: left;
		font-size: 5.5rem;
		line-height: 90%;

		transition: all 0.2s ease-in-out;
	}
	.select_toggle button:hover {
		cursor: pointer;
		text-shadow: var(--hover-text-shadow_black);
	}
	.select_toggle button span {
		float: right;
		margin-top: 1.5rem;
		font-size: 1.5rem;

		transition: transform 0.2s ease-in-out;
	}
	.select_toggle button span.rotated {
		transform: rotate(180deg);
	}

	.select_selection {
		display: flex;
		flex-direction: column;
		width: 100%;
		margin: 2rem 0 1rem 0;
	}
	.select_selection button {
		width: 100%;
		padding: 0.5rem 0;
		background: none;
		border: none;
		text-align: left;
		font-size: 2rem;

		transition: all 0.2s ease-in-out;
	}
	.select_selection button:hover {
		cursor: pointer;
		background: black;
		color: white;
		text-shadow: var(--hover-text-shadow_white);
	}
	.select_selection button.selected::before {
		content: '»';
		margin-right: 1rem;
	}

	.label {
		display: block;
		margin: 2rem 0 0 0;
		font-size: 1.4rem;
	}
</style>
