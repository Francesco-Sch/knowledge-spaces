<script lang="ts">
	import { fly } from 'svelte/transition';
	// provided by <Modals />
	export let isOpen: boolean = true;
</script>

{#if isOpen}
	<div role="dialog" class="modal" transition:fly={{ y: -10, duration: 500 }}>
		<div class="contents">
			<h1>This is going to be content</h1>
		</div>
	</div>
{/if}

<style>
	.modal {
		position: fixed;
		top: 0;
		bottom: 0;
		right: 0;
		left: 0;
		z-index: 100;
		display: flex;
		justify-content: center;
		align-items: center;

		/* allow click-through to backdrop */
		pointer-events: none;
	}

	.contents {
		display: flex;
		flex-direction: column;
		justify-content: space-between;

		width: max-content;
		min-height: max-content;
		max-height: 80vh;

		pointer-events: auto;
	}

	.text {
		background: white;
		padding: 2rem;
		border: 1px transparent solid;
		border-radius: 2rem;
	}
</style>
