<script lang="ts">
	export let loading: boolean = false;
	let progress = 1;

	const interval = setInterval(() => {
		// Let loop stop at 8 until loading is false and keep progress at 8
		if (progress === 8 && !loading) return;

		progress += 1;

		if (progress === 10) clearInterval(interval);
	}, 1000);
</script>

<div class="loading-bar editorial-new-400">
	<p>
		[
		{#each { length: progress } as _}
			<span>*</span>
		{/each}
		]
	</p>
</div>

<style>
	.loading-bar {
		font-size: 5rem;
	}
</style>
