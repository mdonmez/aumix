<script lang="ts">
	import {
		Sun,
		Moon,
		Volume1,
		Volume2,
		VolumeOff,
		Play,
		Pause,
		CircleQuestionMark
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
					class={audioStore.masterPlaying ? 'rounded-full transition-none!' : 'transition-none!'}
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
					class="pointer-events-none cursor-default rounded-full px-4 font-mono uppercase"
					aria-disabled="true"
					tabindex={-1}
				>
					{audioStore.playingTracksCount} PLAYING
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
			<TrackCard
				{track}
				{index}
				flashNonce={index === 0 && keyboardFeedbackStore.firstCardFlashTrackId === track.id
					? keyboardFeedbackStore.firstCardFlashNonce
					: index === 1 && keyboardFeedbackStore.secondCardFlashTrackId === track.id
						? keyboardFeedbackStore.secondCardFlashNonce
						: 0}
			/>
		{/each}

		<DropZone />
	</div>
</div>
