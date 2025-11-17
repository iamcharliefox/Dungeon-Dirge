# CLAUDE.md - Developer Guide for AI Assistants

## Project Overview

**Dungeon Dirge** is an Obsidian plugin for playing and managing audio files with advanced features for creating layered soundscapes. It's designed for tabletop RPG sessions, ambient music, or any scenario requiring simultaneous multi-track audio playback.

**Key Capabilities:**
- Multi-track simultaneous audio playback
- Individual volume control with real-time adjustment
- Configurable fade-in/fade-out effects
- Loop/repeat functionality per track
- Tag-based organization and group controls
- Inline audio player syntax for markdown files
- Persistent settings across sessions

**Tech Stack:**
- TypeScript 4.7.4
- Obsidian API (latest)
- ESBuild for bundling
- HTML5 Audio API
- CSS3 for styling

## Architecture Overview

### Component Hierarchy

```
DungeonDirgePlugin (main.ts)
├── AudioPlayerManager (audio-player.ts)
│   └── Manages audio playback, fade effects, active track state
├── DungeonDirgeView (view.ts)
│   └── Main sidebar UI with file list, controls, tag groups
├── DungeonDirgeInlineProcessor (code-block-processor.ts)
│   └── Renders inline audio players in markdown ({{song: path}})
├── InsertSongModal (insert-song-modal.ts)
│   └── Modal for inserting song syntax into editor
├── AudioFileSettingsModal (settings-modal.ts)
│   └── Modal for editing individual file settings
└── DungeonDirgeSettingTab (settings-tab.ts)
    └── Plugin settings in Obsidian preferences
```

### Data Flow

```
User Action → View/Modal → Plugin → AudioPlayerManager → HTML5 Audio API
                   ↓
            Settings Updated → saveSettings() → Persisted to vault
```

## Codebase Structure

```
DungeonDirge/
├── main.ts                    # Plugin entry point & lifecycle
├── types.ts                   # TypeScript interfaces & defaults
├── audio-player.ts            # Audio playback management
├── view.ts                    # Main sidebar view (~600 lines)
├── code-block-processor.ts    # Inline {{song: path}} processor
├── insert-song-modal.ts       # Insert song modal dialog
├── settings-modal.ts          # File settings editor modal
├── settings-tab.ts            # Plugin settings tab
├── styles.css                 # Complete UI styling (~16KB)
├── manifest.json              # Plugin metadata
├── package.json               # Dependencies & scripts
├── tsconfig.json              # TypeScript configuration
├── esbuild.config.mjs         # Build configuration
├── version-bump.mjs           # Version management script
├── versions.json              # Version history
├── README.md                  # User documentation
├── FEATURES.md                # Feature checklist
├── INSTALLATION.md            # Installation guide
└── LICENSE                    # MIT License
```

## Key Files Explained

### main.ts (Plugin Entry Point)
- **Purpose:** Plugin lifecycle, command registration, view activation
- **Exports:** `DungeonDirgePlugin` class extending Obsidian's `Plugin`
- **Key Methods:**
  - `onload()`: Initialize managers, register views, add commands
  - `onunload()`: Cleanup audio, detach views
  - `activateView()`: Open/reveal plugin in right sidebar
  - `loadSettings()` / `saveSettings()`: Settings persistence

### types.ts (Data Models)
- **Interfaces:**
  - `AudioFileSettings`: Per-file configuration (path, fade, volume, repeat, tags)
  - `DungeonDirgeSettings`: Plugin-wide settings (folder, audioFiles map, UI preferences)
- **Defaults:**
  - `DEFAULT_SETTINGS`: Plugin defaults
  - `DEFAULT_AUDIO_FILE_SETTINGS`: File defaults (5s fade, 70% volume, no repeat)

### audio-player.ts (Audio Engine)
- **Purpose:** Centralized audio playback management
- **Class:** `AudioPlayerManager`
- **Key Features:**
  - Manages Map of active audio instances with settings
  - Implements smooth fade-in/fade-out (50 steps)
  - Tracks playing/stopping states separately
  - Proper cleanup on stop/unload
- **Important Methods:**
  - `play(filePath, settings)`: Start playback with fade-in
  - `stop(filePath, fadeOut?)`: Stop with optional fade-out
  - `isPlaying()` / `isStopping()`: State checks
  - `getAudio()`: Access HTMLAudioElement for UI updates

### view.ts (Main UI)
- **Purpose:** Sidebar view with file list and controls
- **Class:** `DungeonDirgeView` extends `ItemView`
- **Key Features:**
  - Tag-based file grouping
  - Play/Stop buttons with state indicators
  - Volume sliders with real-time updates
  - Group controls (Play All / Stop All per tag)
  - Folder selection and browsing
  - Settings button per file
- **Rendering Pattern:** Imperative DOM manipulation using Obsidian's `createEl()` API

### code-block-processor.ts (Inline Players)
- **Purpose:** Render inline audio players in markdown
- **Syntax:** `{{song: path/to/audio.mp3}}`
- **Features:**
  - Play/stop button with state
  - Loop toggle
  - Progress bar with seek functionality
  - Timeline display (current/total time)
  - Expandable drawer with volume/fade controls
  - Real-time progress updates (100ms interval)
- **Pattern:** Uses TreeWalker to find text nodes, replaces with widgets

## Key Conventions

### TypeScript Patterns

1. **Strict Type Safety**
   ```typescript
   // Always use interfaces from types.ts
   const settings: AudioFileSettings = {...};

   // Use Obsidian API types
   import { TFile, TFolder, Vault } from "obsidian";
   ```

2. **Async/Await**
   ```typescript
   // All file operations and audio playback use async/await
   async play(filePath: string, settings: AudioFileSettings): Promise<void>
   ```

3. **Settings Pattern**
   ```typescript
   // Always merge with defaults
   this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

   // Per-file settings with fallback
   const settings = this.plugin.settings.audioFiles[filePath] || {
       ...DEFAULT_AUDIO_FILE_SETTINGS,
       path: filePath
   };
   ```

### Audio Playback Conventions

1. **Resource Paths**
   ```typescript
   // Always use vault adapter for proper file URLs
   const resourcePath = this.vault.adapter.getResourcePath(filePath);
   const audio = new Audio(resourcePath);
   ```

2. **Fade Implementation**
   - 50 steps for smooth transitions
   - Step duration = (total duration * 1000) / 50
   - Track `currentVolume` separately from target volume
   - Clear intervals on cleanup

3. **State Management**
   - Use `Map<string, ActiveAudio>` for active tracks
   - Separate `isPlaying` and `isStopping` states
   - Mark as stopping immediately for UI responsiveness
   - Delete from map only after fade completes

### UI Rendering Conventions

1. **DOM Creation**
   ```typescript
   // Use Obsidian's createEl() helpers
   const button = container.createEl("button", {
       text: "Play",
       cls: "dungeon-dirge-play-button mod-cta"
   });
   ```

2. **CSS Classes**
   - Prefix all classes with `dungeon-dirge-`
   - Use modifier classes: `mod-cta`, `mod-warning`, `is-active`, `is-playing`
   - State classes: `is-stopping`, `is-expanded`

3. **Event Handlers**
   ```typescript
   // Stop propagation for nested elements
   button.addEventListener("click", async (e) => {
       e.stopPropagation();
       // ... handle action
   });
   ```

4. **Re-rendering Pattern**
   ```typescript
   // Preserve state across re-renders using dataset
   container.dataset.expanded = isExpanded.toString();
   container.empty();
   this.renderComponent(container, ...);
   ```

### File Organization

- **Supported Audio Formats:** `.mp3`, `.wav`, `.ogg`, `.m4a`, `.flac`, `.aac`
- **Audio File Detection:**
  ```typescript
  const AUDIO_EXTENSIONS = ["mp3", "wav", "ogg", "m4a", "flac", "aac"];
  file.extension && AUDIO_EXTENSIONS.includes(file.extension)
  ```

## Development Workflow

### Setup
```bash
npm install              # Install dependencies
npm run dev             # Development mode (watch & rebuild)
npm run build           # Production build
```

### Build Process
- **Tool:** ESBuild (fast TypeScript bundler)
- **Entry:** `main.ts`
- **Output:** `main.js` (bundled, ready for Obsidian)
- **Source Maps:** Inline in dev mode, none in production
- **Target:** ES2018, CommonJS format
- **Externals:** Obsidian API, Electron, CodeMirror

### Testing in Obsidian
1. Build the plugin (`npm run build`)
2. Copy `main.js`, `manifest.json`, `styles.css` to:
   `<vault>/.obsidian/plugins/dungeon-dirge/`
3. Reload Obsidian
4. Enable plugin in Settings → Community Plugins

### Debugging
- Use `console.log()` statements
- Check Obsidian Developer Console (Cmd/Ctrl + Shift + I)
- Audio errors logged with file paths
- Check vault adapter paths for file access issues

## State Management

### Settings Persistence

**Plugin Settings** (saved to vault data):
```typescript
interface DungeonDirgeSettings {
    selectedFolder: string;              // Current audio folder
    audioFiles: Record<string, AudioFileSettings>; // Per-file settings
    showTimeline: boolean;               // UI toggle
    showFadeIn: boolean;                 // UI toggle
    showFadeOut: boolean;                // UI toggle
    showRepeat: boolean;                 // UI toggle
    tagGroupOrder: string[];             // Custom tag order
    collapsedTags: string[];             // Collapsed tag groups
}
```

**Save Pattern:**
```typescript
// Update settings object
this.plugin.settings.audioFiles[filePath] = newSettings;

// Persist to disk
await this.plugin.saveSettings();
```

### Runtime State

**Active Audio Tracking:**
```typescript
interface ActiveAudio {
    audio: HTMLAudioElement;    // Audio element
    settings: AudioFileSettings; // Current settings
    fadeInterval?: number;       // Fade timer ID
    currentVolume: number;       // Real-time volume
    isStopping?: boolean;        // Fade-out in progress
}
```

Stored in: `AudioPlayerManager.activeAudios: Map<string, ActiveAudio>`

## UI Components Deep Dive

### Sidebar View (view.ts)

**Structure:**
1. Folder selector (input + browse button)
2. Audio files grouped by tags
3. Each tag group:
   - Header with tag name
   - Play All / Stop All buttons
   - Collapsible file list
4. Each file row:
   - Play/Stop button
   - File name
   - Volume slider
   - Settings button (⚙️)
   - Status indicator

### Inline Player (code-block-processor.ts)

**Structure:**
1. **First Row:**
   - Play/Stop button
   - Loop toggle
   - Title
   - Timeline progress bar
   - Time display
   - Expand/collapse chevron

2. **Drawer (expandable):**
   - Volume slider (0-100%)
   - Fade In slider (0-30s)
   - Fade Out slider (0-30s)

**State Preservation:**
- Uses `container.dataset.expanded` to track UI state
- Re-renders on interactions, preserving expanded state

### Modals

**AudioFileSettingsModal:**
- Edit fade in/out, volume, loop, tags
- Validates numeric inputs
- Saves on submit, discards on cancel

**InsertSongModal:**
- Lists audio files from selected folder
- Inserts `{{song: path}}` at cursor
- Callback pattern for editor integration

## Important Patterns & Best Practices

### 1. Resource Cleanup
```typescript
// Always cleanup in onunload() and onClose()
async onunload() {
    this.playerManager.cleanup();  // Stop all audio
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_DUNGEON_DIRGE);
}
```

### 2. View State Management
```typescript
// Check for existing view before creating new one
const leaves = workspace.getLeavesOfType(VIEW_TYPE_DUNGEON_DIRGE);
if (leaves.length > 0) {
    leaf = leaves[0];  // Use existing
} else {
    // Create new in right sidebar
    leaf = workspace.getRightLeaf(false);
}
```

### 3. Error Handling
```typescript
// Audio errors
audio.addEventListener('error', (e) => {
    console.error(`Audio error for ${filePath}:`, e, audio.error);
    this.activeAudios.delete(filePath);
});

// File not found
if (!file) {
    console.error(`File not found: ${filePath}`);
    return;
}
```

### 4. Tag Processing
```typescript
// Tags are comma-separated strings
const tags = settings.tags || [];

// Group files by tags (files can appear in multiple groups)
const grouped: Record<string, TFile[]> = {};
files.forEach(file => {
    const settings = this.plugin.settings.audioFiles[file.path];
    const tags = settings?.tags || [];

    if (tags.length === 0) {
        // Add to "Untagged" group
    } else {
        tags.forEach(tag => {
            // Add to each tag group
        });
    }
});
```

### 5. Real-time Updates
```typescript
// Update progress every 100ms while playing
const intervalId = window.setInterval(() => {
    if (!this.plugin.playerManager.isPlaying(filePath)) {
        window.clearInterval(intervalId);
    } else {
        updateProgress();
    }
}, 100);
```

## Common Tasks for AI Assistants

### Adding a New Feature

1. **Determine Component:**
   - Audio behavior → `audio-player.ts`
   - UI in sidebar → `view.ts`
   - Settings → `types.ts` + `settings-tab.ts`
   - Inline player → `code-block-processor.ts`

2. **Update Types:**
   - Add interface properties in `types.ts`
   - Update `DEFAULT_SETTINGS` or `DEFAULT_AUDIO_FILE_SETTINGS`

3. **Implement Logic:**
   - Follow existing patterns
   - Use async/await for file operations
   - Add error handling

4. **Update UI:**
   - Use `createEl()` pattern
   - Add CSS classes in `styles.css`
   - Maintain accessibility (aria-labels)

5. **Test:**
   - Build and reload Obsidian
   - Test all interactions
   - Verify settings persistence

### Modifying Audio Behavior

**Example: Change fade step count**
```typescript
// In audio-player.ts, fadeIn() and fadeOut() methods
const steps = 50;  // Increase for smoother, decrease for faster
```

**Example: Add new audio format**
```typescript
// In view.ts, getAudioFilesInFolder()
const AUDIO_EXTENSIONS = ["mp3", "wav", "ogg", "m4a", "flac", "aac", "opus"];
```

### Updating UI Styles

- All styles in `styles.css`
- Use CSS variables for consistency
- Follow Obsidian's design system
- Prefix classes: `dungeon-dirge-*`
- Test in light and dark themes

### Debugging Common Issues

**Audio not playing:**
- Check console for audio errors
- Verify resource path with `vault.adapter.getResourcePath()`
- Test file format compatibility
- Check browser audio permissions

**Settings not saving:**
- Verify `await this.plugin.saveSettings()` is called
- Check Obsidian console for write errors
- Ensure settings object is updated before saving

**UI not updating:**
- Check if re-render is triggered after state change
- Verify event listeners call appropriate update methods
- Use `container.empty()` before re-rendering

## Git Workflow

### Branch Strategy
- Main branch: Production-ready code
- Feature branches: `feature/feature-name`
- Bug fixes: `fix/issue-description`
- Claude branches: `claude/claude-md-*` (auto-generated)

### Commit Messages
- Follow conventional commits format
- Examples:
  - `feat: add crossfade between tracks`
  - `fix: resolve audio playback on mobile`
  - `docs: update installation guide`
  - `refactor: simplify tag grouping logic`
  - `style: improve inline player responsiveness`

### Before Committing
1. Run `npm run build` to ensure it compiles
2. Test in Obsidian vault
3. Check for TypeScript errors
4. Verify no console errors

## Plugin Release Process

1. Update version in `manifest.json`
2. Run `npm run version` (updates `versions.json`)
3. Build production: `npm run build`
4. Create release with files:
   - `main.js`
   - `manifest.json`
   - `styles.css`
5. Tag commit with version number
6. Push to GitHub

## Obsidian API Integration

### Key Imports
```typescript
import {
    Plugin,           // Base plugin class
    WorkspaceLeaf,    // Workspace leaf management
    ItemView,         // Custom view base
    TFile,            // File type
    TFolder,          // Folder type
    Vault,            // Vault access
    Notice,           // Toast notifications
    Modal,            // Modal dialogs
    Setting           // Settings UI builder
} from "obsidian";
```

### Plugin Lifecycle
```typescript
class DungeonDirgePlugin extends Plugin {
    async onload() {
        // Register views, commands, settings
        this.registerView(VIEW_TYPE, (leaf) => new View(leaf, this));
        this.addCommand({ id, name, callback });
        this.addRibbonIcon(icon, title, callback);
        this.addSettingTab(new SettingTab(this.app, this));
    }

    async onunload() {
        // Cleanup resources
    }
}
```

### View Registration
```typescript
export const VIEW_TYPE_DUNGEON_DIRGE = "dungeon-dirge-view";

class DungeonDirgeView extends ItemView {
    getViewType(): string { return VIEW_TYPE_DUNGEON_DIRGE; }
    getDisplayText(): string { return "DungeonDirge"; }
    getIcon(): string { return "music"; }
}
```

## Performance Considerations

### Audio Management
- Use `Map` for O(1) track lookup
- Clear intervals on cleanup to prevent memory leaks
- Delete inactive tracks from map
- Reuse audio elements when possible

### UI Rendering
- Avoid full re-renders when possible
- Update only changed elements
- Use event delegation for dynamic lists
- Debounce volume slider updates if needed

### File Operations
- Cache audio file list per folder
- Use vault adapter for efficient file access
- Scan folders asynchronously

## Security & Best Practices

### File Access
- Always use Obsidian's Vault API
- Never use direct file system access
- Validate file paths before use
- Handle missing files gracefully

### User Input
- Sanitize tag inputs (comma-separated)
- Validate numeric inputs (fade times, volume)
- Prevent XSS in dynamic content
- Use Obsidian's `createEl()` for safe DOM creation

### Audio Playback
- Handle browser autoplay restrictions
- Provide user feedback for errors
- Limit max fade duration (30s)
- Clean up audio on plugin unload

## Future Enhancement Ideas

From README.md roadmap:
- Crossfade between tracks
- Playlists/presets for quick scene switching
- Audio visualization
- Global volume control
- Search/filter audio files
- Drag-and-drop file ordering
- Export/import configurations
- Keyboard shortcuts for play/stop

## Testing Checklist

When making changes, verify:
- [ ] Plugin loads without errors
- [ ] Audio files play correctly
- [ ] Fade effects work smoothly
- [ ] Volume adjustments respond in real-time
- [ ] Loop/repeat functions properly
- [ ] Tags group files correctly
- [ ] Settings persist across sessions
- [ ] Inline players render in markdown
- [ ] Multiple tracks play simultaneously
- [ ] Stop All functionality works
- [ ] Plugin unloads cleanly (no audio continues)
- [ ] Build completes without TypeScript errors
- [ ] Works in both light and dark themes

## Contact & Support

- **Author:** Charlie Fox
- **License:** MIT
- **Repository:** (Add GitHub URL here)
- **Issues:** Report bugs and feature requests via GitHub Issues

---

**Last Updated:** 2025-11-17 (Auto-generated for Claude Code assistants)

This document is intended to help AI assistants understand the Dungeon Dirge codebase structure, conventions, and best practices for making effective contributions.
