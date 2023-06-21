<script lang="ts">
	let neighbors = 5;
</script>

<div class="nearest-neighbors">
	<div class="counter">
		<p>{neighbors}</p>
		<div class="counter_buttons">
			<button
				on:click={() => {
					neighbors++;
				}}>▲</button
			>
			<button
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
		font-size: 4rem;
		line-height: 85%;
	}
	.counter p {
		margin: 0;
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
