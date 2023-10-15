<script lang="ts">
	export let loading: boolean = false;

	const spinner = {
		interval: 80,
		frames: ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷']
	};

	// Select the grid element
	let grid: HTMLDivElement;

	// Function to start spinner animation
	function startSpinner(spinnerAmount: number) {
		// Set the initial frame index
		let frameIndex = 0;

		if (!grid) return;
		const animation = setInterval(() => {
			// Update the grid element with the current frame
			grid.innerText = Array.from({ length: spinnerAmount }, () => spinner.frames[frameIndex]).join(
				''
			);
			frameIndex = (frameIndex + 1) % spinner.frames.length;
		}, spinner.interval);

		// Increase the spinner amount every second
		setInterval(() => {
			spinnerAmount = spinnerAmount < 20 ? spinnerAmount + 1 : 20;
		}, 1000);

		// Store the animation interval ID to stop it later if needed
		return animation;
	}

	// Function to stop spinner animation
	function stopSpinner(animation: number | undefined) {
		clearInterval(animation);
	}

	let spinnerAnimation: number | undefined;

	// Start the spinner animation when loading is changing to true
	$: if (loading) {
		spinnerAnimation = startSpinner(1);
	} else if (!loading) {
		// Fill loading bar with spinners
		startSpinner(20);

		// Stop the spinner animation after 1 second
		setTimeout(() => {
			stopSpinner(spinnerAnimation);
		}, 1000);
	}
</script>

<div class="loading-bar">
	<div id="spinners-wrapper" bind:this={grid} />
</div>

<style>
	/* Style the grid element */
	#spinners-wrapper {
		display: inline-flex;
		justify-content: flex-start;
		align-items: center;

		font-size: 2rem;
		line-height: 1;
	}

	.loading-bar {
		width: 100%;
	}
</style>
