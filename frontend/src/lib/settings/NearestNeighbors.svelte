<script lang="ts">
	let neighbors = 5;
</script>

<div class="nearest-neighbors">
	<div class="counter">
		<p class="counter_number editorial-new-400">{neighbors}</p>
		<div class="counter_buttons">
			<button
				class="editorial-new-400"
				on:click={() => {
					neighbors++;
				}}>▲</button
			>
			<button
				class="editorial-new-400"
				on:click={() => {
					neighbors--;
				}}>▼</button
			>
		</div>
	</div>

	<label for="neighbors">Similar Results</label>
</div>

<style>
	.nearest-neighbors {
		width: auto;
		height: max-content;
		margin-top: 1rem;
		padding: 1rem;
		background: white;
		pointer-events: all;
	}

	.counter {
		display: flex;
		flex-direction: row;
		font-size: 6rem;
		line-height: 85%;
	}
	.counter .counter_number {
		margin: 0.5rem 0 0;
	}

	.counter .counter_buttons {
		display: flex;
		flex-direction: column;
		margin-left: auto;
	}
	.counter .counter_buttons button {
		cursor: pointer;
		width: 4rem;
		font-size: 1.5rem;
		text-align: right;
		background: none;
		border: none;
	}

	label {
		display: block;
		margin-top: 2rem;
		font-size: 1.4rem;
	}
</style>
