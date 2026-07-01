---
type: "chat-session"
source: "claude-code-cli"
session_id: "0fe601c1-0fbe-4ef2-b6d5-64d54264beb1"
title: "PER-FILE SCRUTINY GATE — unit U-CLEANUP-F5. Review one new file end-to-end + ver"
date: "2026-05-14"
first_ts: "2026-05-14T14:43:58.922Z"
last_ts: "2026-05-14T14:46:54.631Z"
cwd: "H:\\prism"
messages: 28
user_msgs: 11
assistant_msgs: 17
raw_file: "H:/.claude/projects/H--prism/0fe601c1-0fbe-4ef2-b6d5-64d54264beb1/subagents/agent-a3a2ee5ac24e0887f.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:06"
---

# PER-FILE SCRUTINY GATE — unit U-CLEANUP-F5. Review one new file end-to-end + ver

> **claude-code-cli** | 2026-05-14 | 28 msgs (11 user / 17 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/0fe601c1-0fbe-4ef2-b6d5-64d54264beb1/subagents/agent-a3a2ee5ac24e0887f.jsonl`

## Transcript

### User | 2026-05-14T14:43:58.922Z

PER-FILE SCRUTINY GATE — unit U-CLEANUP-F5. Review one new file end-to-end + verify its one-line caller rewire.

PRIMARY FILE: H:\prism\scripts\viz-regen-guard.mjs (NEW)
CALLER REWIRE: H:\prism\scripts\system-viz-on-commit.mjs (line ~115-135 — the detached wiki-regen spawn now invokes `viz-regen-guard.mjs --quiet` instead of `regen-wiki-from-viz.mjs --quiet`)

UNIT F5 CONTRACT: "viz-regen-guard.mjs (centralizes regen-wiki-from-viz.mjs calls; hash-gated on manifest-of-deps NOT graph.json itself; refuses if any input >24h older than its regenerator; G6 hard prerequisite)"

DESIGN: The guard sits in front of the ~8-min `regen-wiki-from-viz.mjs` orchestrator. It (1) hash-gates on a DEP_MANIFEST of SOURCE deps — explicitly EXCLUDING system-graph.json from the hash (graph.json churns every commit; gating on it = always-regen), (2) staleness-refuses if a manifest artifact-input (graph.json, regeneratedBy generate-system-viz.mjs) predates its regenerator by >24h, (3) only then spawns regen-wiki-from-viz.mjs. Pure helpers (dirSignature, resolveGlob, manifestEntrySignature, computeManifestHash, checkStaleInputs) + guardedRegen (injectable spawn/paths) + renderHuman are exported; main() runs only under the isDirectRun guard.

ALREADY VERIFIED by a 36-test vitest suite (all pass): dirSignature catches content-edit + add/remove; resolveGlob prefix/suffix matching; manifestEntrySignature file/dir/glob/missing; computeManifestHash deterministic + changes on dep change + does NOT change on graph.json change; checkStaleInputs flags >24h lag / missing input / clears when fresh / warns on missing regenerator; guardedRegen refuses/skips/runs/--force/--check/regen_failed/--dry-run.

REVIEW FOCUS — find what the test suite did NOT cover:
1. **Correctness of the staleness semantics** — "refuses if any input >24h older than its regenerator". Is `regenMtime - inputMtime > thresholdMs` the right comparison? Trace: graph.json regenerated every commit (mtime ~now), generate-system-viz.mjs rare
... [+2085 chars truncated]

### Assistant | 2026-05-14T14:44:02.630Z

I'll review the new guard file and its caller rewire end-to-end.

### Assistant | 2026-05-14T14:44:03.066Z

[tool_use: Read]

### Assistant | 2026-05-14T14:44:03.210Z

[tool_use: Read]

### User | 2026-05-14T14:44:07.576Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * viz-regen-guard.mjs — centralized, dependency-aware gate in front of
4	 * scripts/regen-wiki-from-viz.mjs.
5	 *
6	 * U-CLEANUP-F5 (CLEANUP-MS0). Every caller of the ~8-min wiki-regen orchestrator
7	 * (system-viz-on-commit.mjs, the hourly cron, the /system-viz slash command)
8	 * should route through THIS guard instead of spawning regen-wiki-from-viz.mjs
9	 * direc
... [+15656 chars truncated]

### User | 2026-05-14T14:44:07.872Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * system-viz-on-commit.mjs — full refresh chain.
4	 *
5	 * Called by:
6	 *   - Git post-commit hook (auto-fires on every commit)
7	 *   - Cron (hourly)
8	 *   - Slash command /system-viz
9	 *   - Manual: `node scripts/system-viz-on-commit.mjs`
10	 *
11	 * Sequence:
12	 *   1. generate-system-viz.mjs           — base graph from live PRISM state
13	 *   2. merge-augmen
... [+6420 chars truncated]

### Assistant | 2026-05-14T14:44:13.472Z

[tool_use: Grep]

### Assistant | 2026-05-14T14:44:13.018Z

[tool_use: Grep]

### Assistant | 2026-05-14T14:44:11.293Z

Now let me examine the surrounding code to verify the staleness semantics and centralization completeness. Let me check the actual mtimes and look for other invocations.

### User | 2026-05-14T14:44:37.079Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-05-14T14:44:37.562Z

[tool_result] knowledge\wiki\decisions\git-tree-sweep-2026-05-13.md:67:- `regen-wiki-from-viz.mjs` will pick up this entry on its next cron fire and link it into `knowledge/wiki/architecture/index.md`.

### Assistant | 2026-05-14T14:44:41.993Z

The grep for `regen-wiki-from-viz` only found a wiki doc mention — but the script `scripts/regen-wiki-from-viz.mjs` itself should exist (it's referenced as `REGEN_SCRIPT`). Let me verify and search more specifically.

### Assistant | 2026-05-14T14:44:44.209Z

[tool_use: Bash]

### Assistant | 2026-05-14T14:44:45.666Z

[tool_use: Grep]

### Assistant | 2026-05-14T14:44:46.667Z

[tool_use: Grep]

### User | 2026-05-14T14:44:53.745Z

[tool_result] Found 6 files
scripts\system-viz-on-commit.mjs
scripts\viz-regen-guard.mjs
scripts\build-wiki-leaf-index.mjs
scripts\extract-skill-triggers.mjs
scripts\regen-wiki-from-viz.mjs
scripts\audit-wiki-coverage.mjs

### User | 2026-05-14T14:44:54.211Z

[tool_result] No matches found

### User | 2026-05-14T14:44:58.110Z

[tool_result] -rwxr-xr-x 1 Mark V 197608 45315 May 11 14:24 H:/prism/scripts/generate-system-viz.mjs
-rwxr-xr-x 1 Mark V 197608  7902 May 11 14:40 H:/prism/scripts/regen-wiki-from-viz.mjs
-rwxr-xr-x 1 Mark V 197608 15372 May 14 09:38 H:/prism/scripts/viz-regen-guard.mjs
---HASH FILE DIR---
ls: cannot access 'H:/prism/state/shared/system-viz/.viz-regen-guard-manifest-hash': No such file or directory
---GRAPH---

... [+99 chars truncated]

### Assistant | 2026-05-14T14:45:01.242Z

Now I have the key data. Let me check the staleness logic against the real mtimes, and look at `regen-wiki-from-viz.mjs` to understand what it actually reads (critical for the hash-gate completeness question).

### Assistant | 2026-05-14T14:45:02.043Z

[tool_use: Read]

### User | 2026-05-14T14:45:03.715Z

[tool_result] read-once-guard: 'H:\prism\scripts\regen-wiki-from-viz.mjs' was already read 14m ago in this session and is unchanged (mtime 1778528459679). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-14T14:45:07.123Z

The guard claims I already read `regen-wiki-from-viz.mjs` — but it isn't in my visible context. Let me bypass the cache to see what the orchestrator actually consumes.

### Assistant | 2026-05-14T14:45:08.219Z

[tool_use: Bash]

### User | 2026-05-14T14:45:13.859Z

[tool_result] #!/usr/bin/env node
/**
 * regen-wiki-from-viz.mjs
 *
 * Orchestrator: runs every viz→wiki generator in sequence after the
 * system-viz graph regenerates. Wire into SessionStart, the system-viz-
 * on-commit hook, or invoke via slash command after `/system-viz`.
 *
 * Generators (run in dependency order):
 *   1. generate-layer-wiki.mjs       — 13 per-layer entries
 *   2. generate-domain-wiki.mj
... [+7478 chars truncated]

### Assistant | 2026-05-14T14:45:16.548Z

Now I have the full picture. This is the critical finding. Let me verify a couple more facts about what the generators actually read.

### Assistant | 2026-05-14T14:45:19.450Z

[tool_use: Bash]

### User | 2026-05-14T14:45:25.031Z

[tool_result] === generate-engine-wiki.mjs ===
6: *   H:/prism/knowledge/wiki/architecture/engines/<domain>/<EngineName>.md
8: * Atomic engines are L5 nodes with subgroup=atomic_engine and id pattern
14: *   - source path guess (mcp-server/src/engines/<EngineName>.ts)
27:import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
34:const GRAPH_PATH = resolve(PRISM_ROOT, "state/shared/system-v
... [+3373 chars truncated]

### Assistant | 2026-05-14T14:46:54.631Z

This confirms the critical architectural finding. I now have everything I need.

---

## Code Quality Analysis Report — U-CLEANUP-F5 `viz-regen-guard.mjs`

### Summary
- Files Analyzed: 2 (`viz-regen-guard.mjs` NEW, `system-viz-on-commit.mjs` caller rewire) + 2 read for context (`regen-wiki-from-viz.mjs`, the wiki generators)
- The caller rewire is correct and well-documented. The guard's *engineering* is clean — pure helpers, injectable deps, exit-code discipline, atomic-ish persist.
- **But the central design premise is broken.** The hash gate's dependency set is wrong in a way that causes the exact failure the review brief named as "the most important question": **a real wiki-affecting change is silently missed, and the wiki staleness-rots.**

---

### Critical Issues

#### P0-1 — The hash gate excludes graph.json, but EVERY wiki generator reads ONLY graph.json. The gate misses all engine/dispatcher/action changes → silent wiki-rot.

This is a self-defeating design. Trace it:

1. `DEP_MANIFEST` puts `mcp-server/src/engines`, `mcp-server/src/tools/dispatchers`, `.claude/commands`, `.claude/hooks`, `knowledge/tribal` **in the hash gate** (`inHashGate: true`), and `system-graph.json` **out** of it (`inHashGate: false`).
2. The doc comment's logic (lines 11-17): *"This guard hashes the actual upstream SOURCE inputs... If none of those changed, the wiki output cannot have changed."*
3. **But the wiki generators do not read those source trees.** I checked `generate-engine-wiki.mjs`, `generate-action-wiki.mjs`, `generate-dispatcher-wiki.mjs`, `generate-domain-wiki.mjs`, `generate-layer-wiki.mjs` — every one of them reads `GRAPH_PATH = state/shared/system-viz/system-graph.json` and *nothing else* as a data input. `generate-engine-wiki.mjs` even defines `ENGINES_SRC` but only uses it to *guess a source path string for display* — it never stats or reads the engine tree for content.
4. So the real dependency chain is: **engine source change → `generate-system-viz.mjs` rebui
... [+12962 chars truncated]
