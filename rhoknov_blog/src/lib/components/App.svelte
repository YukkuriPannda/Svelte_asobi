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
	<div class="Awards">
		<div class="YCC">
			<img src="/Trophy.svg"/>
			<p>Unity YCC Bronze Award</p>
		</div>
		<div class="KLOUD">
			<img src="/Trophy.svg"/>
			<p>KLOUD Hackathon#3 Excellence Award</p>
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
	.YCC,.KLOUD{
		display: flex;
		height: 20px;
		justify-content: center;
		margin: 30px;
	}
	.YCC *,.KLOUD *{
		margin: 0 20px;
	}
	.YCC img,.KLOUD img{
		filter: invert(55%) sepia(86%) saturate(310%) hue-rotate(358deg) brightness(93%) contrast(88%);
	}
	.KLOUD img{
		filter: invert(84%) sepia(0%) saturate(3046%) hue-rotate(49deg) brightness(97%) contrast(85%);
	}
</style>
