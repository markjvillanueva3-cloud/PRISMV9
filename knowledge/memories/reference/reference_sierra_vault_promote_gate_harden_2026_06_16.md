---
name: reference_sierra_vault_promote_gate_harden_2026_06_16
description: "Sierra hardened the Obsidian->wiki promotion gate (promote-memory-to-wiki.mjs) so the freeze-disabled vault-promotion cron will not bloat the canonical wiki when it arms. The gate had NO exclusion for graph-node-pointer memories (node_kind frontmatter) nor explicitly-unverified content (advisoryOnly/mustHumanVerify) -- on the LIVE vault 34 of 54 promotion candidates were node_* MIT course/formula pointer STUBS (audit-pending, 1-2 line bodies) whose inbound refs are inflated to ~10 by a single MIT-course index hub, clearing minRefs=3 without genuine cross-referencing. New nonPromotableReason(fm) helper excludes both classes BEFORE the refs/age/type gate. Live: WOULD-PROMOTE 54->17, 0 node_* leak; 30/30 tests; 2-arm scrutiny PASS. Committed [MAIN-FORCE] 409532c31e to cad-fusion-live-ms0 (the file is canonical-only, absent from slot/sierra). Cron ARMING stays blocked by the active MIGRATION-FREEZE-ACTIVE.flag -- this fix only makes it SAFE to arm."
type: reference
galaxy: system-viz
source: prism-memory
synced: 2026-06-27T20:30:47.202Z
aliases: reference_sierra_vault_promote_gate_harden_2026_06_16
---


# Sierra: vault promotion-gate hardening (2026-06-16, slot:sierra)

Continuation of the OBSIDIAN-VAULT-OPS thread (sierra-owned). Work order: "continue in
engineered loops/harnesses/crons utilizing hermes + obsidian vault + ollama offloading."
Most-recent open ladder item was the vault-maintenance crons (`U-VAULT-MAINT-CRON`,
`8c4dff660a`) -- installers SHIPPED but NOT ARMED.

## The verify-then-build gate paid off (would have been over-call #7 of the lineage)
- Arming the crons is BOTH operator-deferred AND blocked: `MIGRATION-FREEZE-ACTIVE.flag`
  is PRESENT (its existence = the HW/drive-migration freeze is ACTIVE; operator DELETES it
  post-migration). The slot-worktree migration is a SEPARATE, complete migration -- do not
  conflate. So I did NOT arm the crons.
- Pivoted to the freeze-SAFE continuation: prove the promoters work on today's vault (manual
  dry-run was always allowed). Dry-run surfaced a real bug instead.

## The bug (R9/R12): promote-memory-to-wiki.mjs would bloat the wiki when the cron arms
- LIVE dry-run: 54 promotion candidates; **34 were `node_*` graph-node pointer STUBS**
  (`metadata.node_kind: course|formula`; bodies 1-2 lines like "Pointer: [[mit-x]]. No
  engines mapped -- lima audit pending"). 12 of them literally named `*_catalog_metadata_only_lima_audit_pending`.
- Root cause: their inbound `[[ref]]` count is inflated to ~10 by a single MIT-course index
  hub linking all of them -> they clear `minRefs=3` without being genuinely cross-referenced.
  `type: reference` is in the section-map so they passed the type gate too.
- Promoting unverified "audit_pending" stub metadata into the CANONICAL wiki = R9/R12.

## The fix (committed [MAIN-FORCE] 409532c31e, cad-fusion-live-ms0)
- New exported `nonPromotableReason(fm)` -> "node-pointer" | "unverified-advisory" | null:
  excludes (1) any memory with `node_kind` (graph atoms belong to the master-graph, not the
  wiki); (2) explicitly-unverified content (`advisoryOnly`/`mustHumanVerify` YAML-truthy:
  true/1/yes/on) -- also catches the LLM synthesis files that self-declare "verify first".
- Wired into `runMemoryPromotion` Pass-2 as a hard exclusion BEFORE the refs/age/type gate;
  new report counter `skippedNonPromotable`; CLI summary surfaces `skipNonProm=N`.
- VALIDATION: 30/30 tests (7 new incl a genuine-atom-still-promotes regression guard + the
  YAML-truthy no-over-block cases). LIVE dry-run: 54 -> 17 candidates, 0 node_* leak; the 17
  remaining are all genuine reference/feedback atoms. Counting integrity proven (all skip
  counters + candidates == totalMemories). Per-file 2-arm scrutiny PASS, 0 P0/P1.

## Lane note (R7): why [MAIN-FORCE] to cad-fusion-live-ms0, not slot/sierra
`promote-memory-to-wiki.mjs` is **canonical-only** -- it exists on cad-fusion-live-ms0 (where
sierra committed it back when it worked that lineage) and is ABSENT from slot/sierra (which is
1027 commits behind canonical). Committing to slot/sierra would have forked a 379-line
canonical file = merge disaster. The cron + live vault both read `H:/prism` (cad-fusion). So
the canonical tree is correct; used the lane-guard kill switch + `[MAIN-FORCE]` prefix (the
same escape romeo's tip commit `cae26e10b1` used). See [[feedback_sierra_commit_to_slot_branch]].

## Open follow-ups (filed)
- **nn-retrain run-logs (scrutiny arm-B P2):** ~11 `reference_nn_retrain_<timestamp>` logs
  still clear the gate (they carry no node_kind/advisory flag). They are ephemeral run-records,
  not durable knowledge -- a SEPARATE junk class needing a run-log signal (filename pattern or
  `run_log: true` frontmatter). Not fixed here (out of scope).
- **Cron arming** remains operator-gated on deleting `MIGRATION-FREEZE-ACTIVE.flag`. This fix
  makes the promotion cron SAFE to arm; the rot-sentinel cron (read-only scan; live: 19,438
  scanned, ROTTING=0) is also arm-ready.
- **galaxy MEMORY.md gap-ladder** (system-viz) should doc-reflect this (B-tier: cron now
  safe-to-arm; new gate-quality item) -- deferred.

Related: [[reference_obsidian_vault_audit_2026_06_08]] (the vault-ops gap ladder),
[[reference_sierra_open_threads_context_map_2026_06_10]].
