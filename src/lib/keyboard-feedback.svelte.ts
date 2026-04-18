class KeyboardFeedbackStore {
	firstCardFlashNonce = $state(0);
	secondCardFlashNonce = $state(0);

	flashCard(index: number): void {
		if (index === 0) {
			this.firstCardFlashNonce += 1;
			return;
		}

		if (index === 1) {
			this.secondCardFlashNonce += 1;
		}
	}
}

export const keyboardFeedbackStore = new KeyboardFeedbackStore();
