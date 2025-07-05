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

	function handleWheel(event: WheelEvent) {
		if (wheelY + event.deltaY > 0 && (wheelY < state2_wheelY + 500 || event.deltaY < 0)) {
			wheelY += event.deltaY;
		}

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

	post?.equipments?.forEach((equipment) => {
		console.log('Equipment:', equipment);
	});
</script>

{#if post}
	<div class="modalwindow">
		<div class="modalcontent" on:wheel={handleWheel}>
			<div class="photo state{currentState}">
				<img src={post.img_path} alt="Photo" />
			</div>

			<div class="detail state{currentState}">
				<div class="title state{currentState}">
					<h1>"{post.title}"</h1>
				</div>
				<div class="explanation state{currentState}">
					<code>{post.date}</code>
					<div class="explanationText">{@html post.explanation}</div>
					<div class="equipments state{currentState}">
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
	:global(body.modal-open) {
		overflow: hidden;
	}

	.modalwindow {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		background-color: transparent;
		padding: 0px;
		z-index: 1000;
		height: 100vh;

		.modalcontent {
			height: 100vh;
			display: flex;
			align-items: center;

			.detail {
				width: 0vw; /* Initial width */
				padding: 0px;
				margin: 0px 50px;
				color: transparent;
				height: 100%; /* Ensure height is always 100% */
				position: relative;
				transition:
					width 0.5s ease-in-out,
					padding 0.5s ease-in-out,
					margin 0.5s ease-in-out,
					color 0.5s ease-in-out;

				&.state1,
				&.state2,
				&.state3 {
					width: 30vw;
				}

				&.state2,
				&.state3 {
					color: white;
					padding: 10px;
				}
				.title {
					position: absolute;
					bottom: 50%;
					transform: translateY(50%);
					font-family: serif;
					width: 100%;
					color: transparent;
					transition:
						color 0.5s ease-in-out,
						transform 0.5s ease-in-out;
					h1 {
						width: 100%;
						font-size: 20pt;
						margin: 0px auto;
						text-align: justify;
						text-align-last: justify;
					}

					&.state1,
					&.state2,
					&.state3 {
						color: white;
					}
					&.state2,
					&.state3 {
						transform: translateY(-200%);
					}
					&.state3 {
						transform: translateY(-800%);
					}
				}
				.explanation {
					display: block;
					width: 100%;
					height: 0px;
					line-height: 30pt;
					font-size: 10pt;
					position: absolute;
					top: 50%;

					color: transparent;
					transition:
						height 0.5s ease-in-out,
						color 0.5s ease-in-out,
						transform 0.5s ease-in-out;
					.explanationText {
						margin: 0px;
					}
					&.state2,
					&.state3 {
						height: 80%;
						color: white;
					}
					&.state3 {
						transform: translateY(-25%);
					}
					.equipments {
						display: flex;
						height: 0px;
						overflow-x: auto; /* Allow horizontal scrolling */
						/* Hide scrollbar for Chrome, Safari and Opera */
						&::-webkit-scrollbar {
							display: none;
						}
						/* Hide scrollbar for IE, Edge and Firefox */
						-ms-overflow-style: none; /* IE and Edge */
						scrollbar-width: none; /* Firefox */
						color: transparent;
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
				height: 100%;
				transition: width 0.5s ease-in-out;
				&.state1,
				&.state2,
				&.state3 {
					width: 60%;
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
