import { App, PluginSettingTab, Setting, TFolder, Modal } from "obsidian";
import DungeonDirgePlugin from "./main";

// Folder selector modal
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

export class DungeonDirgeSettingTab extends PluginSettingTab {
	plugin: DungeonDirgePlugin;

	constructor(app: App, plugin: DungeonDirgePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	private getAllFolders(): string[] {
		const folders: string[] = [];
		const rootFolder = this.app.vault.getRoot();
		
		const collectFolders = (folder: TFolder) => {
			folders.push(folder.path || "/");
			folder.children.forEach((child: any) => {
				if (child instanceof TFolder) {
					collectFolders(child);
				}
			});
		};

		collectFolders(rootFolder);
		return folders;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl("h2", { text: "Dungeon Dirge Settings" });

		// Folder selection
		new Setting(containerEl)
			.setName("Audio Folder")
			.setDesc("The folder containing your audio files")
			.addText(text => text
				.setPlaceholder("audio")
				.setValue(this.plugin.settings.selectedFolder)
				.onChange(async (value) => {
					this.plugin.settings.selectedFolder = value;
					await this.plugin.saveSettings();
					// Refresh the view if it's open
					const leaves = this.app.workspace.getLeavesOfType("dungeon-dirge-view");
					leaves.forEach(leaf => {
						(leaf.view as any).render?.();
					});
				}));

		// Add a Browse button
		new Setting(containerEl)
			.setName("Browse Folders")
			.setDesc("Select a folder from your vault")
			.addButton(button => button
				.setButtonText("Browse")
				.onClick(async () => {
					const folders = this.getAllFolders();
					const modal = new FolderSelectorModal(this.app, folders, async (folder) => {
						this.plugin.settings.selectedFolder = folder;
						await this.plugin.saveSettings();
						// Refresh the display
						this.display();
						// Refresh the view if it's open
						const leaves = this.app.workspace.getLeavesOfType("dungeon-dirge-view");
						leaves.forEach(leaf => {
							(leaf.view as any).render?.();
						});
					});
					modal.open();
				}));

		containerEl.createEl("h3", { text: "About" });
		containerEl.createEl("p", { 
			text: "Dungeon Dirge allows you to play multiple audio files simultaneously with customizable fade effects, volume control, and tag-based organization. Perfect for tabletop RPG background music and ambiance."
		});

		containerEl.createEl("p", { 
			text: "Select a folder containing audio files, configure individual track settings, and organize them with tags. You can play multiple tracks at once to create layered soundscapes."
		});
	}
}
