<script lang="ts">
	import type { Group as KonvaGroup } from 'konva/lib/Group';
	import { Group } from 'svelte-konva';
	import type { Point } from '$lib/types';
	import Cross from './Cross.svelte';

	// ----- Data -----
	export let mappedEmbeddings: Point[] = [];
	export let visibleMappedEmbeddings: Point[] = [];
	export let cullingEnabled = false;
	export let baseGroupMounted = false;

	// ----- Canvas Objects -----
	export let crossGroup: KonvaGroup | undefined;
</script>

<!-- Base dataset points -->
<!--
	Keep the base group mounted at this position even before its children are
	needed. When culling is enabled, the group is empty or hidden; when the
	cache is first built, its children are added without moving the group below
	the search overlays. This preserves the intended overlay draw order across
	cached/vector transitions.
-->
<Group
	config={{
		visible: !cullingEnabled,
		listening: false
	}}
	bind:handle={crossGroup}
>
	{#if baseGroupMounted}
		{#each mappedEmbeddings as cross (cross.id)}
			<Cross x={cross.x} y={cross.y} pointId={cross.id} color={'black'} />
		{/each}
	{/if}
</Group>

<!-- Culling group -->
<!-- Keep the culling group in its layer slot across mode changes too. -->
<Group
	config={{
		visible: cullingEnabled,
		listening: false
	}}
>
	{#if cullingEnabled}
		{#each visibleMappedEmbeddings as cross (cross.id)}
			<Cross x={cross.x} y={cross.y} pointId={cross.id} color={'black'} />
		{/each}
	{/if}
</Group>
