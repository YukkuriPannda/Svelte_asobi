<script lang="ts">
	import { pushState } from '$app/navigation';
	import Header from '$lib/components/Header.svelte';
	import PhotoDetailModal from '$lib/components/PhotoDetailModal.svelte';
	import PhotoDetailModalMobile from '$lib/components/PhotoDetailModal-mobile.svelte';
	import { photoPost } from '$lib/PostData';
	import { onMount } from 'svelte';
	let detail_modal = false;
	let device_mobile = false;
	let open_photo_id: string = '';
	function openPhotoPost(id: string) {
		pushState('/photo/' + id, {});
		detail_modal = true;
		open_photo_id = id;
		document.getElementsByTagName('body')[0].classList.add('scrolllock');
	}
	function closePhotoPost() {
		if (!detail_modal) return;
		pushState('/photo/', {});
		detail_modal = false;
		open_photo_id = '';
		document.getElementsByTagName('body')[0].classList.remove('scrolllock');
	}
	onMount(() => {
		const urlParams = new URLSearchParams(window.location.search);
		console.log(urlParams.get('photo_id'));
		if (urlParams.get('photo_id')) {
			openPhotoPost(urlParams.get('photo_id') as string);
		}
		device_mobile = /Mobi|Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent);
	});
</script>

<div class={detail_modal ? 'scrolllock' : ''}>
	<div style={detail_modal ? 'filter: blur(3px)' : ''}><Header /></div>
	<div class="body" style={detail_modal ? 'filter: blur(3px) saturate(10%)' : ''}>
		{#each photoPost as _, i}
			<div class="photoPost">
				<button on:click={() => openPhotoPost(photoPost[i].id)}>
					<img src={photoPost[i].img_path} />
				</button>
			</div>
		{/each}
	</div>
	<div
		class="modal {detail_modal && !device_mobile ? '' : 'hide'}"
		on:click={() => closePhotoPost()}
	>
		<PhotoDetailModal id={open_photo_id} />
	</div>
	<div
		class="modal {detail_modal && device_mobile ? '' : 'hide'}"
		on:click={() => closePhotoPost()}
	>
		<PhotoDetailModalMobile id={open_photo_id} />
	</div>
</div>

<style lang="scss">
	n :global(body) {
		margin: 0;
	}
	:global(body) {
		overflow: auto;
	}
	:global(body.scrolllock) {
		overflow: hidden;
	}
	.body {
		width: 60vw;
		margin: auto;
		display: flex;
		flex-wrap: wrap;
		filter: blur(0px);
		transition: filter 0.3s ease-in-out;
		background-color: white;
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
