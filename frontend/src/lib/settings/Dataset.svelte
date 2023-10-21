<script lang="ts">
	import { selectedDataset } from '../../stores/store';
	import datasets from '../../data/datasets';
	import { openModal } from 'svelte-modals';
	import DatasetModal from '$lib/modals/DatasetModal.svelte';

	let open = false;

	// Filter dataset for the dataset that name is the same as selecetedDataset
	$: selected =
		datasets.length === 1
			? datasets[0].label
			: datasets.filter((dataset) => dataset.name === $selectedDataset)[0].label;

	function openDatasetModal() {
		openModal(DatasetModal);
	}
</script>

<div class="datasets">
	<div class="select_toggle">
		<button
			class="times-400"
			on:click={() => {
				if (datasets.length > 1) open = !open;
			}}
		>
			{@html selected}

			{#if datasets.length > 1}
				<span class={open ? 'rotated' : ''}>▼</span>
			{/if}
		</button>
	</div>

	<div class="select_selection">
		{#if open}
			{#each datasets as dataset}
				<button
					class="times-400 {$selectedDataset === dataset.name ? 'selected' : ''}"
					on:click={() => {
						$selectedDataset = dataset.name;
						open = false;
					}}>{@html dataset.label}</button
				>
			{/each}
		{/if}
	</div>

	<div class="meta_information">
		<p class="label">Dataset</p>
		<button class="info_btn" on:click={openDatasetModal}> [info] </button>
	</div>
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
		padding: 0;
		background: none;
		border: none;
		text-align: left;
		font-size: 6rem;
		line-height: 75%;

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

	.meta_information {
		display: flex;
		flex-direction: row;
		width: 100%;
		margin: 2rem 0 0 0;
	}

	.meta_information .label {
		display: block;
		flex-grow: 1;
		font-size: 1.4rem;
		margin: 0;
	}

	.meta_information .info_btn {
		display: inline-block;
		border: none;
		background: none;
		padding: 0;

		transition: all 0.2s ease-in-out;
	}
	.meta_information .info_btn:hover {
		cursor: pointer;
		text-shadow: var(--hover-text-shadow_black);
	}
</style>
