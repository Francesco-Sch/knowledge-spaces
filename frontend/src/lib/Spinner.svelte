<script>
	import { onMount } from 'svelte';

	let chars = ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷'];
	let index = 0;
	let spinner;

	onMount(() => {
		spinner = setInterval(() => {
			index = (index + 1) % chars.length;
		}, 200);
		return () => clearInterval(spinner);
	});
</script>

<div class="spinner">{chars[index]}</div>

<style>
	.spinner {
		font-family: monospace;
		font-size: 2em;
	}
</style>
