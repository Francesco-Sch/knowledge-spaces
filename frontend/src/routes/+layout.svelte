<script lang="ts">
	import { get } from 'svelte/store';
	import { Modals, closeModal } from 'svelte-modals';
	import { searchModalLoading } from '../stores/store';

	function closeTheModal() {
		if (get(searchModalLoading)) return;
		closeModal();
	}
</script>

<svelte:head>
	<title>knowledge spaces</title>
</svelte:head>

<slot />

<Modals>
	<div slot="backdrop" class="backdrop" on:click={closeTheModal} on:keyup={closeTheModal} />
</Modals>

<style>
	.backdrop {
		z-index: 99;
		position: fixed;
		top: 0;
		bottom: 0;
		right: 0;
		left: 0;
	}
</style>
