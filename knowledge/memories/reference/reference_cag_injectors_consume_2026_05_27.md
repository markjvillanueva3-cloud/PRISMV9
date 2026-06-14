---
name: reference-cag-injectors-consume-2026-05-27
description: "2026-05-27 sierra slot — shipped 3 CAG follow-ups (CONSUME / CACHE-CONTROL / DASHBOARD) closing the iter-22+iter-28 producer-only landing. 8 files, 143/143 tests, ghost.cag_router roost emits."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.044Z
aliases: reference_cag_injectors_consume_2026_05_27
---


## What shipped — 3 CAG units in one session

| Unit | Files | Tests |
|---|---|---|
| **U-CAG-INJECTORS-CONSUME** | `.claude/helpers/cag-consume.mjs` (helper) + 3 surgical edits to `master-index-precheck-inject.mjs` / `memory-relevance-inject.mjs` / `tribal-by-domain-inject.mjs` | 26 helper + 14 integration |
| **U-CAG-CACHE-CONTROL** | `.claude/hooks/cag-cold-cache-anchor.mjs` (SessionStart anchor) + settings.json wiring | 15 |
| **U-CAG-DASHBOARD** | `scripts/generate-cag-router-features.mjs` + 3 splices (`regen-viz.mjs` FAST[] / `merge-augmentations.mjs` loadOptional + versions + merger block) | 19 |

Plus orphan-rescue: wired `tribal-by-domain-inject.mjs` into settings.json UserPromptSubmit (was on disk unwired since 2026-04-30 — the cag-router-inject sidecar claimed it as a consumer, but it never fired).

## Consume contract (cag-consume.mjs)

`shouldSkip(skipKey, {sessionId})` reads `state/shared/cag-route/latest-<sid>.json` (env-overridable via `PRISM_CAG_CONSUME_SIDECAR_DIR`). Returns `{skip:bool, reason, tier?, confidence?}`.

Fail-OPEN on EVERY defect (sidecar missing / unparseable / schemaVersion mismatch / writtenAt invalid / >30s stale / flag false). Operator escape: `PRISM_CAG_CONSUME_DISABLE=1`.

The 30s staleness window is the load-bearing guard: prevents a prior HOT/HYBRID prompt's sidecar from leaking a false-flag skip into a later prompt the producer didn't run for.

## Generator stats (live, 2026-05-27 first run)

- 7/7 CAG assets present on disk
- 49 sidecars total in `state/shared/cag-route/`
- Tier distribution: COLD=1, HOT=2, **HYBRID=46** (most prompts default HYBRID with low confidence — this is by design per `cag-router.mjs` `confidenceFloor=0.15`)
- 8 nodes + 13 edges emitted into `cag-router-augmentation.json`

## Test surface — 143/143 pass

- 26 helper unit (parseSidecar / decide / shouldSkip / skipAdvisory)
- 14 integration (subprocess hook spawn + tmpdir sidecar + envelope shape)
- 15 cold-anchor (snapshot / render / sidecar IO / end-to-end SessionStart)
- 19 dashboard generator (probeSidecars / probeAssets / generate)
- 47 master-index regression
- 22 cag-router-inject regression
- All consumer regression suites green

## Key bug caught + fixed mid-build

Integration test failed because the operator's local shell had `PRISM_MASTER_INDEX_INJECT=0` set — the inherited env scuttled the master-index hook BEFORE my CAG check ran. Fixed by adding a `makeHookEnv()` scrubber that strips all disable knobs by default; the test now exercises the genuine skip path. This is exactly the [[feedback_scrutiny_3of3_readonly]] class of hostile-env defect that subprocess-based hook tests routinely miss.

Second bug: cag-cold-cache-anchor's `import.meta.url === \`file://${process.argv[1]?.replace(/\\\\/g, "/")}\`` compare didn't match on Windows (`file:///H:/...` vs `file://H:/...`). Replaced with the canonical `pathToFileURL(process.argv[1]).href` pattern used by master-index-precheck-inject.

## Wiring — settings.json (auto-mirrored C: → H:)

- SessionStart bundle: added `cag-cold-cache-anchor.mjs` after `slot-worktree-cwd-advisory.mjs` (line ~340)
- UserPromptSubmit: added `tribal-by-domain-inject.mjs` after `master-index-precheck-inject.mjs` (line ~1214). Producer cag-router-inject fires first at line 1201; the consumer's CAG check + Ollama-embed fallback executes downstream.

## What this closes

- iter-22 reference [[reference_psn_hybrid_mcp_verify_2026_05_26]] (sister: hybrid-retrieval was the parallel substrate)
- iter-28 [[reference_cag_router_hook_inject_2026_05_26]] producer-only landing → now has its 3 consumers actually consuming
- [[reference_cag_hook_inject_peer_wire_2026_05_26]] peer-wire observation → producer + consumer set complete

## Open follow-ups (NOT shipped this session)

- **Per-hook CAG-skip counter** — none of the 3 consumers increment a feature counter on the skip path. The existing `incrementFeature("SystemViz"/"MemoryInject"/"TribalInject", …)` calls live AFTER the skip return, so the FEATURE-UTILIZATION dashboard sees CAG-skipped fires as 0-fire. Tracking unit candidate: U-CAG-SKIP-TELEMETRY.
- **`cag-soul-cache-block.mjs` still unwired in settings.json** — header claims SessionStart wiring but no settings entry exists. Sister of the cold-cache-anchor I shipped; same SessionStart bundle insertion point would close it.
- **dunik_7 tweet 2058905748579418615** — referenced by [[reference_cag_router_hook_inject_2026_05_26]] as the second X-article ingestion; still UNFETCHED (X auth-gated). Not blocking the CAG stack — independent doctrine ingest unit.
- **regen-viz V8 OOM** — `cag-router-augmentation.json` lands fine but the merged ghost.cag_router roost only materializes on a successful `regen-viz.mjs --full` pass. Pre-existing block per [[reference_regen_viz_string_length_2026_05_23]].

## Related

[[reference_psn_hybrid_mcp_verify_2026_05_26]] · [[reference_cag_router_hook_inject_2026_05_26]] · [[reference_cag_hook_inject_peer_wire_2026_05_26]] · [[feedback_settings_wiring_drift_2026_05_16]] · [[feedback_commit_to_slot_worktree]]
