# CLAUDE-MD PATCH — U-CLOSE-OUT-AUDIT-V2-DRIFT-DETECTOR

> Patch-sibling per PATCH-SIBLING convention (CLAUDE.md is peer-dirty in the
> shared tree — 6820 uncommitted, cannot safely edit directly without clobbering
> peer work). Operator/integrator splices the pointer below into CLAUDE.md
> §CLOSE-OUT AUTOMATION when the tree is quiescent.

**Surface:** `H:/prism/CLAUDE.md`
**Unit:** U-CLOSE-OUT-AUDIT-V2-DRIFT-DETECTOR (alpha /loop, 2026-05-17)
**Where:** append to the `## CLOSE-OUT AUTOMATION` section.

## Pointer line to splice

```
**Silent close-out drift (2026-05-17, alpha /loop)** — a SECOND drift class the
existing audit missed: envelope `status:complete` + all units complete but
`MILESTONE_PROGRESS.json` `shipped:0` (pre-2026-05-12 ship commits not tagged
`[SCOPE]/U-ID`). First measured: 51 milestones / 329 hidden-shipped units (~25-30%
fleet completion blind spot). `scripts/lib/silent-close-out-drift.mjs` (pure) wired
into `audit-close-out-candidates.mjs` as additive `silent_close_out_debt` key +
`## Silent Close-Out Debt` MD section (schemaVersion 1.0.0→1.1.0, non-fatal-wrapped).
ADVISORY ONLY — never auto-flips MILESTONE_PROGRESS; operator reconciles via
`scripts/close-out-milestone.mjs --milestone <ID>`. Wiki:
[`knowledge/wiki/architecture/silent-close-out-drift.md`]. Memory:
[[reference_silent_close_out_drift_2026_05_17]]. Spec:
`state/shared/specs/SILENT-CLOSE-OUT-DEBT-AUDIT-2026-05-17.md`.
```

## Surface #5 — MEMORY.md (also peer-locked at write time)

`C:/Users/wompu/.claude/projects/H--PRISM/memory/MEMORY.md` was held by
`claude-4f9091a6` during this session (chat-bus file-claim). Splice this pointer
as the new most-recent entry under `## Indexed memories` (above the current
top line) when the lock clears:

```
- [silent close-out drift detector](reference_silent_close_out_drift_2026_05_17.md) — 2026-05-17 alpha /loop. 51 ms / 329 hidden units (envelope-complete + MILESTONE_PROGRESS-zero, pre-2026-05-12 untagged ships). Pure lib + audit wiring, 16 tests, 2-reviewer PASS. ADVISORY only. R7 flat/nested two-reader fix; R12 non-array fail-on-revert.
```

The reference file it points to (`reference_silent_close_out_drift_2026_05_17.md`)
is already written to the auto-memory dir — only the index pointer is pending.

## Provenance
- Per-file scrutiny: 2 reviewers PASS/PASS (iter-6), P2.1 flat-units divergence fixed in-session + regression-tested (16/16 node:test).
- Other 3 reflection surfaces done directly: wiki, auto-memory `reference_silent_close_out_drift_2026_05_17.md` + MEMORY.md pointer, Obsidian `knowledge/memories/reference/reference_silent_close_out_drift_2026_05_17.md`.
- This patch-sibling is surface #4 (CLAUDE.md) deferred to operator splice per [[feedback_no_git_stash_shared_tree]] / peer-lane discipline.
