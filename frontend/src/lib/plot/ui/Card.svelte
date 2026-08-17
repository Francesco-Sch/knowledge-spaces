<script context="module" lang="ts">
	const entryCache = new Map<string, string>();
</script>

<script lang="ts">
	import { createEventDispatcher, onDestroy, onMount } from 'svelte';
	import { selectedDataset } from '../../../stores/store';
	import type { CardEmbedding } from '../plot-data';

	type CardStatus = 'loading' | 'success' | 'error';

	type CardEvents = {
		resize: { width: number; height: number };
	};

	const dispatch = createEventDispatcher<CardEvents>();

	const LOADING_DELAY = 500;

	export let x = 0;
	export let y = 0;
	export let scale = 1;
	export let color = 'black';
	export let embedding: CardEmbedding = {
		id: 0,
		x: 0,
		y: 0
	};

	let cardElement: HTMLElement | undefined;
	let status: CardStatus = 'loading';
	let entryText = '';
	let errorMessage = '';
	let showLoading = false;
	let loadingTimer: ReturnType<typeof setTimeout> | undefined;
	let requestController: AbortController | undefined;
	let requestSequence = 0;
	let requestKey = '';
	let activeRequestKey: string | undefined;
	let measuredSize = { width: 0, height: 0 };
	let resizeObserver: ResizeObserver | undefined;

	function getRequestKey(dataset: string, pointId: number): string {
		return `${dataset}:${pointId}`;
	}

	function clearLoadingTimer() {
		if (loadingTimer !== undefined) {
			clearTimeout(loadingTimer);
			loadingTimer = undefined;
		}
	}

	function cancelRequest() {
		clearLoadingTimer();
		requestController?.abort();
		requestController = undefined;
		requestSequence += 1;
	}

	function getErrorMessage(error: unknown): string {
		if (error instanceof Error && error.message) return error.message;
		return 'The dataset entry could not be loaded.';
	}

	function getEntryText(payload: unknown): string {
		if (typeof payload === 'string') return payload;
		if (payload === null || payload === undefined) return '';
		return JSON.stringify(payload) ?? String(payload);
	}

	async function loadDatasetEntry(dataset: string, pointId: number) {
		cancelRequest();
		const sequence = requestSequence;
		const key = getRequestKey(dataset, pointId);
		const cachedEntry = entryCache.get(key);

		status = 'loading';
		entryText = '';
		errorMessage = '';
		showLoading = false;

		if (cachedEntry !== undefined) {
			status = 'success';
			entryText = cachedEntry;
			return;
		}

		loadingTimer = setTimeout(() => {
			if (sequence === requestSequence && status === 'loading') showLoading = true;
		}, LOADING_DELAY);

		const controller = new AbortController();
		requestController = controller;

		try {
			const response = await fetch(
				`/api/dataset-entry?dataset=${encodeURIComponent(dataset)}&embedding=${encodeURIComponent(
					String(pointId)
				)}`,
				{ signal: controller.signal }
			);

			if (!response.ok) {
				throw new Error('The dataset entry could not be loaded.');
			}

			const payload: unknown = await response.json();
			if (sequence !== requestSequence) return;

			entryText = getEntryText(payload);
			entryCache.set(key, entryText);
			status = 'success';
			showLoading = false;
		} catch (error) {
			if (
				sequence !== requestSequence ||
				(error instanceof DOMException && error.name === 'AbortError')
			) {
				return;
			}

			status = 'error';
			showLoading = false;
			errorMessage = getErrorMessage(error);
		} finally {
			if (sequence === requestSequence) {
				clearLoadingTimer();
				requestController = undefined;
			}
		}
	}

	function retry() {
		void loadDatasetEntry($selectedDataset, embedding.id);
	}

	function reportSize() {
		if (!cardElement) return;

		const nextSize = {
			width: cardElement.offsetWidth,
			height: cardElement.offsetHeight
		};
		if (nextSize.width === measuredSize.width && nextSize.height === measuredSize.height) return;

		measuredSize = nextSize;
		dispatch('resize', nextSize);
	}

	onMount(() => {
		resizeObserver = new ResizeObserver(reportSize);
		if (cardElement) resizeObserver.observe(cardElement);
		reportSize();
		return () => resizeObserver?.disconnect();
	});

	onDestroy(() => {
		cancelRequest();
	});

	$: requestKey = getRequestKey($selectedDataset, embedding.id);
	$: if (activeRequestKey !== requestKey) {
		activeRequestKey = requestKey;
		void loadDatasetEntry($selectedDataset, embedding.id);
	}
</script>

<article
	bind:this={cardElement}
	class="dataset-entry-card"
	data-testid="dataset-entry-card"
	data-point-id={embedding.id}
	aria-busy={status === 'loading'}
	style={`--card-scale: ${scale}; left: ${x}px; top: ${y}px;`}
>
	{#if status !== 'loading' || showLoading}
		<header class="card-header">
			<span class="card-color" style={`background-color: ${color};`} aria-hidden="true" />
			<span class="card-coordinates">x: {embedding.x}, y: {embedding.y}</span>
		</header>

		<div class:card-content-reveal={status === 'success'} class="card-body" aria-live="polite">
			{#if status === 'loading' && showLoading}
				Loading...
			{:else if status === 'error'}
				<p class="card-error">{errorMessage}</p>
				<button type="button" on:click={retry}>Retry</button>
			{:else}
				{entryText}
			{/if}
		</div>
	{/if}
</article>

<style>
	.dataset-entry-card {
		position: absolute;
		z-index: 10;
		box-sizing: border-box;
		width: 325px;
		min-height: 100px;
		max-width: calc(100% - 24px);
		padding: 15px;
		background: white;
		color: black;
		font-family: Helvetica, Arial, sans-serif;
		font-size: 14px;
		line-height: 1.25;
		pointer-events: auto;
		user-select: text;
		transform: scale(var(--card-scale));
		transform-origin: top left;
		animation: card-open 150ms ease-out both;
	}

	.card-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 10px;
		min-height: 10px;
	}

	.card-color {
		flex: 0 0 10px;
		width: 10px;
		height: 10px;
	}

	.card-coordinates {
		flex: 1 1 auto;
		font-family: Helvetica, Arial, sans-serif;
		font-size: 8px;
		text-align: right;
		white-space: nowrap;
	}

	.card-body {
		max-height: min(50vh, 420px);
		margin-top: 15px;
		overflow: auto;
		white-space: pre-wrap;
		word-break: break-word;
	}

	.card-error {
		margin: 0 0 8px;
	}

	button {
		padding: 0;
		border: 0;
		background: transparent;
		color: inherit;
		font: inherit;
		text-decoration: underline;
		cursor: pointer;
	}

	@keyframes card-open {
		from {
			opacity: 0;
			transform: scale(var(--card-scale)) scaleY(0);
		}
		to {
			opacity: 1;
			transform: scale(var(--card-scale)) scaleY(1);
		}
	}

	@keyframes card-content-reveal {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.card-content-reveal {
		animation: card-content-reveal 120ms ease-out both;
	}

	@media (prefers-reduced-motion: reduce) {
		.dataset-entry-card,
		.card-content-reveal {
			animation: none;
		}
	}
</style>
