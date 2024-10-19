<script lang="ts">
	import { Canvas } from '@threlte/core';
	import { clickToCopy } from './clickToCopy';
	const copy_email = () => {
		navigator.clipboard.writeText('Rhoknov@gmail.com');
		alert('copied Rhoknov@gmail.com!!');
	};
</script>

<div class="Body">
	<div class="RhoknovLogo">
		<img class = "logo" src ="/RhoknovLogo.svg"/>
		<p>I am Leader of the Oyamakosen Procon</p>
		<div class="icons">
			<div class="instagram">
				<a href="https://www.instagram.com/funahaya1991/">
					<img src="/Instagram_Glyph_Gradient.svg" />
				</a>
			</div>
			<div class="twitter">
				<a href="https://twitter.com/Rhoknov">
					<img src="/logo.svg" />
				</a>
			</div>
			<div class="github">
				<a href="https://github.com/YukkuriPannda">
					<img src="/github.svg" />
				</a>
			</div>
			<div class="email">
				<button on:click={copy_email}>
					<img src="/email.svg" />
				</button>
			</div>
			
		</div>
	</div>
</div>

<style>
	div.Body {
		height: 100%;
		width: auto;
		position: relative;
		z-index: 0;
	}
	.RhoknovLogo {
		position: absolute;
		top: 0;
		bottom: 0;
		left: 0;
		right: 0;
		vertical-align: middle;
		align-items: center;
		margin: auto;
		width: 100%;
		height:fit-content;
	}
	.RhoknovLogo .logo{
		position: relative;
		display:block;
		align-items: center;
		margin: 50px auto;
		width:150px;
		height:150px;
	}
	.RhoknovLogo p{
		position: relative;
		white-space: nowrap;
		text-align: center;
		width: 100%;
		margin: auto;
		font-family: Arial, Helvetica, sans-serif;

	}
	div.Body:before {
		content: '';
		background-image: url('/IMG_2280_Original.jpeg');
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		filter: blur(3px);
		z-index: -1;
		background-size: cover;
	}
	.icons {
		display: flex;
		margin:30px auto;
		height: 50px;
		padding: 10px;
		width: fit-content;
	}
	.icons div {
		height: 30px;
		width: 30px;
		margin: 0px 30px;
	}
	.icons div img {
		height: 30px;
	}
</style>
