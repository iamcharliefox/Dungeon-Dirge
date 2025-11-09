import { ItemView, WorkspaceLeaf, TFolder, TFile, Notice } from "obsidian";
import DungeonDirgePlugin from "./main";
import { AudioFileSettings, DEFAULT_AUDIO_FILE_SETTINGS } from "./types";
import { AudioFileSettingsModal } from "./settings-modal";

export const VIEW_TYPE_DUNGEON_DIRGE = "dungeon-dirge-view";

export class DungeonDirgeView extends ItemView {
	plugin: DungeonDirgePlugin;
	private collapsedGroups: Set<string> = new Set();

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

		// Stop all button
		const controlsSection = containerEl.createDiv({ cls: "dungeon-dirge-controls" });
		const stopAllButton = controlsSection.createEl("button", { 
			text: "Stop All", 
			cls: "mod-warning" 
		});
		stopAllButton.addEventListener("click", () => {
			this.plugin.playerManager.stopAll(true);
			this.render();
		});
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
		
		// Render grouped files
		for (const [tag, files] of Object.entries(grouped)) {
			const isCollapsed = this.collapsedGroups.has(tag);
			
			const tagSection = audioSection.createDiv({ cls: "dungeon-dirge-tag-group" });
			if (isCollapsed) {
				tagSection.addClass("is-collapsed");
			}
			
			const tagHeader = tagSection.createDiv({ cls: "dungeon-dirge-tag-header" });
			
			// Add collapse indicator
			const collapseIcon = tagHeader.createEl("span", { 
				cls: "dungeon-dirge-collapse-icon",
				text: isCollapsed ? "▶" : "▼"
			});
			
			tagHeader.createEl("h4", { text: tag || "Untagged" });
			
			// Make header clickable to toggle collapse
			tagHeader.style.cursor = "pointer";
			tagHeader.addEventListener("click", () => {
				if (this.collapsedGroups.has(tag)) {
					this.collapsedGroups.delete(tag);
				} else {
					this.collapsedGroups.add(tag);
				}
				this.render();
			});

			const filesList = tagSection.createDiv({ cls: "dungeon-dirge-files-list" });
			if (!isCollapsed) {
				files.forEach(file => {
					this.renderAudioFileItem(filesList, file);
				});
			}
		}
	}

	private renderAudioFileItem(container: HTMLElement, file: TFile): void {
		const settings = this.getFileSettings(file.path);
		const isPlaying = this.plugin.playerManager.isPlaying(file.path);
		const isStopping = this.plugin.playerManager.isStopping(file.path);

		const fileItem = container.createDiv({ cls: "dungeon-dirge-file-item" });
		if (isPlaying) {
			fileItem.addClass("is-playing");
		}
		if (isStopping) {
			fileItem.addClass("is-stopping");
		}
		
		// Set transition duration based on fade-out time
		const fadeOutTime = settings.fadeOut || 0;
		fileItem.style.transition = `border-color ${fadeOutTime}s ease, background-color 0.2s ease`;

		const fileInfo = fileItem.createDiv({ cls: "dungeon-dirge-file-info" });
		const displayName = settings.displayName || file.name;
		fileInfo.createEl("div", { text: displayName, cls: "dungeon-dirge-file-name" });

		const controls = fileItem.createDiv({ cls: "dungeon-dirge-file-controls" });

		// Play/Stop button with icons
		const playButton = controls.createEl("button", {
			text: isPlaying ? "■" : "▶",
			cls: isPlaying ? "mod-warning" : "mod-cta"
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

		// Volume slider
		const volumeContainer = controls.createDiv({ cls: "dungeon-dirge-volume-container" });
		const volumeSlider = volumeContainer.createEl("input", {
			type: "range",
			cls: "dungeon-dirge-volume-slider",
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
			
			// Update volume if currently playing
			if (isPlaying) {
				this.plugin.playerManager.setVolume(file.path, newVolume);
			}
		});

		// Settings button
		const settingsButton = controls.createEl("button", {
			text: "⚙️",
			cls: "dungeon-dirge-settings-btn"
		});
		settingsButton.addEventListener("click", () => {
			const modal = new AudioFileSettingsModal(
				this.app,
				settings,
				async (newSettings) => {
					this.plugin.settings.audioFiles[file.path] = newSettings;
					await this.plugin.saveSettings();
					this.render();
				}
			);
			modal.open();
		});
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
