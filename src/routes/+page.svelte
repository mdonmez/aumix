<script lang="ts">
	import { tick } from 'svelte';
	import {
		Sun,
		Moon,
		Volume1,
		Volume2,
		VolumeOff,
		Play,
		Pause,
		SkipBack,
		CircleQuestionMark,
		Trash2,
		GripVertical
	} from '@lucide/svelte';

	import { toggleMode } from 'mode-watcher';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as ButtonGroup from '$lib/components/ui/button-group/index.js';

	import { Slider } from '$lib/components/ui/slider/index.js';
	import { audioStore } from '$lib/audio.svelte.js';
	import { keyboardFeedbackStore } from '$lib/keyboard-feedback.svelte.js';
	import TrackCard from '$lib/components/TrackCard.svelte';
	import DropZone from '$lib/components/DropZone.svelte';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { buttonVariants } from '$lib/components/ui/button/index.js';

	let dragSourceTrackId = $state<string | null>(null);
	let dragTargetTrackId = $state<string | null>(null);

	function resetDragState(): void {
		dragSourceTrackId = null;
		dragTargetTrackId = null;
	}

	function swapTracks(sourceTrackId: string, targetTrackId: string): void {
		const sourceIndex = audioStore.tracks.findIndex((track) => track.id === sourceTrackId);
		const targetIndex = audioStore.tracks.findIndex((track) => track.id === targetTrackId);

		if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) return;

		const sourceTrack = audioStore.tracks[sourceIndex];
		audioStore.tracks[sourceIndex] = audioStore.tracks[targetIndex];
		audioStore.tracks[targetIndex] = sourceTrack;
	}

	function handleDragStart(event: DragEvent, trackId: string): void {
		dragSourceTrackId = trackId;
		dragTargetTrackId = null;

		const handle = event.currentTarget as HTMLElement | null;
		const cardShell = handle?.closest('.track-dnd-item') as HTMLElement | null;
		const card = cardShell?.querySelector("[data-slot='card']") as HTMLElement | null;

		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'move';
			event.dataTransfer.setData('text/plain', trackId);

			if (card && handle) {
				const cardRect = card.getBoundingClientRect();
				const handleRect = handle.getBoundingClientRect();
				const offsetX = Math.min(
					Math.max(handleRect.left - cardRect.left + handleRect.width / 2, 0),
					cardRect.width
				);
				const offsetY = Math.min(
					Math.max(handleRect.top - cardRect.top + handleRect.height / 2, 0),
					cardRect.height
				);

				event.dataTransfer.setDragImage(card, offsetX, offsetY);
			}
		}
	}

	function handleDragOver(event: DragEvent, targetTrackId: string): void {
		if (!dragSourceTrackId || dragSourceTrackId === targetTrackId) return;
		event.preventDefault();
		if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
		dragTargetTrackId = targetTrackId;
	}

	function handleDragLeave(event: DragEvent, targetTrackId: string): void {
		const currentTarget = event.currentTarget as HTMLElement;
		if (event.relatedTarget instanceof Node && currentTarget.contains(event.relatedTarget)) return;
		if (dragTargetTrackId === targetTrackId) dragTargetTrackId = null;
	}

	async function handleDrop(event: DragEvent, targetTrackId: string): Promise<void> {
		event.preventDefault();
		const sourceTrackId = dragSourceTrackId ?? event.dataTransfer?.getData('text/plain');

		if (sourceTrackId && sourceTrackId !== targetTrackId) {
			dragTargetTrackId = null;
			await tick();
			swapTracks(sourceTrackId, targetTrackId);
		}

		resetDragState();
	}
</script>

<div class="flex min-h-screen flex-col">
	<header
		class="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-6 py-4"
	>
		<div class="flex items-center gap-3">
			<h3 class="scroll-m-20 text-2xl font-semibold tracking-tight">Aumix</h3>

			<div class="h-5 w-px shrink-0 bg-border"></div>

			<ButtonGroup.Root>
				<Button
					size="icon"
					class={audioStore.masterPlaying
						? 'w-10 rounded-full transition-none!'
						: 'w-10 transition-none!'}
					disabled={audioStore.tracks.length === 0}
					onclick={() => (audioStore.masterPlaying ? audioStore.pauseAll() : audioStore.playAll())}
				>
					{#if audioStore.masterPlaying}
						<Pause />
					{:else}
						<Play />
					{/if}
				</Button>

				<Button
					variant="secondary"
					class="pointer-events-none cursor-default rounded-full font-mono uppercase"
					aria-disabled="true"
					tabindex={-1}
				>
					{audioStore.playingTracksCount} PLAYING
				</Button>

				<Button
					variant="secondary"
					disabled={audioStore.tracks.length === 0}
					onclick={() => audioStore.rollAll()}
				>
					<SkipBack class="h-4 w-4" /> Roll All
				</Button>

				<Button
					variant="destructive"
					class="rounded-full"
					disabled={audioStore.tracks.length === 0}
					onclick={() => audioStore.clearAll()}
				>
					<Trash2 class="h-4 w-4" /> Clear All
				</Button>
			</ButtonGroup.Root>

			<Button
				variant="ghost"
				size="icon"
				class="shrink-0"
				onclick={() => audioStore.toggleMasterMute()}
			>
				{#if audioStore.masterMuted || audioStore.masterVolume === 0}
					<VolumeOff />
				{:else if audioStore.masterVolume <= 50}
					<Volume1 />
				{:else}
					<Volume2 />
				{/if}
			</Button>
			<Slider
				type="single"
				max={100}
				step={1}
				class="w-32"
				value={audioStore.masterVolume}
				onValueChange={(val: number) => audioStore.setMasterVolume(val)}
			/>
		</div>

		<div class="flex items-center gap-2">
			<Popover.Root>
				<Popover.Trigger class={buttonVariants({ variant: 'default', size: 'icon' })}>
					<CircleQuestionMark class="h-[1.2rem] w-[1.2rem]" />
					<span class="sr-only">Toggle help</span>
				</Popover.Trigger>
				<Popover.Content side="left" align="start">
					<p>
						Web-based audio mixer for playing multiple tracks simultaneously, controlling volume
						levels and playback, and using shortcuts. Source code is available on
						<a href="https://github.com/mdonmez/aumix" target="_blank" class="underline">
							GitHub.
						</a>
					</p>
				</Popover.Content>
			</Popover.Root>

			<Button onclick={toggleMode} size="icon">
				<Sun
					class="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all! dark:scale-0 dark:-rotate-90"
				/>
				<Moon
					class="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all! dark:scale-100 dark:rotate-0"
				/>
				<span class="sr-only">Toggle theme</span>
			</Button>
		</div>
	</header>

	<div class="grid grid-cols-[repeat(auto-fill,minmax(370px,1fr))] gap-4 p-6">
		{#each audioStore.tracks as track, index (track.id)}
			<div
				class={`track-dnd-item relative ${dragTargetTrackId === track.id ? 'track-dnd-item--drop-target' : ''}`}
				role="group"
				aria-label={`Track card ${index + 1}: ${track.name}`}
				ondragover={(event) => handleDragOver(event, track.id)}
				ondragleave={(event) => handleDragLeave(event, track.id)}
				ondrop={(event) => handleDrop(event, track.id)}
			>
				<button
					type="button"
					class="track-drag-handle absolute top-4 left-4 z-10 inline-flex size-8 cursor-grab items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-xs transition-colors hover:bg-muted"
					draggable="true"
					aria-label={`Drag handle for ${track.name}`}
					title="Drag to swap with another card"
					ondragstart={(event) => handleDragStart(event, track.id)}
					ondragend={resetDragState}
				>
					<GripVertical class="h-4 w-4" />
				</button>

				<TrackCard
					{track}
					{index}
					flashActive={index === 0 && keyboardFeedbackStore.firstCardFlashTrackId === track.id
						? keyboardFeedbackStore.firstCardIsActive
						: index === 1 && keyboardFeedbackStore.secondCardFlashTrackId === track.id
							? keyboardFeedbackStore.secondCardIsActive
							: false}
				/>
			</div>
		{/each}

		<DropZone />
	</div>
</div>

<style>
	:global(.track-dnd-item [data-slot='card-header'] > div:first-child) {
		padding-left: 2.5rem;
	}

	:global(.track-dnd-item--drop-target [data-slot='card']) {
		box-shadow: 0 0 0 2px var(--foreground);
	}
</style>
