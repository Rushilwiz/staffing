<script lang="ts">
    import '../app.css';

    import { page } from '$app/state';

    let { children } = $props();
</script>

<div class="h-svh flex flex-col">
    <div class="navbar flex flex-row justify-center mt-4 mb-2 px-4">
        <a href="/" class="link link-info link-hover text-m">board</a>
    </div>

    <main class="flex-1 mb-4 overflow-hidden">
        {@render children()}
    </main>
</div>