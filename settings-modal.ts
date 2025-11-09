import { App, Modal, Setting } from "obsidian";
import { AudioFileSettings } from "./types";

export class AudioFileSettingsModal extends Modal {
	settings: AudioFileSettings;
	onSave: (settings: AudioFileSettings) => void;

	constructor(
		app: App,
		settings: AudioFileSettings,
		onSave: (settings: AudioFileSettings) => void
	) {
		super(app);
		this.settings = { ...settings }; // Create a copy
		this.onSave = onSave;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl("h2", { text: "Audio File Settings" });
		contentEl.createEl("p", { text: this.settings.path, cls: "dungeon-dirge-modal-path" });

		// Display Name
		new Setting(contentEl)
			.setName("Display Name")
			.setDesc("Custom name to display (defaults to filename if empty)")
			.addText(text => text
				.setPlaceholder("Enter custom name")
				.setValue(this.settings.displayName || "")
				.onChange(value => {
					this.settings.displayName = value;
				}));

		// Fade In
		new Setting(contentEl)
			.setName("Fade In Duration")
			.setDesc("Fade in duration in seconds")
			.addText(text => text
				.setPlaceholder("0")
				.setValue(String(this.settings.fadeIn))
				.onChange(value => {
					const num = parseFloat(value);
					if (!isNaN(num) && num >= 0) {
						this.settings.fadeIn = num;
					}
				}));

		// Fade Out
		new Setting(contentEl)
			.setName("Fade Out Duration")
			.setDesc("Fade out duration in seconds")
			.addText(text => text
				.setPlaceholder("0")
				.setValue(String(this.settings.fadeOut))
				.onChange(value => {
					const num = parseFloat(value);
					if (!isNaN(num) && num >= 0) {
						this.settings.fadeOut = num;
					}
				}));

		// Volume
		new Setting(contentEl)
			.setName("Volume")
			.setDesc("Volume level (0-100)")
			.addSlider(slider => slider
				.setLimits(0, 100, 1)
				.setValue(this.settings.volume * 100)
				.setDynamicTooltip()
				.onChange(value => {
					this.settings.volume = value / 100;
				}));

		// Repeat
		new Setting(contentEl)
			.setName("Repeat/Loop")
			.setDesc("Loop this audio file")
			.addToggle(toggle => toggle
				.setValue(this.settings.repeat)
				.onChange(value => {
					this.settings.repeat = value;
				}));

		// Tags
		new Setting(contentEl)
			.setName("Tags")
			.setDesc("Comma-separated tags for organizing audio files")
			.addText(text => text
				.setPlaceholder("ambient, combat, exploration")
				.setValue(this.settings.tags.join(", "))
				.onChange(value => {
					this.settings.tags = value
						.split(",")
						.map(tag => tag.trim())
						.filter(tag => tag.length > 0);
				}));

		// Save button
		new Setting(contentEl)
			.addButton(button => button
				.setButtonText("Save")
				.setCta()
				.onClick(() => {
					this.onSave(this.settings);
					this.close();
				}))
			.addButton(button => button
				.setButtonText("Cancel")
				.onClick(() => {
					this.close();
				}));
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}
}
