import { Plugin, WorkspaceLeaf, MarkdownView } from "obsidian";
import { DungeonDirgeSettings, DEFAULT_SETTINGS } from "./types";
import { AudioPlayerManager } from "./audio-player";
import { DungeonDirgeView, VIEW_TYPE_DUNGEON_DIRGE } from "./view";
import { DungeonDirgeSettingTab } from "./settings-tab";
import { DungeonDirgeInlineProcessor } from "./code-block-processor";
import { InsertSongModal } from "./insert-song-modal";

export default class DungeonDirgePlugin extends Plugin {
	settings: DungeonDirgeSettings;
	playerManager: AudioPlayerManager;
	inlineProcessor: DungeonDirgeInlineProcessor;

	async onload() {
		await this.loadSettings();

		// Initialize the audio player manager with vault
		this.playerManager = new AudioPlayerManager(this.app.vault);

		// Initialize inline processor
		this.inlineProcessor = new DungeonDirgeInlineProcessor(this);

		// Register the view
		this.registerView(
			VIEW_TYPE_DUNGEON_DIRGE,
			(leaf) => new DungeonDirgeView(leaf, this)
		);

		// Register markdown post processor for inline syntax
		this.registerMarkdownPostProcessor((el, ctx) => {
			this.inlineProcessor.processInline(el, ctx);
		});

		// Add ribbon icon
		this.addRibbonIcon("music", "Open DungeonDirge", () => {
			this.activateView();
		});

		// Add command to open the view
		this.addCommand({
			id: "open-dungeon-dirge",
			name: "Open DungeonDirge",
			callback: () => {
				this.activateView();
			}
		});

		// Add command to insert song
		this.addCommand({
			id: "insert-song",
			name: "Insert Song",
			editorCallback: (editor, view) => {
				const modal = new InsertSongModal(this.app, this, (file) => {
					const songSyntax = `{{song: ${file.path}}}`;
					editor.replaceSelection(songSyntax);
				});
				modal.open();
			}
		});

		// Add settings tab
		this.addSettingTab(new DungeonDirgeSettingTab(this.app, this));
	}

	async onunload() {
		// Stop all playing audio
		this.playerManager.cleanup();

		// Detach all views
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_DUNGEON_DIRGE);
	}

	async activateView() {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_DUNGEON_DIRGE);

		if (leaves.length > 0) {
			// View already exists, reveal it
			leaf = leaves[0];
		} else {
			// Create new view in right sidebar
			leaf = workspace.getRightLeaf(false);
			if (leaf) {
				await leaf.setViewState({
					type: VIEW_TYPE_DUNGEON_DIRGE,
					active: true,
				});
			}
		}

		// Reveal the leaf
		if (leaf) {
			workspace.revealLeaf(leaf);
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
