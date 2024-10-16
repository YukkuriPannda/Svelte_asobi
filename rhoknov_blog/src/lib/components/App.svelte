<script lang="ts">
	import { Canvas } from '@threlte/core';
	import RhoknovLogo from './RhoknovLogo.svelte';
	import {clickToCopy} from "./clickToCopy"
	const copy_email=() =>{
		navigator.clipboard.writeText("Rhoknov@gmail.com")
		alert("copied Rhoknov@gmail.com!!")
	}
</script>

<div class="Body">
	<div class="RhoknovLogo">
		<RhoknovLogo />
		<div class="icons">
			<div class="instagram">
				<a href="https://www.instagram.com/funahaya1991/" />
				<img src="/Instagram_Glyph_Gradient.svg" />
			</div>
			<div class="twitter">
				<a href="https://twitter.com/Rhoknov" />
				<img src="/logo.svg" />
			</div>
			<div class="github">
				<a href="https://github.com/YukkuriPannda" />
				<img src="/github.svg" />
			</div>
			<div class="email">
				<button on:click={copy_email}/>
				<img src="/email.svg" />
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
		margin: auto;
		height: 150px;
		width: 150px;
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
		justify-content: center;
		margin: auto;
		height: 50px;
		padding: 10px;
	}
	.icons div {
		height: 30px;
		margin: 30px;
		position: relative;
	}
	.icons div img {
		height: 30px;
	}
	.icons div a {
		position: absolute;
		top: 0;
		left: 0;
		height: 100%;
		width: 100%;
	}
	.icons div button{
		position: absolute;
		top: 0;
		left: 0;
		height: 100%;
		width: 100%;
	}
</style>
