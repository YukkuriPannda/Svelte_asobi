<script lang="ts">
	import { photoPost, type PhotoPost } from '$lib/PostData';
	import { onMount, onDestroy, beforeUpdate } from 'svelte';
	import HalftonePhoto from './HalftonePhoto.svelte';
	import { photoThumbnailUrl } from '$lib/photo-thumbnails';

	let wheelY = 0;
	export let id; // Replace with the actual ID you want to use
	let post: PhotoPost | undefined;
	beforeUpdate(() => {
		if (id) {
			post = photoPost.find((post) => post.id == id);
			if (post) {
				console.log('Post found');
				const date = new Date(post.date as string).toDateString();
			} else {
				console.log(`Post not found id:${id}`);
			}
		}
	});

	let currentState = 0;
	const state1_wheelY = 300;
	const state2_wheelY = 600;
	const state3_wheelY = 900;

	// .modalcontent の実スクロール率でエフェクトを進める
	let modalContent: HTMLDivElement | undefined;
	let photoImage: HTMLDivElement | undefined;
	let scrollTop = 0;
	let maxScroll = 0;
	$: effectProgress = maxScroll > 0 ? Math.min(Math.max(scrollTop / maxScroll, 0), 1) : 0;

	function handleScroll() {
		if (!modalContent) return;
		scrollTop = modalContent.scrollTop;
		maxScroll = modalContent.scrollHeight - modalContent.clientHeight;
	}

	let touchStartY: number | null = null;
	let lastTouchY: number | null = null;

	function updateState() {
		if (wheelY > state3_wheelY) {
			currentState = 3;
		} else if (wheelY > state2_wheelY) {
			currentState = 2;
		} else if (wheelY > state1_wheelY) {
			currentState = 1;
		} else {
			currentState = 0;
		}
		console.log('currentState:', currentState);
	}

	function handleWheel(event: WheelEvent) {
		if (wheelY + event.deltaY > 0 && (wheelY < state2_wheelY + 500 || event.deltaY < 0)) {
			wheelY += event.deltaY;
		}
		updateState();
	}

	function handleTouchStart(event: TouchEvent) {
		if (event.touches && event.touches.length > 0) {
			touchStartY = event.touches[0].clientY;
			lastTouchY = touchStartY;
		}
	}

	function handleTouchMove(event: TouchEvent) {
		if (lastTouchY === null || !event.touches || event.touches.length === 0) return;
		const currentY = event.touches[0].clientY;
		const delta = lastTouchY - currentY; // positive when swiping up
		if (wheelY + delta > 0 && (wheelY < state2_wheelY + 500 || delta < 0)) {
			wheelY += delta;
		}
		lastTouchY = currentY;
		updateState();
	}

	function handleTouchEnd() {
		touchStartY = null;
		lastTouchY = null;
	}

	post?.equipments?.forEach((equipment) => {
		console.log('Equipment:', equipment);
	});
</script>

{#if post}
	<div class="modalwindow">
		<p>mobile</p>
		<div
			class="modalcontent"
			bind:this={modalContent}
			on:scroll={handleScroll}
			on:touchstart={handleTouchStart}
			on:touchmove={handleTouchMove}
			on:touchend={handleTouchEnd}
		>
			<div class="photo state">
				<!-- 一覧用サムネイルを背景に敷き、元データが読み込まれたら上に重ねて表示する -->
				<div
					class="photoImage"
					bind:this={photoImage}
					style:background-image="url('{photoThumbnailUrl(post.id)}')"
				>
					<img src={post.img_path} alt="Photo" />
				</div>
				<!-- ドット化は細部が残らないため、軽い一覧用サムネイルから描く -->
				<HalftonePhoto src={photoThumbnailUrl(post.id)} progress={effectProgress} photo={photoImage} />
			</div>

			<div class="detail state">
				<div class="title state">
					<h1>"{post.title}"</h1>
				</div>
				<div class="explanation state">
					<code>{post.date}</code>
					<div class="explanationText">{@html post.explanation}</div>
					<div class="equipments state">
						{#if post.equipments}
							{#each post.equipments as equipment}
								<div class="equipment">
									<img src="/cameras/{equipment.replace(' ', '')}.png" alt="Equipment" />
									<p>{equipment}</p>
								</div>
							{/each}
						{/if}
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}

<style lang="scss">
	.modalwindow {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		background-color: transparent;
		padding: 0px;
		z-index: 1000;
		height: auto;
		width: 90vw;
		.modalcontent {
			flex-direction: column;
			height: auto;
			max-height: 100vh;
			overflow-y: auto;
			align-items: stretch;
			color: white;
			.detail {
				position: relative;
				z-index: 1;
				width: 100%;
				/* 写真（sticky・100vh）の上に重ねる。冒頭は文章が画面の下に隠れている */
				margin: -100vh 0px 0px;
				padding: 100vh 0px 50px;
				/* 本文が短くても、最後までスクロールするとタイトルが上端から20pxの位置まで来る高さにする。
				   上余白 100vh + 本文 (100vh - 20px) + 下余白 50px */
				box-sizing: border-box;
				min-height: calc(200vh + 30px);
				text-shadow:
					0 0 6px rgba(0, 0, 0, 0.9),
					0 0 2px #000;
				.title {
					font-family: serif;
					width: 100%;
					margin: 50px 0px;
					h1 {
						width: 100%;
						font-size: 20pt;
						margin: 0px auto;
						text-align: justify;
						text-align-last: justify;
					}
				}
				.explanation {
					display: block;
					width: 100%;
					line-height: 30pt;
					font-size: 10pt;
					.explanationText {
						margin: 0px;
					}
					.equipments {
						display: flex;

						transition:
							height 0.5s ease-in-out,
							width 0.5s ease-in-out;
						.equipment {
							height: auto; /* Ensure images maintain their aspect ratio */
							text-align: center;
							img {
								height: 256px;
								filter: invert(88%) sepia(61%) saturate(0%) hue-rotate(229deg) brightness(107%)
									contrast(101%);
							}
						}
						&.state3 {
							height: 100%;
							width: auto;
							color: white;
						}
					}
				}
			}
			.photo {
				width: 100%;
				height: 100vh;
				position: sticky;
				top: 0;
				z-index: 0;
				transition:
					height 0.5s ease-in-out,
					width 0.5s ease-in-out;
				&.state1,
				&.state2,
				&.state3 {
					width: 100%;
				}
				.photoImage {
					height: 100%;
					width: 100%;
					/* 元データの object-fit: contain と同じ位置にサムネイルを表示する */
					background-position: center;
					background-repeat: no-repeat;
					background-size: contain;
				}
				img {
					display: block;
					height: 100%;
					width: 100%; /* Ensure image fills its container */
					object-fit: contain; /* Maintain aspect ratio */
				}
			}
		}
		div::backdrop {
			position: absolute;
			top: 0;
			left: 0;
			width: 100%;
			height: 100vh;
			background-color: rgba(0, 0, 0, 0.9);
			z-index: 999;
		}
	}
</style>
