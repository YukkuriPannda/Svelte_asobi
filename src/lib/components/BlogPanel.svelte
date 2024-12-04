<script lang="ts">
	export var title: string;
	export var id: string;
	export var tags: string[];
	export var date: Date;
	export var likes: number;
	export var sumnail_path: string;
</script>

<div class="main">
	<img src={sumnail_path} />
	<div>
		<h1><a href="/blog/{id}">{title}</a></h1>
		<h2>
			{date.getFullYear().toString()}年
			{date.getMonth().toString()}月
			{date.getDate()}日
		</h2>
	</div>
</div>

<style>
	.main {
		background-color: #1b1b1b;
		padding: 20px;
		border-radius: 20px;
		display: flex;
		font-family: 'Courier New', Courier, monospace;
		align-items: flex-start;
		margin: 30px 0px;
	}
	.main > img {
		width: 100px;
		margin-right: 20px;
		margin-top: 0px;
		margin-bottom: auto;
	}
	.main > div > h1 {
		font-size: 20pt;
		margin-bottom: 20px;
		font-weight: bold;
	}
</style>
