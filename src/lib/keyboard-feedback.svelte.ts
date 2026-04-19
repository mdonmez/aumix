class KeyboardFeedbackStore {
	firstCardFlashTrackId = $state<string | null>(null);
	secondCardFlashTrackId = $state<string | null>(null);
	firstCardIsActive = $state(false);
	secondCardIsActive = $state(false);

	#firstCardPressActive = false;
	#secondCardPressActive = false;
	#firstCardFlashActive = false;
	#secondCardFlashActive = false;

	#firstCardReleaseTimer: ReturnType<typeof setTimeout> | null = null;
	#secondCardReleaseTimer: ReturnType<typeof setTimeout> | null = null;
	#firstCardFlashTimer: ReturnType<typeof setTimeout> | null = null;
	#secondCardFlashTimer: ReturnType<typeof setTimeout> | null = null;

	#syncCardActiveState(index: number): void {
		if (index === 0) {
			this.firstCardIsActive = this.#firstCardPressActive || this.#firstCardFlashActive;
			return;
		}

		if (index === 1) {
			this.secondCardIsActive = this.#secondCardPressActive || this.#secondCardFlashActive;
		}
	}

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

	#clearFlashTimer(index: number): void {
		if (index === 0) {
			if (this.#firstCardFlashTimer !== null) {
				clearTimeout(this.#firstCardFlashTimer);
				this.#firstCardFlashTimer = null;
			}
			return;
		}

		if (this.#secondCardFlashTimer !== null) {
			clearTimeout(this.#secondCardFlashTimer);
			this.#secondCardFlashTimer = null;
		}
	}

	pressCard(index: number, trackId: string | null): void {
		if (index === 0) {
			this.firstCardFlashTrackId = trackId;
			this.#firstCardPressActive = true;
			this.#clearReleaseTimer(0);
			this.#syncCardActiveState(0);
			return;
		}

		if (index === 1) {
			this.secondCardFlashTrackId = trackId;
			this.#secondCardPressActive = true;
			this.#clearReleaseTimer(1);
			this.#syncCardActiveState(1);
		}
	}

	flashCard(index: number, trackId: string | null, delayMs = 120): void {
		if (index === 0) {
			this.firstCardFlashTrackId = trackId;
			this.#firstCardFlashActive = true;
			this.#clearFlashTimer(0);
			this.#syncCardActiveState(0);

			this.#firstCardFlashTimer = setTimeout(() => {
				this.#firstCardFlashActive = false;
				this.#firstCardFlashTimer = null;
				this.#syncCardActiveState(0);
			}, delayMs);
			return;
		}

		if (index === 1) {
			this.secondCardFlashTrackId = trackId;
			this.#secondCardFlashActive = true;
			this.#clearFlashTimer(1);
			this.#syncCardActiveState(1);

			this.#secondCardFlashTimer = setTimeout(() => {
				this.#secondCardFlashActive = false;
				this.#secondCardFlashTimer = null;
				this.#syncCardActiveState(1);
			}, delayMs);
		}
	}

	releaseCard(index: number, delayMs = 120): void {
		if (index === 0) {
			this.#clearReleaseTimer(0);
			this.#firstCardReleaseTimer = setTimeout(() => {
				this.#firstCardPressActive = false;
				this.#firstCardReleaseTimer = null;
				this.#syncCardActiveState(0);
			}, delayMs);
			return;
		}

		if (index === 1) {
			this.#clearReleaseTimer(1);
			this.#secondCardReleaseTimer = setTimeout(() => {
				this.#secondCardPressActive = false;
				this.#secondCardReleaseTimer = null;
				this.#syncCardActiveState(1);
			}, delayMs);
		}
	}
}

export const keyboardFeedbackStore = new KeyboardFeedbackStore();
