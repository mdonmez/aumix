<script lang="ts">
	import { FileMusic } from '@lucide/svelte';

	import { Button } from '$lib/components/ui/button/index.js';
	import * as Empty from '$lib/components/ui/empty/index.js';
	import { audioStore } from '$lib/audio.svelte.js';

	let isDragging = $state(false);
	let fileInput: HTMLInputElement | null = $state(null);

	const AUDIO_EXTENSIONS = new Set([
		'.mp3',
		'.m4a',
		'.aac',
		'.wav',
		'.ogg',
		'.flac',
		'.oga',
		'.webm'
	]);

	function isAudioFile(file: File): boolean {
		if (file.type.startsWith('audio/')) return true;
		const lastDot = file.name.lastIndexOf('.');
		if (lastDot === -1) return false;
		return AUDIO_EXTENSIONS.has(file.name.slice(lastDot).toLowerCase());
	}

	function handleFiles(files: FileList | null): void {
		if (!files) return;
		for (const file of files) {
			if (isAudioFile(file)) {
				audioStore.addTrack(file);
			}
		}
	}

	function handleDrop(e: DragEvent): void {
		e.preventDefault();
		isDragging = false;
		handleFiles(e.dataTransfer?.files ?? null);
	}

	function handleDragOver(e: DragEvent): void {
		e.preventDefault();
		isDragging = true;
	}

	function handleDragLeave(e: DragEvent): void {
		// Only clear dragging if leaving the drop zone entirely (not entering a child)
		if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
			isDragging = false;
		}
	}

	function handleFileInput(e: Event): void {
		handleFiles((e.target as HTMLInputElement).files);
		// Reset input so the same file can be re-added if removed
		(e.target as HTMLInputElement).value = '';
	}
</script>

<div
	class="flex w-full max-w-sm items-center justify-center"
	role="region"
	aria-label="Audio drop zone"
	ondrop={handleDrop}
	ondragover={handleDragOver}
	ondragleave={handleDragLeave}
>
	<input
		bind:this={fileInput}
		type="file"
		accept="audio/*"
		multiple
		class="sr-only"
		onchange={handleFileInput}
	/>
	<Empty.Root
		class={[
			'w-full border border-dashed p-6 transition-colors duration-150',
			isDragging ? 'border-primary bg-primary/5' : ''
		].join(' ')}
	>
		<Empty.Header>
			<Empty.Media variant="icon">
				<FileMusic class={isDragging ? 'text-primary' : ''} />
			</Empty.Media>
			<Empty.Title>{isDragging ? 'Drop to add' : 'Add new audio'}</Empty.Title>
			<Empty.Description>
				Drag and drop the audio file or click the button below to select it.
			</Empty.Description>
		</Empty.Header>
		<Empty.Content>
			<Button onclick={() => fileInput?.click()}>Add audio</Button>
		</Empty.Content>
	</Empty.Root>
</div>
