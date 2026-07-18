---
type: "chat-session"
source: "claude-code-cli"
session_id: "e5840fb7-ef73-4b34-a9f0-20822aa90cab"
title: "RE-VERIFICATION of `H:/prism/scripts/build-milestone-progress.mjs`. A prior revi"
date: "2026-05-22"
first_ts: "2026-05-22T16:55:04.455Z"
last_ts: "2026-05-22T16:56:41.406Z"
cwd: "H:\\prism"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/e5840fb7-ef73-4b34-a9f0-20822aa90cab/subagents/agent-a6b0feced90138ff2.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:30"
---

# RE-VERIFICATION of `H:/prism/scripts/build-milestone-progress.mjs`. A prior revi

> **claude-code-cli** | 2026-05-22 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/e5840fb7-ef73-4b34-a9f0-20822aa90cab/subagents/agent-a6b0feced90138ff2.jsonl`

## Transcript

### User | 2026-05-22T16:55:04.455Z

RE-VERIFICATION of `H:/prism/scripts/build-milestone-progress.mjs`. A prior review of this file returned FAIL with two P1 findings. The fixes are applied — confirm they resolve the P1s. Read the WHOLE current file.

PRIOR P1 #1 — "envelope-status credits had no proof surface; +444 newly-credited units collapsed git-proven and envelope-asserted into one `shipped` number, so /pick-unit can't tell them apart."
FIX APPLIED: `computeProgress` now computes per-milestone `envelopeAssertedCount = unitProgress.filter(u => u.source === "envelope-status").length` and adds it to each milestone result object; the top-level `totals` block now has `envelopeAsserted`; the stderr summary prints it. Empirical run: `totals: 2552/5347 shipped (1044 envelope-asserted, 190 drift cases)` — 1044 of 2552 shipped are now flagged as no-git-proof.

PRIOR P1 #2 — "no guard that `u.status` is a string; a numeric/object status could leak through `??`."
FIX APPLIED: added a module-level `const asStr = (v) => (typeof v === "string" ? v : null);`. All four envelopeStatus assignment sites (phases branch, flat branch, object-map branch, Phase-B enrichment) now route through `asStr(...)`.

PRIOR P2 (test coverage) — deferred: the bug lives in `loadMilestones()` which is FS-coupled (reads MILESTONE_DIR) and not exported; a synthetic unit test would need a fixture-dir harness. The change was instead validated by a real-data run over all 695 envelopes (RGS-TOOL-AUTOINVOKE-MS1 pending 3→0, all git-proven envAsserted=0; INFRA-AGI-ROUTER-MS2 5/5 git-proven). Accept the P2 deferral or escalate with reasoning.

VERIFY:
1. Is P1 #1 resolved — is `envelopeAssertedCount`/`envelopeAsserted` correctly computed and surfaced so a consumer CAN distinguish git-proven from envelope-claimed shipments?
2. Is P1 #2 resolved — do all four sites route through `asStr`, and is the coercion correct (does `asStr(x) ?? asStr(y)` fall through correctly when x is a non-string)?
3. Any NEW P0/P1 introduced by these changes (e.g. `en
... [+138 chars truncated]

### Assistant | 2026-05-22T16:55:18.075Z

I'll read the current file to verify the fixes.

### Assistant | 2026-05-22T16:55:18.246Z

[tool_use: Read]

### User | 2026-05-22T16:56:32.399Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * build-milestone-progress.mjs
4	 *
5	 * Generates state/shared/MILESTONE_PROGRESS.md + .json — a delta surface
6	 * showing what's actually shipped per milestone vs what the milestone
7	 * envelope JSONs claim.
8	 *
9	 * Why: roadmap-index.json carries `status: "not_started"` for milestones
10	 * we've already shipped 5+ units of (e.g. XPROC-NEURAL-OPTIMIZE-MS0 has

... [+23709 chars truncated]

### Assistant | 2026-05-22T16:56:41.406Z

Both fixes verified against the full current file.

**P1 #1 — RESOLVED.** `envelopeAssertedCount` is computed at line 324 inside `computeProgress`'s milestone loop, AFTER `unitProgress` is fully built (lines 272-320), so no use-before-declaration. It filters on `u.source === "envelope-status"` — the exact tag set at line 303 for the no-commit envelope-credit path. It is added to each milestone result (line 336) and aggregated into `totals.envelopeAsserted` (line 486). The per-unit `source` field is also surfaced (line 318), so a consumer can distinguish `git-exact` / `git-unit-only` / `envelope-commit` (all git-proven) from `envelope-status` (envelope-claimed) at unit granularity, not just the rollup. Stderr summary prints it (line 499). No double-count: `shippedCount` (line 307) counts all `isShipped`; `envelopeAssertedCount` is a strict subset filter — they are separate counters, never summed against each other.

**P1 #2 — RESOLVED.** `asStr` declared module-level (line 156). All four sites route through it: phases branch line 188 (`asStr(u.status) ?? asStr(unitOverlay[u.id]?.status)`), flat branch line 207, object-map branch line 222, Phase-B enrichment line 233. Coercion is correct: `asStr` returns `null` for non-strings, and `null ?? asStr(y)` falls through to the second term — so a numeric `u.status` correctly yields the overlay status or final `null`, never a leaked number. The `=== "complete"` check at line 300 is now string-safe.

**No new P0/P1.** `progress.reduce((a,p)=>a+p.envelopeAssertedCount,0)` at line 486 is safe — every milestone object gets the field (line 336, unconditional). Markdown headline (lines 396-402) does not surface the new field, but that is cosmetic, not a P1.

PASS
