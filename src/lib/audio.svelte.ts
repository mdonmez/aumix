import { browser } from '$app/environment';

export interface TrackState {
	id: string;
	name: string;
	playing: boolean;
	volume: number;
	muted: boolean;
	volumeBeforeMute: number;
	loop: boolean;
	currentTime: number;
	duration: number;
}

interface AudioObjects {
	audio: HTMLAudioElement;
	url: string;
}

class AudioStore {
	tracks = $state<TrackState[]>([]);
	masterVolume = $state(75);
	masterMuted = $state(false);
	masterPlaying = $derived(this.tracks.some((t) => t.playing));

	#masterVolumeBeforeMute = 75;
	#audioObjects = new Map<string, AudioObjects>();
	#rafId: number | null = null;

	#syncAudioVolume(track: TrackState, audio: HTMLAudioElement): void {
		const effectiveVolume =
			track.muted || this.masterMuted ? 0 : (track.volume / 100) * (this.masterVolume / 100);

		audio.volume = effectiveVolume;
		audio.muted = effectiveVolume === 0;
	}

	#syncTrackAudio(id: string): void {
		const track = this.tracks.find((t) => t.id === id);
		const objs = this.#audioObjects.get(id);
		if (!track || !objs) return;

		this.#syncAudioVolume(track, objs.audio);
		objs.audio.loop = track.loop;
	}

	#syncAllTrackAudio(): void {
		for (const track of this.tracks) {
			const objs = this.#audioObjects.get(track.id);
			if (objs) {
				this.#syncAudioVolume(track, objs.audio);
				objs.audio.loop = track.loop;
			}
		}
	}

	#startRaf(): void {
		if (this.#rafId !== null) return;
		const tick = () => {
			for (const track of this.tracks) {
				const objs = this.#audioObjects.get(track.id);
				if (objs && track.playing) {
					track.currentTime = objs.audio.currentTime;
				}
			}
			this.#rafId = requestAnimationFrame(tick);
		};
		this.#rafId = requestAnimationFrame(tick);
	}

	#stopRaf(): void {
		if (this.#rafId !== null) {
			cancelAnimationFrame(this.#rafId);
			this.#rafId = null;
		}
	}

	addTrack(file: File): void {
		if (!browser) return;

		const url = URL.createObjectURL(file);
		const audio = new Audio(url);
		audio.preload = 'metadata';

		const id = crypto.randomUUID();

		const state: TrackState = {
			id,
			name: file.name.replace(/\.[^/.]+$/, ''),
			playing: false,
			volume: 75,
			muted: false,
			volumeBeforeMute: 75,
			loop: false,
			currentTime: 0,
			duration: 0
		};

		audio.addEventListener('loadedmetadata', () => {
			const track = this.tracks.find((t) => t.id === id);
			if (track) track.duration = audio.duration;
		});

		audio.addEventListener('timeupdate', () => {
			const track = this.tracks.find((t) => t.id === id);
			if (track) track.currentTime = audio.currentTime;
		});

		audio.addEventListener('ended', () => {
			const track = this.tracks.find((t) => t.id === id);
			if (track) {
				track.playing = false;
				track.currentTime = 0;
			}
		});

		this.#syncAudioVolume(state, audio);
		audio.loop = state.loop;

		this.#audioObjects.set(id, { audio, url });
		this.tracks.push(state);
		this.#startRaf();
	}

	removeTrack(id: string): void {
		const objs = this.#audioObjects.get(id);
		if (!objs) return;

		objs.audio.pause();
		URL.revokeObjectURL(objs.url);
		this.#audioObjects.delete(id);

		const idx = this.tracks.findIndex((t) => t.id === id);
		if (idx !== -1) this.tracks.splice(idx, 1);

		if (this.tracks.length === 0) this.#stopRaf();
	}

	async play(id: string): Promise<void> {
		const track = this.tracks.find((t) => t.id === id);
		const objs = this.#audioObjects.get(id);
		if (!track || !objs) return;

		try {
			await objs.audio.play();
			track.playing = true;
		} catch (e) {
			track.playing = false;
			console.error('Failed to play track:', e);
		}
	}

	pause(id: string): void {
		const track = this.tracks.find((t) => t.id === id);
		const objs = this.#audioObjects.get(id);
		if (!track || !objs) return;

		objs.audio.pause();
		track.playing = false;
	}

	async playAll(): Promise<void> {
		for (const track of this.tracks) {
			await this.play(track.id);
		}
	}

	pauseAll(): void {
		for (const track of this.tracks) {
			this.pause(track.id);
		}
	}

	seekToStart(id: string): void {
		const track = this.tracks.find((t) => t.id === id);
		const objs = this.#audioObjects.get(id);
		if (!track || !objs) return;

		objs.audio.currentTime = 0;
		track.currentTime = 0;
	}

	seekToEnd(id: string): void {
		const track = this.tracks.find((t) => t.id === id);
		const objs = this.#audioObjects.get(id);
		if (!track || !objs) return;

		objs.audio.currentTime = track.duration;
		track.currentTime = track.duration;
	}

	seek(id: string, seconds: number): void {
		const track = this.tracks.find((t) => t.id === id);
		const objs = this.#audioObjects.get(id);
		if (!track || !objs) return;

		const clamped = Math.max(0, Math.min(seconds, track.duration));
		objs.audio.currentTime = clamped;
		track.currentTime = clamped;
	}

	setVolume(id: string, val: number): void {
		const track = this.tracks.find((t) => t.id === id);
		if (!track) return;

		track.volume = val;
		if (val > 0 && track.muted) track.muted = false;
		this.#syncTrackAudio(id);
	}

	toggleMute(id: string): void {
		const track = this.tracks.find((t) => t.id === id);
		if (!track) return;

		if (track.muted) {
			track.muted = false;
			const restored = track.volumeBeforeMute > 0 ? track.volumeBeforeMute : 10;
			track.volume = restored;
		} else {
			track.volumeBeforeMute = track.volume;
			track.muted = true;
			track.volume = 0;
		}
		this.#syncTrackAudio(id);
	}

	toggleLoop(id: string): void {
		const track = this.tracks.find((t) => t.id === id);
		if (!track) return;

		track.loop = !track.loop;
		this.#syncTrackAudio(id);
	}

	setMasterVolume(val: number): void {
		this.masterVolume = val;
		if (val > 0 && this.masterMuted) this.masterMuted = false;
		this.#syncAllTrackAudio();
	}

	toggleMasterMute(): void {
		if (this.masterMuted) {
			this.masterMuted = false;
			const restored = this.#masterVolumeBeforeMute > 0 ? this.#masterVolumeBeforeMute : 10;
			this.masterVolume = restored;
		} else {
			this.#masterVolumeBeforeMute = this.masterVolume;
			this.masterMuted = true;
			this.masterVolume = 0;
		}
		this.#syncAllTrackAudio();
	}
}

export const audioStore = new AudioStore();
