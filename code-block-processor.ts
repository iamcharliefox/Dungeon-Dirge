import { MarkdownPostProcessorContext, TFile, editorInfoField } from "obsidian";
import DungeonDirgePlugin from "./main";
import { AudioFileSettings, DEFAULT_AUDIO_FILE_SETTINGS } from "./types";

export class DungeonDirgeInlineProcessor {
	constructor(private plugin: DungeonDirgePlugin) {}

	async processInline(
		el: HTMLElement,
		ctx: MarkdownPostProcessorContext
	) {
		// Find all {{song: path}} patterns
		const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
		const nodesToReplace: { node: Node; matches: RegExpMatchArray[] }[] = [];

		let node: Node | null;
		while ((node = walker.nextNode())) {
			const text = node.textContent || "";
			const regex = /\{\{song:\s*([^}]+)\}\}/g;
			const matches = Array.from(text.matchAll(regex));
			
			if (matches.length > 0) {
				nodesToReplace.push({ node, matches });
			}
		}

		// Replace matches with player widgets
		for (const { node, matches } of nodesToReplace) {
			const parent = node.parentElement;
			if (!parent) continue;

			let text = node.textContent || "";
			const fragment = document.createDocumentFragment();
			let lastIndex = 0;

			for (const match of matches) {
				// Add text before the match
				if (match.index! > lastIndex) {
					fragment.appendChild(
						document.createTextNode(text.substring(lastIndex, match.index))
					);
				}

				// Get file path and create player
				const filePath = match[1].trim();
				const file = this.plugin.app.vault.getAbstractFileByPath(filePath);
				
				if (file && file instanceof TFile) {
					const settings = this.plugin.settings.audioFiles[file.path] || {
						...DEFAULT_AUDIO_FILE_SETTINGS,
					};
					const playerEl = document.createElement("span");
					playerEl.addClass("dungeon-dirge-inline-player");
					this.renderInlinePlayer(playerEl, file, settings);
					fragment.appendChild(playerEl);
				} else {
					// Show error inline
					const errorEl = document.createElement("span");
					errorEl.addClass("dungeon-dirge-error-inline");
					errorEl.textContent = `[Audio not found: ${filePath}]`;
					fragment.appendChild(errorEl);
				}

				lastIndex = match.index! + match[0].length;
			}

			// Add remaining text after last match
			if (lastIndex < text.length) {
				fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
			}

			parent.replaceChild(fragment, node);
		}
	}

	private renderInlinePlayer(
		container: HTMLElement,
		file: TFile,
		settings: AudioFileSettings
	) {
		const isPlaying = this.plugin.playerManager.isPlaying(file.path);
		const isStopping = this.plugin.playerManager.isStopping(file.path);

		// Track expanded state using a data attribute on the container
		// Note: container.dataset is preserved even after empty() on the parent span
		const isExpanded = container.dataset.expanded === "true";

		const playerContainer = container.createDiv({ cls: "dungeon-dirge-inline-container" });
		if (isPlaying) {
			playerContainer.addClass("is-playing");
		}
		if (isStopping) {
			playerContainer.addClass("is-stopping");
		}
		if (isExpanded) {
			playerContainer.addClass("is-expanded");
		}
		
		// First row: play, loop, title, timeline, timestamp, chevron
		const firstRow = playerContainer.createDiv({ cls: "dungeon-dirge-inline-row-1" });
		
		// Play/Stop button
		const playButton = firstRow.createEl("button", {
			text: isPlaying ? "■" : "▶",
			cls: `dungeon-dirge-play-button dungeon-dirge-inline-button ${isPlaying ? "mod-warning" : "mod-cta"}`
		});
		playButton.addEventListener("click", async (e) => {
			e.stopPropagation();
			if (isPlaying) {
				this.plugin.playerManager.stop(file.path, true);
			} else {
				await this.plugin.playerManager.play(file.path, settings);
			}
			// Re-render to update UI
			container.empty();
			container.dataset.expanded = isExpanded.toString();
			this.renderInlinePlayer(container, file, settings);
		});
		
		// Loop toggle button
		const loopButton = firstRow.createEl("button", {
			text: "↻",
			cls: `dungeon-dirge-loop-toggle dungeon-dirge-inline-button ${settings.repeat ? "is-active" : ""}`,
			attr: { "aria-label": "Toggle loop" }
		});
		loopButton.addEventListener("click", async (e) => {
			e.stopPropagation();
			settings.repeat = !settings.repeat;
			this.plugin.settings.audioFiles[file.path] = settings;
			await this.plugin.saveSettings();
			
			// Update the audio if currently playing
			if (isPlaying) {
				const audio = this.plugin.playerManager.getAudio(file.path);
				if (audio) {
					audio.loop = settings.repeat;
				}
			}
			// Re-render to update UI
			container.empty();
			container.dataset.expanded = isExpanded.toString();
			this.renderInlinePlayer(container, file, settings);
		});
		
		// Title (no editing)
		const displayName = settings.displayName || file.name;
		const title = firstRow.createEl("span", {
			text: displayName,
			cls: "dungeon-dirge-inline-title"
		});
		
		// Timeline with progress bar and timestamp
		const timelineContainer = firstRow.createDiv({ cls: "dungeon-dirge-inline-timeline" });
		const progressBar = timelineContainer.createDiv({ cls: "dungeon-dirge-progress-bar" });
		const progress = progressBar.createDiv({ cls: "dungeon-dirge-progress" });
		
		// Time display
		const timeDisplay = timelineContainer.createDiv({ cls: "dungeon-dirge-time-display dungeon-dirge-inline-time" });
		timeDisplay.setText("0:00 / 0:00");
		
		// Add chevron toggle button
		const chevronButton = firstRow.createEl("button", {
			text: "",
			cls: "dungeon-dirge-chevron-toggle dungeon-dirge-inline-chevron",
			attr: { "aria-label": isExpanded ? "Collapse" : "Expand" }
		});
		chevronButton.addEventListener("click", (e) => {
			e.stopPropagation();
			const newExpandedState = !isExpanded;
			container.empty();
			container.dataset.expanded = newExpandedState.toString();
			this.renderInlinePlayer(container, file, settings);
		});
		
		// Helper function to format time
		const formatTime = (seconds: number): string => {
			const mins = Math.floor(seconds / 60);
			const secs = Math.floor(seconds % 60);
			return `${mins}:${secs.toString().padStart(2, '0')}`;
		};
		
		// Get audio element and update progress
		const audio = this.plugin.playerManager.getAudio(file.path);
		
		// Load audio metadata to get duration
		const tempAudio = audio || new Audio(this.plugin.app.vault.adapter.getResourcePath(file.path));
		tempAudio.addEventListener('loadedmetadata', () => {
			if (tempAudio.duration && timeDisplay) {
				const total = formatTime(tempAudio.duration);
				if (!audio || !(isPlaying || isStopping)) {
					timeDisplay.setText(`0:00 / ${total}`);
				}
			}
		}, { once: true });
		
		// Trigger metadata load if not already loaded
		if (!tempAudio.duration && tempAudio.readyState === 0) {
			tempAudio.load();
		} else if (tempAudio.duration) {
			const total = formatTime(tempAudio.duration);
			if (!audio || !(isPlaying || isStopping)) {
				timeDisplay.setText(`0:00 / ${total}`);
			}
		}
		
		if (audio && (isPlaying || isStopping)) {
			const updateProgress = () => {
				if (audio.duration) {
					const percent = (audio.currentTime / audio.duration) * 100;
					progress.style.width = `${percent}%`;
					
					const current = formatTime(audio.currentTime);
					const total = formatTime(audio.duration);
					timeDisplay.setText(`${current} / ${total}`);
				}
			};
			
			// Initial update
			updateProgress();
			
			// Update every 100ms while playing
			const intervalId = window.setInterval(() => {
				if (!this.plugin.playerManager.isPlaying(file.path) && !this.plugin.playerManager.isStopping(file.path)) {
					window.clearInterval(intervalId);
				} else {
					updateProgress();
				}
			}, 100);
			
			// Make progress bar clickable for seeking
			progressBar.addEventListener("click", (e) => {
				e.stopPropagation();
				const rect = progressBar.getBoundingClientRect();
				const x = e.clientX - rect.left;
				const percent = x / rect.width;
				audio.currentTime = audio.duration * percent;
				updateProgress();
			});
		}
		
		// Drawer for advanced controls
		const drawer = playerContainer.createDiv({ cls: "dungeon-dirge-settings-drawer dungeon-dirge-inline-drawer" });
		const drawerContent = drawer.createDiv({ cls: "dungeon-dirge-drawer-content" });
		
		// Second row: Volume, Fade In, Fade Out sliders (inside drawer)
		const secondRow = drawerContent.createDiv({ cls: "dungeon-dirge-inline-row-2" });
		
		// Volume slider
		const volumeGroup = secondRow.createDiv({ cls: "dungeon-dirge-inline-control" });
		volumeGroup.createEl("label", { text: `Vol: ${Math.round(settings.volume * 100)}%`, cls: "dungeon-dirge-inline-label" });
		const volumeSlider = volumeGroup.createEl("input", {
			type: "range",
			cls: "dungeon-dirge-slider",
			attr: {
				min: "0",
				max: "1",
				step: "0.01",
				value: settings.volume.toString()
			}
		});
		volumeSlider.addEventListener("input", async (e) => {
			e.stopPropagation();
			settings.volume = parseFloat(volumeSlider.value);
			this.plugin.settings.audioFiles[file.path] = settings;
			await this.plugin.saveSettings();
			
			// Update label
			volumeGroup.querySelector("label")!.textContent = `Vol: ${Math.round(settings.volume * 100)}%`;
			
			// Update the audio if currently playing
			if (isPlaying) {
				const audio = this.plugin.playerManager.getAudio(file.path);
				if (audio) {
					audio.volume = settings.volume;
				}
			}
		});
		
		// Fade In slider
		const fadeInGroup = secondRow.createDiv({ cls: "dungeon-dirge-inline-control" });
		fadeInGroup.createEl("label", { text: `Fade In: ${settings.fadeIn}s`, cls: "dungeon-dirge-inline-label" });
		const fadeInSlider = fadeInGroup.createEl("input", {
			type: "range",
			cls: "dungeon-dirge-slider",
			attr: {
				min: "0",
				max: "30",
				step: "0.5",
				value: settings.fadeIn.toString()
			}
		});
		fadeInSlider.addEventListener("input", async (e) => {
			e.stopPropagation();
			settings.fadeIn = parseFloat(fadeInSlider.value);
			this.plugin.settings.audioFiles[file.path] = settings;
			await this.plugin.saveSettings();
			
			// Update label
			fadeInGroup.querySelector("label")!.textContent = `Fade In: ${settings.fadeIn}s`;
		});
		
		// Fade Out slider
		const fadeOutGroup = secondRow.createDiv({ cls: "dungeon-dirge-inline-control" });
		fadeOutGroup.createEl("label", { text: `Fade Out: ${settings.fadeOut}s`, cls: "dungeon-dirge-inline-label" });
		const fadeOutSlider = fadeOutGroup.createEl("input", {
			type: "range",
			cls: "dungeon-dirge-slider",
			attr: {
				min: "0",
				max: "30",
				step: "0.5",
				value: settings.fadeOut.toString()
			}
		});
		fadeOutSlider.addEventListener("input", async (e) => {
			e.stopPropagation();
			settings.fadeOut = parseFloat(fadeOutSlider.value);
			this.plugin.settings.audioFiles[file.path] = settings;
			await this.plugin.saveSettings();
			
			// Update label
			fadeOutGroup.querySelector("label")!.textContent = `Fade Out: ${settings.fadeOut}s`;
		});
	}
}
