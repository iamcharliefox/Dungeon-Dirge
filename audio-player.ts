import { AudioFileSettings } from "./types";
import { Vault } from "obsidian";

interface ActiveAudio {
	audio: HTMLAudioElement;
	settings: AudioFileSettings;
	fadeInterval?: number;
	currentVolume: number;
	isStopping?: boolean;
}

export class AudioPlayerManager {
	private activeAudios: Map<string, ActiveAudio> = new Map();
	private vault: Vault;

	constructor(vault: Vault) {
		this.vault = vault;
	}

	async play(filePath: string, settings: AudioFileSettings): Promise<void> {
		// Stop existing audio for this file if playing
		this.stop(filePath);

		// Get the proper resource path from Obsidian
		const file = this.vault.getAbstractFileByPath(filePath);
		if (!file) {
			console.error(`File not found: ${filePath}`);
			return;
		}

		// Use the vault adapter to get the correct file URL
		const resourcePath = this.vault.adapter.getResourcePath(filePath);
		console.log(`Loading audio from: ${resourcePath}`);
		
		const audio = new Audio(resourcePath);
		
		// Add loading handler
		audio.addEventListener('loadeddata', () => {
			console.log(`Audio loaded successfully: ${filePath}`);
		});
		
		audio.loop = settings.repeat;
		
		const activeAudio: ActiveAudio = {
			audio: audio,
			settings: settings,
			currentVolume: settings.fadeIn > 0 ? 0 : settings.volume
		};

		this.activeAudios.set(filePath, activeAudio);

		// Set initial volume
		audio.volume = activeAudio.currentVolume;

		// Handle fade-in
		if (settings.fadeIn > 0) {
			this.fadeIn(filePath, settings.fadeIn, settings.volume);
		}

		// Handle ended event (for non-looping tracks)
		audio.addEventListener('ended', () => {
			if (!settings.repeat) {
				this.activeAudios.delete(filePath);
			}
		});

		// Add error handler
		audio.addEventListener('error', (e) => {
			console.error(`Audio error for ${filePath}:`, e, audio.error);
			this.activeAudios.delete(filePath);
		});

		try {
			console.log(`Attempting to play: ${filePath} from ${resourcePath}`);
			await audio.play();
			console.log(`Successfully started playing: ${filePath}`);
		} catch (error) {
			console.error(`Failed to play audio: ${filePath}`, error);
			this.activeAudios.delete(filePath);
		}
	}

	stop(filePath: string, fadeOut: boolean = true): void {
		const activeAudio = this.activeAudios.get(filePath);
		if (!activeAudio) return;

		// Mark as stopping immediately so UI can update
		activeAudio.isStopping = true;

		// Clear any existing fade interval
		if (activeAudio.fadeInterval) {
			window.clearInterval(activeAudio.fadeInterval);
		}

		if (fadeOut && activeAudio.settings.fadeOut > 0) {
			this.fadeOut(filePath, activeAudio.settings.fadeOut);
		} else {
			activeAudio.audio.pause();
			activeAudio.audio.currentTime = 0;
			this.activeAudios.delete(filePath);
		}
	}

	stopAll(fadeOut: boolean = true): void {
		const paths = Array.from(this.activeAudios.keys());
		paths.forEach(path => this.stop(path, fadeOut));
	}

	isPlaying(filePath: string): boolean {
		const activeAudio = this.activeAudios.get(filePath);
		// Return false if stopping or not in the map
		return activeAudio ? !activeAudio.isStopping : false;
	}

	isStopping(filePath: string): boolean {
		const activeAudio = this.activeAudios.get(filePath);
		return activeAudio ? activeAudio.isStopping === true : false;
	}

	setVolume(filePath: string, volume: number): void {
		const activeAudio = this.activeAudios.get(filePath);
		if (activeAudio) {
			activeAudio.settings.volume = volume;
			activeAudio.currentVolume = volume;
			activeAudio.audio.volume = volume;
		}
	}

	private fadeIn(filePath: string, duration: number, targetVolume: number): void {
		const activeAudio = this.activeAudios.get(filePath);
		if (!activeAudio) return;

		const steps = 50;
		const stepDuration = (duration * 1000) / steps;
		const volumeIncrement = targetVolume / steps;
		let currentStep = 0;

		activeAudio.fadeInterval = window.setInterval(() => {
			currentStep++;
			activeAudio.currentVolume = Math.min(volumeIncrement * currentStep, targetVolume);
			activeAudio.audio.volume = activeAudio.currentVolume;

			if (currentStep >= steps) {
				window.clearInterval(activeAudio.fadeInterval);
				activeAudio.fadeInterval = undefined;
			}
		}, stepDuration);
	}

	private fadeOut(filePath: string, duration: number): void {
		const activeAudio = this.activeAudios.get(filePath);
		if (!activeAudio) return;

		const steps = 50;
		const stepDuration = (duration * 1000) / steps;
		const startVolume = activeAudio.currentVolume;
		const volumeDecrement = startVolume / steps;
		let currentStep = 0;

		activeAudio.fadeInterval = window.setInterval(() => {
			currentStep++;
			activeAudio.currentVolume = Math.max(startVolume - (volumeDecrement * currentStep), 0);
			activeAudio.audio.volume = activeAudio.currentVolume;

			if (currentStep >= steps) {
				window.clearInterval(activeAudio.fadeInterval);
				activeAudio.fadeInterval = undefined;
				activeAudio.audio.pause();
				activeAudio.audio.currentTime = 0;
				this.activeAudios.delete(filePath);
			}
		}, stepDuration);
	}

	getActiveTracks(): string[] {
		return Array.from(this.activeAudios.keys());
	}

	cleanup(): void {
		this.stopAll(false);
	}
}
