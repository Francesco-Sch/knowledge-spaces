<script lang="ts">
	let datasets = ['20Newsgroups', 'AP'];
</script>

<div class="datasets">
	<select name="datasets" id="select-datasets">
		{#each datasets as dataset}
			<option value={dataset}>{dataset}</option>
		{/each}
	</select>
	<label for="datasets">Dataset</label>
</div>

<style>
	.datasets {
		width: auto;
		height: max-content;
		padding: 1rem;
		background: white;
		pointer-events: all;
	}

	select {
		width: 100%;
		background: none;
		border: none;
		font-size: 4rem;
	}

	label {
		display: block;
		margin-top: 2rem;
		font-size: 1.4rem;
	}
</style>
