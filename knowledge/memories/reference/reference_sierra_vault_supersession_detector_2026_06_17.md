---
name: reference_sierra_vault_supersession_detector_2026_06_17
description: "Sierra built the memory-supersession DETECTOR (commit b397e08da3, 2026-06-17, branch cad-fusion-live-ms0) -- highest-ROI item #1 of the post-link-heal queue. scripts/vault-supersession-detector.mjs: a dated memory (reference_X_2026-06-15.md) whose topic-STEM has a strictly-newer dated sibling is a SUPERSESSION CANDIDATE (stale-but-unmarked -> recall surfaces it as CURRENT, the worst 2nd-brain failure). READ-ONLY triage report (mirrors vault-rot-sentinel; operator/follow-up decides). LIVE: 19,889 scanned, 128 unmarked candidates across 43 stems, 103 C:-sourced, 0 already-marked; report at state/shared/memory-supersession-report.json. CRITICAL R8 win: the live recall path ALREADY excludes superseded memos but via a PROSE marker, NOT superseded_by: frontmatter -- so reuses isSupersededMemory from memory-index-search-lib.mjs (single source of truth, no second regex) and formatMarker emits the exact recall-readable '> **SUPERSEDED <date> -- see [[newer]].**' blockquote (self-tested vs the real predicate). 15 mutation-proof tests. Next unit = gated --mark writer (U-VAULT-SUPERSEDE-MARK)."
type: reference
galaxy: system-viz
source: prism-memory
synced: 2026-06-27T20:30:47.203Z
aliases: reference_sierra_vault_supersession_detector_2026_06_17
---


# Sierra: memory-supersession detector (highest-ROI queue item #1, 2026-06-17)

Operator: "lets tackle the remaining work 1 by 1 by highest roi." Continuation of
[[reference_sierra_vault_link_heal_2026_06_17]] (the #1 gap, orphans). This is the
NEXT-worst 2nd-brain failure: surfacing STALE info as CURRENT.

## Built: scripts/vault-supersession-detector.mjs (commit b397e08da3)
A dated memory `reference_X_2026-06-15.md` whose topic-STEM (basename minus trailing
date) has a strictly-NEWER dated sibling is a SUPERSESSION CANDIDATE -- the older is
stale but unmarked, so recall can still surface yesterday's snapshot as today's truth.
Detector groups dated memos by stem, flags each older-with-newer-sibling, points it at
the NEWEST sibling. READ-ONLY triage report (mirrors vault-rot-sentinel "operator decides").
Exports parseDatedName/formatMarker/runSupersessionScan. LIVE: 19,889 scanned, dated=3,178,
**128 unmarked candidates / 43 stems / 103 C:-sourced / 0 already-marked**, 175ms.
Report: state/shared/memory-supersession-report.json (--write). Top hits genuinely stale:
scrutiny-<id>-05-15 -> -05-16 (same session re-saved next day), weekly-hermes-reflection-06-07
-> -06-14, reference_session_alpha-06-08 -> -06-17.

## CRITICAL R8 win: reuse the EXISTING recall contract, do NOT invent a new axis
The live recall path (memory-index-search-lib.mjs, MEMORY-RECALL-SUPERSEDE 2026-06-01,
[[reference_memory_recall_supersede_exclusion_2026_06_01]]) ALREADY excludes superseded
memos -- but via a PROSE marker, and the lib comment is explicit: "the vault uses NO
status:/superseded_by: frontmatter (verified 0 of 11,493 files)". My ORIGINAL plan was a
`superseded_by:` frontmatter writer -- that would have created a SECOND source of truth the
recall path IGNORES (the "second drifting regex" anti-pattern). Instead: import
`isSupersededMemory` (single source) for "already marked?", and `formatMarker` emits the
exact recall-readable form `> **SUPERSEDED <date> -- see [[newer]].**` (consumer regex
SUPERSEDED_DECL_RE keys on `> **SUPERSEDED\b`; ASCII `--` is cosmetic) -- self-tested vs the
REAL predicate so a follow-up --mark wires straight into recall-exclusion, zero new plumbing.

## Scrutiny: Arm B HALLUCINATED again -- discarded with cross-verification
3-agent per-file scrutiny: code-analyzer PASS + reviewer PASS (both read the real files, 13/26
tool calls, live-verified counts 128/43/103). **test-review-agent FAIL was 100% FABRICATED** --
it reviewed an IMAGINED version (cited a `// Superseded by:` comment marker, a `fs.promises.appendFile`
mutating --write mode, a `.sort((a,b)=>b.date-a.date)` -- NONE exist in my files), ran 2 tool calls,
said "from what I've seen in this session" (never re-read). Its 3 "P0s" (missing round-trip test,
untested mutation, unverified sort) were each DIRECTLY CONTRADICTED by A+C who read the real code.
Same failure as the vault-link-doctor Arm B. LESSON (recurring): a reviewer FAIL must be verified
against the real file before action -- cross-check with the arms that actually read it. R12.

## Fixed 3 real P2s (R16 close-gaps)
- parseDatedName calendar-ROLLOVER: Date.parse silently rolls 2026-02-30->Mar-02 (dateMs would
  diverge from displayed dateStr -> mis-sort). Fix: UTC round-trip reject (Feb-30/Jun-31/month-13).
- readErrors counter (R12): an unreadable dated file is COUNTED in the report, not silently dropped.
- --limit is console-only (--json/--write emit full set) -- documented.

## Unit #2 SHIPPED: U-VAULT-SUPERSEDE-MARK -- gated --mark writer + LIVE-APPLIED (commit bf3a7c3c58)
Turned the 128 detections into actual recall-exclusion. `--mark` (default OFF, `--dry-run` preview)
additively prepends formatMarker's blockquote after frontmatter. **DUAL-TARGET (corrected mid-build):**
recall reads the H: vault (memory-index-search-lib DEFAULT_VAULT_ROOT = H:/prism/knowledge/memories,
verified line 21), so mark the H: copy ALWAYS (immediate recall effect) AND the C: source too for
C:-sourced memos (else the Stop feed C:->H: clobbers the H: mark; byte-equal markers keep the feed
stable). My first (C:-only) design left 103 H: copies unmarked -- caught by re-scanning H: + verifying
which root recall reads. Reversible (per-run ORIGINAL backup, HASH-prefixed names = injective so no
sep-vs-underscore collision), atomic (temp+rename + orphan-tmp unlink on failure), idempotent.
**LIVE-APPLIED + CONVERGED: alreadyMarked=128 UNMARKED=0.** All snapshot/session families (88 session,
24 scrutiny, 14 clean_ship, 1 weekly, 1 ctx-regain -- ZERO substantive evolving memos, so blanket-safe).
Backups: state/shared/memory-supersession-backup-*. 23 tests. 2-arm scrutiny PASS (no P0/P1); fixed 3
P2s. NUANCE (R12): PRISM_MEMORY_INDEX_KEEP_SUPERSEDED=1 escape hatch re-includes only after the next
SIDECAR rebuild (sidecar bakes exclusion at build time); the backup-restore undo is unconditional.

## Next-ROI queue (post-supersession, the operator's "1 by 1 by highest roi")
Per the assessment's own gap ranking: #1 orphans DONE (link-heal), #2 supersession DONE (this).
Next: (a) Auto-Dream CONTRADICTION-detector (advisory -- logical-conflict sibling of this temporal-
staleness detector; assessment's named #2 gap; semantic/harder -- needs embeddings or LLM compare,
false-positive risk -> workflow fan-out + adversarial verify); (b) 150 ambiguous broken links ->
`--ambiguous` review (extend vault-link-doctor, deterministic, lower risk); (c) MECE uncategorized/
(10 files); (d) /Daily writer (inbox/mistakes/connections dirs EMPTY). Sibling:
[[reference_sierra_vault_link_heal_2026_06_17]].
