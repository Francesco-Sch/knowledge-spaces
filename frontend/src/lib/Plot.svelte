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
        const crosses = space.getForm();
        const grid = space.getForm();

        // zoom
        // const grid = new Grid(bound.width, bound.height, 20, 20, form.center(), 0.5, "#ddd");
        space.add( {
            start: (bound, space) => { 
                pts = calculatedMapped().map( (c) => new Pt( c ) );

            },
            animate: (time, ftime, space) => { 
                // --- BACKGROUND GRID ---
                

                // --- CROSSES ---
                crosses.strokeOnly("#000", 1.5);

                // Iterate through each point and draw a cross
                for (const pt of pts) {
                    crosses.line([pt.$subtract(4), pt.$add(4)]); // Draw a horizontal line
                    crosses.line([pt.$subtract([4, -4]), pt.$add([4, -4])]); // Draw a diagonal line
                }
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