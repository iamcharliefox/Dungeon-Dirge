// Data models and interfaces for DungeonDirge plugin

export interface AudioFileSettings {
	path: string;
	fadeIn: number; // in seconds
	fadeOut: number; // in seconds
	volume: number; // 0-1
	repeat: boolean;
	tags: string[];
}

export interface DungeonDirgeSettings {
	selectedFolder: string;
	audioFiles: Record<string, AudioFileSettings>; // key: file path
}

export const DEFAULT_SETTINGS: DungeonDirgeSettings = {
	selectedFolder: "",
	audioFiles: {}
};

export const DEFAULT_AUDIO_FILE_SETTINGS: Partial<AudioFileSettings> = {
	fadeIn: 0,
	fadeOut: 0,
	volume: 0.7,
	repeat: false,
	tags: []
};
