<script lang="ts">
	import {
		Repeat,
		X,
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

	interface Props {
		track: TrackState;
	}

	let { track }: Props = $props();
	let isSeeking = $state(false);
	let progressValue = $state(0);

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

<Card.Root size="sm" class="w-full">
	<Card.Header>
		<Card.Title>
			<h4 class="scroll-m-20 truncate text-xl font-semibold tracking-tight" title={track.name}>
				{track.name}
			</h4>
		</Card.Title>
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
					<X />
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
			<div class="flex items-center justify-center gap-2">
				<Button variant="secondary" onclick={() => audioStore.seekToStart(track.id)}>
					<SkipBack /> Roll
				</Button>
				<Button
					size="icon"
					class={track.playing ? 'rounded-full !transition-none' : '!transition-none'}
					onclick={togglePlayback}
				>
					{#if track.playing}
						<Pause />
					{:else}
						<Play />
					{/if}
				</Button>
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
