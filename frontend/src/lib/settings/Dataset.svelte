<script lang="ts">
	import datasets from '../../data/datasets.json';
	let selected = datasets[0].label;
</script>

<div class="datasets">
	<div class="select">
		<button>
			{@html selected}
			<span>▼</span>
		</button>
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

	.select {
		width: 100%;
	}
	.select button {
		width: 100%;
		padding: 0;
		background: none;
		border: none;
		text-align: left;
		font-size: 4rem;
		line-height: 85%;
		white-space: nowrap;

		transition: text-shadow 0.2s ease-in-out;
	}
	.select button:hover {
		cursor: pointer;
		text-shadow: var(--hover-text-shadow);
	}
	.select button span {
		float: right;
		margin-top: 1rem;
		font-size: 1.75rem;
	}

	.label {
		display: block;
		margin: 2rem 0 0 0;
		font-size: 1.4rem;
	}
</style>
