<script lang="ts">
	import SearchBar from './search/SearchBar.svelte';
	// provided by <Modals />
	export let isOpen;

	export let type: string;
</script>

{#if isOpen}
	<div role="dialog" class="modal">
		<div class="contents" class:text={type !== 'search'}>
			{#if type === 'search'}
				<SearchBar />
			{/if}
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
