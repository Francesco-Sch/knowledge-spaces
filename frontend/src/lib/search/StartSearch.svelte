<script lang="ts">
	import { openModal } from 'svelte-modals';
	import Modal from '../Modal.svelte';

	function handleClick() {
		openModal(Modal, { type: 'search' });
	}
</script>

<button on:click={handleClick}>+</button>

<style>
	button {
		background-color: black;
		color: white;
		border: none;
		width: 4rem;
		height: 4rem;
		font-size: 2rem;
		pointer-events: all;
	}
	button:hover {
		cursor: pointer;
		text-shadow: var(--hover-text-shadow_white);
	}
</style>
