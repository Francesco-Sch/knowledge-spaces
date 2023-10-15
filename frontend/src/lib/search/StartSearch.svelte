<script lang="ts">
	import { openModal } from 'svelte-modals';
	import SearchModal from '../modals/SearchModal.svelte';

	function handleClick() {
		openModal(SearchModal);
	}
</script>

<button class="newsreader-400" on:click={handleClick}>+</button>

<style>
	button {
		display: flex;
		justify-content: center;
		align-items: center;
		width: max-content;
		height: 5rem;
		padding: 1rem;
		aspect-ratio: 1 / 1;
		background-color: black;
		color: white;
		border: none;
		font-size: 6rem;
		pointer-events: all;

		transition: all 0.2s ease-in-out;
	}
	button:hover {
		cursor: pointer;
		text-shadow: var(--hover-text-shadow_white);
	}
</style>
