<script lang="ts">
	import App from '$lib/components/App.svelte';
	import Header from '$lib/components/Header.svelte';
	import { allPosts } from 'contentlayer/generated';
	export let data;
	import SvelteMarkdown from 'svelte-markdown';
	import 'github-markdown-css';

	var source = '';
	var date = '';
	var title = '';
	var post = allPosts.find((post)=>post.slug == data.blogid)
	if(post){
		source =post.body.raw;
		date = new Date(post.date).toDateString()
		title = post.title
	}else{
		source = "# 404"
	}
	console.log(data);
</script>

<div>
	<Header />
	<div class="markdown-body">
		<h1>{title}</h1>
		<code>{date}</code>
		<SvelteMarkdown {source} />
	</div>
</div>

<style>
	:global(body) {
		margin: 0;
		font-family: sans-serif;
	}

	div {
		width: 100vw;
		background: #1b1b1b;
		color: white;
		min-height: 100vh;
	}
	div > .markdown-body {
		margin: 0px auto;
		padding: 20px 50px;
		width: 60%;
		background-color: #202020;
		min-height: 100vh;
	}

	@media (max-width: 1080px) {
		div > .markdown-body {
			width: 90%;
		}
	}

	h1 {
		font-weight: bold;
	}
</style>
