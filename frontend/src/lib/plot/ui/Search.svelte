<script lang="ts">
	import { Label, Tag, Text } from 'svelte-konva';
	import type { MappedSearch } from '../plot-data';
	import Cross from './Cross.svelte';
	import SearchBlob from './SearchBlob.svelte';
	import SearchConnection from './SearchConnection.svelte';

	// ----- Data -----
	export let search: MappedSearch;
	export let blobPoints: number[] = [];
	export let cullingEnabled = false;
	export let hybridEnabled = false;
</script>

<!-- Search blob and connections -->
<SearchBlob points={blobPoints} color={search.color} />

{#each search.neighbors as cross (cross.id)}
	{#if search.searchPoint}
		<SearchConnection searchPoint={search.searchPoint} {cross} color={search.color} />
	{/if}

	<Cross x={cross.x} y={cross.y} pointId={cross.id} color={search.color} />
{/each}

<!-- Search label -->
{#if search.searchPoint}
	<Label
		config={{
			x: search.searchPoint[0],
			y: search.searchPoint[1],
			listening: false
		}}
	>
		<Tag
			config={{
				fill: search.color,
				listening: false
			}}
		/>
		<Text
			config={{
				text: search.query,
				fontSize: 12,
				padding: 2,
				fontFamily: 'Times New Roman',
				listening: false,
				x: cullingEnabled || hybridEnabled ? 0 : search.searchPoint[0],
				y: cullingEnabled || hybridEnabled ? 0 : search.searchPoint[1]
			}}
		/>
	</Label>
{/if}
