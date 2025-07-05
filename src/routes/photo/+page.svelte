<script lang="ts">
	import { goto, pushState } from '$app/navigation';
	import Header from '$lib/components/Header.svelte';
	import PhotoDetailModal from '$lib/components/PhotoDetailModal.svelte';
	import { photoPost } from '$lib/PostData';
	import { onMount } from 'svelte';
	let detail_modal = false;
	let open_photo_id: string = '';
	function openPhotoPost(id: string) {
		pushState('/photo/' + id, {});
		detail_modal = true;
		open_photo_id = id;
	}
	function closePhotoPost() {
		if (!detail_modal) return;
		pushState('/photo/', {});
		detail_modal = false;
		open_photo_id = '';
	}
	onMount(() => {
		const urlParams = new URLSearchParams(window.location.search);
		console.log(urlParams.get('photo_id'));
		if (urlParams.get('photo_id')) {
			openPhotoPost(urlParams.get('photo_id') as string);
		}
	});
</script>

<div class={detail_modal ? 'scrolllock' : ''}>
	<div style={detail_modal ? 'filter: blur(3px)' : ''}><Header /></div>
	<div class="body" style={detail_modal ? 'filter: blur(3px) saturate(10%)' : ''}>
		{#each photoPost as _, i}
			<div class="photoPost">
				<a on:click={() => openPhotoPost(photoPost[i].id)}>
					<img src={photoPost[i].img_path} />
				</a>
			</div>
		{/each}
	</div>
	<div class="modal {detail_modal ? '' : 'hide'}" on:click={() => closePhotoPost()}>
		<PhotoDetailModal id={open_photo_id} />
	</div>
</div>

<style lang="scss">
	.scrolllock {
		overflow: hidden;
	}
	:global(body) {
		margin: 0;
	}
	.body {
		width: 60%;
		margin: auto;
		display: flex;
		flex-wrap: wrap;
		filter: blur(0px);
		transition: filter 0.3s ease-in-out;
	}
	.photoPost {
		display: flex;
		width: 256px;
		margin: 20px;
		align-items: center;
		img {
			width: 100%;
			height: auto;
		}
	}
	.modal {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: rgba(0, 0, 0, 0.75);
		z-index: 1000;
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 1;
		visibility: visible;
		transition:
			opacity 0.3s ease-in-out,
			visibility 0.3s ease-in-out,
			background-color 0.3s ease-in-out;
	}
	.hide {
		opacity: 0;
		visibility: hidden;
		background-color: rgba(0, 0, 0, 0);
	}
</style>
