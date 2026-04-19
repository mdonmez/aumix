import { browser } from '$app/environment';
import { Howl } from 'howler';

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

interface HowlRecord {
	howl: Howl;
	url: string;
	/** Howler sound instance ID returned by howl.play(). Null before first play or after a non-looping sound ends. */
	soundId: number | null;
	/** Seek requested while waiting for the next confirmed onplay event. */
	pendingSeek: number | null;
	/** True between play() call and onplay callback for the active sound instance. */
	awaitingPlayEvent: boolean;
}

class AudioStore {
	tracks = $state<TrackState[]>([]);
	masterVolume = $state(75);
	masterMuted = $state(false);
	masterPlaying = $derived(this.tracks.some((t) => t.playing));
	playingTracksCount = $derived(this.tracks.filter((t) => t.playing).length);

	#masterVolumeBeforeMute = 75;
	#howls = new Map<string, HowlRecord>();
	#rafId: number | null = null;

	// ─── Volume helpers ───────────────────────────────────────────────────────

	#effectiveVolume(track: TrackState): number {
		return track.muted || this.masterMuted ? 0 : (track.volume / 100) * (this.masterVolume / 100);
	}

	#clampSeek(track: TrackState, seconds: number): number {
		const max = track.duration > 0 ? track.duration : Number.POSITIVE_INFINITY;
		return Math.max(0, Math.min(seconds, max));
	}

	#applyPendingSeek(id: string): void {
		const track = this.tracks.find((t) => t.id === id);
		const rec = this.#howls.get(id);
		if (!track || !rec || rec.soundId === null) return;

		if (rec.pendingSeek !== null) {
			const clamped = this.#clampSeek(track, rec.pendingSeek);
			rec.howl.seek(clamped, rec.soundId);
			track.currentTime = clamped;
			rec.pendingSeek = null;
		}
	}

	/**
	 * Pushes the correct volume + mute state from TrackState/masterVolume into
	 * the underlying Howl (and its active sound instance if one exists).
	 */
	#applyVolume(id: string): void {
		const track = this.tracks.find((t) => t.id === id);
		const rec = this.#howls.get(id);
		if (!track || !rec) return;

		const vol = this.#effectiveVolume(track);
		const isMuted = track.muted || this.masterMuted;

		if (rec.soundId !== null) {
			rec.howl.mute(isMuted, rec.soundId);
			rec.howl.volume(vol, rec.soundId);
		} else {
			// No active instance yet – set the Howl-level default so the
			// next play() inherits the right volume.
			rec.howl.mute(isMuted);
			rec.howl.volume(vol);
		}
	}

	#applyVolumeAll(): void {
		for (const track of this.tracks) {
			this.#applyVolume(track.id);
		}
	}

	// ─── RAF tick (currentTime polling) ──────────────────────────────────────

	#startRaf(): void {
		if (this.#rafId !== null) return;

		const tick = () => {
			for (const track of this.tracks) {
				if (!track.playing) continue;
				const rec = this.#howls.get(track.id);
				if (!rec || rec.soundId === null) continue;
				if (rec.awaitingPlayEvent) continue;

				const pos = rec.howl.seek(rec.soundId);
				// seek() returns Howl | number depending on usage;
				// the single-number-ID form returns the position as a number.
				if (typeof pos === 'number' && isFinite(pos)) {
					track.currentTime = pos;
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

	// ─── Public API ───────────────────────────────────────────────────────────

	addTrack(file: File): void {
		if (!browser) return;

		const url = URL.createObjectURL(file);
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

		const rec: HowlRecord = {
			// howl is assigned below – the forward-reference is safe because
			// Howl callbacks only fire asynchronously.
			howl: null as unknown as Howl,
			url,
			soundId: null,
			pendingSeek: null,
			awaitingPlayEvent: false
		};

		// Prime duration from metadata so UI can show length and allow scrubbing
		// before the first playback starts.
		const metadataProbe = new Audio(url);
		metadataProbe.preload = 'metadata';
		metadataProbe.addEventListener(
			'loadedmetadata',
			() => {
				const track = this.tracks.find((t) => t.id === id);
				if (!track) return;
				if (isFinite(metadataProbe.duration) && metadataProbe.duration > 0) {
					track.duration = metadataProbe.duration;
				}
			},
			{ once: true }
		);

		const howl = new Howl({
			src: [url],
			// html5: true streams via HTMLAudioElement, ideal for large local
			// files loaded through blob URLs (no full buffer decode required).
			html5: true,
			volume: this.#effectiveVolume(state),
			loop: state.loop,
			preload: true,

			onload: () => {
				const track = this.tracks.find((t) => t.id === id);
				if (track) track.duration = howl.duration();
			},

			onplay: (soundId: number) => {
				const track = this.tracks.find((t) => t.id === id);
				const r = this.#howls.get(id);
				if (!track || !r) return;

				r.soundId = soundId;
				r.awaitingPlayEvent = false;
				track.playing = true;
				r.howl.loop(track.loop, soundId);
				this.#applyVolume(id);
				this.#applyPendingSeek(id);
			},

			onend: (soundId: number) => {
				const track = this.tracks.find((t) => t.id === id);
				const r = this.#howls.get(id);
				if (!track || !r) return;

				// Only reset if this is the sound instance we're tracking
				// and the track is not set to loop (Howler fires onend even
				// for looping sounds at each cycle in some builds).
				if (r.soundId === soundId && !track.loop) {
					track.playing = false;
					track.currentTime = 0;
					r.soundId = null;
					r.pendingSeek = 0;
					r.awaitingPlayEvent = false;
				}
			},

			onloaderror: (_soundId: number, error: unknown) => {
				console.error(`[aumix] Load error – "${state.name}":`, error);
			},

			onplayerror: (soundId: number, error: unknown) => {
				const track = this.tracks.find((t) => t.id === id);
				const r = this.#howls.get(id);
				console.error(`[aumix] Play error – "${state.name}":`, error);
				const shouldRetryAfterUnlock = !!track?.playing;

				// Mobile browsers block autoplay until a user gesture.
				// Howler fires this error; we wait for its internal unlock and retry.
				howl.once('unlock', () => {
					if (!shouldRetryAfterUnlock) return;
					const rr = this.#howls.get(id);
					const t = this.tracks.find((tt) => tt.id === id);
					if (!rr || !t || !t.playing) return;

					rr.awaitingPlayEvent = true;
					const retryId = howl.play();
					if (typeof retryId === 'number') rr.soundId = retryId;
				});

				if (r && r.soundId === soundId) {
					r.soundId = null;
					r.awaitingPlayEvent = false;
				}
			}
		});

		rec.howl = howl;
		this.#howls.set(id, rec);
		this.tracks.push(state);
		this.#startRaf();
	}

	removeTrack(id: string): void {
		const rec = this.#howls.get(id);
		if (!rec) return;

		// unload() stops playback, destroys all sound instances and
		// frees Web Audio nodes / HTMLAudioElement resources.
		rec.howl.unload();
		URL.revokeObjectURL(rec.url);
		this.#howls.delete(id);

		const idx = this.tracks.findIndex((t) => t.id === id);
		if (idx !== -1) this.tracks.splice(idx, 1);

		if (this.tracks.length === 0) this.#stopRaf();
	}

	clearAll(): void {
		for (const track of [...this.tracks]) {
			this.removeTrack(track.id);
		}
	}

	reorderTracks(nextTracks: TrackState[]): void {
		if (nextTracks.length !== this.tracks.length) return;

		const currentIds = new Set(this.tracks.map((track) => track.id));
		const nextIds = new Set(nextTracks.map((track) => track.id));
		if (nextIds.size !== this.tracks.length) return;
		if (nextTracks.some((track) => !currentIds.has(track.id))) return;

		this.tracks.splice(0, this.tracks.length, ...nextTracks);
	}

	play(id: string): void {
		const track = this.tracks.find((t) => t.id === id);
		const rec = this.#howls.get(id);
		if (!track || !rec) return;

		// Capture the desired playback position before touching Howler.
		// This covers the case where the user seeked the progress slider
		// while the track was stopped / had ended (soundId === null).
		const targetTime = track.currentTime;

		let soundId = rec.soundId;
		rec.pendingSeek = targetTime;
		rec.awaitingPlayEvent = true;

		if (soundId !== null) {
			// Resume the existing (paused) sound instance.
			const resumedId = rec.howl.play(soundId);
			if (typeof resumedId === 'number') {
				soundId = resumedId;
			}
		} else {
			// First play, or resuming after a non-looping sound ended.
			soundId = rec.howl.play();
		}

		if (typeof soundId === 'number') {
			rec.soundId = soundId;
		}

		track.playing = true;
	}

	pause(id: string): void {
		const track = this.tracks.find((t) => t.id === id);
		const rec = this.#howls.get(id);
		if (!track || !rec) return;

		if (rec.soundId !== null) {
			// pause() preserves the current seek position so play() can resume.
			rec.howl.pause(rec.soundId);
		}
		track.playing = false;
		rec.awaitingPlayEvent = false;
	}

	playAll(): void {
		for (const track of this.tracks) {
			this.play(track.id);
		}
	}

	pauseAll(): void {
		for (const track of this.tracks) {
			this.pause(track.id);
		}
	}

	seekToStart(id: string): void {
		this.seek(id, 0);
	}

	seekToEnd(id: string): void {
		const track = this.tracks.find((t) => t.id === id);
		if (!track) return;
		this.seek(id, track.duration);
	}

	seek(id: string, seconds: number): void {
		const track = this.tracks.find((t) => t.id === id);
		const rec = this.#howls.get(id);
		if (!track || !rec) return;

		const clamped = this.#clampSeek(track, seconds);

		if (rec.soundId !== null) {
			if (track.playing && rec.awaitingPlayEvent) {
				rec.pendingSeek = clamped;
			} else {
				// seek(position, soundId) – setter form.
				rec.howl.seek(clamped, rec.soundId);
				rec.pendingSeek = null;
			}
		} else {
			rec.pendingSeek = clamped;
		}
		// Always update state so play() can apply it if soundId was null.
		track.currentTime = clamped;
	}

	setVolume(id: string, val: number): void {
		const track = this.tracks.find((t) => t.id === id);
		if (!track) return;

		const clamped = Math.max(0, Math.min(100, val));
		const shouldUnmute = track.muted && clamped > 0;
		if (clamped === track.volume && !shouldUnmute) return;

		track.volume = clamped;
		// Unmute implicitly when the user drags the volume above zero.
		if (shouldUnmute) track.muted = false;
		this.#applyVolume(id);
	}

	toggleMute(id: string): void {
		const track = this.tracks.find((t) => t.id === id);
		if (!track) return;

		if (track.muted) {
			track.muted = false;
			track.volume = track.volumeBeforeMute > 0 ? track.volumeBeforeMute : 10;
		} else {
			track.volumeBeforeMute = track.volume;
			track.muted = true;
			track.volume = 0;
		}
		this.#applyVolume(id);
	}

	toggleLoop(id: string): void {
		const track = this.tracks.find((t) => t.id === id);
		const rec = this.#howls.get(id);
		if (!track || !rec) return;

		track.loop = !track.loop;

		if (rec.soundId !== null) {
			// Apply to the active sound instance.
			rec.howl.loop(track.loop, rec.soundId);
		}
		// If soundId is null, play() will call howl.loop() on the next play.
	}

	setMasterVolume(val: number): void {
		this.masterVolume = val;
		if (val > 0 && this.masterMuted) this.masterMuted = false;
		this.#applyVolumeAll();
	}

	toggleMasterMute(): void {
		if (this.masterMuted) {
			this.masterMuted = false;
			this.masterVolume = this.#masterVolumeBeforeMute > 0 ? this.#masterVolumeBeforeMute : 10;
		} else {
			this.#masterVolumeBeforeMute = this.masterVolume;
			this.masterMuted = true;
			this.masterVolume = 0;
		}
		this.#applyVolumeAll();
	}
}

export const audioStore = new AudioStore();
