import { toast } from 'svelte-sonner';
import { audioStore } from '$lib/audio.svelte.js';

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

export function isAudioFile(file: File): boolean {
	if (file.type.startsWith('audio/')) return true;
	const lastDot = file.name.lastIndexOf('.');
	if (lastDot === -1) return false;
	return AUDIO_EXTENSIONS.has(file.name.slice(lastDot).toLowerCase());
}

export function isFileDrag(event: DragEvent): boolean {
	return Array.from(event.dataTransfer?.types ?? []).includes('Files');
}

export function handleFiles(files: FileList | null): void {
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
