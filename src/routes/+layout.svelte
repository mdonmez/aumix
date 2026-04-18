<script lang="ts">
	import { onMount } from 'svelte';
	import './layout.css';
	import { ModeWatcher } from 'mode-watcher';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();

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

	onMount(() => {
		const handleKeydown = (event: KeyboardEvent): void => {
			if (blockedMediaKeys.has(event.code) || blockedMediaKeys.has(event.key)) {
				event.preventDefault();
				event.stopPropagation();
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

		if ('mediaSession' in navigator) {
			for (const action of mediaSessionActions) {
				navigator.mediaSession.setActionHandler(action, () => {});
			}
		}

		return () => {
			window.removeEventListener('keydown', handleKeydown, true);

			if ('mediaSession' in navigator) {
				for (const action of mediaSessionActions) {
					navigator.mediaSession.setActionHandler(action, null);
				}
			}
		};
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<ModeWatcher />

{@render children()}
