---
type: "chat-session"
source: "claude-code-cli"
session_id: "77971357-5bcb-4ccc-a608-c74803591428"
title: "You are reviewing 3 files for PRISM unit `U-REGEN-VIZ-MERGE-FAILLOUD` (slot=lima"
date: "2026-05-17"
first_ts: "2026-05-17T04:37:01.514Z"
last_ts: "2026-05-17T04:37:43.062Z"
cwd: "H:\\prism"
messages: 12
user_msgs: 5
assistant_msgs: 7
raw_file: "H:/.claude/projects/H--prism/77971357-5bcb-4ccc-a608-c74803591428/subagents/agent-af93c759ce15d0edc.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:15"
---

# You are reviewing 3 files for PRISM unit `U-REGEN-VIZ-MERGE-FAILLOUD` (slot=lima

> **claude-code-cli** | 2026-05-17 | 12 msgs (5 user / 7 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/77971357-5bcb-4ccc-a608-c74803591428/subagents/agent-af93c759ce15d0edc.jsonl`

## Transcript

### User | 2026-05-17T04:37:01.514Z

You are reviewing 3 files for PRISM unit `U-REGEN-VIZ-MERGE-FAILLOUD` (slot=lima, claude-77971357). Your role: content-specialist analyst review — code quality, logic correctness, edge-case completeness.

**Context — the bug being fixed:**
`scripts/regen-viz.mjs --full` spawns `scripts/merge-augmentations.mjs` to fold per-augmentation JSONs into `state/shared/system-viz/system-graph.json`. Reproduced 2026-05-17 in lima session: the merge subprocess failed (likely SIGKILL under 97% commit-mem pressure) emitting `[regen-viz] ✗ merge failed` with ZERO stderr (signal-kill leaves no V8 message). The parent then CONTINUED through `repair-graph-engine-classification` → `dedup-graph-nodes` → `reparent-viz-categories` → `add-parent-contains-edges` → `system-viz-obsidian-bridge-v2` → `generate-executive-briefing` → `generate-wiki-debt-worklist` → drift-gate, ALL running against the STALE pre-merge graph (99352 nodes instead of the expected 145440 after merge). Downstream artifacts (EXECUTIVE-BRIEFING.md, WIKI-DEBT-WORKLIST.md, obsidian-augmentation.json) were published with stale data; drift-gate certified "clean" because stale ≠ truncated. The script then exited 1 (`failed > 0` path) so cron caught it, but downstream artifacts were already corrupted. Karpathy R12 — silent corruption masquerading as exit-1.

**Files to review (read each end-to-end):**

1. `H:/prism/scripts/lib/regen-viz-merge-guard.mjs` — NEW pure decision helper. Exports `decideMergePostState({mergeStatus, mergeSignal, preMergeNodeCount, postMergeNodeCount, augTotalBytes})` returning `{abort, exitCode, reason, message}`. Plus I/O helpers `readGraphNodeCount(graphPath)` and `readAugmentationByteTotal(dir)`. Exit-code constants: EXIT_OK=0, EXIT_MERGE_FAILED=2, EXIT_MERGE_NO_OP=3. AUG_BYTE_THRESHOLD=1MB.

2. `H:/prism/scripts/lib/regen-viz-merge-guard.test.mjs` — NEW. 19 node:test cases. Pure-logic: happy path, merge-fail (exit ≠0), signal-kill SIGKILL surface, exit-fail takes precedence over 0-delta, silent no
... [+2650 chars truncated]

### Assistant | 2026-05-17T04:37:05.666Z

I'll read all three files end-to-end before grading.

### Assistant | 2026-05-17T04:37:06.294Z

[tool_use: Read]

### User | 2026-05-17T04:37:07.130Z

[tool_result] 1	/**
2	 * regen-viz-merge-guard.mjs — pure decision logic for regen-viz.mjs merge step.
3	 *
4	 * Why this exists (U-REGEN-VIZ-MERGE-FAILLOUD):
5	 *   Previously the orchestrator logged `[regen-viz] ✗ merge failed`, set
6	 *   failed++, and KEPT GOING through repair → dedup → reparent → parent-edges
7	 *   → obsidian-bridge → executive-briefing → wiki-debt → drift-gate. Those
8	 *   stages all re
... [+4274 chars truncated]

### Assistant | 2026-05-17T04:37:09.842Z

[tool_use: Read]

### User | 2026-05-17T04:37:10.685Z

[tool_result] 1	/**
2	 * regen-viz-merge-guard.test.mjs — unit tests for U-REGEN-VIZ-MERGE-FAILLOUD.
3	 *
4	 * Covers:
5	 *   - happy path (merge succeeded, augmentations folded in)
6	 *   - merge-fail (subprocess exit ≠ 0) → exit 2, post-merge stages must abort
7	 *   - merge-fail with signal kill (SIGKILL — the actual prod failure mode
8	 *     observed 2026-05-17 lima session under 97% commit-mem pressure)
9
... [+9658 chars truncated]

### Assistant | 2026-05-17T04:37:13.823Z

[tool_use: Read]

### User | 2026-05-17T04:37:15.576Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * regen-viz.mjs — single-shot regenerate the entire system-viz graph.
4	 *
5	 * Use cases:
6	 *   - After pdf-learn / video-learn / shop-knowledge / tribal-ingest writes
7	 *     new tips: knowledge-galaxy picks them up and emits new L8 nodes.
8	 *   - After any audit script that writes a new state/shared/UNWIRED-*.json:
9	 *     wiring-overlay emits fresh phantom ed
... [+9806 chars truncated]

### Assistant | 2026-05-17T04:37:18.767Z

Let me read the rest of the file to check the exit-code handling.

### Assistant | 2026-05-17T04:37:19.716Z

[tool_use: Read]

### User | 2026-05-17T04:37:20.613Z

[tool_result] 220	  console.error(`[regen-viz] ✗ dedup failed`);
221	  failed++;
222	}
223	
224	// Post-dedup restructure: re-parent catalog file nodes under manufacturer hubs,
225	// and build the JM-Die file-type → machine-type hierarchy. Idempotent.
226	console.log(`[regen-viz] post-merge restructure: categories by manufacturer / file-type…`);
227	const rc = spawnSync(process.execPath, [...NODE_ARGS, path.jo
... [+3841 chars truncated]

### Assistant | 2026-05-17T04:37:43.062Z

Now I have full context. Let me deliver the verdict.

## Code Quality Analysis Report — U-REGEN-VIZ-MERGE-FAILLOUD

VERDICT: PASS

**Decision logic** is correct. All 4 paths well-defined: merge-fail (status!==0) precedes everything; silent-no-op gated on `augTotalBytes >= THRESHOLD && preMergeNodeCount > 0 && postMergeNodeCount <= preMergeNodeCount`; otherwise continue. The `preMergeNodeCount > 0` predicate genuinely prevents the first-run-regen false-positive (verified: pre=0 → middle clause false → fall-through). NaN inputs fall through safely because every `>=`/`<=`/`>` comparison with NaN is false (JS spec) — confirmed by the dedicated test.

**Threshold choice** (1MB) is defensible against the use cases: FAST mode emitting <1MB total augs is the idempotent re-merge case and gets a tolerance pass; FULL mode at 34MB+ stays guarded. Boundary test asserts `>=` semantics.

**Signal handling on Windows** works because `spawnSync.signal` is `null` on Windows (no POSIX signals) and the guard only conditionally appends `signal=` to the message — the exit-code path still fires correctly via `mergeStatus !== 0`. The SIGKILL test exercises the message formatting, not Windows kernel semantics. The actual lima repro on Windows would more likely show `status: null, signal: null` from an OOM kill — still caught because `null !== 0`. Good.

**Peer file safety**: confirmed — only reads `system-graph.json` (its own product) and lib helpers; writes nothing.

P0: none.

P1: none.

P2:
- `readGraphNodeCount` parses the 153MB system-graph.json TWICE per run via `JSON.parse(fs.readFileSync(...))`. On the 97%-commit-mem box that triggered this bug, this allocates ~300MB transient peak (string + parsed object, dropped after `.length`) and could itself OOM the parent. A streaming node-count (regex-scan for `"id":` occurrences inside `"nodes":[...]`, or a stream-json parser) would be ~10MB peak. Defer to follow-up — current impl works on the box that has the headroom to run the rest of th
... [+1194 chars truncated]
