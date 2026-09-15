"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const os = require("os");
const https = require("https");
// ─── Language Server Discovery ────────────────────────────────────────────────
let cachedLsInfo = null;
/**
 * Finds the Antigravity Language Server port and CSRF token from the latest ls-main.log
 */
function findLanguageServerInfo() {
    const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    const logsDir = path.join(appData, 'Antigravity IDE', 'logs');
    if (!fs.existsSync(logsDir)) {
        return null;
    }
    let newestFile = null;
    let newestMtime = 0;
    try {
        const dirs = fs.readdirSync(logsDir);
        for (const d of dirs) {
            const candidate = path.join(logsDir, d, 'ls-main.log');
            if (fs.existsSync(candidate)) {
                const stat = fs.statSync(candidate);
                if (stat.mtimeMs > newestMtime) {
                    newestMtime = stat.mtimeMs;
                    newestFile = candidate;
                }
            }
        }
    }
    catch {
        return null;
    }
    if (!newestFile) {
        return null;
    }
    try {
        const content = fs.readFileSync(newestFile, 'utf8');
        const csrfMatch = content.match(/--csrf_token\s+([a-f0-9-]+)/i);
        const portMatch = content.match(/LS started on port\s+(\d+)/i) ||
            content.match(/listening on random port at\s+(\d+)\s+for HTTPS/i);
        if (csrfMatch && portMatch) {
            return {
                csrfToken: csrfMatch[1],
                port: parseInt(portMatch[1], 10),
                sourceFile: newestFile
            };
        }
    }
    catch {
        return null;
    }
    return null;
}
/**
 * Fetches the user quota summary from Antigravity Language Server via Connect RPC
 */
async function fetchUserQuotaSummary(forceRefresh = false) {
    if (!cachedLsInfo) {
        cachedLsInfo = findLanguageServerInfo();
    }
    if (!cachedLsInfo) {
        throw new Error('Antigravity Language Server not detected in logs.');
    }
    const payload = JSON.stringify({ forceRefresh });
    const options = {
        hostname: '127.0.0.1',
        port: cachedLsInfo.port,
        path: '/exa.language_server_pb.LanguageServerService/RetrieveUserQuotaSummary',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-codeium-csrf-token': cachedLsInfo.csrfToken,
            'Content-Length': Buffer.byteLength(payload)
        },
        rejectUnauthorized: false,
        timeout: 8000
    };
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        const parsed = JSON.parse(data);
                        resolve(parsed);
                    }
                    catch (e) {
                        reject(new Error(`Failed to parse response JSON: ${e}`));
                    }
                }
                else {
                    // If 401 or 400, cached LS info might be stale
                    cachedLsInfo = null;
                    reject(new Error(`Server returned HTTP ${res.statusCode}: ${data}`));
                }
            });
        });
        req.on('error', (err) => {
            cachedLsInfo = null; // Re-detect on next attempt
            reject(err);
        });
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request to Antigravity Language Server timed out'));
        });
        req.write(payload);
        req.end();
    });
}
// ─── Data Extraction Helpers ──────────────────────────────────────────────────
function parseModelBucket(group) {
    if (!group.buckets || group.buckets.length === 0) {
        return undefined;
    }
    const weeklyBucket = group.buckets.find(b => b.window === 'weekly' ||
        b.bucketId.includes('weekly') ||
        b.displayName.toLowerCase().includes('weekly'));
    const fiveHourBucket = group.buckets.find(b => b.window === '5h' ||
        b.bucketId.includes('5h') ||
        b.displayName.toLowerCase().includes('five hour') ||
        b.displayName.toLowerCase().includes('5-hour'));
    if (!weeklyBucket) {
        return undefined;
    }
    return {
        weeklyPercent: Math.round((weeklyBucket.remainingFraction ?? 0) * 100),
        weeklyResetTime: weeklyBucket.resetTime,
        fiveHourPercent: fiveHourBucket ? Math.round((fiveHourBucket.remainingFraction ?? 0) * 100) : undefined,
        fiveHourResetTime: fiveHourBucket?.resetTime
    };
}
function parseQuotaSummary(data) {
    const groups = data.response?.groups ?? [];
    let gemini;
    let claude;
    for (const group of groups) {
        const name = group.displayName.toLowerCase();
        if (name.includes('gemini')) {
            gemini = parseModelBucket(group);
        }
        else if (name.includes('claude') || name.includes('gpt') || name.includes('3p')) {
            claude = parseModelBucket(group);
        }
    }
    return { gemini, claude };
}
/**
 * Converts a target ISO timestamp into a human-readable countdown string (e.g. "3d 8h", "4h 18m", "31m")
 */
function formatTimeRemaining(isoDateStr) {
    if (!isoDateStr) {
        return '--';
    }
    const target = new Date(isoDateStr).getTime();
    const diff = target - Date.now();
    if (isNaN(target) || diff <= 0) {
        return '0m';
    }
    const totalMinutes = Math.floor(diff / (60 * 1000));
    const days = Math.floor(totalMinutes / (24 * 60));
    const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
    const minutes = totalMinutes % 60;
    if (days > 0) {
        return `${days}d ${hours}h`;
    }
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
}
/**
 * Formats a local time string for reset timestamps
 */
function formatLocalResetDate(isoDateStr) {
    if (!isoDateStr)
        return 'Unknown';
    try {
        const d = new Date(isoDateStr);
        return d.toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    }
    catch {
        return isoDateStr;
    }
}
// ─── Extension Controller ─────────────────────────────────────────────────────
class QuotaTrackerExtension {
    constructor(context) {
        this.state = null;
        this.fetchIntervalTimer = null;
        this.uiTickTimer = null;
        this.isFetching = false;
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.statusBarItem.command = 'quotaTracker.refresh';
        context.subscriptions.push(this.statusBarItem);
        // Register commands
        context.subscriptions.push(vscode.commands.registerCommand('quotaTracker.refresh', async () => {
            await this.refresh(true, true);
        }), vscode.commands.registerCommand('quotaTracker.showDetails', () => {
            this.showDetailsModal();
        }));
        // Listen for config changes
        context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('quotaTracker.refreshIntervalSeconds')) {
                this.restartFetchTimer();
            }
        }));
        // Initial load
        this.updateStatusConnecting();
        this.statusBarItem.show();
        this.refresh(false, false);
        // Start background timers
        this.restartFetchTimer();
        this.startUiTickTimer();
    }
    updateStatusConnecting() {
        this.statusBarItem.text = '$(sync~spin) AGY Quota: Connecting...';
        this.statusBarItem.tooltip = 'Connecting to Antigravity Language Server to fetch quota...';
    }
    async refresh(forceServerRefresh = false, userInitiated = false) {
        if (this.isFetching)
            return;
        this.isFetching = true;
        if (userInitiated) {
            this.statusBarItem.text = '$(sync~spin) Refreshing...';
        }
        try {
            const summary = await fetchUserQuotaSummary(forceServerRefresh);
            const { gemini, claude } = parseQuotaSummary(summary);
            this.state = {
                gemini,
                claude,
                lastUpdated: new Date(),
                rawResponse: summary
            };
            this.render();
            if (userInitiated) {
                vscode.window.showInformationMessage('AGY Quota successfully refreshed!');
            }
        }
        catch (err) {
            if (!this.state) {
                this.statusBarItem.text = '$(warning) AGY Quota: Offline';
                this.statusBarItem.tooltip = `Could not fetch quota: ${err.message}\nClick to retry.`;
            }
            if (userInitiated) {
                vscode.window.showErrorMessage(`Failed to refresh quota: ${err.message}`);
            }
        }
        finally {
            this.isFetching = false;
        }
    }
    render() {
        if (!this.state)
            return;
        const { gemini, claude } = this.state;
        // Gemini weekly format
        const geminiText = gemini
            ? `W Gemini: ${gemini.weeklyPercent}% 🕐 ${formatTimeRemaining(gemini.weeklyResetTime)}`
            : 'W Gemini: --';
        // Claude weekly format
        const claudeText = claude
            ? `W Claude: ${claude.weeklyPercent}% 🕐 ${formatTimeRemaining(claude.weeklyResetTime)}`
            : 'W Claude: --';
        // Status bar compact display: "W Gemini: 69% 🕐 3d 8h | W Claude: 76% 🕐 5d 10h"
        this.statusBarItem.text = `${geminiText}  |  ${claudeText}`;
        // Rich Markdown Tooltip
        const md = new vscode.MarkdownString();
        md.isTrusted = true;
        md.supportThemeIcons = true;
        md.appendMarkdown('### **Antigravity Model Quotas**\n\n');
        if (gemini) {
            md.appendMarkdown('#### **Gemini Models**\n');
            md.appendMarkdown(`- **Weekly Limit Remaining:** **${gemini.weeklyPercent}%**\n`);
            md.appendMarkdown(`  - *Refreshes in:* **${formatTimeRemaining(gemini.weeklyResetTime)}** (${formatLocalResetDate(gemini.weeklyResetTime)})\n`);
            if (gemini.fiveHourPercent !== undefined) {
                md.appendMarkdown(`- **5-Hour Limit Remaining:** ${gemini.fiveHourPercent}%\n`);
                md.appendMarkdown(`  - *Refreshes in:* ${formatTimeRemaining(gemini.fiveHourResetTime)}\n`);
            }
            md.appendMarkdown('\n');
        }
        if (claude) {
            md.appendMarkdown('#### **Claude & GPT Models**\n');
            md.appendMarkdown(`- **Weekly Limit Remaining:** **${claude.weeklyPercent}%**\n`);
            md.appendMarkdown(`  - *Refreshes in:* **${formatTimeRemaining(claude.weeklyResetTime)}** (${formatLocalResetDate(claude.weeklyResetTime)})\n`);
            if (claude.fiveHourPercent !== undefined) {
                md.appendMarkdown(`- **5-Hour Limit Remaining:** ${claude.fiveHourPercent}%\n`);
                md.appendMarkdown(`  - *Refreshes in:* ${formatTimeRemaining(claude.fiveHourResetTime)}\n`);
            }
            md.appendMarkdown('\n');
        }
        md.appendMarkdown('---\n');
        const timeStr = this.state.lastUpdated.toLocaleTimeString();
        md.appendMarkdown(`*Updated at ${timeStr} • [Refresh Now](command:quotaTracker.refresh)*\n`);
        this.statusBarItem.tooltip = md;
    }
    showDetailsModal() {
        if (!this.state) {
            vscode.window.showInformationMessage('No quota data available yet. Please wait for connection.');
            return;
        }
        const { gemini, claude } = this.state;
        const items = [];
        if (gemini) {
            items.push({
                label: `Gemini Models: ${gemini.weeklyPercent}% Weekly Remaining`,
                description: `Refreshes in ${formatTimeRemaining(gemini.weeklyResetTime)}`,
                detail: gemini.fiveHourPercent !== undefined
                    ? `5-Hour Limit: ${gemini.fiveHourPercent}% remaining (refresh in ${formatTimeRemaining(gemini.fiveHourResetTime)})`
                    : undefined
            });
        }
        if (claude) {
            items.push({
                label: `Claude/GPT Models: ${claude.weeklyPercent}% Weekly Remaining`,
                description: `Refreshes in ${formatTimeRemaining(claude.weeklyResetTime)}`,
                detail: claude.fiveHourPercent !== undefined
                    ? `5-Hour Limit: ${claude.fiveHourPercent}% remaining (refresh in ${formatTimeRemaining(claude.fiveHourResetTime)})`
                    : undefined
            });
        }
        items.push({
            label: '$(refresh) Refresh Quota Now',
            description: 'Fetch the latest limits from Antigravity'
        });
        vscode.window.showQuickPick(items, {
            title: 'Antigravity Quota Tracker Details',
            placeHolder: 'Select an action or view quota details'
        }).then(selected => {
            if (selected && selected.label.includes('Refresh')) {
                this.refresh(true, true);
            }
        });
    }
    restartFetchTimer() {
        if (this.fetchIntervalTimer) {
            clearInterval(this.fetchIntervalTimer);
            this.fetchIntervalTimer = null;
        }
        const config = vscode.workspace.getConfiguration('quotaTracker');
        const intervalSec = Math.max(10, config.get('refreshIntervalSeconds', 30));
        this.fetchIntervalTimer = setInterval(() => {
            this.refresh(false, false);
        }, intervalSec * 1000);
    }
    startUiTickTimer() {
        if (this.uiTickTimer) {
            clearInterval(this.uiTickTimer);
        }
        // Update countdown timers every 15 seconds
        this.uiTickTimer = setInterval(() => {
            if (this.state && !this.isFetching) {
                this.render();
            }
        }, 15000);
    }
    dispose() {
        if (this.fetchIntervalTimer)
            clearInterval(this.fetchIntervalTimer);
        if (this.uiTickTimer)
            clearInterval(this.uiTickTimer);
        this.statusBarItem.dispose();
    }
}
// ─── Extension Entry Points ───────────────────────────────────────────────────
let tracker = null;
function activate(context) {
    tracker = new QuotaTrackerExtension(context);
}
function deactivate() {
    if (tracker) {
        tracker.dispose();
        tracker = null;
    }
}
//# sourceMappingURL=extension.js.map