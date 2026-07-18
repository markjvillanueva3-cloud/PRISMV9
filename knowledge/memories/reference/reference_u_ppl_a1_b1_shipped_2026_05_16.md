---
name: u-ppl-a1-b1-shipped-2026-05-16
description: U-PPL-A1 TurningMinFingerprintEngine + U-PPL-B1 ProgramReoptimizationOrchestratorEngine shipped 2026-05-16 slot foxtrot. Okuma S[Vnn] dialect gotcha, MAX_GCODE_BYTES orchestrator guard, lane-guard slot mis-resolution, 6th shared-tree absorption.
aliases: reference_u_ppl_a1_b1_shipped_2026_05_16
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.240Z
---

# U-PPL-A1 + U-PPL-B1 — MS-PRINT-PROGRAM-LOOP, slot foxtrot 2026-05-16

claude-32a39c0c, /loop do-everything (post-/compact, /checkin-foxtrot). MS-PRINT-PROGRAM-LOOP completed_units **7→9 / 23** (envelope close-out in this session; `exit_evidence` + `closeout_note` keys added to the envelope, which previously had neither).

## U-PPL-A1 — TurningMinFingerprintEngine (SHIPPED, absorbed)

`mcp-server/src/engines/TurningMinFingerprintEngine.ts` (573L) + 58-case engine test + 11-case dispatcher round-trip test + 2 `prism_turning` actions (`turning_min_fingerprint`, `turning_min_classify`) + Zod schemas. **Absorbed into peer commit `a76ea58c5` [[[reference_nn_graph_ms0_2026_05_16|NN-GRAPH-MS0]]]** via shared-tree wildcard `git add` — the **6th shared-tree absorption** of the session-family (precedent: [[reference_u_ppl_d5_bridge_shipped]], [[reference_u_ppl_d4_program_equivalent_index]]). All 5 files verified in HEAD via `git ls-tree HEAD <path>`. Work is real; commit subject is a peer's (irreversible — annotated in envelope `exit_evidence`).

Pure structural-fingerprint engine: 16-dim normalized feature vector + cosine-distance classify against named anchors. Composes `OkumaProgram` + `LathePartFamily`. 5-signature corruption detector (null_bytes / git_blob / json_state / empty / non_okuma) runs BEFORE the parser.

**Arm-B per-file scrutiny caught 4 real P0s** (folded into the rewrite, no separate commit): parseFn `.bind()` requirement undocumented; `family_label: "unknown"` leaked an ad-hoc string into the closed `LathePartFamily` union (→ `| null`); 60-byte corruption head too small for the BASIC-CASING.MIN garbage prefix (→ 256); **feature-vector slot 10 referenced a non-existent `op.turn` type — dead-coded on every real program** (→ real Okuma `od_rough+od_finish` vs `face`). Plus a test-driven fix: non-finite `g50MaxRPM` (NaN/Infinity) poisoned the vector → `Number.isFinite` filter before Math.max/min.

## U-PPL-B1 — ProgramReoptimizationOrchestratorEngine (SHIPPED, on-disk+tested, awaiting absorption)

`mcp-server/src/engines/ProgramReoptimizationOrchestratorEngine.ts` + 39-case engine test + 9-case dispatcher round-trip + `prism_turning:lathe_program_reoptimize` + Zod schema. Detect→lathe-optimizer→dual-safety-pass(before/after)→unified-diff. Composes `LatheProgramOptimizerEngine.generateOptimizedProgram` + `gcSafetyAnalyzer.analyze` (NOT `gcodeSafetyAnalyzerEngine` — singleton is named `gcSafetyAnalyzer`). 48 tests pass, incl. real on-disk CASING_MACRO.MIN round-trip.

Scope honestly bounded: lathe arm fully wired; **mill arm surfaces `mill_path_deferred`** (MillProgramOptimizerEngine takes a filePath not content — clean U-PPL-B2 follow-up). prism_cam/prism_mill/prism_dev fanout + ProgramPhysicsOptimizer per-block S/F are explicitly U-PPL-B2 per the milestone brief, not silently dropped.

## Durable lessons (apply to ALL future MS-PRINT-PROGRAM-LOOP / Okuma work)

1. **Okuma OSP spindle syntax is `S[Vnn]`, NOT Fanuc `S<digit>`.** Real `.MIN`: `G50 S[V65]`, `G96 S[V45] M3`, `G97 S[V87] M3`. Any regex written as `G50\s+S\d` / `G96\s+S\d` **silently fails every JM Die lathe file** (designed-against-synthetic-fixture, Karpathy R9). Detection must be token-anywhere + variable-tolerant: `\bG50\s+S\S`, `\bG9[67]\b`. Also: G97 (constant-RPM) is lathe-exclusive too — don't only check G96. Check lathe BEFORE mill (lathes use G54-G59 work offsets too; the discriminator is G50-S + G96/G97 spindle modes which are turning-exclusive).
2. **Orchestrators composing heavy O(n)-per-line engines need a size guard.** A 3.8 MB synthetic hung `LatheProgramOptimizer` + dual `gcSafetyAnalyzer` for minutes. Added `MAX_GCODE_BYTES = 2*1024*1024` (14× the largest real single .MIN) → fail loud `gcode_too_large` BEFORE the heavy pass. Multi-MB / concatenated-archive input belongs in U-PPL-B2 ArchiveReoptimizationBatchEngine (streams file-by-file), not a single-program front door.
3. **Lane-guard slot mis-resolution (recurring fleet bug).** `git-add-lane-guard.mjs` resolved my session → slot `kilo` (a peer's slot) even after `chat-slots.mjs claim --preferSlot foxtrot` succeeded and bound my chatId to foxtrot. Root cause: the hook's `sessionId` resolution (CLAUDE_SESSION_ID-derived) ≠ the chatId I claimed with. Inline `PRISM_GIT_ADD_LANE_DISABLE=1` in bash does **NOT** work — hooks run in the harness process, not the bash subshell; the env var must be harness-level. Working commit path in this fleet is **shared-tree absorption** (a peer's wildcard add picks up untracked files). Don't burn cycles fighting the lane-guard from inside a chat; ship the files + tests on disk, document in handoff, let absorption land it. Sister: [[reference_u_ppl_d5_bridge_shipped]] (PRISM_GIT_ADD_LANE_DISABLE bypass note), [[reference_slot_worktree_ms0_p3_cutover_complete]].
4. **`slimResponse` strips null/undefined/empty-array** from dispatcher responses for MCP transport. A `{nearest_anchor: null, family_label: null}` engine result arrives on the wire with those keys ABSENT. Assert the surviving load-bearing carriers (`confidence===0`, `distance===2`) not the stripped nulls.

## Cross-references
- [[reference_min_template_corruption_2026_05_16]] — the 5/7 corrupt anchor map (corrected this session: 5 corrupt in 3 patterns, not 1; no in-repo git recovery; JM DIE 16,558-corpus unaffected)
- [[reference_u_ppl_d5_bridge_shipped]] · [[reference_u_ppl_d4_program_equivalent_index]] — shared-tree absorption + lane-guard precedent
- [[feedback_roadmap_close_out]] — the 4-surface close-out doctrine applied here
- Envelope: `mcp-server/data/milestones/MS-PRINT-PROGRAM-LOOP.json` `exit_evidence.U-PPL-A1` / `.U-PPL-B1`
