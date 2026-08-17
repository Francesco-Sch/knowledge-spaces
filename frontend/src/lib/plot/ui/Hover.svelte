<script lang="ts">
	import Cross from './Cross.svelte';
	import type { HoveredPoint } from '../plot-data';

	// ----- Data -----
	export let point: HoveredPoint | undefined;
</script>

<!-- Keep one hover highlight overlay instead of mutating every point. -->
<Cross
	x={point?.x ?? 0}
	y={point?.y ?? 0}
	pointId={point?.id ?? -1}
	color={point?.color ?? 'black'}
	hovered={point !== undefined}
	interactive={false}
	visible={point !== undefined}
/>
