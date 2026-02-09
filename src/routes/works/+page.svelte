<script lang="ts">
	import App from '$lib/components/App.svelte';
	import Header from '$lib/components/Header.svelte';
	import Procon from '$lib/components/WorkPanels/Procont.svelte';
</script>

<div>
	<Header />
	<Procon />
</div>

<style>
	:global(body) {
		margin: 0;
	}

	div {
		width: 100vw;
		height: 100vh;
		background: #1b1b1b;
		color: white;
	}
</style>
