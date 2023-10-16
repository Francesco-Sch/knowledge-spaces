<script lang="ts">
	export let loading: boolean = false;
</script>

<div class="loading-bar">
	<p class="times-400 loading-bar__message">AI is searching in its knowledge space...</p>
</div>

<style>
	.loading-bar {
		width: 100%;
	}
	.loading-bar__message {
		margin: 0;
		padding: 0;
		font-size: 1.75rem;
		color: var(--text-secondary);
	}
</style>
