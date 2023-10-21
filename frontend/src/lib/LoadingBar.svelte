<script lang="ts">
	import Spinner from './Spinner.svelte';
</script>

<div class="loading-bar">
	<p class="times-400 loading-bar__message">AI is searching in its knowledge space...</p>
	<Spinner />
</div>

<style>
	.loading-bar {
		display: flex;
		flex-direction: row;
		width: 100%;
	}
	.loading-bar__message {
		flex-grow: 1;
		margin: 0;
		padding: 0;
		font-size: 1.75rem;
		color: var(--text-secondary);
	}
</style>
