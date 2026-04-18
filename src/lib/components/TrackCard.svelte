<script lang="ts">
	import {
		Repeat,
		Trash2,
		Volume1,
		Volume2,
		VolumeOff,
		SquarePlay,
		Play,
		Pause,
		SkipBack
	} from '@lucide/svelte';

	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Slider } from '$lib/components/ui/slider/index.js';
	import { audioStore, type TrackState } from '$lib/audio.svelte.js';
	import { GripVertical } from '@lucide/svelte';

	import { Badge } from '$lib/components/ui/badge/index.js';

	interface Props {
		track: TrackState;
		index: number;
		flashActive?: boolean;
		dragHandleRef?: (node: HTMLElement) => void;
	}

	let { track, index, flashActive = false, dragHandleRef }: Props = $props();
	let isSeeking = $state(false);
	let progressValue = $state(0);
	let isFlashActive = $state(false);
	const noop = () => {};

	const shortcutLabel = $derived(index === 0 ? '↑ ↓ ⋅ 1' : index === 1 ? '← → ⋅ 2' : '');

	function formatTime(seconds: number): string {
		if (!isFinite(seconds) || isNaN(seconds)) return '0:00';
		const m = Math.floor(seconds / 60);
		const s = Math.floor(seconds % 60)
			.toString()
			.padStart(2, '0');
		return `${m}:${s}`;
	}

	const progressPercent = $derived(
		track.duration > 0 ? (track.currentTime / track.duration) * 100 : 0
	);

	$effect(() => {
		if (!isSeeking) {
			progressValue = progressPercent;
		}
	});

	$effect(() => {
		isFlashActive = flashActive;
	});

	function handleSeekCommit(val: number): void {
		audioStore.seek(track.id, (val / 100) * track.duration);
		isSeeking = false;
	}

	function togglePlayback(): void {
		if (track.playing) {
			audioStore.pause(track.id);
		} else {
			audioStore.play(track.id);
		}
	}
</script>

<Card.Root
	size="sm"
	class={`w-full transition-[box-shadow,ring-color] duration-150 ${isFlashActive ? 'shadow-[0_0_0_1px_hsl(var(--primary)/0.7)] ring-2 ring-primary' : ''}`}
>
	<Card.Header>
		<div class="flex min-w-0 items-center gap-2">
			<button
				type="button"
				aria-label="Drag to reorder track"
				class="flex size-8 shrink-0 cursor-grab items-center justify-center rounded-full border border-border bg-background/95 text-muted-foreground transition-colors hover:text-foreground active:cursor-grabbing"
				{@attach dragHandleRef ?? noop}
			>
				<GripVertical class="h-4 w-4" />
			</button>
			<Badge class="size-8 rounded-full p-0 font-mono text-sm tabular-nums" variant="outline">
				{index + 1}
			</Badge>
			<Card.Title class="w-full min-w-0 flex-1">
				<h4
					class="block min-w-0 scroll-m-20 truncate text-xl font-semibold tracking-tight"
					title={track.name}
				>
					{track.name}
				</h4>
			</Card.Title>
		</div>
		<Card.Action>
			<div class="flex items-center gap-1">
				<Button
					size="sm"
					variant={track.loop ? 'default' : 'secondary'}
					onclick={() => audioStore.toggleLoop(track.id)}
				>
					<Repeat /> Loop
				</Button>
				<Button
					variant="destructive"
					size="icon-sm"
					onclick={() => audioStore.removeTrack(track.id)}
				>
					<Trash2 />
				</Button>
			</div>
		</Card.Action>
	</Card.Header>
	<Card.Content>
		<div class="flex flex-col gap-3">
			<!-- Progress row -->
			<div class="flex items-center gap-2">
				<Button variant="ghost" size="icon" tabindex={-1} class="pointer-events-none shrink-0">
					<SquarePlay />
				</Button>
				<Slider
					type="single"
					max={100}
					step={0.1}
					class="flex-1"
					bind:value={progressValue}
					onValueCommit={(val: number) => handleSeekCommit(val)}
					onpointerdown={() => {
						isSeeking = true;
					}}
				/>
				<span class="shrink-0 text-xs text-muted-foreground tabular-nums">
					{formatTime(track.currentTime)} / {formatTime(track.duration)}
				</span>
			</div>

			<!-- Playback controls row -->
			<div class="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
				<div class="justify-self-start">
					{#if shortcutLabel}
						<kbd
							class={`pointer-events-none inline-flex h-5 items-center gap-1 rounded-full border bg-muted px-2 font-mono text-[10px] font-medium opacity-100 transition-colors duration-150 select-none ${isFlashActive ? 'border-primary text-primary' : 'text-muted-foreground'}`}
						>
							<span class="text-xs">{shortcutLabel}</span>
						</kbd>
					{/if}
				</div>
				<div class="flex items-center justify-center gap-2 justify-self-center">
					<Button variant="secondary" onclick={() => audioStore.seekToStart(track.id)}>
						<SkipBack /> Roll
					</Button>
					<Button
						size="icon"
						class={track.playing ? 'rounded-full transition-none!' : 'transition-none!'}
						onclick={togglePlayback}
					>
						{#if track.playing}
							<Pause />
						{:else}
							<Play />
						{/if}
					</Button>
				</div>
				<div></div>
			</div>

			<!-- Separator -->
			<div class="mt-2 border-t border-border"></div>

			<!-- Volume row -->
			<div class="flex items-center gap-2">
				<Button
					variant="ghost"
					size="icon"
					class="shrink-0"
					onclick={() => audioStore.toggleMute(track.id)}
				>
					{#if track.muted || track.volume === 0}
						<VolumeOff />
					{:else if track.volume <= 50}
						<Volume1 />
					{:else}
						<Volume2 />
					{/if}
				</Button>
				<Slider
					type="single"
					max={100}
					step={1}
					class="flex-1"
					value={track.volume}
					onValueChange={(val: number) => audioStore.setVolume(track.id, val)}
				/>
			</div>
		</div>
	</Card.Content>
</Card.Root>
