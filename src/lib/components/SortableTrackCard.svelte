<script lang="ts">
	import { useSortable } from '@dnd-kit-svelte/svelte/sortable';
	import type { TrackState } from '$lib/audio.svelte.js';
	import TrackCard from '$lib/components/TrackCard.svelte';

	interface Props {
		id: string;
		track: TrackState;
		index: number;
		flashActive?: boolean;
	}

	let { id, track, index, flashActive = false }: Props = $props();

	const sortable = useSortable({
		id: () => id,
		index: () => index,
		group: 'tracks',
		type: 'track',
		data: () => ({ group: 'tracks' }),
		feedback: 'move'
	});
</script>

<div
	class="w-full transition-opacity"
	class:opacity-40={sortable.isDragging.current}
	{@attach sortable.ref}
>
	<TrackCard {track} {index} {flashActive} dragHandleRef={sortable.handleRef} />
</div>
