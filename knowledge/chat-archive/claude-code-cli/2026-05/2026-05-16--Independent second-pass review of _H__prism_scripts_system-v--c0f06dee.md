---
type: "chat-session"
source: "claude-code-cli"
session_id: "c0f06dee-d6f2-4070-8e01-4732115adb48"
title: "Independent second-pass review of `H:\\prism\\scripts\\system-viz-action-overlay.mj"
date: "2026-05-16"
first_ts: "2026-05-16T03:20:11.277Z"
last_ts: "2026-05-16T03:22:21.100Z"
cwd: "H:\\prism"
messages: 36
user_msgs: 14
assistant_msgs: 22
raw_file: "H:/.claude/projects/H--prism/c0f06dee-d6f2-4070-8e01-4732115adb48/subagents/agent-abf59c30af633f338.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:25"
---

# Independent second-pass review of `H:\prism\scripts\system-viz-action-overlay.mj

> **claude-code-cli** | 2026-05-16 | 36 msgs (14 user / 22 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/c0f06dee-d6f2-4070-8e01-4732115adb48/subagents/agent-abf59c30af633f338.jsonl`

## Transcript

### User | 2026-05-16T03:20:11.277Z

Independent second-pass review of `H:\prism\scripts\system-viz-action-overlay.mjs` (read whole file). Context: OBSIDIAN-INTELLIGENCE-MS3/D4 — portable-node script rendering the append-only trace log into a read-only system-viz staging overlay (`state/shared/system-viz/staging/action-trace-overlay.json`). Already smoke-tested: populated run (total=3, skipped=1 corrupt, correct byAgent/byTool/timeline, promptHash dropped) + empty-state (exit 0, honest message).

You are weighted toward what a code-analyzer typically MISSES:
- **Integration coupling with the real system-viz consumer**: the script writes `state/shared/system-viz/staging/action-trace-overlay.json`. Is `staging/` the correct sink (an existing `add-node-queue.jsonl` lives there)? Does ANY existing system-viz regen/ingest script (e.g. system-viz-on-commit.mjs, regen-wiki-from-viz.mjs) consume `staging/*.json` in a way that a NEW unexpected file could break (schema assumptions, glob that ingests all staging/*.json)? If you can't verify the consumer, say so and rate the risk — do NOT assume safe.
- **Concurrency with peers**: 12 chats may run this (or a cron). The atomic write uses `${file}.tmp-${pid}-${Date.now()}` + rename. Two concurrent runs: last-rename-wins on the SAME target path — is that acceptable for an idempotent overlay, or a lost-update concern? Any tmp-file leak if the process dies between writeFileSync and renameSync?
- **Determinism / ordering**: `Object.entries` insertion-order for byAgent/byTool before the sort — stable? The timeline lexical sort on `YYYY-MM-DDTHH` — correct only if ts is canonical UTC Z (the engine normalizes it, but this script reads raw lines that *could* contain a hand-injected non-Z ts). Is a mixed-tz log a real correctness risk for the timeline, or adequately mitigated?
- **Convention conformance** vs sibling `scripts/system-viz-query.mjs` (shebang, `import fs from "node:fs"`, `--json` flag semantics, read-only ethos, exit codes).
- Stub/placeholder detection; any inl
... [+410 chars truncated]

### Assistant | 2026-05-16T03:20:18.695Z

I'll review the script and investigate the system-viz consumer integration risk.

### Assistant | 2026-05-16T03:20:19.134Z

[tool_use: Read]

### User | 2026-05-16T03:20:19.587Z

[tool_result] read-once-guard: 'H:\prism\scripts\system-viz-action-overlay.mjs' was already read 14s ago in this session and is unchanged (mtime 1778901556487). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-16T03:20:20.061Z

[tool_use: Grep]

### User | 2026-05-16T03:20:20.971Z

[tool_result] Found 8 files
scripts\system-viz-action-overlay.mjs
scripts\expand-skill-triggers.mjs
scripts\export-ledger-lora.mjs
scripts\cherry-pick-consolidator.mjs
scripts\viz-output-size.mjs
scripts\regen-golf-owned-paths.mjs
scripts\system-viz-add-node.mjs
scripts\bootstrap-golf.mjs

### Assistant | 2026-05-16T03:20:23.482Z

The read-once guard says the file is in my context, but it isn't shown. Let me read it with explicit cache disable, and investigate consumers in parallel.

### Assistant | 2026-05-16T03:20:24.757Z

[tool_use: Bash]

### Assistant | 2026-05-16T03:20:26.120Z

[tool_use: Grep]

### User | 2026-05-16T03:20:28.830Z

[tool_result] #!/usr/bin/env node
/**
 * system-viz-action-overlay — render the append-only agent-write trace log
 * into a READ-ONLY system-viz overlay (timeline + per-agent / per-target /
 * per-tool rollups).
 *
 * OBSIDIAN-INTELLIGENCE-MS3 / U-ACTION-TRACES (D4).
 *
 * Reads `state/shared/action-traces.jsonl` (the ActionTraceEngine log;
 * PRISM_ACTION_TRACE_FILE override honoured for parity with the engine
... [+6829 chars truncated]

### User | 2026-05-16T03:20:38.568Z

[tool_result] .claude\hooks\golf-slot-write-allowlist.mjs:339:      `golf-write-block: ${rel} not in golf-write allowlist. Golf may only write to state/shared/{dashboards,ledgers,golf-*,*.cron-locks/,system-viz/staging}/, AGENT_CHAT.jsonl, or mcp-server/data/state/*.log. See state/shared/specs/GOLF-WATCHDOG-MS0-2026-05-13.md §A.A5 + R1-B6 for the canonical allowlist. Set PRISM_GOLF_WRITE_ALLOWLIST_BYPASS=1 for 
... [+1053 chars truncated]

### Assistant | 2026-05-16T03:20:40.740Z

Now let me investigate what consumes the staging directory — specifically whether any ingest loop globs `staging/*.json`.

### Assistant | 2026-05-16T03:20:42.921Z

[tool_use: Grep]

### User | 2026-05-16T03:20:43.559Z

[tool_result] 3: * system-viz-add-node.mjs — Incremental dashed-node staging for system-viz.
15: *      staging/add-node-queue.jsonl as one JSONL row per node.
100:/** Resolve the staging dir, honoring PRISM_SYSTEM_VIZ_DIR for tests. */
107:export function stagingDir()    { return path.join(vizDir(), "staging"); }
108:export function queuePath()     { return path.join(stagingDir(), "add-node-queue.jsonl"); }
10
... [+188 chars truncated]

### Assistant | 2026-05-16T03:20:44.353Z

[tool_use: Grep]

### User | 2026-05-16T03:21:04.946Z

[tool_result] .claude\hooks\golf-slot-write-allowlist.mjs:339:      `golf-write-block: ${rel} not in golf-write allowlist. Golf may only write to state/shared/{dashboards,ledgers,golf-*,*.cron-locks/,system-viz/staging}/, AGENT_CHAT.jsonl, or mcp-server/data/state/*.log. See state/shared/specs/GOLF-WATCHDOG-MS0-2026-05-13.md §A.A5 + R1-B6 for the canonical allowlist. Set PRISM_GOLF_WRITE_ALLOWLIST_BYPASS=1 for 
... [+1659 chars truncated]

### Assistant | 2026-05-16T03:21:07.065Z

Let me check how the staging queue is actually drained/consumed to confirm the glob risk.

### Assistant | 2026-05-16T03:21:08.752Z

[tool_use: Grep]

### User | 2026-05-16T03:21:09.345Z

[tool_result] 14: *   3. detect-newly-built.mjs            — diff vs prev snapshot, emit newly-built.json
15: *   4. merge-augmentations.mjs (round 2) — fold THIS commit's newly-built.json back into the graph
21: * the prior commit's newly-built.json automatically. Highlighting in the viz
37:// chains each reading+writing 41MB system-graph.json with no file locking →
91:// merge-file-coverage runs only if agent
... [+131 chars truncated]

### Assistant | 2026-05-16T03:21:10.251Z

[tool_use: Grep]

### User | 2026-05-16T03:21:11.071Z

[tool_result] mcp-server\src\__tests__\AccessControlListEngine.test.ts:436:        context: { env: 'staging' },
mcp-server\src\types\cam-plugin-architecture.ts:1035:  staging_directory: string;
mcp-server\src\data\calculatorWorkholdingCatalog.ts:144:    detail: 'Rotary / trunnion posture for index work and multiaxis staging.',
mcp-server\src\data\edgecam-cam-tips.ts:2735:      "tool for pre-staging), SPINDLE_SP
... [+4486 chars truncated]

### Assistant | 2026-05-16T03:21:13.689Z

Let me verify how the staging queue is drained — the critical question is whether any consumer globs `staging/*.json` indiscriminately.

### Assistant | 2026-05-16T03:21:15.849Z

[tool_use: Grep]

### Assistant | 2026-05-16T03:21:16.172Z

[tool_use: Glob]

### User | 2026-05-16T03:21:16.497Z

[tool_result] No matches found

[Showing results with pagination = offset: 110]

### User | 2026-05-16T03:21:22.954Z

[tool_result] scripts\system-viz-obsidian-bridge.mjs
scripts\install-system-viz-git-hook.mjs
scripts\system-viz-obsidian-bridge-v2.mjs
scripts\system-viz-add-node.mjs
scripts\system-viz-on-commit.mjs
scripts\build-system-viz-livediff.mjs
scripts\system-viz-query.mjs
scripts\expand-system-viz-l12-files.test.mjs
scripts\system-viz-ghost-report.mjs
scripts\expand-system-viz-l12-files.mjs
scripts\detect-system-viz-
... [+120 chars truncated]

### Assistant | 2026-05-16T03:21:25.626Z

Let me check the actual drain logic — how `add-node-queue.jsonl` is consumed, and whether `generate-system-viz.mjs` or the on-commit chain globs staging.

### Assistant | 2026-05-16T03:21:27.602Z

[tool_use: Bash]

### User | 2026-05-16T03:21:30.965Z

[tool_result] scripts/system-viz-add-node.mjs:3: * system-viz-add-node.mjs — Incremental dashed-node staging for system-viz.
scripts/system-viz-add-node.mjs:15: *      staging/add-node-queue.jsonl as one JSONL row per node.
scripts/system-viz-add-node.mjs:100:/** Resolve the staging dir, honoring PRISM_SYSTEM_VIZ_DIR for tests. */
scripts/system-viz-add-node.mjs:107:export function stagingDir()    { return path
... [+2464 chars truncated]

### Assistant | 2026-05-16T03:21:33.138Z

Now let me check whether `generate-system-viz.mjs` reads the staging directory contents (the queue) — this is the key consumer question.

### Assistant | 2026-05-16T03:21:34.623Z

[tool_use: Grep]

### User | 2026-05-16T03:21:35.249Z

[tool_result] No matches found

### Assistant | 2026-05-16T03:21:37.594Z

`generate-system-viz.mjs` does not read the staging dir at all. Let me confirm what consumes `add-node-queue.jsonl` — the drain consumer — and whether it globs.

### Assistant | 2026-05-16T03:21:39.228Z

[tool_use: Grep]

### User | 2026-05-16T03:21:59.842Z

[tool_result] .claude\helpers\cog-bridge-drain.mjs:91:function rotateQueue(queuePath) {
.claude\helpers\cog-bridge-drain.mjs:92:  if (!fs.existsSync(queuePath)) return null;
.claude\helpers\cog-bridge-drain.mjs:93:  const stats = fs.statSync(queuePath);
.claude\helpers\cog-bridge-drain.mjs:96:  const snapshotPath = `${queuePath}.processing-${ts}`;
.claude\helpers\cog-bridge-drain.mjs:99:    fs.renameSync(queueP
... [+4195 chars truncated]

### Assistant | 2026-05-16T03:22:21.100Z

I have enough to grade. The `add-node-queue.jsonl` consumer references only the explicit `queuePath()` (`add-node-queue.jsonl`), not a `staging/*.json` glob. No system-viz ingest reads `staging/*.json` indiscriminately. Verdict below.

---

## Independent Second-Pass Review — `scripts/system-viz-action-overlay.mjs`

### Integration coupling (highest-value check) — VERIFIED SAFE
I grepped all `.mjs`/`.ts` consumers. The staging dir is consumed only via the explicit literal path `add-node-queue.jsonl` (`system-viz-add-node.mjs:108`). `generate-system-viz.mjs` does **not** read `system-viz/staging/` at all (no `stagingDir`/`queuePath`/glob match). `system-viz-on-commit.mjs` chains snapshot/merge scripts, none globbing `staging/*.json`. **No ingest loop picks up `staging/*.json` indiscriminately** — the new sidecar cannot be fed unvalidated into `system-graph.json`. The golf write-allowlist explicitly permits `system-viz/staging/.+`, so peer/cron writes are sanctioned. Cross-unit regression risk: **LOW, verified** (not assumed).

### P1 — tmp-file leak on crash (`atomicWriteJson`, line ~159)
`${file}.tmp-${pid}-${Date.now()}` is written then renamed. If the process dies between `writeFileSync` and `renameSync` (or `writeFileSync` partially fails), a `.tmp-*` orphan persists in `staging/` forever — there is no startup sweep and no consumer cleans it. Over 12 chats + cron this accumulates. Since no consumer globs `staging/*`, it's cosmetic/disk-bloat, not a correctness break — hence P1 not P0. **Fix:** wrap rename in `try/finally` that `fs.rmSync(tmp,{force:true})` on failure, or unique-suffix is fine but add a best-effort sweep of stale `action-trace-overlay.json.tmp-*` at start of `main()`.

### Concurrency — ACCEPTABLE (note, not a defect)
Two concurrent runs: distinct tmp names, last-`renameSync`-wins on the target. Output is a pure idempotent projection of an append-only log, so a lost update self-heals on the next run. `renameSync` is atomic on same filesystem → no 
... [+1177 chars truncated]
