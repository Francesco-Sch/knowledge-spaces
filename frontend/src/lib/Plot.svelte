<script lang="ts">
    import { onMount } from 'svelte';
    import { CanvasSpace, Pt } from 'pts';

    let canvas: Element, windowWidth: number, windowHeight: number;
    export let data: Array<Array<number>>;

    function map_range(value, low1, high1, low2, high2) {
        return low2 + (high2 - low2) * (value - low1) / (high1 - low1);
    }

    const calculatedMapped = (): Array<Array<number>> => {
    return data.map(([x, y]) => [
            map_range(x, -0.1, 0.5, 0, windowWidth),
            map_range(y, -0.1, 0.5, 0, windowHeight)
        ]);
    };
    

    onMount(() => {
        let pts: Array<Pt> = [];

        const space = new CanvasSpace(canvas).setup({ bgcolor: '#EBEAEB', resize: true, retina: true });
        const form = space.getForm();

        // zoom
        // const grid = new Grid(bound.width, bound.height, 20, 20, form.center(), 0.5, "#ddd");
        space.add( {
            start: (bound, space) => { 
                pts = calculatedMapped().map( (c) => new Pt( c ) );

            },
            animate: (time, ftime, space) => { 
                form.fillOnly("#123").points( pts, 2, "circle" );
                // form.point( space.pointer, 10 )
            },
        });

        space.play().bindMouse();
    });
</script>

<svelte:window bind:innerWidth={windowWidth} bind:innerHeight={windowHeight}/>

<canvas id="pts" bind:this={canvas} /> 
  
<style>
    #pts { width: 100%; height: 100%; }
    /* .dot {
        fill: steelblue;
        stroke: white;
      } */
</style>