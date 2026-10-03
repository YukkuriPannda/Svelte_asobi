<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import 'github-markdown-css';
	import '$lib/blog.scss';
	import { blogPost } from '$lib/PostData';
	import { onMount } from 'svelte';
	export let data;
	var source = '';
	var date = '';
	var title = '';
	var description: string | undefined = '';
	var thumnail_path: string | undefined = '';
	let toc: { text: string; id: string }[] = [];

	function slugify(s: string) {
		return s
			.toLowerCase()
			.trim()
			.replace(/[^a-z0-9\s-]/g, '')
			.replace(/\s+/g, '-')
			.replace(/-+/g, '-');
	}

	var post = blogPost.find((post) => post.id == data.blogid);
	if (post) {
		source = post.content as string;
		date = new Date(post.date as string).toDateString();
		title = post.title;
		description = post.description == undefined ? post.description : post.description;
		thumnail_path = post.thumbnail_path == undefined ? post.thumbnail_path : post.thumbnail_path;
	} else {
		source = '# 404';
	}
	console.log(data);

	onMount(() => {
		const headings = Array.from(
			document.querySelectorAll('#artic h1, #artic h2, #artic h3, #artic h4, #artic h5, #artic h6')
		) as HTMLElement[];
		const items: { text: string; id: string }[] = headings.map((h) => {
			const text = h.innerText.trim();
			const id = h.id && h.id.length ? h.id : slugify(text);
			if (!h.id) h.id = id;
			return { text, id };
		});
		toc = items;
	});
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<meta name="viewport" content="width=device-width,initial-scale=1" />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:image" content={thumnail_path} />
	<meta property="og:url" content="https://rhoknov.net/blog/${data.blogid}" />
	<meta property="og:type" content="article" />
	<meta property="og:site_name" content="rhoknov.net" />
</svelte:head>

<div class="body">
	<Header />
	<div class="markdown-body">
		<h1>{title}</h1>
		<code>{date}</code>
		<nav class="toc">
			{#if toc.length}
				<h2>目次</h2>
				<ul>
					{#each toc as item}
						<li class="toc-item"><a href={'#' + item.id}>{'・' + item.text}</a></li>
					{/each}
				</ul>
			{/if}
		</nav>
		<article id="artic">{@html source}</article>
	</div>
</div>
