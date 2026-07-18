# Memory Monitor — Recurring Orphan Reaper for 6-Chat Fleet

## Context

User runs ~6 concurrent Claude Code chats on this PC. Each chat spawns its own PRISM MCP server (`H:/prism/mcp-server/dist/index.js`, ~485 MB resident). When a chat dies (crash, kill, OS hibernate, host process exit), its MCP child can survive as an orphan — parent PPID is dead but the node process keeps consuming ~500 MB indefinitely. Bash/git/node hook helpers also accumulate when fork-storms saturate the process table.

Audit run at session start showed:
- 13 `dist/index.js` MCP servers (expected: ~7, one per active chat + a couple of legitimate cmd-shell parents)
- 4 confirmed orphans (parent PPID dead) totalling ~1.96 GB
- 1 stale `.git/index.lock`
- 6 bash.exe / 0 git.exe / system 58.7% memory used

Three reapers already exist (`node-process-janitor.mjs`, `stop_close_prism_nodes_v2.mjs`, `helpers/node-orphan-cleaner.mjs`) but **all three explicitly protect `dist/index.js`** to avoid killing live MCPs — there is a coverage gap for true orphan PRISM MCPs (parent dead). This is the gap the monitor fills.

**Already done this session** (before plan-mode activated):
1. Created `H:/prism/scripts/system-health/04-prism-mcp-orphan-monitor.ps1` — focused reaper for `dist/index.js` orphans with parent-dead + age-gate (120s) safety; also sweeps stale `.git/index.lock` files >60s old.
2. Ran one cleanup pass: `mem=59.4% node=14→14 mcp=alive:7/orphan:4/young:0 killed=4(+1959MB) git_locks_swept=1`.
3. Ran standard `node-process-janitor.mjs --full` (killed=0 — clean).
4. Ran `helpers/node-orphan-cleaner.mjs --force --reason=monitor --min-age=3` (returned 0).

## Remaining work — the recurring monitor

Use `CronCreate` (session-scoped, in-memory) to fire a self-prompt every ~7 minutes. Each fire instructs me to:
1. Run `04-prism-mcp-orphan-monitor.ps1` (no flags — live mode).
2. Read its one-line summary stdout.
3. If `killed > 0` OR `mem > 80%` OR `mcpOrphan > 0` after the kill pass, post a short note. Otherwise stay quiet (don't spam the chat).
4. If `mem > 90%`, also run the standard janitor + orphan-cleaner as backstop.

**Cadence: 7 minutes**, off-cycle from the 5-min Windows scheduled "PRISM Memory Pressure Auto-Relief" task to interleave coverage. Cron uses an off-minute (`3 * * * 7`-style) per CronCreate guidance to avoid the 0/30-min API spike alignment.

**Auto-expiry**: CronCreate recurring tasks auto-expire after 7 days — they fire once at expiry then delete. Acceptable; if the user wants it longer, re-issue or convert to a Windows Scheduled Task.

**Cancellation**: User can run `CronList` to see scheduled jobs, `CronDelete <id>` to stop. Cron also dies when this Claude session exits — by design, since the script is session-scoped.

## Files involved

| Path | Role | Status |
|------|------|--------|
| `H:/prism/scripts/system-health/04-prism-mcp-orphan-monitor.ps1` | New monitor script (orphan MCP reaper + git-lock sweeper + memory snapshot) | created this session |
| `H:/prism/state/shared/mcp-orphan-monitor.log` | Text log (one line per kill / sweep) | auto-created on first kill |
| `H:/prism/state/shared/mcp-orphan-monitor.jsonl` | Structured event log (tick + kill events) | auto-created on first tick |
| `H:/prism/.claude/hooks/node-process-janitor.mjs` | Existing hook janitor — read-only reference | unchanged |
| `H:/prism/.claude/hooks/stop_close_prism_nodes_v2.mjs` | Existing orphan reaper — read-only reference | unchanged |
| `H:/PRISM/.claude/helpers/node-orphan-cleaner.mjs` | Existing transient cleaner — read-only reference | unchanged |

## Why a parallel reaper instead of patching the existing ones

The three existing reapers protect `dist/index.js` deliberately (KEEP_PATTERNS in `helpers/node-orphan-cleaner.mjs:41`). That protection is correct for their use case — they're invoked by hooks/cron that don't have parent-aliveness as an entry condition, so a broad rule is safer. The new monitor adds the parent-aliveness condition (a process whose parent is verifiably dead is unambiguously an orphan), which is too narrow to retrofit without revisiting the existing logic in three places. Adding a fourth, focused script avoids touching three known-working safety-critical tools.

## Verification

After ExitPlanMode and approval:
1. `CronCreate` recurring job → returns a job ID. Confirm with `CronList`.
2. Wait ~7 minutes; the cron fires, the chat will get a prompt-tick. Output should show "STAYING QUIET" or a one-line summary.
3. Manual check at any time: run the script directly:
   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/scripts/system-health/04-prism-mcp-orphan-monitor.ps1
   ```
4. Inspect the structured log: `Get-Content H:/prism/state/shared/mcp-orphan-monitor.jsonl -Tail 20`
5. To stop: `CronDelete <id>` (or just exit the chat — it's session-scoped).

## Out of scope (intentionally)

- Converting to a Windows Scheduled Task (would survive session exit, but the user asked for *me* to monitor; the existing 5-min `03-memory-pressure-auto-relief.ps1` scheduled task already covers the always-on backstop).
- Wiring as a hook (would fire on every tool call — too noisy for a ~2-GB reclamation task that only needs to run every few minutes).
- Auto-killing alive-parent MCPs based on idle time (high risk of killing a live chat's MCP).
- Bash/cmd.exe sweep — the existing standard janitor handles those; killing all bash without parent check would crash live shells.

## Token cost

Each fire consumes ~500 input + ~150 output tokens. 8 fires/hour × ~650 tokens = ~5 200 tokens/hour. Over the 7-day cron auto-expiry that's ~870 K tokens, mostly in the prompt-cache window so amortized cost is low.
