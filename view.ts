import { ItemView, WorkspaceLeaf, TFolder, TFile, Notice } from "obsidian";
import DungeonDirgePlugin from "./main";
import { AudioFileSettings, DEFAULT_AUDIO_FILE_SETTINGS } from "./types";

export const VIEW_TYPE_DUNGEON_DIRGE = "dungeon-dirge-view";

export class DungeonDirgeView extends ItemView {
	plugin: DungeonDirgePlugin;
	private expandedFiles: Set<string> = new Set();

	constructor(leaf: WorkspaceLeaf, plugin: DungeonDirgePlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return VIEW_TYPE_DUNGEON_DIRGE;
	}

	getDisplayText(): string {
		return "DungeonDirge";
	}

	getIcon(): string {
		return "music";
	}

	async onOpen(): Promise<void> {
		const containerEl = this.containerEl;
		containerEl.empty();
		containerEl.addClass("dungeon-dirge-view");

		this.render();
	}

	async onClose(): Promise<void> {
		this.plugin.playerManager.cleanup();
	}

	render(): void {
		const containerEl = this.containerEl;
		containerEl.empty();

		// Audio files section
		const audioSection = containerEl.createDiv({ cls: "dungeon-dirge-audio-section" });
		this.renderAudioFiles();
	}

	private async selectFolder(): Promise<string | null> {
		const folders = this.getAllFolders();
		// For simplicity, we'll use a modal to show folders
		// In a real implementation, you might want a more sophisticated folder picker
		return new Promise((resolve) => {
			const modal = new FolderSelectorModal(this.app, folders, (folder) => {
				resolve(folder);
			});
			modal.open();
		});
	}

	private getAllFolders(): string[] {
		const folders: string[] = [];
		const rootFolder = this.app.vault.getRoot();
		
		const collectFolders = (folder: TFolder) => {
			folders.push(folder.path || "/");
			folder.children.forEach(child => {
				if (child instanceof TFolder) {
					collectFolders(child);
				}
			});
		};

		collectFolders(rootFolder);
		return folders;
	}

	private renderAudioFiles(): void {
		const containerEl = this.containerEl;
		const audioSection = containerEl.querySelector(".dungeon-dirge-audio-section");
		if (!audioSection) return;

		audioSection.empty();

		const selectedFolder = this.plugin.settings.selectedFolder;
		if (!selectedFolder) {
			audioSection.createEl("p", { text: "Please select a folder to load audio files." });
			return;
		}

		const audioFiles = this.getAudioFilesInFolder(selectedFolder);
		if (audioFiles.length === 0) {
			audioSection.createEl("p", { text: "No audio files found in the selected folder." });
			return;
		}

		// Group files by tags
		const grouped = this.groupFilesByTags(audioFiles);
		
		// Sort tags by custom order, then alphabetically
		const tags = Object.keys(grouped);
		const orderedTags = this.getSortedTags(tags);
		
		// Render grouped files
		orderedTags.forEach((tag, index) => {
			const files = grouped[tag];
			const isCollapsed = this.plugin.settings.collapsedTags.includes(tag);
			
			const tagSection = audioSection.createDiv({ cls: "dungeon-dirge-tag-group" });
			tagSection.setAttribute("data-tag", tag);
			
			if (isCollapsed) {
				tagSection.addClass("is-collapsed");
			}
			
			const tagHeader = tagSection.createDiv({ cls: "dungeon-dirge-tag-header" });
			tagHeader.setAttribute("draggable", "true");
			
			// Add drag handle
			const dragHandle = tagHeader.createEl("span", {
				cls: "dungeon-dirge-drag-handle",
				text: "⋮⋮"
			});
			
			const tagTitle = tagHeader.createEl("h4", { text: `${tag || "Untagged"} (${files.length})` });
			if (!isCollapsed) {
				tagTitle.style.fontWeight = "bold";
			}
			
			// Make header clickable to toggle collapse (except drag handle)
			tagHeader.style.cursor = "pointer";
			tagHeader.addEventListener("click", async (e) => {
				// Don't collapse if clicking drag handle or if dragging
				if ((e.target as HTMLElement).classList.contains("dungeon-dirge-drag-handle")) {
					return;
				}
				if (this.plugin.settings.collapsedTags.includes(tag)) {
					this.plugin.settings.collapsedTags = this.plugin.settings.collapsedTags.filter(t => t !== tag);
				} else {
					this.plugin.settings.collapsedTags.push(tag);
				}
				await this.plugin.saveSettings();
				this.render();
			});

			// Drag and drop handlers on tagHeader instead of tagSection
			tagHeader.addEventListener("dragstart", (e) => {
				e.dataTransfer?.setData("text/plain", tag);
				tagSection.addClass("is-dragging");
			});

			tagHeader.addEventListener("dragend", () => {
				tagSection.removeClass("is-dragging");
			});

			tagHeader.addEventListener("dragover", (e) => {
				e.preventDefault();
				const draggingElement = document.querySelector(".is-dragging");
				if (draggingElement && draggingElement !== tagSection) {
					tagSection.addClass("drag-over");
				}
			});

			tagHeader.addEventListener("dragleave", () => {
				tagSection.removeClass("drag-over");
			});

			tagHeader.addEventListener("drop", async (e) => {
				e.preventDefault();
				tagSection.removeClass("drag-over");
				
				const draggedTag = e.dataTransfer?.getData("text/plain");
				if (draggedTag && draggedTag !== tag) {
					await this.reorderTags(draggedTag, tag);
				}
			});

			const filesList = tagSection.createDiv({ cls: "dungeon-dirge-files-list" });
			if (!isCollapsed) {
				// Sort files alphabetically by display name or filename
				const sortedFiles = files.sort((a, b) => {
					const nameA = this.getFileSettings(a.path).displayName || a.name;
					const nameB = this.getFileSettings(b.path).displayName || b.name;
					return nameA.localeCompare(nameB);
				});
				
				sortedFiles.forEach(file => {
					this.renderAudioFileItem(filesList, file);
				});
			}
		});
	}

	private renderAudioFileItem(container: HTMLElement, file: TFile): void {
		const settings = this.getFileSettings(file.path);
		const isPlaying = this.plugin.playerManager.isPlaying(file.path);
		const isStopping = this.plugin.playerManager.isStopping(file.path);
		const isExpanded = this.expandedFiles.has(file.path);

		const fileItem = container.createDiv({ cls: "dungeon-dirge-file-item" });
		if (isPlaying) {
			fileItem.addClass("is-playing");
		}
		if (isStopping) {
			fileItem.addClass("is-stopping");
		}
		if (isExpanded) {
			fileItem.addClass("is-expanded");
		}
		
		// Set transition duration based on fade-out time
		const fadeOutTime = settings.fadeOut || 0;
		fileItem.style.transition = `border-color ${fadeOutTime}s ease, background-color 0.2s ease`;

		// Add click handler to fileItem for expanding/collapsing
		fileItem.addEventListener("click", (e) => {
			// Check if the click target is an interactive element
			const target = e.target as HTMLElement;
			const isInteractive = target.closest('button, input, .dungeon-dirge-progress-bar');
			
			// Only toggle if not clicking on interactive elements
			if (!isInteractive) {
				if (this.expandedFiles.has(file.path)) {
					this.expandedFiles.delete(file.path);
				} else {
					this.expandedFiles.add(file.path);
				}
				this.render();
			}
		});

		// Create a row for file name and controls
		const mainRow = fileItem.createDiv({ cls: "dungeon-dirge-file-main-row" });
		
		// Play/Stop button with icons (before filename)
		const playButton = mainRow.createEl("button", {
			text: isPlaying ? "■" : "▶",
			cls: `dungeon-dirge-play-button ${isPlaying ? "mod-warning" : "mod-cta"}`
		});
		playButton.addEventListener("click", async () => {
			if (isPlaying) {
				console.log(`Stopping: ${file.path}`);
				this.plugin.playerManager.stop(file.path, true);
			} else {
				console.log(`Playing: ${file.path}`);
				await this.plugin.playerManager.play(file.path, settings);
			}
			this.render();
		});
		
		// Loop toggle button (next to play button)
		const loopButton = mainRow.createEl("button", {
			text: "↻",
			cls: `dungeon-dirge-loop-toggle ${settings.repeat ? "is-active" : ""}`,
			attr: { "aria-label": "Toggle loop" }
		});
		loopButton.addEventListener("click", async () => {
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
			this.render();
		});
		
		const fileInfo = mainRow.createDiv({ cls: "dungeon-dirge-file-info" });
		const displayName = settings.displayName || file.name;
		
		// Add chevron toggle button (text will be hidden by CSS, chevron drawn with CSS)
		const chevronButton = mainRow.createEl("button", {
			text: "",
			cls: "dungeon-dirge-chevron-toggle",
			attr: { "aria-label": isExpanded ? "Collapse" : "Expand" }
		});
		chevronButton.addEventListener("click", (e) => {
			e.stopPropagation();
			if (this.expandedFiles.has(file.path)) {
				this.expandedFiles.delete(file.path);
			} else {
				this.expandedFiles.add(file.path);
			}
			this.render();
		});
		
		if (isExpanded) {
			// Create a wrapper that matches timeline structure
			const titleRow = fileInfo.createDiv({ cls: "dungeon-dirge-title-row" });
			
			// Show inline edit input when expanded
			const input = titleRow.createEl("input", {
				type: "text",
				value: displayName,
				cls: "dungeon-dirge-file-name dungeon-dirge-inline-name-edit"
			});
			
			const saveAndExit = async () => {
				const newName = input.value.trim();
				// Only save if different from filename (empty means use filename)
				if (newName && newName !== file.name) {
					settings.displayName = newName;
				} else {
					settings.displayName = "";
				}
				this.plugin.settings.audioFiles[file.path] = settings;
				await this.plugin.saveSettings();
				this.render();
			};
			
			input.addEventListener("blur", saveAndExit);
			input.addEventListener("keydown", (e) => {
				if (e.key === "Enter") {
					saveAndExit();
				} else if (e.key === "Escape") {
					this.render();
				}
			});
		} else {
			// Show normal text when collapsed
			const fileName = fileInfo.createEl("div", { 
				text: displayName, 
				cls: "dungeon-dirge-file-name dungeon-dirge-file-name-editable"
			});
		}
		
		// Timeline/scrubber - structure changes based on expanded state
		let timeline: HTMLElement;
		if (isExpanded) {
			// When expanded, create timeline as a separate row in fileItem (after mainRow)
			timeline = fileItem.createDiv({ cls: "dungeon-dirge-timeline-compact dungeon-dirge-timeline-expanded" });
		} else {
			// When collapsed, timeline stays inside fileInfo
			timeline = fileInfo.createDiv({ cls: "dungeon-dirge-timeline-compact" });
		}
		
		const progressBar = timeline.createDiv({ cls: "dungeon-dirge-progress-bar" });
		const progress = progressBar.createDiv({ cls: "dungeon-dirge-progress" });
		
		// Time display (always shown now, not just when expanded)
		const timeDisplay = timeline.createDiv({ cls: "dungeon-dirge-time-display" });
		timeDisplay.setText("0:00 / 0:00");
		
		// Helper function to format time
		const formatTime = (seconds: number): string => {
			const mins = Math.floor(seconds / 60);
			const secs = Math.floor(seconds % 60);
			return `${mins}:${secs.toString().padStart(2, '0')}`;
		};
		
		// Get audio element and update progress if playing
		const audio = this.plugin.playerManager.getAudio(file.path);
		
		// Load audio metadata to get duration even when not playing
		const tempAudio = audio || new Audio(this.app.vault.adapter.getResourcePath(file.path));
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
					
					// Update time display if expanded
					if (timeDisplay) {
						const current = formatTime(audio.currentTime);
						const total = formatTime(audio.duration);
						timeDisplay.setText(`${current} / ${total}`);
					}
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
					const rect = progressBar.getBoundingClientRect();
					const x = e.clientX - rect.left;
					const percent = x / rect.width;
					audio.currentTime = audio.duration * percent;
					updateProgress();
			});
		}
		
		// Settings drawer (always present for animation)
		const drawer = fileItem.createDiv({ cls: "dungeon-dirge-settings-drawer" });
		const drawerContent = drawer.createDiv({ cls: "dungeon-dirge-settings-drawer-content" });
		
		if (isExpanded) {
			// All controls in one row
			const controlsRow = drawerContent.createDiv({ cls: "dungeon-dirge-controls-row" });			// Volume slider
			const volumeGroup = controlsRow.createDiv({ cls: "dungeon-dirge-setting-group dungeon-dirge-inline-group" });
			volumeGroup.createEl("label", { text: `Vol: ${Math.round(settings.volume * 100)}%` });
			const volumeSlider = volumeGroup.createEl("input", {
				type: "range",
				cls: "dungeon-dirge-slider",
				attr: {
					min: "0",
					max: "100",
					value: String(Math.round(settings.volume * 100))
				}
			});
			volumeSlider.addEventListener("input", async (e) => {
				const target = e.target as HTMLInputElement;
				const newVolume = parseInt(target.value) / 100;
				settings.volume = newVolume;
				this.plugin.settings.audioFiles[file.path] = settings;
				await this.plugin.saveSettings();
				
				// Update the label
				const label = volumeGroup.querySelector("label");
				if (label) {
					label.textContent = `Vol: ${Math.round(newVolume * 100)}%`;
				}
				
				// Update volume if currently playing
				if (isPlaying) {
					this.plugin.playerManager.setVolume(file.path, newVolume);
				}
			});
			
			// Fade In slider
			const fadeInGroup = controlsRow.createDiv({ cls: "dungeon-dirge-setting-group dungeon-dirge-inline-group" });
			fadeInGroup.createEl("label", { text: `Fade In: ${settings.fadeIn}s` });
			const fadeInSlider = fadeInGroup.createEl("input", {
				type: "range",
				cls: "dungeon-dirge-slider",
				attr: {
					min: "0",
					max: "30",
					step: "0.5",
					value: String(settings.fadeIn)
				}
			});
			fadeInSlider.addEventListener("input", async (e) => {
				const target = e.target as HTMLInputElement;
				const newFadeIn = parseFloat(target.value);
				settings.fadeIn = newFadeIn;
				this.plugin.settings.audioFiles[file.path] = settings;
				await this.plugin.saveSettings();
				
				// Update the label
				const label = fadeInGroup.querySelector("label");
				if (label) {
					label.textContent = `Fade In: ${newFadeIn}s`;
				}
			});
			
			// Fade Out slider
			const fadeOutGroup = controlsRow.createDiv({ cls: "dungeon-dirge-setting-group dungeon-dirge-inline-group" });
			fadeOutGroup.createEl("label", { text: `Fade Out: ${settings.fadeOut}s` });
			const fadeOutSlider = fadeOutGroup.createEl("input", {
				type: "range",
				cls: "dungeon-dirge-slider",
				attr: {
					min: "0",
					max: "30",
					step: "0.5",
					value: String(settings.fadeOut)
				}
			});
			fadeOutSlider.addEventListener("input", async (e) => {
				const target = e.target as HTMLInputElement;
				const newFadeOut = parseFloat(target.value);
				settings.fadeOut = newFadeOut;
				this.plugin.settings.audioFiles[file.path] = settings;
				await this.plugin.saveSettings();
				
				// Update the label
				const label = fadeOutGroup.querySelector("label");
				if (label) {
					label.textContent = `Fade Out: ${newFadeOut}s`;
				}
			});
			
			// Tags
			const tagsGroup = drawerContent.createDiv({ cls: "dungeon-dirge-setting-group" });
			tagsGroup.createEl("label", { text: "Tags (comma-separated)" });
			const tagsInput = tagsGroup.createEl("input", {
				type: "text",
				placeholder: "ambient, combat",
				value: settings.tags.join(", ")
			});
			tagsInput.addEventListener("input", async () => {
				settings.tags = tagsInput.value.split(",").map(t => t.trim()).filter(t => t.length > 0);
				this.plugin.settings.audioFiles[file.path] = settings;
				await this.plugin.saveSettings();
			});
			tagsInput.addEventListener("blur", () => {
				this.render();
			});
		}
	}

	private getAudioFilesInFolder(folderPath: string): TFile[] {
		const folder = this.app.vault.getAbstractFileByPath(folderPath);
		if (!folder || !(folder instanceof TFolder)) {
			return [];
		}

		const audioExtensions = [".mp3", ".wav", ".ogg", ".m4a", ".flac", ".aac"];
		const audioFiles: TFile[] = [];

		const collectAudioFiles = (folder: TFolder) => {
			folder.children.forEach(child => {
				if (child instanceof TFile) {
					if (audioExtensions.some(ext => child.path.toLowerCase().endsWith(ext))) {
						audioFiles.push(child);
					}
				} else if (child instanceof TFolder) {
					collectAudioFiles(child);
				}
			});
		};

		collectAudioFiles(folder);
		return audioFiles;
	}

	private getFileSettings(filePath: string): AudioFileSettings {
		if (!this.plugin.settings.audioFiles[filePath]) {
			this.plugin.settings.audioFiles[filePath] = {
				path: filePath,
				...DEFAULT_AUDIO_FILE_SETTINGS
			} as AudioFileSettings;
		}
		return this.plugin.settings.audioFiles[filePath];
	}

	private groupFilesByTags(files: TFile[]): Record<string, TFile[]> {
		const grouped: Record<string, TFile[]> = {};

		files.forEach(file => {
			const settings = this.getFileSettings(file.path);
			if (settings.tags.length === 0) {
				if (!grouped["Untagged"]) {
					grouped["Untagged"] = [];
				}
				grouped["Untagged"].push(file);
			} else {
				settings.tags.forEach(tag => {
					if (!grouped[tag]) {
						grouped[tag] = [];
					}
					grouped[tag].push(file);
				});
			}
		});

		return grouped;
	}

	private getSortedTags(tags: string[]): string[] {
		const { tagGroupOrder } = this.plugin.settings;
		
		// Separate tags that are in the custom order from those that aren't
		const orderedTags = tagGroupOrder.filter(tag => tags.includes(tag));
		const unorderedTags = tags.filter(tag => !tagGroupOrder.includes(tag)).sort();
		
		return [...orderedTags, ...unorderedTags];
	}

	private async reorderTags(draggedTag: string, targetTag: string): Promise<void> {
		const audioFiles = this.getAudioFilesInFolder(this.plugin.settings.selectedFolder);
		const grouped = this.groupFilesByTags(audioFiles);
		const allTags = Object.keys(grouped);
		
		// Get current order
		let currentOrder = this.getSortedTags(allTags);
		
		// Remove dragged tag and insert before target
		currentOrder = currentOrder.filter(t => t !== draggedTag);
		const targetIndex = currentOrder.indexOf(targetTag);
		currentOrder.splice(targetIndex, 0, draggedTag);
		
		// Save new order
		this.plugin.settings.tagGroupOrder = currentOrder;
		await this.plugin.saveSettings();
		this.render();
	}
}

// Simple folder selector modal
class FolderSelectorModal extends Modal {
	folders: string[];
	onSelect: (folder: string) => void;

	constructor(app: App, folders: string[], onSelect: (folder: string) => void) {
		super(app);
		this.folders = folders;
		this.onSelect = onSelect;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl("h2", { text: "Select Audio Folder" });

		const folderList = contentEl.createDiv({ cls: "dungeon-dirge-folder-list" });
		this.folders.forEach(folder => {
			const folderItem = folderList.createDiv({ cls: "dungeon-dirge-folder-item" });
			folderItem.createEl("div", { text: folder });
			folderItem.addEventListener("click", () => {
				this.onSelect(folder);
				this.close();
			});
		});
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}
}

// Import Modal at the top
import { App, Modal } from "obsidian";
