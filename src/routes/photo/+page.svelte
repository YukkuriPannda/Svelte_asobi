<script lang="ts">
	import { pushState, replaceState } from '$app/navigation';
	import Header from '$lib/components/Header.svelte';
	import PhotoDetailModal from '$lib/components/PhotoDetailModal.svelte';
	import PhotoDetailModalMobile from '$lib/components/PhotoDetailModal-mobile.svelte';
	import HalftonePhoto from '$lib/components/HalftonePhoto.svelte';
	import { CURSOR_RIPPLE_POINTS } from '$lib/halftone/common';
	import {
		CURSOR_RADIUS_PX,
		CURSOR_RIPPLE_MAX_RADIUS_PX,
		CURSOR_RIPPLE_SPEED_PX,
		CURSOR_RIPPLE_THRESHOLD,
		RippleDetector,
		rippleAlive,
		type CursorRipple
	} from '$lib/halftone/cursor';
	import { photoPost } from '$lib/PostData';
	import { photoThumbnailUrl } from '$lib/photo-thumbnails';
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
	let thumbnailErrors = new Set<string>();
	// マウスが乗っている写真の周りの円形の範囲（CURSOR_RADIUS_PX）に入った写真だけに、カーソル用のドットエフェクトを重ねる。
	// 円は写真の境目をまたぐため、ギャラリー全体でポインターを追跡し、写真ごとに範囲に入っているかを判定する
	const CURSOR_FADE_OUT_MS = 400; // 範囲の外へ出てから HalftonePhoto を外すまでの時間（フェードアウトの分）
	// 写真の id → 写真の左上基準のポインター位置。null はフェードアウト中（まだアンマウントしていない）。キーが無ければマウントしない
	let cursorTiles: Record<string, { x: number; y: number } | null> = {};
	const cursorTimers: Record<string, ReturnType<typeof setTimeout>> = {};
	let cursorClient: { x: number; y: number } | null = null; // ギャラリー内の最後のポインター位置（client 座標）。外へ出たら null
	let cursorFrame = 0;
	let thumbnailImages: Record<string, HTMLImageElement | null> = {};
	// 波紋: カーソルの加速度が閾値を超えたら、その位置から波紋を出す。判定はギャラリー全体で1回だけ行い、
	// 全写真に同じ波紋を渡す。位置はページ基準（スクロールしても写真に対して動かない）で持ち、client 座標の動きだけで判定する
	const rippleDetector = new RippleDetector();
	let ripples: CursorRipple[] = []; // ページ基準の CSS px、新しい順
	let tileOrigins: Record<string, { x: number; y: number }> = {}; // 写真の id → 写真の左上（ページ基準の CSS px）
	let rippleFrame = 0;
	let rippleIdle = true; // 判定のループが止まっているか
	let rippleLastTime = 0;
	let rippleLastClient: { x: number; y: number } | null = null;

	// 状態の更新は1フレームに1回にまとめる（pointermove・スクロール・リサイズが続いても判定は1回）
	function scheduleCursorUpdate() {
		if (typeof window === 'undefined' || cursorFrame) return;
		cursorFrame = requestAnimationFrame(updateCursorTiles);
	}

	function distanceToRect(point: { x: number; y: number }, rect: DOMRect) {
		const dx = Math.max(rect.left - point.x, 0, point.x - rect.right);
		const dy = Math.max(rect.top - point.y, 0, point.y - rect.bottom);
		return Math.hypot(dx, dy);
	}

	function updateCursorTiles() {
		cursorFrame = 0;
		// 詳細モーダル中・動きを減らす設定・マウス以外の入力では、円は出さない
		const pointer = detail_modal || reduceMotion ? null : cursorClient;
		for (const [id, img] of Object.entries(thumbnailImages)) {
			// 読み込みに失敗した写真には出さない（失敗時は img が外れる）
			const rect = pointer && img?.complete && img.naturalWidth > 0 ? img.getBoundingClientRect() : null;
			if (pointer && rect && distanceToRect(pointer, rect) < CURSOR_RADIUS_PX) {
				showCursorTile(id, { x: pointer.x - rect.left, y: pointer.y - rect.top });
				setTileOrigin(id, { x: rect.left + window.scrollX, y: rect.top + window.scrollY });
			} else if (cursorTiles[id]) {
				fadeCursorTile(id);
			}
		}
	}

	function showCursorTile(id: string, point: { x: number; y: number }) {
		clearTimeout(cursorTimers[id]);
		delete cursorTimers[id];
		const current = cursorTiles[id];
		if (current && current.x === point.x && current.y === point.y) return;
		cursorTiles = { ...cursorTiles, [id]: point };
	}

	function setTileOrigin(id: string, origin: { x: number; y: number }) {
		const current = tileOrigins[id];
		if (current && current.x === origin.x && current.y === origin.y) return;
		tileOrigins = { ...tileOrigins, [id]: origin };
	}

	// 止まっていたループを再開するときは、直前の移動を1フレーム（1/60 秒）の間の動きとみなす。
	// 古い時刻のままだと経過時間が長くなり、静止からの急発進の加速度を小さく見積もる
	function scheduleRippleUpdate() {
		if (typeof window === 'undefined' || rippleFrame) return;
		if (rippleIdle) rippleLastTime = performance.now() - 1000 / 60;
		rippleIdle = false;
		rippleFrame = requestAnimationFrame(updateRipples);
	}

	// 1フレームの間のポインターの移動（client 座標）から加速度を求め、閾値を超えたら波紋を置く。
	// 静止した瞬間の減速も拾うため、速度が残っている間はポインターが動かなくてもフレームを進める
	function updateRipples() {
		rippleFrame = 0;
		const now = performance.now();
		const dt = Math.min((now - rippleLastTime) / 1000, 0.1);
		rippleLastTime = now;
		const pointer = detail_modal || reduceMotion ? null : cursorClient;
		if (!pointer) {
			rippleDetector.reset();
			rippleLastClient = null;
			rippleIdle = true;
			return;
		}
		const last = rippleLastClient ?? pointer;
		rippleLastClient = pointer;
		const moved = { x: pointer.x - last.x, y: pointer.y - last.y };
		if (rippleDetector.update(dt, moved, CURSOR_RIPPLE_THRESHOLD, now)) {
			const ripple = { x: pointer.x + window.scrollX, y: pointer.y + window.scrollY, time: now };
			const alive = ripples.filter((item) =>
				rippleAlive(item, now, CURSOR_RIPPLE_SPEED_PX, CURSOR_RIPPLE_MAX_RADIUS_PX)
			);
			ripples = [ripple, ...alive].slice(0, CURSOR_RIPPLE_POINTS);
		}
		if (rippleDetector.moving) scheduleRippleUpdate();
		else rippleIdle = true;
	}

	// ページ基準の波紋を、写真の左上基準に直す
	function tileRipples(all: CursorRipple[], origin: { x: number; y: number } | undefined) {
		if (!origin) return [];
		return all.map((ripple) => ({ ...ripple, x: ripple.x - origin.x, y: ripple.y - origin.y }));
	}

	// 範囲の外へ出た写真は、フェードアウトさせてから HalftonePhoto を外す
	function fadeCursorTile(id: string) {
		cursorTiles = { ...cursorTiles, [id]: null };
		cursorTimers[id] = setTimeout(() => {
			delete cursorTimers[id];
			const next = { ...cursorTiles };
			delete next[id];
			cursorTiles = next;
		}, CURSOR_FADE_OUT_MS);
	}

	function handleGalleryPointer(event: PointerEvent) {
		cursorClient = event.pointerType === 'mouse' ? { x: event.clientX, y: event.clientY } : null;
		scheduleCursorUpdate();
		scheduleRippleUpdate();
	}

	function handleGalleryLeave() {
		cursorClient = null;
		scheduleCursorUpdate();
		// 外へ出た位置を残すと、戻ってきたときの位置の飛びを急加速として数えるので、判定を1回流してリセットする
		scheduleRippleUpdate();
	}

	// 詳細モーダルを開いた・動きを減らす設定にしたときは、すべての円を外す
	$: if (detail_modal || reduceMotion) {
		scheduleCursorUpdate();
		scheduleRippleUpdate();
	}

	function handleThumbnailError(id: string) {
		thumbnailErrors = new Set(thumbnailErrors).add(id);
	}

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
		if (cursorFrame) cancelAnimationFrame(cursorFrame);
		if (rippleFrame) cancelAnimationFrame(rippleFrame);
		for (const timer of Object.values(cursorTimers)) clearTimeout(timer);
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
		for (const image of document.querySelectorAll<HTMLImageElement>('.photoPost img')) {
			if (image.complete && image.naturalWidth === 0) {
				const visualId = image.closest<HTMLElement>('.photoPost')?.dataset.visualId;
				if (visualId?.startsWith('photo-')) handleThumbnailError(visualId.slice('photo-'.length));
			}
		}
		return () => motionPreference.removeEventListener('change', updateMotionPreference);
	});
</script>

<svelte:window on:scroll={scheduleCursorUpdate} on:resize={scheduleCursorUpdate} />
<div class={detail_modal ? 'scrolllock' : ''}>
	<div style={detail_modal ? 'filter: blur(3px)' : ''}><Header /></div>
	<div
		class="body"
		data-visual-id="photo-gallery"
		style={detail_modal ? 'filter: blur(3px) saturate(10%)' : ''}
		on:pointermove={handleGalleryPointer}
		on:pointerleave={handleGalleryLeave}
	>
		{#each photoPost as _, i}
			<div class="photoPost" data-visual-id={`photo-${photoPost[i].id}`}>
				<button on:click={() => openPhotoPost(photoPost[i].id)} aria-label={`写真を開く: ${photoPost[i].title}`}>
					{#if thumbnailErrors.has(photoPost[i].id)}
						<span class="thumbnail-error" role="img" aria-label={`${photoPost[i].title}のサムネイルを読み込めません`}>
							サムネイルを読み込めません
						</span>
					{:else}
						<span class="thumbnail">
							<img
								bind:this={thumbnailImages[photoPost[i].id]}
								src={photoThumbnailUrl(photoPost[i].id)}
								alt={photoPost[i].title}
								on:error={() => handleThumbnailError(photoPost[i].id)}
							/>
							{#if cursorTiles[photoPost[i].id] !== undefined}
								<HalftonePhoto
									src={photoThumbnailUrl(photoPost[i].id)}
									photo={thumbnailImages[photoPost[i].id] ?? undefined}
									mode="cursor"
									pointer={cursorTiles[photoPost[i].id]}
									ripples={tileRipples(ripples, tileOrigins[photoPost[i].id])}
								/>
							{/if}
						</span>
					{/if}
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
		// カーソル用のドットエフェクトの基準（HalftonePhoto の canvas はこの中で絶対配置する）
		.thumbnail {
			position: relative;
			display: block;
			img {
				display: block;
			}
		}
		.thumbnail-error {
			display: block;
			min-height: 80px;
			padding: 2rem 0.5rem;
			background: #f1f1f1;
			color: #555;
			font-size: 0.8rem;
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
