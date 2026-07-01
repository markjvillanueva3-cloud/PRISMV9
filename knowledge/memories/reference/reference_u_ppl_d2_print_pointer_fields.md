---
name: reference_u_ppl_d2_print_pointer_fields
description: "U-PPL-D2 — Print-pointer fields on ProgramMemoryEngine.ProgramRecord + LatheProgramCatalogEngine.ProgramCatalogEntry + auto-link orchestration via ProgramPrintLinkIndexEngine + new action prism_data:box_program_memory_link_print. Shipped 2026-05-15 by charlie/claude-339c8ff7 in commits c06bb96d5 + d831748fc."
aliases: reference_u_ppl_d2_print_pointer_fields
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.241Z
---


# U-PPL-D2 — Print-Pointer Fields + Auto-Link Orchestration

Shipped 2026-05-15 by claude-339c8ff7 (slot charlie, /loop iter 1 post-/compact). MS-PRINT-PROGRAM-LOOP now **2/23** units. The U-PPL-D1 link index (commit `21854fed0`, U-PPL-D1) now feeds saved program records with their resolved blueprint pointer.

## Commits

- `c06bb96d5` — `[MAIN] [charlie/U-PPL-D2]` — 7 files / 1475 insertions: engine extensions + 3 new test files + claim. Clean commit, no peer absorption.
- `d831748fc` — `[MAIN] [SYSTEM-VIZ-BRAIN-MS0]: close-out 3 units — envelope status flip` — scope-mislabeled via the **third occurrence of the shared-tree commit collision pattern** ([[feedback_conflict_fork_rule]]). My `git commit --amend --no-edit` was supposed to amend `c06bb96d5` but HEAD had moved to peer ALPHA's SYSTEM-VIZ envelope commit between my push and my amend; the amend rewrote peer's commit, absorbing my 2-file Reviewer-B fix-up under the SYSTEM-VIZ subject line. Files are correct + tracked; commit message is wrong.
- `188e07729` — `[MAIN] [echo/U-PPL-D2-envelope-flip] MS-PRINT-PROGRAM-LOOP — U-PPL-D2 status=completed` — peer ECHO (claude-2081f435) flipped the envelope to "completed" citing my work as the exit_evidence. Envelope close-out done by the wrong chat but evidence accurate (slightly understated 63/63 vs actual 66/66).

## What it does

### Engines

**ProgramMemoryEngine.ts** — adds 3 optional fields to `ProgramRecord`:
- `linked_blueprint_path?: string`
- `linked_blueprint_confidence?: string` (v6 union: exact/loose/ambiguous/filename_exact/filename_loose)
- `linked_blueprint_page?: number` (1-indexed PDF page for multi-page Docustrata containers)

Extended `save()` with optional 6th arg `linkInfo?: BlueprintLinkInfo | null` — **backwards-compatible** (existing 5-arg callers unchanged). Re-save WITHOUT new linkInfo **preserves** the prior link (must not silently strip a known-good pointer).

New methods:
- `linkPrint(customer, partNumber, linkInfo)` — post-hoc / operator-invoked attach. Returns null for unknown record. **FAIL-LOUD** (throws) on malformed payload. `linkInfo = null` explicitly clears.
- `_validateLinkInfo()` (private) — canonicalize trim path + conf, drop malformed page (NaN/Inf/negative/zero/non-integer/oversize/whitespace-only). Returns null on whole-payload miss.

**LatheProgramCatalogEngine.ts** — same 3 fields on `ProgramCatalogEntry`. Extended `register()` with **prior-link preservation** for auto-rescan safety (re-register w/o link does NOT strip prior pointer; pass new link to overwrite; call `linkPrint(path, null)` to clear). New methods `linkPrint()` + `linkPrintBatch()` with `{attached, missing, invalid, cleared}` counts. Exported `validateLinkInfo()` helper for dispatcher pre-validation.

### Dispatcher (prism_data)

`box_program_memory_save` extended with optional `linked_blueprint_path` + `linked_blueprint_confidence` + `linked_blueprint_page` (explicit attach) OR `program_path` + `join_jsonl_path` + `input_program_paths` + `auto_link` (auto-resolution via U-PPL-D1 link index). When auto-link is gated on (default), the dispatcher calls `resolveAutoLink()` helper which:
1. Loads the link index via `ProgramPrintLinkIndexEngine.loadLinkIndex`.
2. Calls `lookupPrintForProgram(programPath, idx)`.
3. **Training-triple branch** (priority): uses `link.print_disk_path` directly when present.
4. **v6-join branch**: resolves `link.print_doc_ids[0]` → BlueprintRef.filename via `idx.joinIndex.byNormalizedPN.get(link.part_number_normalized).blueprints[]` lookup; page from `blueprint.page_index + 1`.

This doc_id-to-filename resolution is the **Reviewer B P0 fix** — the initial commit reached for `top.print_path` / `top.path` / `top.print_page` which don't exist on `ProgramToPrintLink`. The correct contract: `ProgramToPrintLink` only carries `print_doc_ids[]` (v6) or `print_disk_path?` (training-triple); the canonical filename + page index live on the parent `JoinIndexRow.blueprints[]`.

New action **`box_program_memory_link_print`** — three modes:
- `mode=explicit` — caller supplies `linked_blueprint_path` + `linked_blueprint_confidence` (+ optional page). Engine throws if path or conf missing.
- `mode=auto` — caller supplies `program_path`; dispatcher uses `resolveAutoLink()`. **Miss preserves existing link** (lookup miss != operator clear). Load-fail logs warn + returns unchanged record.
- `mode=clear` — strips any prior pointer unconditionally.

Returns `data: null` when no record exists for the customer/part.

## Tests — 66/66 PASS (~~63/63~~ — echo's exit_evidence understates)

- `ProgramMemoryEngine.linkPrint.test.ts` — 27 cases: save w/ link, prior-link preservation, linkPrint attach/clear/throw, malformed page silent drop, 7 adversarial inputs, 3-customer variability (ITW/AGRATI/TFI), exportJSON/importJSON round-trip, stats.
- `LatheProgramCatalogEngine.linkPrint.test.ts` — 25 cases: register preservation, linkPrint attach/clear/throw, linkPrintBatch counts + don't-abort-on-bad, validateLinkInfo unit, 7 adversarial, 3-controller variability (Okuma OSP / Mastercam / Mazatrol).
- `dataDispatcher.uppl-d2.test.ts` — 14 cases: E2E round-trip via MockMCPServer + registerDataDispatcher — explicit save link, **auto-resolved save link pinned to "9082526.pdf"+page=4+"exact"** (Reviewer B P0 fix), auto-link miss preserves no-link, `auto_link=false` suppresses, missing join warns + save proceeds, link_print 3 modes, miss-on-auto preserves existing link, throws on missing required params, recall-after-save round-trip.

Sibling regression: BlueprintProgramJoinEngine 59 + JMDieArchiveBackAnnotationEngine 41 + ProgramPrintLinkIndexEngine 66 + LatheProgramCatalogEngine (base) 36 + dataDispatcher.uppl-d1 12 — all PASS. **280/280 across the entire D-track**.

## Per-file scrutiny gate

Per [[feedback_parallel_scrutiny_per_file]], every multi-file file got 2 parallel reviewers. Notable findings:
- File 1 (ProgramMemoryEngine.ts): clean.
- File 2 (LatheProgramCatalogEngine.ts): clean.
- File 3 (boxAuditActionSchemas.ts): clean.
- File 4 (dataDispatcher.ts): see end-of-task Reviewer B P0.
- Files 5-7 (tests): post-write run revealed 3 production bugs surfaced ONLY by test execution (envelope shape `r.data` vs `r.data.data`; the lookup result has no top-level `print_path`/`print_page`; empty join file throws). Fixed live during the dispatch loop, not after-the-fact.

## 3-of-3 scrutiny gate (Stop gate)

Session `ppl-d2-339c8ff7`. First pass:
- Arm A (holistic): **PASS** — 10 acceptance criteria met.
- Arm B (independent): **FAIL** with 2 P0s — dispatcher reached for nonexistent ProgramToPrintLink fields; test assertion tautological.
- Arm C (analyst): **PASS** — no silent breakage / regression / I/O security / error-budget / integration coupling concerns.

Fix-up commit `d831748fc` (scope-mislabeled) added the `resolveAutoLink()` helper, deleted the duplicated extraction logic in both call sites, and tightened the test assertions. Re-review of Arm B: **PASS**. Ledger entry: opusReviewed/claudeReviewed/codexReviewed = true.

## Shared-tree commit collision — 3rd occurrence

Same pattern as [[reference_blueprint_ocr_training_ms1_collision]] and [[reference_training_learning_ms0_u1_collision]] and [[reference_u_ppl_d1_program_print_link_index]]. The peer-ownership-guard + commit-amend race in `H:/prism` (the shared multi-chat tree) means:
1. My `c06bb96d5` landed clean.
2. Peer ECHO landed `188e07729` (envelope flip) + peer ALPHA landed `87459e375` (SYSTEM-VIZ ship) between my commit and my amend.
3. My `git commit --amend --no-edit` rewrote peer ALPHA's `87459e375` instead of my own `c06bb96d5`, sweeping my 2 fix-up files into the SYSTEM-VIZ commit subject.

**Lesson**: `git commit --amend` is unsafe in a 7-chat shared tree even minutes after the original commit. Use a new commit (`git commit -m "[MAIN] [charlie/U-PPL-D2-fixup]: …"`) instead. Or fork to `H:/prism-slot-charlie` from the start per [[feedback_conflict_fork_rule]].

## Companion memories

- [[reference_u_ppl_d1_program_print_link_index]] — the prerequisite link index this unit consumes.
- [[reference_u_docu_05_jm_die_back_annotation]] — sibling unit in the same chat-cycle.
- [[reference_milestone_progress_surface]] — MILESTONE_PROGRESS now shows U-PPL-D2 shipped.
- [[reference_build_state_surface]] — engine count +0 (no new engines, both extensions).
- [[feedback_conflict_fork_rule]] — the 3rd shared-tree collision applies again.
- [[feedback_roadmap_close_out]] — 4-surface close-out applied (envelope, MILESTONE_PROGRESS, BUILD_STATE, chat-bus).

## Follow-ups (deferred, not blocking)

- **U-PPL-D3**: `ArchiveToPartsCatalogIngesterEngine` (NEW) — walks JM-Die archive (38,251 files), keys prism_parts by normalized PN via the U-PPL-D1 link index. Next pick. Fork to `H:/prism-slot-charlie` from the start.
- **U-PPL-D-SEC-PATH-CLAMP** (filed by Arm C): U-PPL-D1's `loadLinkIndex` accepts caller-supplied `joinJsonlPath` / `inputProgramPaths` without path containment. Read-amplification primitive (path-existence probe via parse-error messages). Not a U-PPL-D2-introduced regression — inherited. Should clamp to `H:/prism/Docustrata/.index/**` allowlist.
- **DRY**: `box_program_memory_save` auto-link + `box_program_memory_link_print` mode=auto now share `resolveAutoLink()`. The save case wraps in try/catch (log + proceed-without-link), the link_print case wraps for the same reason (log + return-unchanged-record). The behaviors differ deliberately but the path-extraction is identical via the helper. Reviewer A flagged DRY before refactor; resolved by helper extraction.
- **LatheProgramCatalogEngine wiring**: catalog gains the linkPrint API but NOT a dispatcher action this commit. Future track if operator needs a cam_program_link_print surface.

## Operator quick-start

```js
// Save w/ explicit link
prism_data:box_program_memory_save {
  customer: "ITW", part_number: "T8047D3", filename: "T8047D3.MIN",
  dialect: "okuma_osp", assignments: [...],
  linked_blueprint_path: "H:/PRISM/JM DIE/PRINTS/ITW/T8047D3.pdf",
  linked_blueprint_confidence: "exact",
  linked_blueprint_page: 1
}

// Save w/ auto-resolution via U-PPL-D1 link index
prism_data:box_program_memory_save {
  customer: "AGRATI", part_number: "9082526", filename: "9082526.MIN",
  dialect: "fanuc_31i", assignments: [...],
  program_path: "H:/PRISM/JM DIE/CNC LATHE/AGRATI/9082526.MIN"
  // auto_link defaults true; join_jsonl_path defaults to Docustrata/.index/blueprint-program-join-full-v6.jsonl
}

// Post-hoc back-fill
prism_data:box_program_memory_link_print {
  customer: "AGRATI", part_number: "9082526",
  mode: "auto",
  program_path: "H:/PRISM/JM DIE/CNC LATHE/AGRATI/9082526.MIN"
}

// Clear a stale link
prism_data:box_program_memory_link_print {
  customer: "ITW", part_number: "T8047D3", mode: "clear"
}
```
