---
type: "chat-session"
source: "claude-code-cli"
session_id: "2220271d-d467-4a86-a5a1-63fd71cdebc2"
title: "Review a 3-file PRISM system-viz change set under U-VIZ-SCRIPTLIB-COVERAGE. Cont"
date: "2026-05-20"
first_ts: "2026-05-20T19:11:47.444Z"
last_ts: "2026-05-20T19:13:42.231Z"
cwd: "H:\\prism"
messages: 20
user_msgs: 9
assistant_msgs: 11
raw_file: "H:/.claude/projects/H--prism/2220271d-d467-4a86-a5a1-63fd71cdebc2/subagents/agent-af56ca4336618e964.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:08"
---

# Review a 3-file PRISM system-viz change set under U-VIZ-SCRIPTLIB-COVERAGE. Cont

> **claude-code-cli** | 2026-05-20 | 20 msgs (9 user / 11 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/2220271d-d467-4a86-a5a1-63fd71cdebc2/subagents/agent-af56ca4336618e964.jsonl`

## Transcript

### User | 2026-05-20T19:11:47.444Z

Review a 3-file PRISM system-viz change set under U-VIZ-SCRIPTLIB-COVERAGE. Context:

The /system-viz generator family already has `generate-scripts-atomic.mjs` which DELIBERATELY does not recurse into `scripts/lib/` (see its line 40 comment). That leaves 144 load-bearing library files invisible to the master-index graph, blast-radius queries, and subagent pre-search. The new generator covers this gap.

Files to review END-TO-END (read each whole, not in chunks):

1. `H:/prism/scripts/generate-scripts-lib-atomic.mjs` (new file, ~165 lines) — emits 144 L6 nodes (scriptlib.<slug> for impl files; scriptlib.<slug>.test for test files) + 144 `contains` edges + 68 `test-coverage` edges. Mirrors the existing `generate-scripts-atomic.mjs` pattern exactly.

2. `H:/prism/scripts/generate-scripts-lib-atomic.test.mjs` (new file, ~165 lines) — 14 node:test cases run against the live `scripts/lib/` directory and live `system-graph.json`. All 14 PASS as of this review request.

3. `H:/prism/scripts/merge-augmentations.mjs` — 4 surgical inserts (loadOptional + version stamp + mergeIndexedAugmentation + summary line) all mirroring the existing `scriptsAtomic` sibling.

4. `H:/prism/scripts/regen-viz.mjs` — 1 line insert: added `"generate-scripts-lib-atomic.mjs",` to the FAST[] array right after `"generate-scripts-atomic.mjs",`.

Reviewer A weight: integration with already-built engines, hidden coupling, security, error budgets, naming/convention conformance, R12 fail-loud (no silent stub assertions, no `||` fallback on user-controlled keys against plain {} maps), inlined constants policy (existing scripts-atomic uses magic numbers 300/0.28/0.20/0.07 inline; mine mirrors that pattern).

Specifically check:
- Does the new generator's `scriptlib.<slug>` namespace collide with anything in the existing graph? (the test pin at "does NOT clobber existing graph node ids" verifies this — confirm it's load-bearing.)
- Is the `mcpToolToDispNodeId`-style hostile-key guard needed here? (User inp
... [+650 chars truncated]

### Assistant | 2026-05-20T19:11:59.886Z

I'll review the four files end-to-end against the stated criteria.

### Assistant | 2026-05-20T19:12:01.393Z

[tool_use: Read]

### Assistant | 2026-05-20T19:12:00.417Z

[tool_use: Read]

### Assistant | 2026-05-20T19:12:00.931Z

[tool_use: Read]

### User | 2026-05-20T19:12:07.504Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * generate-scripts-lib-atomic.mjs — emit L6 nodes for every script library
4	 * file under scripts/lib/{,*.test.mjs}.
5	 *
6	 * Sister generator to generate-scripts-atomic.mjs which DELIBERATELY does
7	 * not recurse (see its line 40 — "sub-dirs are utilities"). The lib/
8	 * subdirectory is the exception: every file there is a load-bearing pure
9	 * library imported
... [+6085 chars truncated]

### User | 2026-05-20T19:12:07.824Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * generate-scripts-lib-atomic.test.mjs — hermetic tests for the
4	 * scripts/lib atomic node generator (U-VIZ-SCRIPTLIB-COVERAGE).
5	 *
6	 * Run: node --test scripts/generate-scripts-lib-atomic.test.mjs
7	 *
8	 * Strategy: run the real generator against the live scripts/lib/ directory
9	 * and the live state/shared/system-viz/system-graph.json — no fixtures, no
10	 *
... [+7795 chars truncated]

### User | 2026-05-20T19:12:08.654Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * generate-scripts-atomic.mjs — drill scripts/*.{mjs,js,py,ts,sh,ps1} into
4	 * atomic L6 children of core.scripts. Excludes archived/completed/test buckets.
5	 *
6	 * Output: state/shared/system-viz/scripts-atomic-augmentation.json
7	 */
8	import fs from "node:fs";
9	import path from "node:path";
10	import { fileURLToPath } from "node:url";
11	
12	const __dirname = 
... [+4434 chars truncated]

### Assistant | 2026-05-20T19:12:12.651Z

[tool_use: Read]

### Assistant | 2026-05-20T19:12:12.196Z

[tool_use: Read]

### User | 2026-05-20T19:12:23.143Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * regen-viz.mjs — single-shot regenerate the entire system-viz graph.
4	 *
5	 * Use cases:
6	 *   - After pdf-learn / video-learn / shop-knowledge / tribal-ingest writes
7	 *     new tips: knowledge-galaxy picks them up and emits new L8 nodes.
8	 *   - After any audit script that writes a new state/shared/UNWIRED-*.json:
9	 *     wiring-overlay emits fresh phantom ed
... [+18983 chars truncated]

### User | 2026-05-20T19:12:24.568Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-1064 of 1567 total (31284 tokens, cap 25000). Call Read with offset=1065 limit=1064 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	#!/usr/bin/env node
2	/**
3	 * merge-augmentations.mjs — fold per-augmentation JSONs back into system-
... [+49927 chars truncated]

### Assistant | 2026-05-20T19:12:27.653Z

I have enough context to confirm the merge insert placements. Let me verify the actual splice block for scriptsLibAtm.

### Assistant | 2026-05-20T19:12:29.758Z

[tool_use: Grep]

### Assistant | 2026-05-20T19:12:30.744Z

[tool_use: Grep]

### User | 2026-05-20T19:12:51.489Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-05-20T19:12:51.494Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-05-20T19:12:54.468Z

[tool_use: Bash]

### User | 2026-05-20T19:13:09.708Z

[tool_result] 112:const scriptsAtomic  = loadOptional("scripts-atomic-augmentation.json");
113:const scriptsLibAtm  = loadOptional("scripts-lib-atomic-augmentation.json");
179:if (scriptsAtomic)   versions.scriptsAtomic   = scriptsAtomic.generatedAt   ?? "present";
180:if (scriptsLibAtm)   versions.scriptsLibAtomic = scriptsLibAtm.generatedAt   ?? "present";
1492:const [scriptNodesA, scriptEdgesA] = mergeIndexe
... [+151 chars truncated]

### Assistant | 2026-05-20T19:13:42.231Z

I have enough confirmation. The 4 inserts land in the canonical sibling positions (113, 180, 1493, plus the summary line). Now I can render the verdict.

---

## PRISM Review — U-VIZ-SCRIPTLIB-COVERAGE (Reviewer A, holistic)

**Verdict: PASS** with 2 P2 + 3 P3 findings. No P0/P1. Safe to ship; follow-ups can be deferred.

### Strengths
- Mirrors `generate-scripts-atomic.mjs` namespace/edge/output conventions cleanly (`scriptlib.*` is a fresh prefix — no collision with the existing `script.*` namespace owned by the sibling generator). The test at lines 69-77 *is* load-bearing: it pins both "no plain `script.` prefix" AND "no double-prefix" — that's exactly the regression class to guard.
- 4 merge-augmentations inserts land in the canonical sibling positions (decl 113, version 180, merge 1493, summary will be ~9 lines deeper in the same block). Order matches `scriptsAtomic` precisely.
- `regen-viz.mjs` insert at line 124 follows the existing `generate-scripts-atomic.mjs` (line 123) — runs in the same FAST pass before merge, before downstream sidecar build. Correct.
- R12 fail-loud: status is hard-cased to `built`/`stub`, test at line 181-187 pins this.
- Path normalization to forward slashes (`f.rel.replace(/\\/g, "/")`, line 132) — important since `path.join` produces `\` on Win11. Test at 189-196 guards.
- No `||`-on-user-controlled-key issue: the only lookup-style code (`EXT_COLORS[f.ext]`) is keyed by `path.extname(...).toLowerCase()` filtered through `EXTS` set first — hostile-key class is **not** reachable here. `mcpToolToDispNodeId`-style guard is not needed.

### P2 findings
1. **`generate-scripts-lib-atomic.mjs:111`** — `baseStem` double-strips ext: `deriveImplStem(f.name)` returns `foo` from `foo.test.mjs` (regex strips the full `.test.<ext>`), then the next `.replace(new RegExp(`\\${f.ext}$`), "")` is a no-op. Cosmetic — output is correct because the regex doesn't match anything to strip — but it's confusing. Inline a comment or drop the second replace.
2. 
... [+2031 chars truncated]
