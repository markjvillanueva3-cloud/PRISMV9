---
type: "chat-session"
source: "claude-code-cli"
session_id: "88b0032d-0552-493b-a189-33c54e0904e9"
title: "Review `H:/prism/scripts/generate-link-audit-features.mjs` (just created — read "
date: "2026-05-21"
first_ts: "2026-05-21T14:47:27.914Z"
last_ts: "2026-05-21T14:49:11.717Z"
cwd: "H:\\prism"
messages: 14
user_msgs: 6
assistant_msgs: 8
raw_file: "H:/.claude/projects/H--prism/88b0032d-0552-493b-a189-33c54e0904e9/subagents/agent-a49b21d30e1b84921.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:16"
---

# Review `H:/prism/scripts/generate-link-audit-features.mjs` (just created — read 

> **claude-code-cli** | 2026-05-21 | 14 msgs (6 user / 8 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/88b0032d-0552-493b-a189-33c54e0904e9/subagents/agent-a49b21d30e1b84921.jsonl`

## Transcript

### User | 2026-05-21T14:47:27.914Z

Review `H:/prism/scripts/generate-link-audit-features.mjs` (just created — read the whole file end-to-end). This is iter 6 of an echo /loop /goal synergize milestone — the visual surface for the iter-4 producer + iter-5 consumer pair. Generates a `/system-viz` ghost roost `ghost.link_audit_integrity` under `ghost.planned_features`, plus one `broken-link` child per top-N broken `[[name]]` sample, by reading `state/shared/.knowledge-link-audit.json`.

Spec it must satisfy:
1. Pure-core split — `brokenLinkNodeId`, `generate` exported for tests; `main` is the I/O shell.
2. Deterministic — re-running produces byte-stable output (audit JSON is already sorted by producer).
3. Idempotent at merge time — merge-augmentations.mjs is authoritative dedupe; we only need to NOT inject collisions.
4. topN clamped to `[0, HARD_TOPN_CAP=200]` — never explode the graph with 4136 children.
5. Hostile-payload safe — missing `.stats`, non-array `broken`, NaN counts must not throw.
6. Knobs: `PRISM_LINK_AUDIT_VIZ_TOPN=N`.
7. Exit codes: 0 ok, 1 audit missing, 2 runtime error.

Reviewer-A weighting (code-analyzer): correctness, integration with sibling `generate-misc-tasks-features.mjs` (canonical exemplar — same pattern), control flow, naming, conventions. Compare structurally to:
- H:/prism/scripts/generate-misc-tasks-features.mjs (canonical sibling)
- H:/prism/scripts/merge-augmentations.mjs lines ~88-90 (loadOptional cluster), ~161-163 (versions cluster), ~860-948 (merge cluster) — verify the new generator slots in cleanly.

Grade PASS/FAIL. List P0/P1/P2/P3 with line numbers. Brief — under 400 words.

### Assistant | 2026-05-21T14:47:51.192Z

I'll review this file end-to-end against the spec and canonical sibling pattern.

### Assistant | 2026-05-21T14:47:51.618Z

[tool_use: Read]

### User | 2026-05-21T14:47:57.952Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * generate-link-audit-features.mjs — system-viz augmentation: the link-audit
4	 * integrity roost.
5	 *
6	 * Spec: /goal synergy iter 6 (echo, 2026-05-21). Closes the visual surface
7	 * for the iter-4 producer / iter-5 consumer pair:
8	 *   - iter-4 [[reference_u_knowledge_link_audit_wire_2026_05_20]] writes
9	 *     `state/shared/.knowledge-link-audit.json` weekly.
... [+8854 chars truncated]

### Assistant | 2026-05-21T14:48:01.580Z

[tool_use: Read]

### User | 2026-05-21T14:48:04.597Z

[tool_result] read-once-guard: 'H:\prism\scripts\generate-misc-tasks-features.mjs' was already read 7m ago in this session and is unchanged (mtime 1778937910095). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-21T14:48:10.952Z

[tool_use: Read]

### User | 2026-05-21T14:48:17.360Z

[tool_result] 80	const staleness      = loadOptional("staleness-overlay-augmentation.json");
81	const fsDeep         = loadOptional("fs-deep-inventory-augmentation.json");
82	const l11Leaves      = loadOptional("l11-leaves-augmentation.json");
83	const wiringOverlay  = loadOptional("wiring-overlay-augmentation.json");
84	const galaxyConst    = loadOptional("galaxy-constituents-augmentation.json");
85	const know
... [+7778 chars truncated]

### Assistant | 2026-05-21T14:48:21.882Z

[tool_use: Read]

### User | 2026-05-21T14:48:27.993Z

[tool_result] 855	    existingEdges.add(k);
856	    stagnantEdges++;
857	  }
858	  G.meta.stagnantFeatures = {
859	    generatedAt: stagnantFeats.generatedAt,
860	    stats: stagnantFeats.stats,
861	  };
862	}
863	
864	// Misc-tasks roost: the "Misc Tasks" ghost parent + one misc-task child per
865	// orphaned-incomplete-work item — work found across all PRISM chats that was
866	// never finished and never form
... [+3530 chars truncated]

### Assistant | 2026-05-21T14:48:32.539Z

I have enough to grade. Let me verify the merge cluster wiring is complete.

### Assistant | 2026-05-21T14:48:33.455Z

[tool_use: Read]

### User | 2026-05-21T14:48:42.466Z

[tool_result] 952	// Link-audit integrity layer: ghost.link_audit_integrity roost + one
953	// broken-link child per top-N broken `[[name]]` sample. Source:
954	// state/shared/.knowledge-link-audit.json (producer iter-4) via
955	// scripts/generate-link-audit-features.mjs (iter-6, echo /goal synergy).
956	// The producer/consumer pair (Stop-hook write, SessionStart digest) is
957	// already in place; this laye
... [+1555 chars truncated]

### Assistant | 2026-05-21T14:49:11.717Z

Review complete.

---

## Code Quality Analysis Report — `generate-link-audit-features.mjs`

### Grade: **PASS**

### Summary
- Pure-core split correct (`brokenLinkNodeId`, `generate` exported, `main` is I/O shell). Spec items 1-7 all satisfied.
- Structurally mirrors `generate-misc-tasks-features.mjs` (canonical exemplar) and `generate-bridge-synergy-features.mjs`: same `loadOptional` slot, same versions slot, same merge cluster shape. Slots into merge-augmentations.mjs at lines 91, 165, 958-981 with no collisions.
- Determinism preserved: `JSON.stringify(result, null, 2)` over a sorted-input audit; only non-deterministic field is `generatedAt` (consistent with siblings — merge cluster stores it in `G.meta.linkAudit.generatedAt`, which is the convention).
- Hostile-payload guards rigorous (lines 96-105): non-object `.stats`, non-array `broken`, NaN/missing counts, negative/non-finite `topN` all degrade safely.
- FNV-1a 32-bit hash (lines 76-82) is the right call — dependency-free, stable across Node versions; comment justifying collision odds is correct (~1e-10 at N=50, but worth noting at HARD_TOPN_CAP=200 it rises to ~1.5e-9 — still safe).
- Exit codes match spec exactly (1 missing, 2 runtime, 0 ok).

### Findings

**P0:** None.

**P1:** None.

**P2:**
- **Line 173** — `Number.isFinite(envTopN)` accepts negative env values; the clamp in `generate()` at line 105 catches them (→ 0), but a negative `PRISM_LINK_AUDIT_VIZ_TOPN=-5` silently emits zero children with no warning. Sibling `generate-misc-tasks-features.mjs` has the same pattern, so this is convention-conforming — flag as observation only. Consider a `console.warn` if `envTopN < 0`.
- **Line 105** — `Math.floor(topN)` after the `>= 0` check is correct, but `Math.floor(0.9) === 0` means a fractional env like `PRISM_LINK_AUDIT_VIZ_TOPN=0.9` silently yields 0 children. Minor; matches sibling behavior.

**P3:**
- **Line 113** — `.slice(0, MAX_LABEL)` on a template like `Wiki↔Memory Link Integrity (4136/12345 bro
... [+1874 chars truncated]
