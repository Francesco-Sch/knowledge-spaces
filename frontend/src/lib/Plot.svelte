<script lang="ts">
    import { onMount } from "svelte";
    import { CanvasSpace, Rectangle } from "pts";

    let container, space, form;

    onMount(() => {
      space = new CanvasSpace(container).setup({bgcolor: "#52f"});
      form = space.getForm();
          
      space.add( time => {
              form.fillOnly("#f06").point(space.pointer, 200, "circle");
              form.strokeOnly("#fff", 5).lines( 
                  Rectangle.corners(space.innerBound).map(r => [r, space.pointer])
              );
              form.fillOnly("#0c9").point(space.pointer, 100, "circle");
          });
          
      space.bindMouse().bindTouch().play();
    });
</script>

<canvas id="pts" bind:this={container} /> 
  
<style>
    #pts { width: 100vw; height: 100vh; }
</style>