<script lang="ts">
	import { onMount } from 'svelte';
	import type { Container as KonvaContainer } from 'konva/lib/Container';
	import type { Node as KonvaNode } from 'konva/lib/Node';
	import type { Stage as KonvaStage } from 'konva/lib/Stage';
	import {
		createPlotProfiler,
		type PlotProfilerSnapshot,
		type PlotRenderMode
	} from './plotProfiler';

	export let stageHandle: KonvaStage | undefined;
	export let getRenderMode: () => PlotRenderMode = () => 'adaptive-culling';

	type RecordedSnapshot = PlotProfilerSnapshot & {
		recordedAt: string;
	};

	const MAX_RECORDED_SAMPLES = 10_000;

	let profiler: ReturnType<typeof createPlotProfiler>;
	let snapshot: PlotProfilerSnapshot | null = null;
	let currentRenderMode: PlotRenderMode = 'adaptive-culling';
	let recordedSnapshots: RecordedSnapshot[] = [];
	let sessionStartedAt: string;
	let scenario = 'unspecified';
	let cacheEnabled = true;
	let cullEnabled = false;
	let hybridEnabled = false;
	let enabled = false;

	function isKonvaContainer(node: KonvaNode): node is KonvaContainer {
		return node.hasChildren();
	}

	function countKonvaNodes(node: KonvaNode): number {
		if (!isKonvaContainer(node)) return 1;

		return 1 + node.getChildren().reduce((count, child) => count + countKonvaNodes(child), 0);
	}

	onMount(() => {
		const params = new URLSearchParams(window.location.search);
		enabled = params.has('plotDebug');
		if (!enabled) return;

		scenario = params.get('plotScenario') || 'unspecified';
		cullEnabled = params.get('plotCull') === '1';
		hybridEnabled = !cullEnabled && params.get('plotHybrid') !== '0';
		cacheEnabled = params.get('plotCache') !== '0' && !cullEnabled && !hybridEnabled;
		sessionStartedAt = new Date().toISOString();
		profiler = createPlotProfiler({
			onSnapshot: (nextSnapshot) => {
				currentRenderMode = getRenderMode();
				snapshot = nextSnapshot;
				recordedSnapshots = [
					...recordedSnapshots.slice(-(MAX_RECORDED_SAMPLES - 1)),
					{
						recordedAt: new Date().toISOString(),
						...nextSnapshot
					}
				];
			},
			getKonvaNodeCount: () => (stageHandle ? countKonvaNodes(stageHandle) : 0)
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

	function downloadMeasurements() {
		if (!enabled || recordedSnapshots.length === 0) return;

		const exportedAt = new Date();
		const report = {
			metadata: {
				scenario,
				cacheEnabled,
				cullEnabled,
				hybridEnabled,
				renderMode: getRenderMode(),
				sessionStartedAt,
				exportedAt: exportedAt.toISOString(),
				url: window.location.href,
				userAgent: navigator.userAgent,
				viewport: {
					width: window.innerWidth,
					height: window.innerHeight,
					devicePixelRatio: window.devicePixelRatio
				}
			},
			samples: recordedSnapshots
		};
		const blob = new Blob([JSON.stringify(report, null, 2)], {
			type: 'application/json'
		});
		const downloadUrl = URL.createObjectURL(blob);
		const link = document.createElement('a');
		const timestamp = exportedAt.toISOString().replace(/[:.]/g, '-');
		const safeScenario =
			scenario.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-|-$/g, '') || 'unspecified';

		link.href = downloadUrl;
		const cacheState = hybridEnabled ? 'hybrid' : cacheEnabled ? 'enabled' : 'disabled';
		const cullState = hybridEnabled ? 'hybrid' : cullEnabled ? 'enabled' : 'disabled';
		link.download = `plot-profile-${safeScenario}-cache-${cacheState}-cull-${cullState}-${timestamp}.json`;
		link.click();
		window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 0);
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
		<div>Mode: {currentRenderMode}</div>
		<div>Pointer: {snapshot.pointerEvents} · Wheel: {snapshot.wheelEvents}</div>
		<div>Blobs: {snapshot.blobCount} · {snapshot.blobTime.toFixed(1)} ms</div>
		<div>Konva nodes: {snapshot.konvaNodeCount}</div>
		{#if snapshot.jsHeapUsed !== null}
			<div>Heap: {(snapshot.jsHeapUsed / 1024 / 1024).toFixed(1)} MB</div>
		{/if}
		<button type="button" on:click={downloadMeasurements}>
			Save JSON ({recordedSnapshots.length})
		</button>
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
		pointer-events: auto;
	}

	button {
		margin-top: 6px;
		padding: 2px 5px;
		border: 1px solid rgba(0, 0, 0, 0.3);
		background: white;
		font: inherit;
		cursor: pointer;
	}
</style>
