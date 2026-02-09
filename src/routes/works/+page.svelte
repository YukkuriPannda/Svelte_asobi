<script lang="ts">
	import App from '$lib/components/App.svelte';
	import Header from '$lib/components/Header.svelte';
	import Procon from '$lib/components/WorkPanels/Procont.svelte';
</script>

<div>
	<Header />
	<div class="Panels">
		<Procon />
	</div>
</div>

<style lang="scss">
	:global(body) {
		margin: 0;
	}

	div {
		width: 100vw;
		height: 100vh;
		background: #1b1b1b;
		color: white;
		.Panels{
			width: 60%;
			margin: 0 auto;
		}
	}
</style>
