<script lang="ts">
	import { FileMusic } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

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

	function isFileDrag(event: DragEvent): boolean {
		return Array.from(event.dataTransfer?.types ?? []).includes('Files');
	}

	function handleFiles(files: FileList | null): void {
		if (!files) return;

		const rejectedFiles: string[] = [];
		for (const file of files) {
			if (isAudioFile(file)) {
				audioStore.addTrack(file);
			} else {
				rejectedFiles.push(file.name);
			}
		}

		if (rejectedFiles.length > 0) {
			toast('The following files could not be identified as audio files:', {
				position: 'top-center',
				style: 'color: #ef4444;',
				descriptionClass: 'whitespace-pre-line',
				description: rejectedFiles.map((fileName) => `• ${fileName}`).join('\n'),
				action: {
					label: 'OK',
					onClick: () => console.info('OK')
				}
			});
		}
	}

	function handleFileInput(e: Event): void {
		handleFiles((e.target as HTMLInputElement).files);
		// Reset input so the same file can be re-added if removed
		(e.target as HTMLInputElement).value = '';
	}

	function handleDrop(e: DragEvent): void {
		if (!isFileDrag(e)) return;
		e.preventDefault();
		isDragging = false;
		handleFiles(e.dataTransfer?.files ?? null);
	}

	function handleDragOver(e: DragEvent): void {
		if (!isFileDrag(e)) return;
		e.preventDefault();
		isDragging = true;
	}

	function handleDragLeave(e: DragEvent): void {
		if (!isFileDrag(e)) return;
		// Only clear dragging if leaving the drop zone entirely (not entering a child)
		if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
			isDragging = false;
		}
	}
</script>

<div
	class="flex h-full w-full items-stretch justify-stretch"
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
			'h-full w-full border border-dashed p-4 transition-colors duration-150',
			isDragging ? 'border-primary bg-primary/5' : ''
		].join(' ')}
	>
		<Empty.Header>
			<Empty.Media variant="icon">
				<FileMusic class={isDragging ? 'text-primary' : ''} />
			</Empty.Media>
			<Empty.Title>{isDragging ? 'Drop to add' : 'Add new audio'}</Empty.Title>
			<Empty.Description>
				Drag and drop audio file(s) here, or use the button below.
			</Empty.Description>
		</Empty.Header>
		<Empty.Content>
			<Button onclick={() => fileInput?.click()}>Add audio</Button>
		</Empty.Content>
	</Empty.Root>
</div>
