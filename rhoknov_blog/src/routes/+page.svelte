<script lang="ts">
	import App from '$lib/components/App.svelte';
	import Blog from '$lib/components/Blog.svelte';
	import Header from '$lib/components/Header.svelte';
	export const pererender = true;
</script>

<div>
	<Header />
	<App />
</div>

<style>
	:global(body) {
		margin: 0;
		font-family: 'Courier New', Courier, monospace;
	}

	div {
		width: 100vw;
		height: 100vh;
		background: #1b1b1b;
		color: white;
	}
</style>
