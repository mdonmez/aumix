class KeyboardFeedbackStore {
	firstCardFlashTrackId = $state<string | null>(null);
	secondCardFlashTrackId = $state<string | null>(null);
	firstCardIsActive = $state(false);
	secondCardIsActive = $state(false);
	firstCardFlashNonce = $state(0);
	secondCardFlashNonce = $state(0);

	#firstCardReleaseTimer: ReturnType<typeof setTimeout> | null = null;
	#secondCardReleaseTimer: ReturnType<typeof setTimeout> | null = null;

	#clearReleaseTimer(index: number): void {
		if (index === 0) {
			if (this.#firstCardReleaseTimer !== null) {
				clearTimeout(this.#firstCardReleaseTimer);
				this.#firstCardReleaseTimer = null;
			}
			return;
		}

		if (this.#secondCardReleaseTimer !== null) {
			clearTimeout(this.#secondCardReleaseTimer);
			this.#secondCardReleaseTimer = null;
		}
	}

	pressCard(index: number, trackId: string | null): void {
		if (index === 0) {
			this.firstCardFlashTrackId = trackId;
			this.firstCardIsActive = true;
			this.#clearReleaseTimer(0);
			this.firstCardFlashNonce += 1;
			return;
		}

		if (index === 1) {
			this.secondCardFlashTrackId = trackId;
			this.secondCardIsActive = true;
			this.#clearReleaseTimer(1);
			this.secondCardFlashNonce += 1;
		}
	}

	flashCard(index: number, trackId: string | null, delayMs = 120): void {
		this.pressCard(index, trackId);
		this.releaseCard(index, delayMs);
	}

	releaseCard(index: number, delayMs = 120): void {
		if (index === 0) {
			this.#clearReleaseTimer(0);
			this.#firstCardReleaseTimer = setTimeout(() => {
				this.firstCardIsActive = false;
				this.#firstCardReleaseTimer = null;
			}, delayMs);
			return;
		}

		if (index === 1) {
			this.#clearReleaseTimer(1);
			this.#secondCardReleaseTimer = setTimeout(() => {
				this.secondCardIsActive = false;
				this.#secondCardReleaseTimer = null;
			}, delayMs);
		}
	}
}

export const keyboardFeedbackStore = new KeyboardFeedbackStore();
