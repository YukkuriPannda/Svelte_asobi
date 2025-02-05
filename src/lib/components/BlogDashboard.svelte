<script lang="ts">
	import BlogPanel from './BlogPanel.svelte';
	import parseMD from 'parse-md';
	export let articles
</script>

<div class="main">
	{#each articles as _, i}
		<BlogPanel
			title={articles[i].title}
			id={articles[i].slug}
			date={articles[i].date}
			thumnail_path={articles[i].thumnail_path}
			tags={[]}
			likes={1}
		/>
	{/each}
</div>

<style>
	.main {
		margin: 0px auto;
		padding: 20px;
		width: 90%;
		background-color: gray;
		min-height: 100vh;
	}
</style>
