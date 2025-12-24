# InfiNote 📝

A modern, infinite-canvas note-taking application built with React, TypeScript, and TailwindCSS.

## ✨ Features

- **Infinite Canvas**: Drag, pan, and zoom across an unbounded workspace.
- **Rich Note Types**: Create sticky notes, cards with images, and standalone text.
- **Connections**: Link notes together with dynamic lines (straight or curved).
- **Organization**: Tag notes, filter by category, and search by content.
- **Customization**: Full dark mode UI, grid toggles, and "snap to grid" precision.
- **Multi-Board Support**: Create and manage multiple distinct boards (saved locally).

## 🚀 Getting Started

1.  **Install Dependencies**:
    ```bash
    npm install
    ```
2.  **Run Development Server**:
    ```bash
    npm run dev
    ```
3.  **Build for Production**:
    ```bash
    npm run build
    ```

## ⚠️ Loopholes & Limitations

Current known limitations of the prototype:

- **No Real Authentication**: The login is currently a simulation (local state only). Reloading triggers a "login" screen, but it accepts any email and doesn't verify credentials against a server.
- **Local-Only Persistence**: Data is saved exclusively to browser `localStorage`. If you clear your cache, use a different browser, or switch devices, your data will be lost. There is no cloud database sync.
- **Single User Mode**: Despite the "collaborators" field in the code and UI, this is a single-player experience. There is no real-time WebSocket connection for multiplayer editing.
- **Memory Usage**: The Undo/Redo system saves full snapshots of the board state. For very large boards with thousands of elements, this could eventually slow down the browser or consume significant memory.
- **Image Optimization**: Uploaded images are stored as Base64 strings directly in the JSON data. Uploading large/high-res images will bloat the save file significantly and could crash `localStorage` (which typically has a ~5MB limit).
- **No "Smart" Conflict Resolution**: If two browser tabs are open with the same board, the last one to save will overwrite the other's changes.
