<script lang="ts">
	import App from '$lib/components/App.svelte';
	import Blog from '$lib/components/BlogDashboard.svelte';
	import Header from '$lib/components/Header.svelte';
	export const pererender = true;
</script>

<div>
	<Header />
	<App />
</div>

<style>
	* {
		margin: 0px;
		padding: 0px;
	}
	:global(body) {
		padding: 0px;
		margin: 0;
		font-family: 'Courier New', Courier, monospace;
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		z-index: -1;
		background-size: cover;
	}
	div {
		background: url('/IMG_2280_Original.jpeg');
		width: 100vw;
		height: 100vh;
		color: white;
		background-size: cover;
		background-repeat: no-repeat;
		background-position: center center;
	}
	div::before {
		filter: blur(3px);
	}
</style>
