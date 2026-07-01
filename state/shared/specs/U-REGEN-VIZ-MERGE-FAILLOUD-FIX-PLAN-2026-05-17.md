---
unit: U-REGEN-VIZ-MERGE-FAILLOUD
slot: lima (claude-77971357)
created: 2026-05-17
domain: backend-dev / harness-tooling
sister-to: precompact-handoff bare-node-spawnSync fix (CLAUDE.md 2026-05-16, commit 5c4778b59)
status: planned (not started)
---

# U-REGEN-VIZ-MERGE-FAILLOUD — fail-loud the silent merge step

## Bug

`scripts/regen-viz.mjs --full` spawns `scripts/merge-augmentations.mjs` to splice augmentations into `state/shared/system-viz/system-graph.json`. Under default Node heap (~4GB) and 97% commit-memory pressure, the merge subprocess crashes (likely `JavaScript heap out of memory`) but:

1. The parent captures **zero stderr** (subprocess output not piped/inherited or silently swallowed).
2. The parent emits one cryptic line: `[regen-viz] ✗ merge failed`.
3. The parent **continues through post-merge stages** against the **stale pre-merge graph**.
4. The script **exits 0** with `failed=1 · driftFail=false`.
5. drift-gate reports clean (because the stale graph IS structurally clean — just stale).

Reproduced 2026-05-17 in lima session 77971357: a `--full` regen completed in 150.3s with apparent success but the new fs-deep augmentation (34.3 MB, 37,791 new nodes) was rolled back. Direct invocation `node --max-old-space-size=8192 scripts/merge-augmentations.mjs` succeeded immediately — confirming the only thing wrong was the parent's spawn config + error handling.

**Class:** fail-silent. Identical family to the `precompact-handoff.mjs` bare-node-spawnSync regression already in CLAUDE.md (2026-05-16 / 5c4778b59). Karpathy R12 violation — "merge failed" returning exit 0 is dishonest.

## Classify · Technique · Edge cases · Failure modes (Karpathy)

**CLASSIFY:** spawn-failure-handling + heap-config bug in an orchestrator script.

**TECHNIQUE:**
1. **Pass `--max-old-space-size=8192`** when spawning merge-augmentations.mjs (its graph buffer is now 331 MB; default 4 GB heap is too tight under host-OS pressure).
2. **Capture subprocess stdout + stderr** into the parent log instead of dropping them (`spawnSync(..., { stdio: 'inherit' })` or explicit capture-and-print).
3. **Treat non-zero exit as FATAL** — the script must exit non-zero, NOT continue through post-merge stages against a stale graph.
4. **Pre/post sanity assert** — if augmentations emitted N nodes/edges per their JSON files but the merge step records 0 deltas across all merge counters, fail loud (covers the "subprocess silently truncated graph" case).
5. **Sweep the orchestrator** — apply the same capture + fail-loud pattern to every `spawnSync`/`exec` of a sub-stage in regen-viz.mjs (drift detector, engine-classification, dedup, restructure, parent-edges, obsidian-bridge, executive-briefing, wiki-debt). They all share the same anti-pattern by inspection of the prior log.

**EDGE CASES:**
- Subprocess crashed (exit ≠ 0, stderr empty): parent must print `merge process exited N: <stderr or '(no stderr)'>`.
- Subprocess OOM: bumped heap should prevent recurrence; if not, captured stderr surfaces `JavaScript heap out of memory`.
- Subprocess hung: add a `timeout: 240000` to the spawnSync call; on TIMEOUT fail loud, do NOT roll back to stale.
- Subprocess wrote a partial graph file on disk: VERIFY `merge-augmentations.mjs` uses atomic write-and-rename (tmp + rename); if not, ship that as a sibling fix.
- spawn ENOENT (e.g., portable-node missing from PATH): same fail-loud message.

**FAILURE MODES (what success looks like):**
- ≥1 augmentation file present + merge subprocess exit 0 → merged graph; post-merge stages run.
- Augmentation file present + merge subprocess exit ≠ 0 → script exits ≠ 0, prints stderr, does NOT run post-merge stages.
- Augmentation file present + merge subprocess exit 0 + 0 deltas reported across all merge counters AND ≥1 augmentation file had non-zero content → script exits ≠ 0 (sanity assert).
- No augmentation files (fresh checkout) → no merge spawn, script exits 0 (existing happy path).

## Scope sizing (S — ~2-3 hours)

- ~50 LOC change in `scripts/regen-viz.mjs` (runStage hardening + heap arg + capture + sanity assert).
- ~30 LOC test file: `scripts/__tests__/regen-viz-merge-faillod.test.mjs` (inject failing merge sub-step via PATH override + fixture spawn, assert exit ≠ 0 and stderr captured).
- 1 regression line in `H:/prism/CLAUDE.md` `## Recent regressions` section.
- 0 schema changes, 0 dispatcher wiring, 0 engine churn.

## Out of scope (separate units)

- **Audit other orchestrator scripts** for the same anti-pattern (regen-wiki-from-viz.mjs, build-state-snapshot.mjs, etc.) — flag as `U-ORCHESTRATOR-SPAWN-AUDIT`.
- **merge-augmentations.mjs internal perf** — it ran clean direct with 8 GB heap. Heap reduction is a follow-up unit if telemetry shows the box can't always spare 8 GB.
- **fs-deep generator perf** — 3.0s incremental is fine; cold-start cost untested.

## Tests

- `regen-viz-merge-faillod.test.mjs` — happy path · failing sub-step exits ≠ 0 with stderr in parent log · 0-delta sanity assert · timeout enforcement · ENOENT path.
- Coverage floor (per CLAUDE.md `COMPREHENSIVE-BUILD ENFORCEMENT`): happy + 3 failure modes + ≥2 adversarial (truncated augmentation JSON, NaN node count in counters).

## Sister surfaces to update (per `feedback_reflect_all_changes_post_update`)

- `H:/prism/CLAUDE.md` `## Recent regressions` line citing this commit.
- `knowledge/wiki/architecture/regen-viz-faillod.md` — short wiki entry.
- Memory file: `C:/Users/wompu/.claude/projects/H--PRISM/memory/reference_u_regen_viz_merge_faillod_2026_05_17.md`.

## Coordination

- Lima slot will claim `U-REGEN-VIZ-MERGE-FAILLOUD` via `slot-task-claim.mjs` before editing `scripts/regen-viz.mjs`.
- `scripts/regen-viz.mjs` is NOT currently peer-claimed (verified at planning time 2026-05-17 03:50 local).
- Single-file edit + 1 new test file — no multi-file scrutiny gate burden beyond the standard 2-reviewer per-file pass.
