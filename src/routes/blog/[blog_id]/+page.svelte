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
	var description: string | undefined = '';
	var thumnail_path: string | undefined = '';
	var post = allPosts.find((post)=>post.slug == data.blogid)
	if(post){
		source =post.body.raw;
		date = new Date(post.date).toDateString()
		title = post.title
		description =  post.description == undefined? post.description : post.description
		thumnail_path = post.thumnail_path == undefined? post.thumnail_path : post.thumnail_path
	}else{
		source = "# 404"
	}
	console.log(data);
</script>
<svelte:head>
	<title>{title}</title>
	<meta name="description" content="{description}">
	<meta name="viewport" content="width=device-width,initial-scale=1">
	<meta property="og:title" content="{title}">
	<meta property="og:description" content="{description}">
	<meta property="og:image" content={thumnail_path}>
	<meta property="og:url" content="https://rhoknov.net/blog/${data.blogid}">
	<meta property="og:type" content="article">
	<meta property="og:site_name" content="rhoknov.net">
</svelte:head>

<div class="body">
	<Header />
	<div class="markdown-body">
		<h1>{title}</h1>
		<code>{date}</code>
		<article id="artic"><SvelteMarkdown {source}/></article>
	</div>
</div>

