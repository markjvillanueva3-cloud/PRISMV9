---
name: reference_u_docu_05_jm_die_back_annotation
description: "U-DOCU-05 — JMDieArchiveBackAnnotationEngine ships 2026-05-15 (commit 01ed88d41). MS-DOCU-INGEST now 2/2 complete. Back-annotation pipeline writes per-program print-pointer sidecars + per-PN parts-index from v6 join, FAIL-LOUDs on ~31K disk-side orphans."
aliases: reference_u_docu_05_jm_die_back_annotation
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.236Z
---


# U-DOCU-05 — JM-Die Archive Back-Annotation Engine

Shipped 2026-05-15 by claude-339c8ff7 (slot charlie, /loop iter 1) at commit `01ed88d41`. MS-DOCU-INGEST now **2/2** units complete (U-DOCU-04 was the v6 query layer; U-DOCU-05 is the disk-side back-annotation).

## What it does

`JMDieArchiveBackAnnotationEngine` (`mcp-server/src/engines/JMDieArchiveBackAnnotationEngine.ts`, ~570 LOC) back-annotates the JM-Die program archive at `H:/PRISM/JM DIE/` with print-pointer sidecars derived from `BlueprintProgramJoinEngine`'s v6 join (shipped U-DOCU-04, 73,876 rows, 1,943 exact + 1,918 loose matches). Three artifact families:

1. **Per-program sidecar** — `<program_path>.print-pointer.json` alongside each program file. Lets shop-floor tools resolve "what print does this NC come from?" without loading the 60MB v6 join.
2. **Per-PN parts-index entry** — `<archiveRoot>/Docustrata/.index/prism_parts/<pn-norm>.json`. Lets quoting / part-history tools resolve "what programs and prints exist for this PN?" without scanning the archive.
3. **Gap report** — `state/shared/jm-die-back-annotation-gap-report.json`. **FAIL-LOUD** per CLAUDE.md R12 surfacing programs on disk that have **NO row in the v6 join** — the canonical ~16K g-code + ~15K cam_project orphans the envelope brief explicitly demanded. Computed by walking `Docustrata/.index/jm-die-index-v2.json`'s 38,251 disk entries and diffing against the join's `byProgramPath` set.

## Wiring (3 actions on `prism_dev`)

| Action | Purpose |
|--------|---------|
| `back_annotate_archive` | Plan or write (default `dryRun:true` safety gate). Filters by `confidence_filter:["exact","loose"]` default. |
| `back_annotate_gap_report` | Two-sided gap report — join-side confidence breakdown + disk-side orphan walk. |
| `read_print_pointer` | Fast sidecar lookup with self-provenance check. Returns null on foreign / missing / malformed sidecars. |

`prism_cam:cam_read_print_pointer` is documented in the engine docblock but **NOT yet wired** — Tier-D follow-up (one lazy-import + one switch case in camDispatcher.ts). All three 3-of-3 reviewers flagged this as P2/P3 (deferrable, not a blocker).

## Safety properties

- **Default `dryRun:true`** — operators preview blast radius before mutating disk.
- **Foreign-sidecar provenance check** — `isOurSidecar` reads `annotator === CANONICAL_ANNOTATOR`; foreign files are NEVER overwritten (counted as `skipped_foreign`).
- **Path-traversal trust boundary** — new `isPathUnderAllowedRoot` validator defends against tampering of the Python-emitted `source_path` field in the v6 join. Programs whose resolved path escapes the `allowRoots` list are counted as `skipped_path_unsafe`.
- **Concurrent-writer data safety** — parts-index entry is FULLY derivable from `(row, triple)`, so two writers produce byte-identical content. `safeWriteSync` is per-file atomic. No file lock required.

## Tests — 41/41 PASS

`mcp-server/src/__tests__/JMDieArchiveBackAnnotationEngine.test.ts` covers:
- 4 pure-transform groups (buildSidecarFromJoinRow / buildPartsIndexEntry / sidecarPathFor / partsIndexPathFor)
- Path utilities (normalizePathForCompare, isPathUnderAllowedRoot)
- computeGapReport with + without injected disk index (oversize 10K-entry test for adversarial input)
- I/O orchestrator with injected JoinIndex + tmp-dir archive root
- 4 failure modes (`skipped_path_unsafe` / `missing_program_file` / `skipped_no_source_path` / `skipped_no_part_number`)
- Idempotence (`skipped_existing_self` on re-run)
- Spanning confidence variability (exact / loose / ambiguous)
- Foreign-sidecar provenance + malformed-JSON + null inputs
- Sample-cap-at-PER_OUTCOME_SAMPLE_CAP (50)
- Class+singleton dual-export pattern

## Per-file scrutiny gate (CLAUDE.md, 2026-05-12)

First engine pass FAILed both reviewers with 3 P0s:
1. **Gap report wrong universe** — was scanning only the v6 join rows, NOT the on-disk archive. Envelope explicitly demanded FAIL-LOUD on disk-side orphans. **Fixed**: added disk-side walk against `jm-die-index-v2.json` + diff vs `byProgramPath`.
2. **`wrotePartsIndexThisRow` dead flag** — set never, misleading guard. **Fixed**: removed the flag (the block is naturally once-per-row by position).
3. **`skipped_no_part_number` counter mislabeled** — counted missing source-path, not missing PN. **Fixed**: split into `skipped_no_part_number` (row-level empty PN) + `skipped_no_source_path` (program-level empty path).

Also fixed in rewrite: archiveRoot double-separator bug (`path.join` not `path.dirname + sep + "PRISM"`), double-read of foreign sidecars (combined into `readSidecarWithProvenance`), unsafe `as PrintPointerSidecar` cast (cast to `Record<string, unknown>` then verify annotator field before trusting).

## 3-of-3 scrutiny (Stop gate)

Session `339c8ff7-73f9-4ab2-9d68-2e10d32f5267`:
- Arm A (holistic): **PASS** — 6 acceptance criteria met, 5 P2/P3 notes (cam mirror docstring claim).
- Arm B (independent): **PASS** — 41/41 tests with 109 real-value assertions, dispatcher wiring complete.
- Arm C (analyst): **PASS** — peer-engine contract preserved, I/O security hardened, error-budget complete.

## Companion memories

- [[reference_milestone_progress_surface]] — MS-DOCU-INGEST now appears as `shipped:2 total:2` after this commit.
- [[reference_build_state_surface]] — engine count rises by 1 (the new JMDieArchiveBackAnnotationEngine).
- [[reference_conflict_fork_rule_2026_05_15]] — built initially in fork `H:/prism-docu-print-org` after peer hammered devDispatcher.ts; ff-merged back via [[reference_reverse_merge_then_ff_only]].
- [[feedback_roadmap_close_out]] — close-out touched envelope + roadmap-index (close-out-milestone.mjs orchestrator).
- Sibling unit: U-DOCU-04 (the query layer) shipped previously at commit `5680c52f6` — this unit builds on that surface.

## Follow-ups (not blocking)

- **Cam mirror** (P2): wire `prism_cam:cam_read_print_pointer` mirroring the prism_dev:read_print_pointer action. One-line lazy-import + one switch case in `camDispatcher.ts`. Per the engine's existing docblock claim. Matches U-DOCU-04's prism_cam mirror pattern for `cam_program_for_print` / `cam_print_for_program`.
- **Operator first-run**: invoke `prism_dev:back_annotate_archive` with no params (dryRun:true default) — preview the would_annotate count; then once approved, invoke with `dry_run:false` for the actual mutation pass. Expected counts per the v6 join confidence breakdown: ~6,421 exact + ~4,863 loose = ~11,284 sidecars (capped per-call by `limit:` parameter for operator-incremental annotation).
- **Long-tail coverage** (envelope brief explicit): the ~31K disk-side orphans (programs with no v6 join row) cannot be back-annotated from Docustrata alone. Future work: CAD link / programmer notes / ERP tie-in. Tracked under MS-PRINT-PROGRAM-LOOP Track D U-PPL-D1.
