<script lang="ts">
    // ----- Components -----
    import Plot from '$lib/Plot.svelte';

    // ----- Data -----
    import type { PageData } from './$types';

    export let data: PageData;
</script>

<Plot />