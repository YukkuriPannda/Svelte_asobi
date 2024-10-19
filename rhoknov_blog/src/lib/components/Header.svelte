<script>
</script>

<div class="Header">
	<div class="Buttons">
		<div class="HomeButton Button">
			<a href="/">
				<img src="RhoknovLogo.svg"/>
			</a>

		</div>
		<div class="BasicButtons">
			<div class="BlogButton Button">
				<a href="/blog"> blog </a>
			</div>
			<div class="WorksButton Button">
				<a href="/works"> works </a>
			</div>
	
			<div class="PhotoButton Button">
				<a href="/photo"> photo </a>
			</div>

		</div>
	</div>
</div>

<style>
	.Buttons{
		display: flex;
		align-items:center;
		vertical-align: middle;
	}
	.HomeButton{
		margin: 30px 20px;
		width: 30px;
		height: 30px;
	}
	.Header{
		background-color: #1b1b1b;
		z-index: 100;
	}
	.Header .BasicButtons {

		display: flex;
		align-items: center;
		justify-content:center;
	}
	.Button{
		height:30px;
		margin: 20px 15px;
		text-align: center;
		padding: 0px;
	}
	.Button a{
		display: flex; 
		justify-content: center;
		align-items: center;
		height: 100%;	
	}
</style>
