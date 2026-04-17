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

		window.addEventListener('keydown', handleKeydown, true);

		try {
			navigator.mediaSession?.setActionHandler('play', null);
			navigator.mediaSession?.setActionHandler('pause', null);
			navigator.mediaSession?.setActionHandler('previoustrack', null);
			navigator.mediaSession?.setActionHandler('nexttrack', null);
			navigator.mediaSession?.setActionHandler('seekbackward', null);
			navigator.mediaSession?.setActionHandler('seekforward', null);
			navigator.mediaSession?.setActionHandler('stop', null);
		} catch {
			// Ignore browsers that do not allow clearing handlers.
		}

		return () => {
			window.removeEventListener('keydown', handleKeydown, true);
		};
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<ModeWatcher />

{@render children()}
