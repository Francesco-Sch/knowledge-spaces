<script lang="ts">
	import { onMount } from 'svelte';
	import { Stage, Layer, Rect } from 'svelte-konva';

	let canvas: Element, windowWidth: number, windowHeight: number;
	export let data: Array<Array<number>>;

	onMount(() => {});
</script>

<svelte:window bind:innerWidth={windowWidth} bind:innerHeight={windowHeight} />

<Stage config={{ width: windowWidth, height: windowHeight }}>
	<Layer>
		<Rect config={{ x: 100, y: 100, width: 400, height: 200, fill: 'blue' }} />
	</Layer>
</Stage>

<style></style>
