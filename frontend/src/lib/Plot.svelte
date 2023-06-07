<script lang="ts">
    import { onMount } from 'svelte';
    import { CanvasSpace, Pt } from 'pts';

    let canvas: Element, windowWidth: number, windowHeight: number;
    let mapped = [];
    export let data;

    function map_range(value, low1, high1, low2, high2) {
        return low2 + (high2 - low2) * (value - low1) / (high1 - low1);
    }

    const calculatedMapped = () => {
        data.forEach(e => {
            let tmp = [];

            tmp[0] = map_range(e[0], -0.1, 0.5, 0, windowWidth)
            tmp[1] = map_range(e[1], -0.1, 0.5, 0, windowHeight)

            mapped.push(tmp)
        })
    }
    

    onMount(() => {
        let pts

        calculatedMapped();

        const space = new CanvasSpace(canvas).setup({ bgcolor: "#f6f6f6", resize: true, retina: true });
        const form = space.getForm();

        // zoom
        // const grid = new Grid(bound.width, bound.height, 20, 20, form.center(), 0.5, "#ddd");
        space.add( {
            start: (bound, space) => { 
                pts = mapped.map( (c) => new Pt( c ) );

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