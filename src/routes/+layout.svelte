<script lang="ts">
	import '../app.css';

	import { page } from '$app/state';

	let { children } = $props();
</script>

<div class="flex h-svh flex-col">
	<div class="navbar mt-4 mb-2 flex flex-row justify-center px-4">
		<a href="/" class="text-m link link-info link-hover">board</a>
	</div>

	<main class="mb-4 flex-1 overflow-hidden">
		{@render children()}
	</main>
</div>
