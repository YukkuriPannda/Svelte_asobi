<script lang="ts">
	import App from '$lib/components/App.svelte';
	import Header from '$lib/components/Header.svelte';
</script>

<div>
	<Header />
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
