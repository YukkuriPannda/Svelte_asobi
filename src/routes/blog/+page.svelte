<script lang="ts">
	import App from '$lib/components/App.svelte';
	import BlogDashboard from '$lib/components/BlogDashboard.svelte';
	import Header from '$lib/components/Header.svelte';
	import { onMount } from 'svelte';
	import { allPosts } from 'contentlayer/generated'
	export let data;
	console.log(data);

</script>

<div>
	<Header />
	<BlogDashboard articles ={ allPosts } />
</div>

<style>
	:global(body) {
		margin: 0;
	}

	div {
		width: 100vw;
		background: #1b1b1b;
		color: white;
		min-height: 100vh;
	}
</style>
