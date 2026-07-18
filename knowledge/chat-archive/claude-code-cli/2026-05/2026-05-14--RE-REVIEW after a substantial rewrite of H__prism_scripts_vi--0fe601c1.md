---
type: "chat-session"
source: "claude-code-cli"
session_id: "0fe601c1-0fbe-4ef2-b6d5-64d54264beb1"
title: "RE-REVIEW after a substantial rewrite of H:\\prism\\scripts\\viz-regen-guard.mjs (U"
date: "2026-05-14"
first_ts: "2026-05-14T14:58:43.796Z"
last_ts: "2026-05-14T15:00:40.800Z"
cwd: "H:\\prism\\mcp-server"
messages: 17
user_msgs: 6
assistant_msgs: 11
raw_file: "H:/.claude/projects/H--prism/0fe601c1-0fbe-4ef2-b6d5-64d54264beb1/subagents/agent-a4ff5d991689281d9.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:06"
---

# RE-REVIEW after a substantial rewrite of H:\prism\scripts\viz-regen-guard.mjs (U

> **claude-code-cli** | 2026-05-14 | 17 msgs (6 user / 11 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/0fe601c1-0fbe-4ef2-b6d5-64d54264beb1/subagents/agent-a4ff5d991689281d9.jsonl`

## Transcript

### User | 2026-05-14T14:58:43.796Z

RE-REVIEW after a substantial rewrite of H:\prism\scripts\viz-regen-guard.mjs (U-CLEANUP-F5). You previously returned VERDICT: FAIL on 2 P0s + 3 P1s.

YOUR FINDINGS AND THE FIXES:
- **P0-1 (hash gate excluded graph.json, but generators read ONLY graph.json → silent wiki-rot)**: FIXED via your recommended option (a). The manifest now has `system-graph.json` as `kind:"graph-content"`, `inHashGate:true`. New `graphContentSignature()` reads only the first 16 KB (via openSync/readSync — NOT a full readFileSync of the 41MB file), slices everything before the top-level `"nodes":[` array marker (position-anchored, so a longer/shorter `generatedAt` cannot shift the hashed content), strips `generatedAt`/`timestamp`, and hashes that. So the gate now keys on the graph's MEANINGFUL CONTENT (headline counts) — stable across a cosmetic re-timestamp, moves on a real change. The redundant+expensive source-tree (`mcp-server/src/engines` etc.) walk was DROPPED entirely — `dirSignature` is gone.
- **P0-2 (staleness check `regenMtime - inputMtime > threshold` — dead code in primary path, false-positive in secondary)**: FIXED. `checkStaleInputs` is now WALL-CLOCK age: `nowMs - inputMtime > thresholdMs` → stale. `regeneratedBy` is kept only for the operator-facing error message. `nowMs` is injectable for deterministic tests.
- **P1-1 (3000-file walk cost)**: ELIMINATED — no source-tree walking remains.
- **P1-2 (lost-update race on hash file)**: FIXED — hash persist is now temp-write + atomic `renameSync`.
- **P1-3 (centralization / double-gating)**: the guard now spawns `regen-wiki-from-viz.mjs` WITH `--force` so the orchestrator's inner gate cannot override the guard's decision (guard is sole authority). The docstring was rewritten to accurately state there is ONE chokepoint (system-viz-on-commit.mjs) that the cron + slash command reach through.
- P2-1 (weak isDirectRun): FIXED — now `import.meta.url === pathToFileURL(process.argv[1]).href`.

ALREADY VERIFIED by smoke test + a 50-test v
... [+1034 chars truncated]

### Assistant | 2026-05-14T14:58:50.520Z

I'll re-read the file end-to-end and verify the fixes.

### Assistant | 2026-05-14T14:58:50.587Z

[tool_use: Read]

### User | 2026-05-14T14:58:56.146Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * viz-regen-guard.mjs — centralized, dependency-aware gate in front of
4	 * scripts/regen-wiki-from-viz.mjs.
5	 *
6	 * U-CLEANUP-F5 (CLEANUP-MS0). Every caller of the ~8-min wiki-regen orchestrator
7	 * routes through this guard. In practice there is ONE chokepoint —
8	 * scripts/system-viz-on-commit.mjs — and the git post-commit hook, the hourly
9	 * cron, and the /
... [+16371 chars truncated]

### Assistant | 2026-05-14T14:58:59.284Z

Now let me verify the actual structure of the system-graph.json to confirm the `"nodes":[` anchor assumption holds.

### Assistant | 2026-05-14T14:59:01.137Z

[tool_use: Bash]

### User | 2026-05-14T14:59:11.649Z

[tool_result] -rw-r--r-- 1 Mark V 197608 20496839 May 13 19:50 H:/prism/state/shared/system-viz/system-graph.json
---HEAD 2KB---
{"schemaVersion":"2.29.0","generatedAt":"2026-05-14T00:50:05.329Z","meta":{"counts":{"engines":3233,"dispatchers":97,"actions":7464,"algorithms":53,"registries":27,"tests":3576,"srcHooks":54,"claudeHooks":521,"scripts":656,"slashLocal":161,"slashUser":392,"formulas":499},"headline":{"
... [+1804 chars truncated]

### Assistant | 2026-05-14T14:59:14.431Z

I see a critical issue. Let me examine more carefully — the first `"nodes"` occurrence is at byte 656, but I need to check whether it's `"nodes":[` or `"nodes":<count>`.

### Assistant | 2026-05-14T14:59:17.163Z

[tool_use: Bash]

### User | 2026-05-14T14:59:25.839Z

[tool_result] --- bytes 640-720 ---
y":4},"totals":{"nodes":20002,"edges":75678,"layers":11},"vault":{"memories":240
--- all nodes-array-marker offsets in first 20KB ---
--- all bare nodes: occurrences in first 20KB ---
656:"nodes":2

### Assistant | 2026-05-14T14:59:28.313Z

This confirms a **P0 bug**. Let me verify the regex behavior precisely with a quick test.

### Assistant | 2026-05-14T14:59:33.836Z

[tool_use: Bash]

### User | 2026-05-14T14:59:42.262Z

[tool_result] signature: 810fe0a17e3c628038573231
nodesAt (array marker): -1
head length: 16372
real nodes:[ in head?: -1
head contains nodes-array: false

### Assistant | 2026-05-14T14:59:49.660Z

Confirmed. This is a **P0 regression** introduced by the rewrite. Let me trace the full consequence.

The graph structure is:
```json
{"schemaVersion":"2.29.0","generatedAt":"...","meta":{"counts":{...},"headline":{...},...,"totals":{"nodes":20002,"edges":75678,...},...,"roadmap":{"principle":"...","phases":[ ... massive nested structure ... ]}},"nodes":[...20002 nodes...],"edges":[...]}
```

The top-level `"nodes":[` array marker is **far past 16 KB** — the `meta` header alone (with the embedded `roadmap.phases[]` structure containing wire-up domains, leverage scores, etc.) easily exceeds 16 KB. So:

1. `head.search(/"nodes"\s*:\s*\[/)` returns **-1** (the array marker is not within the 16 KB head read).
2. The fallback fires: `const header = nodesAt > 0 ? head.slice(0, nodesAt) : head;` → `header = head` (the **entire 16 KB**).
3. That 16 KB head is `generatedAt`-stripped and hashed.

Let me verify what's actually inside that 16 KB window — whether it's stable content or volatile.

### Assistant | 2026-05-14T14:59:51.352Z

[tool_use: Bash]

### User | 2026-05-14T14:59:57.372Z

[tool_result] === bytes 15800-16384 (tail of the 16KB window) ===
/ToolpathStrategyRegistry.ts","evidence":"id=adaptive; name-marker; non-standard-iso-name","noveltyScore":4},{"kind":"novel-toolpath","name":"Adaptive 2D","file":"H:/prism/mcp-server/src/registries/ToolpathStrategyRegistry.ts","evidence":"id=adaptive_2d; name-marker; non-standard-iso-name","noveltyScore":4},{"kind":"novel-toolpath","name":"Adapti
... [+891 chars truncated]

### Assistant | 2026-05-14T15:00:40.800Z

I have enough to render a verdict. The rewrite did not resolve P0-1 — it relocated the bug.

## Re-Review: viz-regen-guard.mjs (U-CLEANUP-F5)

### P0-1 — NOT RESOLVED. The `"nodes":[` anchor never matches; the gate silently hashes 16 KB of volatile node payload.

Verified against the live `system-graph.json` (20 MB, schemaVersion 2.29.0):

- The **top-level `"nodes":[` array marker sits far past 16 KB.** The `meta` header carries an embedded `meta.roadmap.phases[]` structure (wire-up domains, leverage scores, novelty-toolpath lists) that alone exceeds 16 KB. `head.search(/"nodes"\s*:\s*\[/)` returns **-1** — confirmed by running `graphContentSignature` in-process and by `grep -abo` over the first 20 KB (zero array-marker matches).
- So the fallback always fires: `const header = nodesAt > 0 ? head.slice(0, nodesAt) : head;` → `header = head`, the **entire 16 KB**.
- That 16 KB window's tail is **not** the stable headline counts — it's `meta.roadmap.phases[].items[]` content: `{"kind":"novel-toolpath","name":"Adaptive 2D",...,"noveltyScore":4}` etc. This region is volatile (changes whenever the roadmap/novelty scan shifts) but it is **not** the headline counts the docstring claims drive wiki content, and crucially it is **truncated mid-token at byte 16384** — the slice ends inside `"file":"H:/prism/mcp-server/src/registries/ToolpathStrategyRegistry.ts","evidence":"id=nx_...`.

Consequences, both bad:

1. **The position-anchored stability claim is false.** The whole point of the rewrite (your recommended option a) was that the hashed slice ends at a position-anchored marker so `generatedAt` length variance can't shift it. Since the marker is never found, the slice is a **fixed 16384-byte offset** — exactly the byte-offset-anchored behavior the rewrite was supposed to eliminate. `generatedAt` is stripped by regex so genAt-length variance is handled, but any content edit *before* byte 16384 still shifts every downstream byte in/out of the window. The 50-test suite passes
... [+4632 chars truncated]
