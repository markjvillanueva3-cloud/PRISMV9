---
name: reference_alpha_memory_index_nofire_2026_05_29
description: memory-index-precheck no-fires in production (sidecar staleness discarded to a timeout-prone live-scan) — root cause + 1-line graceful-degradation fix
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.470Z
aliases: reference_alpha_memory_index_nofire_2026_05_29
---


**Production-confirmed bug (2026-05-29, slot:alpha):** `memory-index-precheck-inject.mjs` (UserPromptSubmit recall over the Obsidian vault) effectively **no-fires in production** — `🧠 Memory vault pre-search` appeared **0×** across 8 recent `H--prism` transcripts and **3×** in `H--prism-slot-alpha`, while sibling injectors (`wiki-precheck` 78/51, `master/graph` 154/22, `mem-relevance` 104/67) fired heavily. So it is genuinely dead, NOT a CLI artifact (the audit's #3 was right; its #2 "wiki unwired" was WRONG — wiki-precheck fires via the cag-router orchestrator fan-out, not a direct settings entry).

**Root cause:** `runMemoryIndexSearch` (`scripts/lib/memory-index-search-lib.mjs`) prefers a prebuilt sidecar (`state/shared/memory-index-sidecar.json`, ~11ms fast-path) and falls back to a live-scan only when the sidecar is absent/corrupt. BUT `tryLoadMemorySidecar` also **discards** the sidecar when STALE (`sc.sourceMtimeMs < youngest namespace-DIR mtime`, lines ~260-262). A namespace dir's mtime bumps every time a memory is **added** (~95/day across 8 chats). The Stop-triggered regen hook (`memory-index-sidecar-regen.mjs`) has a **1-hour throttle** with a fleet-shared stamp → only ~1 rebuild/hour. So the sidecar is stale most of every hour → discarded → **live-scan over 11,262 files / 20.9MB** → exceeds the UserPromptSubmit timeout → killed → silent no-fire. (The `DEFAULT_MAX_TOTAL_BYTES = 8MB` cap = the "8MB cap" the 2nd-brain audit guessed at; it bounds the live-scan but thousands of small-file `readFileSync`s still blow the timeout.)

**STATUS: FIXED + COMMITTED LIVE** by slot:alpha (commit `0c0c7ace08` on cad-fusion-live-ms0, via `[BOOTSTRAP-SLOT-ENFORCE]` cross-tree per [[feedback_all_slots_free_access]] — do NOT defer integration-tree fixes to golf). Verified: forced-stale sidecar now warns "using anyway" and returns 3 hits instead of the timeout live-scan. NOT pending anymore.

**The fix (1-line, graceful degradation):** in `tryLoadMemorySidecar`, the STALE branch now **returns `sc.records` anyway** (with a soft stderr advisory), NOT `return rejected("stale...")`. A stale sidecar is missing only the handful of memories added since the last regen — vastly better than a live-scan timeout that returns NOTHING. Reserve the live-scan strictly for genuine corruption (unparseable/schema-mismatch/malformed), which already `rejected()` above it. The Stop-regen catches the sidecar up.

```js
// lines ~260-262, replace:
if (youngestMtime > 0 && Number(sc.sourceMtimeMs) < youngestMtime) {
  return rejected("stale (older than vault)");
}
// with:
if (youngestMtime > 0 && Number(sc.sourceMtimeMs) < youngestMtime) {
  try { process.stderr.write("[memory-index-search-lib] sidecar stale — using anyway (regen refreshes; live-scan reserved for corruption)\n"); } catch {}
  // fall through to `return sc.records`
}
return sc.records;
```

**Immediate relief shipped:** `node scripts/build-memory-index-sidecar.mjs` (10,796 records, 510ms) rebuilt the stale sidecar live — fixes it until the next stale window. Secondary knob: lower `PRISM_MEMORY_INDEX_REGEN_THROTTLE_MS` (default 3600000) — narrows but does NOT fix (any single add still triggers discard). The lib fix is the real cure.

**Lesson (recurring class):** a CLI repro of a hook (`echo|node hook.mjs`) is UNRELIABLE on Windows (fd-0 quirks) — my CLI showed 0 for BOTH the broken hook AND the wired master-index, while wiki-precheck emitted 1203B. **Production transcript grep is the ground truth** for "does a hook fire," not CLI. Same class as the high-roi-skill-rank false "dead route" (2026-05-17). Related: [[reference_galaxy_synergy_state]], [[feedback_obsidian_brain]], audit `state/shared/OBSIDIAN-2ND-BRAIN-AUDIT-2026-05-29.md`, plan `state/shared/specs/OBSIDIAN-2ND-BRAIN-GETUP-PLAN-2026-05-29.md`.
