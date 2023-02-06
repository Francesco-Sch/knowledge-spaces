<script lang="ts">
    import { onMount } from "svelte";

    export let data;

    let sketchContainer: any;

    const s = ( sketch ) => {

        sketch.setup = () => {
            sketch.createCanvas(sketch.windowWidth, sketch.windowHeight);

            sketch.background(139);
            sketch.fill(255);

            for(const circle in data) {
                let mappedX: number = sketch.map(circle[0], -0.5, 0.5, 0, sketch.windowWidth);
                let mappedY: number = sketch.map(circle[1], -0.5, 0.5, 0, sketch.windowHeight);
                sketch.circle(mappedX/10, mappedY/10, 10)
            }
        }
        sketch.draw = () => {
            
        };

        //  sketch.windowResized = () => {
        //     sketch.resizeCanvas(sketch.windowWidth, sketch.windowHeight);
        //  }
    };

    onMount(() => {
        let p5sketch = new p5(s, sketchContainer);
        p5sketch
    });
</script>

<div id="p5" bind:this={sketchContainer} /> 
  
<style>
    #p5 { width: 100%; height: 100%; }
</style>