<script lang="ts">
    import { onMount } from "svelte";

    export let data;
</script>

<div id="p5" bind:this={sketchContainer} /> 
  
<style>
    #p5 { width: 100%; height: 100%; }
</style>