---
name: reference_viz_graph_truncation_atomic_fix_2026_06_09
description: system-graph.json truncated by non-atomic merge write; fix + the bootstrap recovery procedure
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.252Z
aliases: reference_viz_graph_truncation_atomic_fix_2026_06_09
---


# system-viz graph truncation: root-cause atomic fix + recovery (2026-06-09, slot:sierra)

**Symptom:** sierra graph-health 🔴 FAILED-LAST for 11h; regen failed at stage "augment molecules" exit=1. Fleet-wide search degrades (the graph is the master-index/awareness substrate).

**Root cause (verified, not guessed):** `merge-augmentations.mjs:2876` (the ONE canonical writer of `state/shared/system-viz/system-graph.json`) used the NON-atomic `writeGraphStreaming`. A SIGKILL mid-write (reaper / OOM / commit-pressure -- documented class [[reference_u_regen_viz_merge_faillod_2026_05_17]] "merge SIGKILLed at 97% commit") left a TRUNCATED file: the 660MB graph ended mid-edges-array (`...,"intensity":0.3},` -- no closing `]}`). Then `readGraphStreaming` (graph-io.mjs:179, the per-element JSON.parse) threw "Unexpected end of JSON input" in EVERY consumer: augment-molecules (the failing regen stage), system-viz-query, lint-orphans --graph.

**Chicken-and-egg that hid it:** `merge-augmentations` READS `system-graph.json` as its base (line 69/77) then folds augmentations and writes it back. Once truncated, merge can't read its own base -> a plain re-run of regen-viz can NOT self-heal (merge aborts before writing). `generate-system-viz.mjs` writes a SEPARATE `architecture-graph.json` (its own OUT_FILE since F1 dd735c1871), NOT system-graph.json -- so it doesn't overwrite the truncated merged graph either.

**Fix (durable, commit 153887a519, U-VIZ-GRAPH-ATOMIC-WRITE):** switch merge's write to the existing crash-safe `writeGraphStreamingAtomic` (graph-io.mjs:86 -- tmp-<pid> + rename). A kill mid-write now leaves only an orphan `.tmp` (swept by the tmp-orphan janitor, which dead-PID-gates), NEVER a truncated canonical graph. The other two graph writers (seed-ghost-from-unwired, vault-to-gnn-refpool) were ALREADY atomic; merge was the lone non-atomic outlier. Output byte-identical (test-proven; the atomic wrapper delegates to writeGraphStreaming). +3 graph-io.test.mjs cases (round-trip / no-.tmp-orphan-on-success / byte-identical / overwrite); 14/14. 3-of-3 PASS.

**RECOVERY PROCEDURE (when system-graph.json is truncated/corrupt -- reuse this):**
1. Confirm corruption: `tail -c 40 system-graph.json` -- a valid graph ends `]}`; truncated ends mid-token / `,`.
2. Bootstrap a valid base: `architecture-graph.json` (generate-system-viz's fresh output, ~60K nodes / ~183K edges, valid) -> atomically copy it onto system-graph.json (cp to .tmp then mv). This replaces the broken file with a valid (smaller) base so merge can read it.
3. `node scripts/regen-viz.mjs --full` -> folds all augmentations onto the 60K base back to the full ~372K graph, writing ATOMICALLY now. F11 cross-lock prevents concurrent-regen clobber.
4. Verify: graph tail ends `]}`, node count back to ~372K, sierra health GREEN, augment-molecules succeeds.

**Lessons:** (a) EVERY writer of a large canonical file must be atomic (tmp+rename) -- one non-atomic outlier under a kill-happy host (reaper/commit-pressure) corrupts it for all readers. Audit: grep `writeFileSync|writeGraphStreaming(` for canonical-file writers, ensure all use the atomic variant. (b) An incremental writer that reads-its-own-output as base has a self-heal dead-end when that output corrupts -- keep a from-scratch bootstrap source (here architecture-graph.json). (c) `regen-viz` default does NOT rebuild the truncated base; only the bootstrap+--full does. See [[reference_v8_graph_read_mass_migration_2026_05_25]], [[reference_sierra_regen_fast_registration_gap_2026_05_29]].
