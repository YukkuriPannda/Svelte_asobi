<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { photoPost } from '$lib/PostData';
	import { photoOgImageUrl } from '$lib/photo-thumbnails';
	export let data: { photoid: string };
	const origin = 'https://rhoknov.net';
	$: post = photoPost.find((p) => p.id === data.photoid);
	$: title = post?.title ?? data.photoid;
	onMount(() => {
		goto('/photo/?photo_id=' + data.photoid);
	});
</script>

<svelte:head>
	<title>{title}</title>
	<meta property="og:title" content={title} />
	<meta property="og:image" content={origin + photoOgImageUrl(data.photoid)} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:url" content={`${origin}/photo/${encodeURIComponent(data.photoid)}`} />
	<meta property="og:type" content="article" />
	<meta property="og:site_name" content="rhoknov.net" />
	<meta name="twitter:card" content="summary_large_image" />
</svelte:head>
