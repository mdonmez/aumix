<script lang="ts">
	import { onMount } from 'svelte';
	import type { Component } from 'svelte';
	import './layout.css';
	import { Toaster } from '$lib/components/ui/sonner/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import favicon from '$lib/assets/favicon.svg';
	import { audioStore } from '$lib/audio.svelte.js';
	import { keyboardFeedbackStore } from '$lib/keyboard-feedback.svelte.js';

	let { children } = $props();
	let ModeWatcherComponent = $state<Component | null>(null);

	const blockedMediaKeys = new Set([
		'MediaPlayPause',
		'MediaPause',
		'MediaPlay',
		'MediaTrackNext',
		'MediaTrackPrevious',
		'MediaStop',
		'MediaRewind',
		'MediaFastForward'
	]);

	const arrowKeys = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
	const arrowStepIntervalMs = 50;
	const minimumViewportWidth = 768;
	const minimumWideViewportMediaQuery = `(min-width: ${minimumViewportWidth}px)`;

	const getInitialWideViewportState = (): boolean => {
		if (typeof window === 'undefined') {
			return true;
		}

		return window.matchMedia(minimumWideViewportMediaQuery).matches;
	};

	let isWideViewport = $state(getInitialWideViewportState());

	onMount(() => {
		void import('mode-watcher').then(({ ModeWatcher }) => {
			ModeWatcherComponent = ModeWatcher;
		});

		const pressedArrowKeys = new Set<string>();
		let arrowRafId: number | null = null;
		let arrowLastStepAt = 0;

		const adjustVolume = (trackId: string, volume: number): void => {
			audioStore.setVolume(trackId, Math.max(0, Math.min(100, volume)));
		};

		const applyArrowVolumeStep = (): void => {
			const firstTrack = audioStore.tracks[0];
			const secondTrack = audioStore.tracks[1];
			const firstAxisActive = pressedArrowKeys.has('ArrowUp') || pressedArrowKeys.has('ArrowDown');
			const secondAxisActive =
				pressedArrowKeys.has('ArrowLeft') || pressedArrowKeys.has('ArrowRight');

			const firstDelta =
				(pressedArrowKeys.has('ArrowUp') ? 1 : 0) + (pressedArrowKeys.has('ArrowDown') ? -1 : 0);
			const secondDelta =
				(pressedArrowKeys.has('ArrowRight') ? 1 : 0) + (pressedArrowKeys.has('ArrowLeft') ? -1 : 0);

			if (firstAxisActive) {
				keyboardFeedbackStore.pressCard(0, firstTrack?.id ?? null);
			}

			if (secondAxisActive) {
				keyboardFeedbackStore.pressCard(1, secondTrack?.id ?? null);
			}

			if (firstTrack && firstDelta !== 0) {
				adjustVolume(firstTrack.id, firstTrack.volume + firstDelta);
			}

			if (secondTrack && secondDelta !== 0) {
				adjustVolume(secondTrack.id, secondTrack.volume + secondDelta);
			}
		};

		const runArrowLoop = (now: number): void => {
			if (pressedArrowKeys.size === 0) {
				arrowRafId = null;
				arrowLastStepAt = 0;
				return;
			}

			if (arrowLastStepAt === 0) {
				arrowLastStepAt = now;
			}

			const elapsed = now - arrowLastStepAt;
			if (elapsed >= arrowStepIntervalMs) {
				const steps = Math.min(4, Math.floor(elapsed / arrowStepIntervalMs));
				for (let i = 0; i < steps; i += 1) {
					applyArrowVolumeStep();
				}
				arrowLastStepAt += steps * arrowStepIntervalMs;
			}

			arrowRafId = requestAnimationFrame(runArrowLoop);
		};

		const startArrowRepeatLoop = (): void => {
			if (arrowRafId !== null) return;
			arrowRafId = requestAnimationFrame(runArrowLoop);
		};

		const stopArrowRepeatLoop = (): void => {
			if (arrowRafId === null) return;
			cancelAnimationFrame(arrowRafId);
			arrowRafId = null;
			arrowLastStepAt = 0;
		};

		const clearArrowState = (): void => {
			pressedArrowKeys.clear();
			keyboardFeedbackStore.releaseCard(0);
			keyboardFeedbackStore.releaseCard(1);
			stopArrowRepeatLoop();
		};

		const viewportMedia = window.matchMedia(minimumWideViewportMediaQuery);

		const syncViewportState = (): void => {
			isWideViewport = viewportMedia.matches;

			if (!isWideViewport) {
				clearArrowState();
			}
		};

		syncViewportState();

		let unsubscribeViewportChange = (): void => {};

		if (typeof viewportMedia.addEventListener === 'function') {
			viewportMedia.addEventListener('change', syncViewportState);
			unsubscribeViewportChange = () => {
				viewportMedia.removeEventListener('change', syncViewportState);
			};
		} else {
			viewportMedia.addListener(syncViewportState);
			unsubscribeViewportChange = () => {
				viewportMedia.removeListener(syncViewportState);
			};
		}

		const togglePlayback = (trackId: string): void => {
			const track = audioStore.tracks.find((item) => item.id === trackId);
			if (!track) return;

			if (track.playing) {
				audioStore.pause(trackId);
			} else {
				audioStore.play(trackId);
			}
		};

		const handleKeydown = (event: KeyboardEvent): void => {
			if (!isWideViewport) return;

			if (event.repeat && arrowKeys.has(event.key)) {
				event.preventDefault();
				event.stopPropagation();
				return;
			}

			if (
				event.repeat &&
				(event.code === 'Digit1' ||
					event.code === 'Numpad1' ||
					event.code === 'Digit2' ||
					event.code === 'Numpad2')
			) {
				event.preventDefault();
				event.stopPropagation();
				return;
			}

			if (blockedMediaKeys.has(event.code) || blockedMediaKeys.has(event.key)) {
				event.preventDefault();
				event.stopPropagation();
				return;
			}

			const target = event.target;
			if (target instanceof HTMLElement) {
				const tagName = target.tagName;
				if (
					target.isContentEditable ||
					tagName === 'INPUT' ||
					tagName === 'TEXTAREA' ||
					tagName === 'SELECT'
				) {
					return;
				}
			}

			if (arrowKeys.has(event.key)) {
				event.preventDefault();
				event.stopPropagation();

				if (!pressedArrowKeys.has(event.key)) {
					pressedArrowKeys.add(event.key);

					if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
						keyboardFeedbackStore.pressCard(0, audioStore.tracks[0]?.id ?? null);
					}

					if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
						keyboardFeedbackStore.pressCard(1, audioStore.tracks[1]?.id ?? null);
					}

					applyArrowVolumeStep();
				}

				startArrowRepeatLoop();
				return;
			}

			if (event.code === 'Digit1' || event.code === 'Numpad1') {
				const firstTrack = audioStore.tracks[0];
				if (firstTrack) {
					event.preventDefault();
					event.stopPropagation();
					keyboardFeedbackStore.flashCard(0, firstTrack.id);
					togglePlayback(firstTrack.id);
				}
				return;
			}

			if (event.code === 'Digit2' || event.code === 'Numpad2') {
				const secondTrack = audioStore.tracks[1];
				if (secondTrack) {
					event.preventDefault();
					event.stopPropagation();
					keyboardFeedbackStore.flashCard(1, secondTrack.id);
					togglePlayback(secondTrack.id);
				}
				return;
			}
		};

		const handleKeyup = (event: KeyboardEvent): void => {
			if (!isWideViewport) return;

			const isTrackedArrowKey = arrowKeys.has(event.key) && pressedArrowKeys.has(event.key);
			if (isTrackedArrowKey) {
				event.preventDefault();
				event.stopPropagation();

				pressedArrowKeys.delete(event.key);

				if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
					if (!pressedArrowKeys.has('ArrowUp') && !pressedArrowKeys.has('ArrowDown')) {
						keyboardFeedbackStore.releaseCard(0);
					}
				}

				if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
					if (!pressedArrowKeys.has('ArrowLeft') && !pressedArrowKeys.has('ArrowRight')) {
						keyboardFeedbackStore.releaseCard(1);
					}
				}

				if (pressedArrowKeys.size === 0) {
					stopArrowRepeatLoop();
				}
				return;
			}

			const target = event.target;
			if (target instanceof HTMLElement) {
				const tagName = target.tagName;
				if (
					target.isContentEditable ||
					tagName === 'INPUT' ||
					tagName === 'TEXTAREA' ||
					tagName === 'SELECT'
				) {
					return;
				}
			}

			if (event.code === 'Digit1' || event.code === 'Numpad1') {
				if (audioStore.tracks[0]) {
					event.preventDefault();
					event.stopPropagation();
				}
				return;
			}

			if (event.code === 'Digit2' || event.code === 'Numpad2') {
				if (audioStore.tracks[1]) {
					event.preventDefault();
					event.stopPropagation();
				}
				return;
			}
		};

		const handleWindowBlur = (): void => {
			clearArrowState();
		};

		const handleVisibilityChange = (): void => {
			if (document.visibilityState !== 'visible') {
				clearArrowState();
			}
		};

		const mediaSessionActions: MediaSessionAction[] = [
			'play',
			'pause',
			'previoustrack',
			'nexttrack',
			'stop',
			'seekbackward',
			'seekforward',
			'seekto'
		];

		window.addEventListener('keydown', handleKeydown, true);
		window.addEventListener('keyup', handleKeyup, true);
		window.addEventListener('blur', handleWindowBlur);
		document.addEventListener('visibilitychange', handleVisibilityChange);

		if ('mediaSession' in navigator) {
			for (const action of mediaSessionActions) {
				navigator.mediaSession.setActionHandler(action, () => {});
			}
		}

		return () => {
			unsubscribeViewportChange();
			window.removeEventListener('keydown', handleKeydown, true);
			window.removeEventListener('keyup', handleKeyup, true);
			window.removeEventListener('blur', handleWindowBlur);
			document.removeEventListener('visibilitychange', handleVisibilityChange);
			clearArrowState();

			if ('mediaSession' in navigator) {
				for (const action of mediaSessionActions) {
					navigator.mediaSession.setActionHandler(action, null);
				}
			}
		};
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{#if ModeWatcherComponent}
	<ModeWatcherComponent />
{/if}
<Toaster />

{#if isWideViewport}
	<div class="hidden md:block">
		{@render children()}
	</div>
{/if}

<main class="flex min-h-screen items-center justify-center p-6 md:hidden">
	<Card.Root class="w-full max-w-xl text-center shadow-sm">
		<Card.Header>
			<Card.Title class="text-2xl tracking-tight">Wide Screen Required</Card.Title>
		</Card.Header>
		<Card.Content>
			<p class="text-sm leading-relaxed text-muted-foreground sm:text-base">
				Aumix is designed for wide screens only. You cannot proceed on smaller viewports. Please
				open this site on a desktop or widen your browser window to at least {minimumViewportWidth}px.
			</p>
		</Card.Content>
	</Card.Root>
</main>
