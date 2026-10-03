<script lang="ts">
	import { pushState, replaceState } from '$app/navigation';
	import Header from '$lib/components/Header.svelte';
	import PhotoDetailModal from '$lib/components/PhotoDetailModal.svelte';
	import PhotoDetailModalMobile from '$lib/components/PhotoDetailModal-mobile.svelte';
	import { photoPost } from '$lib/PostData';
	import { onMount, onDestroy, tick } from 'svelte';
	let detail_modal = false;
	let device_mobile = false;
	let open_photo_id: string = '';
	function openPhotoPost(id: string) {
		pushState('/photo/' + encodeURIComponent(id), {});
		detail_modal = true;
		open_photo_id = id;
		document.getElementsByTagName('body')[0].classList.add('scrolllock');
	}
	let swipeStart: { x: number; y: number; identifier: number } | null = null;
	let swipeDirection: 'horizontal' | 'vertical' | null = null;
	let suppressSwipeClick = false;
	let swipeOffset = 0;
	let swipeAnimating = false;
	let reduceMotion = false;
	let swipeAnimation: Animation | null = null;
	let animationGeneration = 0;

	function adjacentPhoto(dx: number) {
		const index = photoPost.findIndex((photo) => photo.id === open_photo_id);
		return index < 0 ? undefined : photoPost[index + (dx < 0 ? 1 : -1)];
	}

	async function switchPhoto(id: string, dx: number) {
		const generation = ++animationGeneration;
		const direction = dx < 0 ? -1 : 1;
		const width = window.innerWidth;
		const outgoing = document.querySelector<HTMLElement>('.modal:not(.hide) .modalwindow');
		swipeAnimating = true;
		try {
			if (!reduceMotion && outgoing) {
				swipeAnimation = outgoing.animate(
					[{ translate: `${swipeOffset}px 0` }, { translate: `${direction * width}px 0` }],
					{ duration: 160, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' }
				);
				await swipeAnimation.finished;
			}
			if (generation !== animationGeneration) return;
			open_photo_id = id;
			swipeOffset = 0;
			replaceState('/photo/' + encodeURIComponent(id), {});
			await tick();
			swipeAnimation?.cancel();
			const incoming = document.querySelector<HTMLElement>('.modal:not(.hide) .modalwindow');
			if (!reduceMotion && incoming) {
				swipeAnimation = incoming.animate(
					[{ translate: `${-direction * width}px 0` }, { translate: '0px 0' }],
					{ duration: 220, easing: 'cubic-bezier(0, 0, 0.2, 1)' }
				);
				await swipeAnimation.finished;
			}
		} catch (error) {
			if (!(error instanceof DOMException && error.name === 'AbortError')) throw error;
		} finally {
			if (generation === animationGeneration) {
				swipeAnimation = null;
				swipeAnimating = false;
				swipeOffset = 0;
			}
		}
	}

	onDestroy(() => {
		animationGeneration++;
		swipeAnimation?.cancel();
	});

	function handleSwipeStart(event: TouchEvent) {
		if (swipeAnimating) return;
		swipeOffset = 0;
		suppressSwipeClick = false;
		swipeDirection = null;
		const touch = event.touches[0];
		swipeStart = event.touches.length === 1
			? { x: touch.clientX, y: touch.clientY, identifier: touch.identifier }
			: null;
	}

	function handleSwipeMove(event: TouchEvent) {
		if (!swipeStart) return;
		if (event.touches.length !== 1) {
			handleSwipeCancel();
			return;
		}
		const touch = event.touches[0];
		const dx = Math.abs(touch.clientX - swipeStart.x);
		const dy = Math.abs(touch.clientY - swipeStart.y);
		if (!swipeDirection && Math.max(dx, dy) >= 10) {
			swipeDirection = dx > dy * 1.2 ? 'horizontal' : 'vertical';
		}
		if (swipeDirection === 'horizontal') {
			suppressSwipeClick = true;
			const distance = touch.clientX - swipeStart.x;
			swipeOffset = reduceMotion ? 0 : Math.max(-window.innerWidth, Math.min(window.innerWidth, distance)) * (adjacentPhoto(distance) ? 1 : 0.25);
			if (event.cancelable) event.preventDefault();
		}
	}

	function handleSwipeEnd(event: TouchEvent) {
		if (!swipeStart) return;
		const touch = Array.from(event.changedTouches).find(
			(touch) => touch.identifier === swipeStart?.identifier
		);
		const start = swipeStart;
		swipeStart = null;
		if (!touch || swipeDirection === 'vertical') {
			swipeOffset = 0;
			return;
		}
		const dx = touch.clientX - start.x;
		const dy = touch.clientY - start.y;
		if (Math.abs(dx) < 60 || Math.abs(dx) <= Math.abs(dy) * 1.2) {
			swipeOffset = 0;
			return;
		}
		suppressSwipeClick = true;
		const next = adjacentPhoto(dx);
		if (!next) {
			swipeOffset = 0;
			return;
		}
		void switchPhoto(next.id, dx);
	}

	function handleSwipeCancel() {
		swipeOffset = 0;
		swipeStart = null;
		swipeDirection = null;
	}

	function closePhotoPost() {
		if (suppressSwipeClick) {
			suppressSwipeClick = false;
			return;
		}
		if (swipeAnimating) return;
		if (!detail_modal) return;
		pushState('/photo/', {});
		detail_modal = false;
		open_photo_id = '';
		document.getElementsByTagName('body')[0].classList.remove('scrolllock');
	}
	onMount(() => {
		const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
		const updateMotionPreference = () => { reduceMotion = motionPreference.matches; };
		updateMotionPreference();
		motionPreference.addEventListener('change', updateMotionPreference);
		const urlParams = new URLSearchParams(window.location.search);
		console.log(urlParams.get('photo_id'));
		if (urlParams.get('photo_id')) {
			openPhotoPost(urlParams.get('photo_id') as string);
		}
		device_mobile = /Mobi|Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent);
		return () => motionPreference.removeEventListener('change', updateMotionPreference);
	});
</script>

<div class={detail_modal ? 'scrolllock' : ''}>
	<div style={detail_modal ? 'filter: blur(3px)' : ''}><Header /></div>
	<div class="body" data-visual-id="photo-gallery" style={detail_modal ? 'filter: blur(3px) saturate(10%)' : ''}>
		{#each photoPost as _, i}
			<div class="photoPost" data-visual-id={`photo-${photoPost[i].id}`}>
				<button on:click={() => openPhotoPost(photoPost[i].id)}>
					<img src={photoPost[i].img_path} />
				</button>
			</div>
		{/each}
	</div>
	<div
		class="modal {detail_modal && !device_mobile ? '' : 'hide'}"
		on:click={() => closePhotoPost()}
		class:swipe-dragging={swipeStart !== null && swipeDirection === 'horizontal'}
		style={`--swipe-offset: ${swipeOffset}px`}
		data-swipe-animating={swipeAnimating}
		on:touchstart={handleSwipeStart}
		on:touchmove|nonpassive={handleSwipeMove}
		on:touchend={handleSwipeEnd}
		on:touchcancel={handleSwipeCancel}
	>
		{#key open_photo_id}
			<PhotoDetailModal id={open_photo_id} />
		{/key}
	</div>
	<div
		class="modal {detail_modal && device_mobile ? '' : 'hide'}"
		on:click={() => closePhotoPost()}
		class:swipe-dragging={swipeStart !== null && swipeDirection === 'horizontal'}
		style={`--swipe-offset: ${swipeOffset}px`}
		data-swipe-animating={swipeAnimating}
		on:touchstart={handleSwipeStart}
		on:touchmove|nonpassive={handleSwipeMove}
		on:touchend={handleSwipeEnd}
		on:touchcancel={handleSwipeCancel}
	>
		{#key open_photo_id}
			<PhotoDetailModalMobile id={open_photo_id} />
		{/key}
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
		justify-content: center;
		filter: blur(0px);
		transition: filter 0.3s ease-in-out;
		background-color: white;
	}
	.photoPost {
		display: flex;
		width: 256px;
		max-width: calc(100% - 40px);
		margin: 20px;
		align-items: center;
		img {
			width: 100%;
			height: auto;
		}
	}
	@media (max-width: 600px) {
		.body {
			width: 100%;
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
		touch-action: pan-y;
		transition:
			opacity 0.3s ease-in-out,
			visibility 0.3s ease-in-out,
			background-color 0.3s ease-in-out;
	}
	.modal {
		overflow: hidden;
	}
	.modal :global(.modalwindow) {
		translate: var(--swipe-offset, 0px) 0;
		transition: translate 180ms ease-out;
	}
	.modal.swipe-dragging :global(.modalwindow) {
		transition: none;
	}
	@media (prefers-reduced-motion: reduce) {
		.modal :global(.modalwindow) {
			transition: none;
		}
	}
	.hide {
		opacity: 0;
		visibility: hidden;
		background-color: rgba(0, 0, 0, 0);
	}
</style>
