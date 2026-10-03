<script lang="ts">
	import { photoPost, type PhotoPost } from '$lib/PostData';
	import { onMount, onDestroy, beforeUpdate } from 'svelte';

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
			on:touchstart={handleTouchStart}
			on:touchmove={handleTouchMove}
			on:touchend={handleTouchEnd}
		>
			<div class="photo state">
				<img src={post.img_path} alt="Photo" />
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
				width: 100%;
				padding: 0px;
				margin: 50px 0px;
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
				transition:
					height 0.5s ease-in-out,
					width 0.5s ease-in-out;
				&.state1,
				&.state2,
				&.state3 {
					width: 100%;
				}
				img {
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
