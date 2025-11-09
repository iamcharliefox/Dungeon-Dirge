// Data models and interfaces for DungeonDirge plugin

export interface AudioFileSettings {
	path: string;
	displayName?: string; // optional custom name
	fadeIn: number; // in seconds
	fadeOut: number; // in seconds
	volume: number; // 0-1
	repeat: boolean;
	tags: string[];
}

export interface DungeonDirgeSettings {
	selectedFolder: string;
	audioFiles: Record<string, AudioFileSettings>; // key: file path
	showTimeline: boolean;
	showFadeIn: boolean;
	showFadeOut: boolean;
	showRepeat: boolean;
	tagGroupOrder: string[]; // custom order of tag groups
}

export const DEFAULT_SETTINGS: DungeonDirgeSettings = {
	selectedFolder: "",
	audioFiles: {},
	showTimeline: true,
	showFadeIn: true,
	showFadeOut: true,
	showRepeat: true,
	tagGroupOrder: []
};

export const DEFAULT_AUDIO_FILE_SETTINGS: Partial<AudioFileSettings> = {
	displayName: "",
	fadeIn: 0,
	fadeOut: 0,
	volume: 0.7,
	repeat: false,
	tags: []
};
