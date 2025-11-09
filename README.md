# DungeonDirge

An Obsidian plugin for playing and managing audio files with advanced features for creating layered soundscapes. Perfect for tabletop RPG sessions, ambient music, or any scenario where you need to play multiple audio tracks simultaneously.

## Features

- 🎵 **Multi-track playback**: Play multiple audio files simultaneously
- 🔊 **Volume control**: Individual volume sliders for each track
- 🎚️ **Fade effects**: Configurable fade-in and fade-out durations
- 🔄 **Loop support**: Enable repeat/loop for individual tracks
- 🏷️ **Tag organization**: Organize audio files with custom tags
- 📁 **Folder-based**: Select any folder in your vault containing audio files
- 💾 **Persistent settings**: All configurations are saved and restored
- 🎛️ **Group controls**: Play or stop all tracks in a tag group at once

## Supported Audio Formats

- MP3 (.mp3)
- WAV (.wav)
- OGG (.ogg)
- M4A (.m4a)
- FLAC (.flac)
- AAC (.aac)

## Installation

### From GitHub Releases (Recommended)

1. Download the latest release from the GitHub releases page
2. Extract the files to your vault's plugins folder: `<vault>/.obsidian/plugins/dungeon-dirge/`
3. Reload Obsidian
4. Enable the plugin in Settings → Community Plugins

### Manual Installation

1. Clone this repository or download the source code
2. Navigate to the plugin directory:

   ```bash
   cd DungeonDirge
   ```

3. Install dependencies:

   ```bash
   npm install
   ```

4. Build the plugin:

   ```bash
   npm run build
   ```

5. Copy the following files to your vault's plugin folder `<vault>/.obsidian/plugins/dungeon-dirge/`:

   - `main.js`
   - `manifest.json`
   - `styles.css`

6. Reload Obsidian and enable the plugin

## Development

### Prerequisites

- Node.js (v16 or higher)
- npm

### Setup

1. Clone the repository:

   ```bash
   git clone <your-repo-url>
   cd DungeonDirge
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start development mode (watches for changes and rebuilds):

   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

### Project Structure

```
DungeonDirge/
├── main.ts              # Main plugin file
├── types.ts             # TypeScript interfaces and types
├── audio-player.ts      # Audio playback manager with fade effects
├── view.ts              # Main UI view component
├── settings-modal.ts    # Modal for editing audio file settings
├── settings-tab.ts      # Plugin settings tab
├── styles.css           # Plugin styles
├── manifest.json        # Plugin manifest
├── package.json         # Node.js dependencies
├── tsconfig.json        # TypeScript configuration
└── esbuild.config.mjs   # Build configuration
```

## Usage

### Opening the Plugin

1. Click the music icon in the left ribbon, or
2. Use the command palette (Cmd/Ctrl + P) and search for "Open DungeonDirge"

The plugin will open in the right sidebar.

### Selecting an Audio Folder

1. Enter the path to a folder in your vault containing audio files
2. Click "Browse" to select from a list of folders
3. The plugin will automatically load all supported audio files from that folder (including subfolders)

### Playing Audio

1. Click the "Play" button next to any audio file
2. Adjust the volume using the slider while playing
3. Click "Stop" to stop playback with fade-out (if configured)

### Configuring Audio Settings

Click the ⚙️ (settings) button next to any audio file to configure:

- **Fade In Duration**: Time in seconds to gradually increase volume when starting
- **Fade Out Duration**: Time in seconds to gradually decrease volume when stopping
- **Volume**: Default volume level (0-100%)
- **Repeat/Loop**: Whether the track should loop continuously
- **Tags**: Comma-separated tags for organization (e.g., "ambient, forest, peaceful")

### Using Tags

- Audio files are automatically grouped by their tags
- Use the "Play All" button to start all tracks in a tag group
- Use the "Stop All" button to stop all tracks in a tag group
- Files without tags appear in the "Untagged" group

### Examples

**Creating an ambient forest scene:**

- Tag: "forest"
- Files: birds.mp3, wind.mp3, stream.mp3
- Set all to loop, adjust volumes, add fade-in/out
- Click "Play All" in the forest tag group

**Combat music with transitions:**

- Tag: "combat"
- File: battle-theme.mp3 (fade-in: 2s, fade-out: 3s, no loop)

## Tips

- Use lower volumes for ambient/background tracks and higher for primary music
- Fade effects create smooth transitions between scenes
- Organize by scene/mood with tags like "town", "dungeon", "combat", "peaceful"
- Multiple tags per file allow flexible organization
- The volume slider updates in real-time while tracks are playing

## Troubleshooting

**Audio files not appearing:**

- Ensure the folder path is correct relative to your vault root
- Check that files have supported extensions
- Verify files are actually in the specified folder

**Audio not playing:**

- Check your system volume
- Verify the file format is supported by your browser
- Try a different audio file to isolate the issue

**Settings not saving:**

- Ensure you have write permissions to your vault
- Check the Obsidian console for errors (Cmd/Ctrl + Shift + I)

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

MIT

## Support

If you encounter any issues or have feature requests, please open an issue on GitHub.

## Roadmap

- [ ] Crossfade between tracks
- [ ] Playlists/presets for quick scene switching
- [ ] Audio visualization
- [ ] Global volume control
- [ ] Search/filter audio files
- [ ] Drag-and-drop file ordering
- [ ] Export/import configurations
- [ ] Keyboard shortcuts for play/stop

---

Made with ❤️ for tabletop RPG enthusiasts and Obsidian users
