---
name: reference_audit_multiline_import_false_orphan_2026_06_02
description: "DETECTOR BUG (fixed): audit-unwired-engines.mjs engineReferencedInConsumer() required ')' immediately after the import-path quote, so it MISSED the dominant multi-line `await import(\\n \"...Engine.js\"\\n)` wiring form — mis-reporting ~129 wired engines as UNWIRED fleet-wide (654->525 after fix). This is why the '67 unwired lathe / 654 fleet' orphan backlog was phantom. Fix: add \\s* before the closing \\). Tests 21/21. Commit 0f6a72b0c4 on slot/whiskey (needs merge to correct fleet count)."
type: reference
slot: whiskey
source: prism-memory
synced: 2026-06-27T20:30:46.473Z
aliases: reference_audit_multiline_import_false_orphan_2026_06_02
---


# Wiring-detector multi-line await-import false-orphan bug (U-AUDIT-MULTILINE-IMPORT-FIX, slot:whiskey, 2026-06-02)

**What:** `scripts/audit-unwired-engines.mjs` `engineReferencedInConsumer(name, content)` — the predicate that `BUILD_STATE.json` NEEDS_WIRING, the fleet "N unwired engines" count, and the `/system-viz` ghost-orphan roosts are all built from — had a regex that matched `await import("...Engine.js")` only when the closing `)` came **immediately** after the path quote (`['"]\)`). The dominant PRISM dispatcher form is multi-line:

```
const { x } = await import(
  "../../engines/XEngine.js"
);
```

with `)` on its own line. `"\n)` never matched `"\)`, so **every engine wired via multi-line `await import` was mis-classified UNWIRED**.

**How found:** chasing the "67 unwired lathe / 654 fleet" backlog during a `/loop wire` arc. Engines I had *just verifiably wired* (`LathePrintProgramEmitterEngine` via camDispatcher `lathe_p2p_emit` + my U-CL9; `LatheQualityGateEngine` U-CL11; `LatheAdvancedOperationsEngine` U-CL12) were ALL still listed UNWIRED by a fresh audit (generated today, scanning the slot tree — not stale, not wrong-tree). The only explanation left was the regex; the multi-line `)` placement was the gap.

**Fix:** add `\s*` before the closing `\)` in the await-import branch (line ~114). One char-class. Verified impact: audit UNWIRED **654 → 525** (−129 false positives), WIRED-DIRECT 2449 → 2585. Tests **21/21** (+2 multi-line unit cases + 1 real-file E2E oracle reading turningProgramDispatcher). Sibling to echo's table-driven detection fix (`9e27d9d420`, [[reference_audit_actionmap_synergy_chain_2026_05_18]]).

**How to apply:**
1. **The "unwired engine" counts (BUILD_STATE, awareness snapshot, system-viz ghosts) were inflated by ~129** — do NOT treat the raw orphan count as ground truth for wiring backlogs; many "orphans" are wired via multi-line `await import`. Re-run the audit after this fix merges.
2. When wiring an engine, the multi-line `await import(` form is fine and now correctly detected.
3. **Verify-before-wiring (R8):** before wiring a claimed-orphan engine, grep the dispatchers for its name — the orphan list can false-positive. Three of my `/loop wire` fires were spent confirming claimed orphans were already wired (camDispatcher/turningDispatcher) before this root cause surfaced.
4. Commit `0f6a72b0c4` is on `slot/whiskey` — the fleet count stays wrong until slot/whiskey merges toward `cad-fusion-live-ms0`. Pairs with [[feedback_always_fill_gaps]] + R12 fail-loud.

## 2nd blind spot (same session, commit `e77a366d39`) — WIRE-EXEMPT head-only scan
The WIRE-EXEMPT classifier read only `.slice(0,2000)` (first 2KB) of each engine for the `// WIRE-EXEMPT:` marker. But the CLAUDE.md convention places the marker adjacent to whatever makes the engine exempt — for a singleton-wrapped engine that's the singleton export at the **file bottom** (e.g. `LatheThermodynamicsEngine`, tag near line 2827). Such engines were mis-classified UNWIRED. `fs.readFile` already loads the whole file, so the `.slice` was the only thing hiding the marker → **zero-I/O fix**: extracted exported `wireExemptMarker(content)` scanning the full source. Impact: WIRE-EXEMPT 105→123 (+18 bottom-tagged), UNWIRED 525→513.

**Combined detector accuracy (both fixes this session): UNWIRED 654 → 513 (−141 phantom orphans, ~22% of the backlog).** Two distinct false-positive classes: (a) multi-line `await import(` with `)` on its own line, (b) bottom-placed WIRE-EXEMPT tags. Both are dominant PRISM conventions the detector didn't model.

## What the corrected detector revealed (the genuine in-lane lathe orphans)
After the fixes, only **2** genuine whiskey-lane orphans remained among the 40 listed (the other 38 are india AI/LoRA, echo MasterPost/Post, a data-catalog, or now-correctly-exempt): **`LatheResourceKnowledgeEngine`** (tribal program-QA — wired U-CL13, `turning_knowledge_*`) and **`LatheUnifiedPhysicsOrchestrationEngine`** (constants-clean unified turning physics — wired U-CL14, `turning_physics_analyze`). `LatheThermodynamicsEngine` was correctly WIRE-EXEMPT (the bottom-tag the 2nd fix now detects). Lesson: **fix the measurement before chasing the backlog** — 141 of the 654 "orphans" were never real.
