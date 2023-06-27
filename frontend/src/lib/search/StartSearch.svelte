<script lang="ts">
	import { openModal } from 'svelte-modals';
	import Modal from '../modals/SearchModal.svelte';

	function handleClick() {
		openModal(Modal, { type: 'search' });
	}
</script>

<button on:click={handleClick}>+</button>

<style>
	button {
		display: flex;
		justify-content: center;
		align-items: center;
		width: max-content;
		height: auto;
		padding: 1rem 1rem 1.5rem 1rem;
		aspect-ratio: 1 / 1;
		background-color: black;
		color: white;
		border: none;
		font-size: 4rem;
		pointer-events: all;

		transition: all 0.2s ease-in-out;
	}
	button:hover {
		cursor: pointer;
		text-shadow: var(--hover-text-shadow_white);
	}
</style>
