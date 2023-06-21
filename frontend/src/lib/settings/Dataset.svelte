<script lang="ts">
	import datasets from '../../data/datasets.json';
	let selected = datasets[0].label;
	let open = false;
</script>

<div class="datasets">
	<div class="select_toggle">
		<button
			on:click={() => {
				open = !open;
			}}
		>
			{@html selected}
			<span>▼</span>
		</button>
	</div>

	<div class="select_selection">
		{#if open}
			{#each datasets as dataset}
				<button
					on:click={() => {
						selected = dataset.label;
						open = false;
					}}
				>
					{@html dataset.label}
				</button>
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
		padding: 0;
		background: none;
		border: none;
		text-align: left;
		font-size: 4rem;
		line-height: 85%;

		transition: text-shadow 0.2s ease-in-out;
	}
	.select_toggle button:hover {
		cursor: pointer;
		text-shadow: var(--hover-text-shadow);
	}
	.select_toggle button span {
		float: right;
		margin-top: 1rem;
		font-size: 1.75rem;
	}

	.select_selection {
		width: 100%;
		margin: 1rem 0 1rem 0;
	}

	.label {
		display: block;
		margin: 2rem 0 0 0;
		font-size: 1.4rem;
	}
</style>
