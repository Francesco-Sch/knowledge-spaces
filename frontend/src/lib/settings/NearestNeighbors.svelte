<script lang="ts">
	import { amountOfNeighbors } from '../../stores/store';

	// Handle mouse wheel scroll
	const handleScroll = (event: { preventDefault: () => void; deltaY: number }) => {
		event.preventDefault();
		if (event.deltaY > 0) {
			$amountOfNeighbors--;
		} else {
			$amountOfNeighbors++;
		}
	};

	// Keep neighbors between 1 and 20
	$: if ($amountOfNeighbors > 20) {
		$amountOfNeighbors = 20;
	}
	$: if ($amountOfNeighbors < 1) {
		$amountOfNeighbors = 1;
	}
</script>

<div class="nearest-neighbors">
	<div class="counter" on:wheel={handleScroll}>
		<p class="counter_number times-400">{$amountOfNeighbors}</p>
		<div class="counter_buttons">
			<button
				class="times-400"
				on:click={() => {
					$amountOfNeighbors++;
				}}>▲</button
			>
			<button
				class="times-400"
				on:click={() => {
					$amountOfNeighbors--;
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
		line-height: 75%;

		transition: all 0.2s ease-in-out;
	}
	.counter:hover {
		text-shadow: var(--hover-text-shadow_black);
	}
	.counter .counter_number {
		margin: 0 0;
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

		transition: all 0.2s ease-in-out;
	}
	.counter:hover .counter_buttons button {
		text-shadow: var(--hover-text-shadow_black);
	}

	label {
		display: block;
		margin-top: 2rem;
		font-size: 1.4rem;
	}
</style>
