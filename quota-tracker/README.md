# AGY Quota Tracker

A VS Code / Antigravity IDE extension that shows your **weekly AI model quota** and **time until reset** directly in the status bar.

## Features

Three status bar items appear in the bottom-right of your IDE:

| Item | Description |
|---|---|
| `🤖 C: ████░ 80%` | Claude weekly quota remaining |
| `✨ G: ███░░ 60%` | Gemini weekly quota remaining |
| `🕐 Reset: 2d 6h` | Time until next weekly quota refresh |

- **Color coding**: Green (>50%) → Yellow (>20%) → Red (≤20%)
- **Progress bar**: 5-block visual fill level
- **Click to update**: Click the Gemini or Claude bar to manually log your current usage
- **Click reset timer**: Click the timer to manually reset all counters

## Configuration

Open **Settings** → search `quotaTracker`:

| Setting | Default | Description |
|---|---|---|
| `quotaTracker.weeklyResetDay` | `Monday` | Day of week when quota resets |
| `quotaTracker.geminiLimit` | `1000` | Weekly Gemini request limit |
| `quotaTracker.claudeLimit` | `500` | Weekly Claude request limit |

## Commands

| Command | Description |
|---|---|
| `AGY Quota Tracker: Configure Quota Limits` | Manually enter current usage |
| `AGY Quota Tracker: Set Weekly Reset Time` | Reset all counters to zero |

## Installation

### Option A – Install from VSIX
1. Run `npm install && npm run compile` in this folder
2. Run `npx vsce package` to build `quota-tracker-1.0.0.vsix`
3. In VS Code / Antigravity IDE: **Extensions** → **⋯** → **Install from VSIX…**

### Option B – Development Mode (instant)
1. Open this folder in VS Code
2. Press `F5` to launch Extension Development Host
