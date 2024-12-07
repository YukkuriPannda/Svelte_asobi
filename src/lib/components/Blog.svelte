<script lang="ts">
	import path from 'path';
	import parseMD from 'parse-md';
	import SvelteMarkdown from 'svelte-markdown';
	import 'github-markdown-css/github-markdown-light.css';
	import { onMount } from 'svelte';
	import { type BlogData } from '../../routes/blog.json';
	export let blog_data: BlogData;
	let outerWidth: number = 0;
	let side_margin: boolean = true;
	let source = '';
	$: source = parseMD(blog_data.md).content;
	/*onMount(() => {
		console.log('Mounted!!');
		console.log('outerWidth:' + outerWidth);
		side_margin = outerWidth / screen.width > 0.5;
	});*/
</script>

<svelte:window bind:outerWidth />
<div>
	<div class="markdown-body {side_margin ? 'side-margin' : ''}">
		<SvelteMarkdown {source} />
	</div>
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
	div > .markdown-body {
		margin: 0px auto;
		padding: 20px;
		width: 90%;
		background-color: #202020;
		min-height: 100vh;
	}
	div > .markdown-body.side-margin {
		width: 60%;
	}
</style>
