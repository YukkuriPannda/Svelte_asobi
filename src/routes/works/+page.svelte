<script lang="ts">
	import Header from '$lib/components/Header.svelte';

	const images = [
		'/Works/01Procon.png',
		'/Works/02LimiT.png',
	];
</script>

<div class="page">
	<Header />
	<div class="gallery">
		{#each images as src}
			<img {src} alt={src} />
		{/each}
	</div>
</div>

<style lang="scss">
	:global(body) {
		margin: 0;
	}

	.page {
		width: 100vw;
		min-height: 100vh;
		background: #1b1b1b;
		color: white;
	}

	.gallery {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2rem;
		padding: 2rem;

		img {
			max-width: 100%;
			height: auto;
			display: block;
			transition: filter 0.2s ease;

			&:hover {
				filter: brightness(0.7);
			}
		}
	}
</style>
