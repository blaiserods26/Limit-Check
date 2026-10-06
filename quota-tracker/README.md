# quotooo

**quotooo** is a status bar extension that tracks your AI model quotas and reset countdown timers in real time.

Currently built with first-class support for **Google Antigravity IDE**, with support for additional AI coding agents planned on our roadmap.

---

## Features

- ⚡ **Automated Local Sync**: Directly communicates with the Antigravity Language Server via local RPC — zero manual counting and no external API keys required.
- 📊 **Status Bar Overview**: Shows remaining quota percentage and live countdowns directly in your status bar:
  ```text
  W Gemini: 69% 🕐 3d 8h  |  W Claude: 76% 🕐 5d 10h
  ```
- 🔍 **Interactive Details Modal**: Click the status bar item at any time to open an interactive QuickPick breakdown showing both weekly and 5-hour window limits plus a 1-click refresh action.
- 💡 **Rich Hover Tooltip**: Hover over the status bar item to view formatted markdown details, exact reset dates, and a quick "Refresh Now" link.
- ⏱️ **Auto-Refresh**: Automatically checks for quota updates in the background and keeps countdown timers updated dynamically.

---

## Requirements

> [!NOTE]
> Currently, **quotoooo** connects to **Google Antigravity IDE** (or VS Code running on a machine where Antigravity IDE / its Language Server is active). If the server is not detected, the status bar displays `$(warning) quotooo: Offline`.

Compatible with **Windows**, **macOS**, and **Linux**.

---

## Roadmap

- [x] Antigravity IDE local quota tracking (Gemini & Claude weekly / 5-hour limits)
- [ ] Customizable warning thresholds (e.g. status bar color change when quota drops below 20%)
- [ ] Support for additional AI coding agents and CLI assistant quotas
- [ ] Notification alerts when quotas reset

---

## Configuration

Open **Settings** (`Ctrl+,` or `Cmd+,`) and search for `quotooo`:

| Setting | Default | Description |
|---|---|---|
| `quotooo.refreshIntervalSeconds` | `30` | Interval (in seconds) to automatically query the language server for updated quota data (minimum: 10s). |

---

## Commands

Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and search for:

| Command | Identifier | Description |
|---|---|---|
| **quotooo: Show Quota Details** | `quotooo.showDetails` | Displays a popup breakdown of Gemini and Claude limits and reset times. |
| **quotooo: Refresh Quota Now** | `quotooo.refresh` | Forces an immediate refresh from the language server. |

---

## Installation

### Install from VSIX
1. Compile the extension and package it:
   ```bash
   npm install
   npm run compile
   npx @vscode/vsce package
   ```
2. In your IDE: Press `Ctrl+Shift+P` → type **Extensions: Install from VSIX...** → select the generated `.vsix` file.

### Development Mode
1. Open the `quota-tracker` folder in Antigravity IDE or VS Code.
2. Press `F5` to launch an Extension Development Host window.

---

## License

[MIT](LICENSE)
