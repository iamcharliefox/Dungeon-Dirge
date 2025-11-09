# DungeonDirge - Quick Installation Guide

## What You Need

The following files are required to install DungeonDirge in your Obsidian vault:

- `main.js` (generated after building)
- `manifest.json`
- `styles.css`

## Installation Steps

### Option 1: Install in Your Obsidian Vault

1. Navigate to your Obsidian vault's plugins folder:

   ```
   <your-vault>/.obsidian/plugins/
   ```

2. Create a new folder called `dungeon-dirge`:

   ```
   <your-vault>/.obsidian/plugins/dungeon-dirge/
   ```

3. Copy these three files into that folder:

   - `main.js`
   - `manifest.json`
   - `styles.css`

4. Open Obsidian or reload it if already open

5. Go to Settings → Community Plugins

6. Enable "DungeonDirge"

7. You should see a music icon in the left ribbon - click it to open DungeonDirge!

### Option 2: Development Mode

If you want to work on the plugin and see live changes:

1. Create a symbolic link from the plugin directory to your vault:

   ```bash
   ln -s /Users/charlie/Dev/DungeonDirge /path/to/your/vault/.obsidian/plugins/dungeon-dirge
   ```

2. In the DungeonDirge directory, run:

   ```bash
   npm run dev
   ```

3. This will watch for changes and rebuild automatically

4. Reload Obsidian (Cmd/Ctrl + R) to see changes

## First Time Setup

After enabling the plugin:

1. Click the music icon in the left ribbon (or use Cmd/Ctrl + P → "Open DungeonDirge")

2. The plugin will open in the right sidebar

3. Enter a folder path that contains your audio files (e.g., "Music/Ambient")

4. Click "Browse" to select from available folders

5. Your audio files will appear, organized by tags (initially all "Untagged")

6. Click the ⚙️ button next to any file to configure:

   - Fade-in/fade-out times
   - Volume
   - Loop/repeat
   - Tags for organization

7. Click "Play" to start playback!

## Example Folder Structure

```
your-vault/
├── .obsidian/
│   └── plugins/
│       └── dungeon-dirge/
│           ├── main.js
│           ├── manifest.json
│           └── styles.css
└── Audio/
    ├── Ambient/
    │   ├── forest.mp3
    │   ├── rain.mp3
    │   └── wind.mp3
    └── Combat/
        └── battle.mp3
```

In this example, you would set the folder path to "Audio/Ambient" or "Audio/Combat".

## Supported Audio Formats

- MP3 (.mp3)
- WAV (.wav)
- OGG (.ogg)
- M4A (.m4a)
- FLAC (.flac)
- AAC (.aac)

## Tips

- **Organization**: Use tags like "ambient", "combat", "town", "peaceful" to group similar tracks
- **Layering**: Play multiple ambient tracks simultaneously for rich soundscapes
- **Smooth Transitions**: Set fade-in/out times (e.g., 2-3 seconds) for smooth scene changes
- **Volume Balance**: Keep ambient sounds at 30-50% volume, music at 60-80%
- **Loop Settings**: Enable repeat for ambient tracks, disable for one-time music cues

## Troubleshooting

**Plugin doesn't appear in the list:**

- Make sure all three files (main.js, manifest.json, styles.css) are in the correct folder
- Try closing and reopening Obsidian

**No audio files showing:**

- Verify the folder path is correct (relative to vault root)
- Ensure files have supported extensions
- Check that the folder actually contains audio files

**Can't hear audio:**

- Check system volume
- Verify the track isn't at 0% volume
- Try a different audio file to rule out file corruption

**Settings not saving:**

- Check you have write permissions to your vault folder
- Look for errors in the Developer Console (Cmd/Ctrl + Shift + I)

## Need Help?

Check the full README.md for more detailed information, or open an issue on GitHub.

Enjoy your audio adventures! 🎵
