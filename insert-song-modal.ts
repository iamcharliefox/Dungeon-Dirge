import { App, Modal, TFile, Setting } from "obsidian";
import DungeonDirgePlugin from "./main";

export class InsertSongModal extends Modal {
	plugin: DungeonDirgePlugin;
	onSelect: (file: TFile) => void;
	selectedFile: TFile | null = null;

	constructor(app: App, plugin: DungeonDirgePlugin, onSelect: (file: TFile) => void) {
		super(app);
		this.plugin = plugin;
		this.onSelect = onSelect;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl("h2", { text: "Insert Song" });

		// Get all audio files from the vault
		const audioFiles = this.app.vault.getFiles().filter((file) => {
			const ext = file.extension.toLowerCase();
			return ext === "mp3" || ext === "wav" || ext === "ogg" || ext === "m4a" || ext === "flac";
		});

		if (audioFiles.length === 0) {
			contentEl.createEl("p", { text: "No audio files found in vault." });
			return;
		}

		// Group by folder for better organization
		const filesByFolder = new Map<string, TFile[]>();
		for (const file of audioFiles) {
			const folder = file.parent?.path || "(root)";
			if (!filesByFolder.has(folder)) {
				filesByFolder.set(folder, []);
			}
			filesByFolder.get(folder)!.push(file);
		}

		// Sort folders
		const sortedFolders = Array.from(filesByFolder.keys()).sort();

		// Create search input
		const searchContainer = contentEl.createDiv({ cls: "dungeon-dirge-search-container" });
		let searchInput: HTMLInputElement;
		
		new Setting(searchContainer)
			.setName("Search")
			.addText((text) => {
				searchInput = text.inputEl;
				text.setPlaceholder("Filter songs...")
					.onChange((value) => {
						this.filterFiles(listContainer, filesByFolder, value.toLowerCase());
					});
			});

		// Create scrollable list container
		const listContainer = contentEl.createDiv({ cls: "dungeon-dirge-file-list" });

		this.renderFileList(listContainer, filesByFolder, sortedFolders);

		// Buttons
		const buttonContainer = contentEl.createDiv({ cls: "dungeon-dirge-modal-buttons" });
		
		const cancelButton = buttonContainer.createEl("button", { text: "Cancel" });
		cancelButton.addEventListener("click", () => {
			this.close();
		});

		const insertButton = buttonContainer.createEl("button", {
			text: "Insert",
			cls: "mod-cta"
		});
		insertButton.disabled = true;
		insertButton.addEventListener("click", () => {
			if (this.selectedFile) {
				this.onSelect(this.selectedFile);
				this.close();
			}
		});

		// Enable insert button when a file is selected
		this.onFileSelect = (file) => {
			this.selectedFile = file;
			insertButton.disabled = false;
		};
	}

	onFileSelect: ((file: TFile) => void) | null = null;

	private renderFileList(
		container: HTMLElement,
		filesByFolder: Map<string, TFile[]>,
		folders: string[]
	) {
		container.empty();

		for (const folder of folders) {
			const files = filesByFolder.get(folder)!;
			
			// Folder header
			const folderHeader = container.createDiv({ cls: "dungeon-dirge-folder-header" });
			folderHeader.createEl("strong", { text: folder });

			// Files in this folder
			for (const file of files.sort((a, b) => a.name.localeCompare(b.name))) {
				const fileItem = container.createDiv({ cls: "dungeon-dirge-modal-file-item" });
				
				// Get display name from settings if available
				const settings = this.plugin.settings.audioFiles[file.path];
				const displayName = settings?.displayName || file.name;
				
				fileItem.createEl("span", { text: displayName });
				
				fileItem.addEventListener("click", () => {
					// Remove selection from all items
					container.querySelectorAll(".dungeon-dirge-modal-file-item").forEach((el) => {
						el.removeClass("is-selected");
					});
					
					// Select this item
					fileItem.addClass("is-selected");
					
					if (this.onFileSelect) {
						this.onFileSelect(file);
					}
				});
			}
		}
	}

	private filterFiles(
		container: HTMLElement,
		filesByFolder: Map<string, TFile[]>,
		searchTerm: string
	) {
		if (!searchTerm) {
			// Show all
			const sortedFolders = Array.from(filesByFolder.keys()).sort();
			this.renderFileList(container, filesByFolder, sortedFolders);
			return;
		}

		// Filter files
		const filtered = new Map<string, TFile[]>();
		for (const [folder, files] of filesByFolder) {
			const matchingFiles = files.filter((file) => {
				const settings = this.plugin.settings.audioFiles[file.path];
				const displayName = settings?.displayName || file.name;
				return displayName.toLowerCase().includes(searchTerm) ||
					   file.path.toLowerCase().includes(searchTerm);
			});

			if (matchingFiles.length > 0) {
				filtered.set(folder, matchingFiles);
			}
		}

		const sortedFolders = Array.from(filtered.keys()).sort();
		this.renderFileList(container, filtered, sortedFolders);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
