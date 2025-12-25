<script lang="ts">
  import { enhance } from '$app/forms';
    import { slide } from 'svelte/transition';
    import MaterialSymbolsChevronRight from '~icons/material-symbols/chevron-right'
    import MaterialSymbolsChevronLeft from '~icons/material-symbols/chevron-left'
  import type { ActionData } from './$types';

  let selectedShift = new Date();
  let name = '';
  let status: 'in' | 'out' | '' = '';

  // Mock data - we'll replace with real data from server
  const firefighters = [
    { name: 'John Smith', rank: 'Captain' },
    { name: 'Jane Doe', rank: 'Lieutenant' },
    { name: 'Mike Johnson', rank: 'Engineer' },
    { name: 'Sarah Williams', rank: 'Firefighter' },
  ];

  const ranks = ['Captain', 'Lieutenant', 'Engineer', 'Firefighter'];

  function adjustShift(days: number) {
    selectedShift = new Date(selectedShift.getTime() + days * 24 * 60 * 60 * 1000);
  }

  function formatShiftDate(date: Date) {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
</script>

<div class="h-full flex justify-center items-center">
    <div class="flex flex-col max-w-2xl min-w-1/2 p-4">
        <form method="POST" use:enhance class="space-y-6">
            <h2 class="block text-center text-m">shift availability</h2>
            <div class="m-4">
                <div class="flex w-full">
                    <button 
                        type="button"
                        class="btn"
                        on:click={() => adjustShift(-7)}
                    >
                        <MaterialSymbolsChevronLeft />
                    </button>
                    
                    <select name="shift" id="shift" class="select">
                        <option selected value={selectedShift.toISOString()}>
                            {formatShiftDate(selectedShift)}
                        </option>
                    </select>
                    <button 
                        type="button"
                        class="btn"
                        on:click={() => adjustShift(7)}
                    >
                        <MaterialSymbolsChevronRight />
                    </button>
                </div>
            </div>
            <div class="m-4">
                <select 
                    name="name"
                    class="select select-bordered w-full"
                    bind:value={name}
                    required
                >
                    <option disabled selected value="">select your name</option>
                    {#each firefighters as ff}
                        <option value={ff.name}>{ff.name} ({ff.rank})</option>
                    {/each}
                </select>
            </div>
            {#if name}
            <div class="m-4" transition:slide|global>
                <div class="flex gap-4 w-full join" >
                    <input type="radio" class="join-item btn {status === 'in' ? 'btn-success' : ''} flex-1 text-center" name="status" id="status-in" value="in" bind:group={status} aria-label="in" />
                    <input type="radio" class="join-item btn {status === 'out' ? 'btn-error' : ''} flex-1 text-center" name="status" id="status-out" value="out" bind:group={status} aria-label="out" />
                </div>
            </div>
            {#if status === 'out'}
            <div class="m-4 space-y-4 p-4 bg-base-200 rounded-lg" transition:slide|global>
                <div class="flex justify-between items-center">
                    <h2>cover?</h2>
                    <a href="mailto:covers@stvfd.org?subject=B Crew Cover | {selectedShift.toLocaleDateString('en-US', { weekday: 'short' })} {String(selectedShift.getMonth() + 1).padStart(2, '0')}/{String(selectedShift.getDate()).padStart(2, '0')}&body=Looking for cover. Will cover back. - {encodeURIComponent(name)}">
                        <button type="button" class="btn btn-soft btn-primary px-4">generate email</button>
                    </a>

                </div><div>
                    <input 
                        type="text"
                        name="coverName"
                        class="input input-bordered w-full"
                        placeholder="enter firefighter's name"
                        
                    />
                </div>
                <div>
                    <select 
                        name="coverRank"
                        class="select select-bordered w-full"
                        
                    >
                        <option disabled selected value="">select rank</option>
                        {#each ranks as rank}
                            <option value={rank}>{rank}</option>
                        {/each}
                    </select>
                </div>
            </div>
            {/if}
            <div class="m-4" transition:slide|global>
                <textarea 
                    name="trainingSuggestion"
                    class="textarea textarea-bordered h-24 w-full"
                    placeholder="any training requests? (optional)"
                ></textarea>
            </div>
            {/if}
            {#if name && status}
            <div class="m-4" transition:slide|global>
                <button type="submit" class="btn btn-accent w-full">
                    submit
                </button>
            </div>
            {/if}
        </form>
    </div>
</div>