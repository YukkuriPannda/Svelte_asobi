<script lang="ts">
	import BlogPanel from './BlogPanel.svelte';
	export let articles;
</script>

<div class="main">
	{#each articles as _, i}
		<BlogPanel
			title={articles[i].title}
			id={articles[i].id}
			date={articles[i].date}
			thumnail_path={articles[i].thumnail_path}
			tags={articles[i].tags}
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
