<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	export let data: { photoid: string };
	onMount(() => {
		goto('/photo/?photo_id=' + data.photoid);
	});
</script>
