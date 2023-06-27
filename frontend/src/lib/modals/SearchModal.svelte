<script lang="ts">
	// provided by <Modals />
	export let isOpen;

	export let type: string;
</script>

{#if isOpen}
	<div role="dialog" class="modal">
		<div class="contents" class:text={type !== 'search'}>
			<div class="search-wrapper">
				<input
					type="text"
					placeholder="Enter your search term"
					class="editorial-new-400"
					autofocus
				/>
				<button class="editorial-new-400">→</button>
			</div>
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
		height: max-content;

		pointer-events: auto;
	}

	.search-wrapper {
		display: flex;
		flex-direction: row;
		align-items: center;
		width: 100%;
		height: 100%;
		padding: 1rem;
		background-color: white;
		box-shadow: 0px 0px 40px 0px rgba(0, 0, 0, 1);
	}

	.search-wrapper input {
		font-size: 3rem;

		border: none;
	}
	.search-wrapper input::placeholder {
		color: #cacaca;
	}
	.search-wrapper input:focus {
		outline: none;
	}

	.search-wrapper button {
		width: 100%;
		height: auto;
		padding: 0;
		border: none;
		background: none;
		aspect-ratio: 1 / 1;

		font-size: 3rem;

		transition: all 0.2s ease-in-out;
	}
	.search-wrapper button:hover {
		cursor: pointer;
		text-shadow: var(--hover-text-shadow_black);
	}
</style>
