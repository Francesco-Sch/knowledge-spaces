<script lang="ts">
	import { onMount } from 'svelte';
	import type { Stage as KonvaStage } from 'konva/lib/Stage';
	import { createPlotProfiler, type PlotProfilerSnapshot } from './plotProfiler';

	export let stageHandle: KonvaStage | undefined;

	let profiler: ReturnType<typeof createPlotProfiler>;
	let snapshot: PlotProfilerSnapshot | null = null;
	let enabled = false;

	onMount(() => {
		enabled = new URLSearchParams(window.location.search).has('plotDebug');
		if (!enabled) return;

		profiler = createPlotProfiler({
			onSnapshot: (nextSnapshot) => (snapshot = nextSnapshot),
			getKonvaNodeCount: () => stageHandle?.find('*').length ?? 0
		});
		profiler.start();

		return () => profiler.stop();
	});

	export function recordPointerEvent() {
		profiler?.recordPointerEvent();
	}

	export function recordWheelEvent() {
		profiler?.recordWheelEvent();
	}

	export function measureBlobGeneration<T>(callback: () => T): T {
		if (!profiler) return callback();

		const startTime = performance.now();
		const result = callback();
		profiler.recordBlobGeneration(performance.now() - startTime);
		return result;
	}
</script>

{#if enabled && snapshot}
	<div class="plot-profiler" aria-hidden="true">
		<strong>Plot debug</strong>
		<div>FPS: {snapshot.fps.toFixed(1)}</div>
		<div>
			Frame: {snapshot.averageFrameTime.toFixed(1)} ms avg /
			{snapshot.p95FrameTime.toFixed(1)} ms p95
		</div>
		<div>
			Input: {snapshot.averageInputLatency.toFixed(1)} ms avg /
			{snapshot.p95InputLatency.toFixed(1)} ms p95
		</div>
		<div>Pointer: {snapshot.pointerEvents} · Wheel: {snapshot.wheelEvents}</div>
		<div>Blobs: {snapshot.blobCount} · {snapshot.blobTime.toFixed(1)} ms</div>
		<div>Konva nodes: {snapshot.konvaNodeCount}</div>
		{#if snapshot.jsHeapUsed !== null}
			<div>Heap: {(snapshot.jsHeapUsed / 1024 / 1024).toFixed(1)} MB</div>
		{/if}
	</div>
{/if}

<style>
	.plot-profiler {
		position: fixed;
		top: 8px;
		left: 8px;
		z-index: 1000;
		padding: 8px 10px;
		border: 1px solid rgba(0, 0, 0, 0.2);
		border-radius: 4px;
		background: rgba(255, 255, 255, 0.9);
		color: #222;
		font: 11px/1.4 monospace;
		pointer-events: none;
	}
</style>
