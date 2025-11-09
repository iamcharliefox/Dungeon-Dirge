import { Plugin, WorkspaceLeaf } from "obsidian";
import { DungeonDirgeSettings, DEFAULT_SETTINGS } from "./types";
import { AudioPlayerManager } from "./audio-player";
import { DungeonDirgeView, VIEW_TYPE_DUNGEON_DIRGE } from "./view";
import { DungeonDirgeSettingTab } from "./settings-tab";

export default class DungeonDirgePlugin extends Plugin {
	settings: DungeonDirgeSettings;
	playerManager: AudioPlayerManager;

	async onload() {
		await this.loadSettings();

		// Initialize the audio player manager with vault
		this.playerManager = new AudioPlayerManager(this.app.vault);

		// Register the view
		this.registerView(
			VIEW_TYPE_DUNGEON_DIRGE,
			(leaf) => new DungeonDirgeView(leaf, this)
		);

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
