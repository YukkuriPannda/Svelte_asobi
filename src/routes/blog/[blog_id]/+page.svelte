<script lang="ts">
	import App from '$lib/components/App.svelte';
	import Blog from '$lib/components/Blog.svelte';
	import Header from '$lib/components/Header.svelte';
	export let data;
	console.log(data);
</script>

<div>
	<Header />

	{#await data.article}
		<p>waiting...</p>
	{:then article}
		<Blog blog_data={article} />
	{:catch error}
		<p>{error}</p>
	{/await}
</div>
