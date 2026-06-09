<script lang="ts">
	import { enhance } from '$app/forms';
	import { slide } from 'svelte/transition';
	import MaterialSymbolsChevronRight from '~icons/material-symbols/chevron-right';
	import MaterialSymbolsChevronLeft from '~icons/material-symbols/chevron-left';

	import { AvailabilityStatus, FirefighterRank, ShiftType } from '$lib/generated/prisma/enums';
	import { formatFirefighterName, rankStyleAttr } from '$lib/firefighter-display';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let selectedIndex = $state(0);
	let name = $state('');
	let status: AvailabilityStatus = $state(AvailabilityStatus.PENDING);

	const shiftTypeLabel: Record<ShiftType, string> = {
		[ShiftType.HR12]: '12HR',
		[ShiftType.HR24]: '24HR',
		[ShiftType.HR48]: '48HR'
	};

	const shiftSpanDays: Record<ShiftType, number> = {
		[ShiftType.HR12]: 1,
		[ShiftType.HR24]: 2,
		[ShiftType.HR48]: 3
	};

	const selectedShift = $derived(data.shifts[selectedIndex]);
	const selectedFirefighter = $derived(data.firefighters.find((ff) => ff.name === name));

	const dateToShiftIndex = $derived.by(() => {
		const map = new Map<string, number>();
		data.shifts.forEach((shift, idx) => {
			const base = parseUtcDate(shift.date);
			for (let i = 0; i < shiftSpanDays[shift.type]; i++) {
				const d = new Date(base);
				d.setUTCDate(base.getUTCDate() + i);
				map.set(toYmd(d), idx);
			}
		});
		return map;
	});

	const minDate = $derived(data.shifts.length > 0 ? data.shifts[0].date : '');
	const maxDate = $derived(
		data.shifts.length > 0 ? data.shifts[data.shifts.length - 1].date : ''
	);

	function toYmd(date: Date): string {
		return date.toISOString().slice(0, 10);
	}

	function parseUtcDate(ymd: string): Date {
		return new Date(`${ymd}T00:00:00Z`);
	}

	function formatShiftLabel(shift: { date: string; type: ShiftType } | undefined): string {
		if (!shift) return '';
		const d = parseUtcDate(shift.date);
		const weekday = d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
		const month = d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
		const day = d.getUTCDate();
		return `${weekday} ${month} ${day} · ${shiftTypeLabel[shift.type]}`;
	}

	function stepPrev(): void {
		if (selectedIndex > 0) selectedIndex -= 1;
	}

	function stepNext(): void {
		if (selectedIndex < data.shifts.length - 1) selectedIndex += 1;
	}

	function selectFirefighter(ffName: string): void {
		name = ffName;
		(document.getElementById('name-popover') as HTMLElement | null)?.hidePopover();
	}

	function attachCalendar(allowed: Map<string, number>) {
		return (element: Element) => {
			const el = element as Element & {
				isDateDisallowed?: (d: Date) => boolean;
				value?: string;
			};

			let canceled = false;
			let onChange: ((e: Event) => void) | null = null;

			customElements.whenDefined('calendar-date').then(() => {
				if (canceled) return;
				el.isDateDisallowed = (date: Date) => !allowed.has(toYmd(date));

				onChange = () => {
					const value = el.value;
					if (!value) return;
					const idx = allowed.get(value);
					if (idx !== undefined) selectedIndex = idx;
				};
				element.addEventListener('change', onChange);
			});

			return () => {
				canceled = true;
				if (onChange) element.removeEventListener('change', onChange);
			};
		};
	}

	const coverMailtoHref = $derived.by(() => {
		if (!selectedShift) return '#';
		const d = parseUtcDate(selectedShift.date);
		const weekday = d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
		const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
		const dd = String(d.getUTCDate()).padStart(2, '0');
		const subject = `B Crew Cover | ${weekday} ${mm}/${dd}`;
		const body = `Looking for cover. Will cover back. - ${name}`;
		return `mailto:covers@stvfd.org?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
	});
</script>

<svelte:head>
	<script type="module" src="https://unpkg.com/cally"></script>
</svelte:head>

<div class="flex h-full items-center justify-center">
	<div class="flex max-w-2xl min-w-1/2 flex-col p-4">
		{#if data.shifts.length === 0}
			<div class="rounded-lg bg-base-200 p-6 text-center">
				<h2 class="text-m">no upcoming shifts</h2>
				<p class="mt-2 text-sm opacity-70">check back later once shifts are scheduled.</p>
			</div>
		{:else if selectedShift}
			<form method="POST" use:enhance class="space-y-6">
				<h2 class="text-m block text-center">shift availability</h2>
				<input type="hidden" name="shiftId" value={selectedShift.id} />
				<div class="m-4">
					<div class="flex w-full gap-2">
						<button
							type="button"
							class="btn"
							onclick={stepPrev}
							disabled={selectedIndex === 0}
							aria-label="previous shift"
						>
							<MaterialSymbolsChevronLeft />
						</button>

						<button
							type="button"
							popovertarget="cally-popover"
							class="input input-border flex-1 text-center"
							id="cally-trigger"
							style="anchor-name: --cally"
						>
							{formatShiftLabel(selectedShift)}
						</button>

						<div
							popover
							id="cally-popover"
							class="dropdown bg-base-100 rounded-box shadow-lg"
							style="position-anchor: --cally"
						>
							<calendar-date
								class="cally"
								value={selectedShift.date}
								min={minDate}
								max={maxDate}
								{@attach attachCalendar(dateToShiftIndex)}
							>
								<span slot="previous" aria-label="previous">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="1.5"
										class="size-4"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M15.75 19.5 8.25 12l7.5-7.5"
										></path>
									</svg>
								</span>
								<span slot="next" aria-label="next">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="1.5"
										class="size-4"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="m8.25 4.5 7.5 7.5-7.5 7.5"
										></path>
									</svg>
								</span>
								<calendar-month></calendar-month>
							</calendar-date>
						</div>

						<button
							type="button"
							class="btn"
							onclick={stepNext}
							disabled={selectedIndex >= data.shifts.length - 1}
							aria-label="next shift"
						>
							<MaterialSymbolsChevronRight />
						</button>
					</div>
				</div>
				<div class="m-4">
					<input type="hidden" name="name" value={name} required />
					<button
						type="button"
						popovertarget="name-popover"
						class="input input-bordered w-full text-center"
						style={`anchor-name: --name-select;${
							selectedFirefighter ? ' ' + rankStyleAttr(selectedFirefighter.rank) : ''
						}`}
					>
						{name ? formatFirefighterName(name) : 'select your name'}
					</button>
					<ul
						popover
						id="name-popover"
						class="dropdown menu bg-base-100 rounded-box max-h-80 overflow-y-auto p-2 shadow-lg"
						style="position-anchor: --name-select; width: anchor-size(width);"
					>
						{#each data.firefighters as ff (ff.id)}
							<li>
								<button
									type="button"
									class="justify-center"
									style={rankStyleAttr(ff.rank)}
									onclick={() => selectFirefighter(ff.name)}
								>
									{formatFirefighterName(ff.name)}
								</button>
							</li>
						{/each}
					</ul>
				</div>
				{#if name}
					<div class="m-4" transition:slide|global>
						<div class="join flex w-full gap-4">
							<input
								type="radio"
								class="btn join-item {status === AvailabilityStatus.IN
									? 'btn-success'
									: ''} flex-1 text-center"
								name="status"
								id="status-in"
								value={AvailabilityStatus.IN}
								bind:group={status}
								aria-label="in"
							/>
							<input
								type="radio"
								class="btn join-item {status === AvailabilityStatus.OUT
									? 'btn-error'
									: ''} flex-1 text-center"
								name="status"
								id="status-out"
								value={AvailabilityStatus.OUT}
								bind:group={status}
								aria-label="out"
							/>
						</div>
					</div>
					{#if status === AvailabilityStatus.OUT}
						<div class="m-4 space-y-4 rounded-lg bg-base-200 p-4" transition:slide|global>
							<div class="flex items-center justify-between">
								<h2 class="">cover?</h2>
								<a href={coverMailtoHref}>
									<button type="button" class="btn px-4 btn-soft btn-primary"
										>generate email</button
									>
								</a>
							</div>
							<div>
								<input
									type="text"
									name="coverName"
									class="input-bordered input w-full"
									placeholder="enter firefighter's name"
								/>
							</div>
							<div>
								<select name="coverRank" class="select-bordered select w-full">
									<option disabled selected value="">select rank</option>
									{#each Object.values(FirefighterRank) as rank (rank)}
										<option value={rank}>{rank}</option>
									{/each}
								</select>
							</div>
							<div class="flex flex-wrap items-center justify-center">
								{#each ['EMT', 'C89', 'B85', 'DPO', 'DAO'] as qual (qual)}
									<input
										type="checkbox"
										class="btn m-2"
										name="coverQualifications"
										value={qual}
										aria-label={qual}
									/>
								{/each}
							</div>
						</div>
					{/if}
					<div class="m-4" transition:slide|global>
						<textarea
							name="trainingSuggestion"
							class="textarea-bordered textarea h-24 w-full"
							placeholder="any training requests? (optional)"
						></textarea>
					</div>
				{/if}
				{#if name && status !== AvailabilityStatus.PENDING}
					<div class="m-4" transition:slide|global>
						<button type="submit" class="btn w-full btn-accent"> submit </button>
					</div>
				{/if}
			</form>
		{/if}
	</div>
</div>
