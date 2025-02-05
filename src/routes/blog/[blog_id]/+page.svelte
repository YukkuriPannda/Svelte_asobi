<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import { allPosts } from 'contentlayer/generated';
	import 'github-markdown-css';
	import '$lib/blog.scss';
	import SvelteMarkdown from 'svelte-markdown';
	export let data;
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

<div class="body">
	<Header />
	<div class="markdown-body">
		<h1>{title}</h1>
		<code>{date}</code>
		<article id="artic"><SvelteMarkdown {source}/></article>
	</div>
</div>

