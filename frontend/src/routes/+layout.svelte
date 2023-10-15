<script lang="ts">
	import { Modals, closeModal } from 'svelte-modals';
</script>

<slot />

<Modals>
	<div slot="backdrop" class="backdrop" on:click={closeModal} on:keyup={closeModal} />
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
