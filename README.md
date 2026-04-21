# Aumix

Aumix is a browser-based audio mixer for loading local audio files, playing multiple tracks at the same time, and controlling each track independently. It is built as a static SvelteKit application, so all mixing happens in the browser without a backend or database.

## Description

Aumix solves the common need to quickly audition and balance multiple audio clips in one place. You can add local audio files, play and pause tracks individually or together, adjust per-track and master volume, loop tracks, scrub through progress, and reorder tracks by drag and drop.

The interface also includes keyboard-focused controls for the first two tracks, visual feedback for keyboard interactions, a theme toggle, and a mobile viewport warning that blocks use on small screens.

## Features

- Load multiple local audio files through file picker or drag and drop.
- Play, pause, seek, loop, mute, and delete tracks independently.
- Control global playback with play/pause, roll all, clear all, and master volume controls.
- Swap track order with drag-and-drop, including auto-scroll while dragging near the viewport edges.
- Use keyboard shortcuts for the first two tracks: arrow keys and number keys are mapped to track-specific volume control and visual focus feedback.
- See track duration and current position as soon as audio metadata is available.
- Reject non-audio files with a toast notification.
- Toggle between light and dark themes.
- Block the experience on mobile viewports; the app is intended for desktop and tablet browsers.

## Tech Stack

- TypeScript
- SvelteKit 2 with Svelte 5 runes mode
- Vite
- Tailwind CSS 4
- shadcn-svelte and bits-ui
- Howler.js for audio playback
- Lucide icons
- svelte-sonner for toast notifications
- mode-watcher for theme switching

## Architecture

Aumix is organized as a single-page audio mixing interface with most application state kept in client-side Svelte stores.

- [src/routes/+page.svelte](src/routes/+page.svelte) contains the main mixer UI, track ordering, drag-and-drop swap behavior, and master controls.
- [src/lib/audio.svelte.ts](src/lib/audio.svelte.ts) is the core audio store. It creates and manages Howler instances, playback state, seek position, loop state, mute state, master volume, and cleanup.
- [src/lib/keyboard-feedback.svelte.ts](src/lib/keyboard-feedback.svelte.ts) handles the temporary visual feedback used for the keyboard-mapped track cards.
- [src/lib/components/TrackCard.svelte](src/lib/components/TrackCard.svelte) renders the per-track controls and timeline.
- [src/lib/components/DropZone.svelte](src/lib/components/DropZone.svelte) handles file selection, drag-and-drop upload, and audio file validation.
- [src/lib/components/ui](src/lib/components/ui) contains the reusable shadcn-svelte UI primitives used across the app.
- [src/routes/layout.css](src/routes/layout.css) defines the theme tokens, typography, and Tailwind base styling.
- [.github/workflows/deploy.yml](.github/workflows/deploy.yml) deploys the built static site from the `main` branch to GitHub Pages.

The app uses local file URLs and Howler.js HTML5 audio playback, so audio is processed in the browser and is not uploaded to a server.

## Installation

### Prerequisites

- Bun 1.x or a compatible Node.js toolchain
- A modern desktop or tablet browser
- Local audio files to mix

### Clone

```bash
git clone https://github.com/mdonmez/aumix.git
cd aumix
```

### Dependencies

```bash
bun install
```

## Usage

### Development

```bash
bun run dev
```

### Type and Svelte checks

```bash
bun run check
```

### Lint and format

```bash
bun run lint
bun run format
```

### Production build

```bash
bun run build
```

The build outputs a static site in `build/`.

### Local preview

```bash
bun run preview
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
