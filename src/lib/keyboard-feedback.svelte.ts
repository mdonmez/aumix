class KeyboardFeedbackStore {
	firstCardFlashTrackId = $state<string | null>(null);
	secondCardFlashTrackId = $state<string | null>(null);
	firstCardFlashNonce = $state(0);
	secondCardFlashNonce = $state(0);

	flashCard(index: number, trackId: string | null): void {
		if (index === 0) {
			this.firstCardFlashTrackId = trackId;
			this.firstCardFlashNonce += 1;
			return;
		}

		if (index === 1) {
			this.secondCardFlashTrackId = trackId;
			this.secondCardFlashNonce += 1;
		}
	}
}

export const keyboardFeedbackStore = new KeyboardFeedbackStore();
