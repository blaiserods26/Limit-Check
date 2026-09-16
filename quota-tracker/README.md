# AGY Quota Tracker

**AGY Quota Tracker** is a companion status bar extension designed for **Google Antigravity IDE** (and VS Code with Antigravity running). It automatically connects to your local Antigravity Language Server to display your real-time **Gemini** and **Claude** AI model quotas and reset countdown timers directly in your status bar.

---

## Features

- ⚡ **Automated Local Sync**: Directly communicates with the Antigravity Language Server via local RPC — no manual tracking or API keys required.
- 📊 **Status Bar Overview**: Shows weekly remaining quota percentage and live reset countdowns:
  ```text
  W Gemini: 69% 🕐 3d 8h  |  W Claude: 76% 🕐 5d 10h
  ```
- 🔍 **Interactive Details Modal**: Click the status bar item at any time to open a QuickPick breakdown showing both weekly and 5-hour window limits plus a 1-click refresh action.
- 💡 **Rich Hover Tooltip**: Hover over the status bar item to view formatted markdown details, exact reset dates, and a quick "Refresh Now" action.
- ⏱️ **Auto-Refresh**: Periodically checks for updated quotas in the background and updates countdown timers dynamically.

---

## Requirements

> [!IMPORTANT]
> This extension is specifically designed for **Google Antigravity IDE** (or VS Code running on a machine where Antigravity IDE / its Language Server is active). If Antigravity is not detected, the status bar will display `$(warning) AGY Quota: Offline`.

Works seamlessly on **Windows**, **macOS**, and **Linux**.

---

## Configuration

You can customize the auto-fetch interval in **Settings** (`Ctrl+,` or `Cmd+,`) by searching for `quotaTracker`:

| Setting | Default | Description |
|---|---|---|
| `quotaTracker.refreshIntervalSeconds` | `30` | Interval (in seconds) to automatically query the Antigravity Language Server for updated quota data (minimum: 10s). |

---

## Commands

Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and search for:

| Command | Identifier | Description |
|---|---|---|
| **AGY Quota Tracker: Show Quota Details** | `quotaTracker.showDetails` | Displays a popup breakdown of Gemini and Claude limits and reset times. |
| **AGY Quota Tracker: Refresh Quota Now** | `quotaTracker.refresh` | Forces an immediate refresh from the language server. |

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
2. Press `F5` to open an Extension Development Host window.

---

## License

[MIT](LICENSE)
