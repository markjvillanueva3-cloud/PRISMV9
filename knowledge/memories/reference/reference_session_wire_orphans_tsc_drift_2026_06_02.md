---
name: reference_session_wire_orphans_tsc_drift_2026_06_02
description: "2026-06-02 slot:bravo /loop — closed 3 cross-galaxy orphans (pp-verify engine never-committed broken-build fix, ModelAttribution + OpusCapability dispatcher wires) + surfaced that shared-tree tsc baseline is 655 errors, NOT clean."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.183Z
aliases: reference_session_wire_orphans_tsc_drift_2026_06_02
---


2026-06-02 slot:bravo (claude-5e210e4e), /goal /loop "wire all viable nodes+galaxies+master brain with hermes/zebra/zulu". Three more orphans closed on the `cad-fusion-live-ms0` shared tree via the proven round-trip-test + 2-arm-scrutiny pattern:

1. **PostProcessorVerificationOrchestratorEngine** (`2cac254f03`) — latent BROKEN-BUILD fix, NOT a normal orphan. The committed `ppDispatcher` (`pp_verify_posted_nc`, prism_pp) imported this engine, but the engine file itself was **never committed** — it existed only as an untracked file in the shared `H:/prism` workdir, absent from the `slot/bravo` checkout. A fresh checkout could not resolve the import. The earlier `git commit -- <engine>` failed with "pathspec did not match" precisely because the file was untracked (a bare pathspec commit only matches tracked changes) — this was misread in a prior summary as "absorbed into a peer commit." Fix = `git add` then pathspec-commit. Also committed the `overall_score` `[0,1]` clamp regression guard.
2. **ModelAttributionEngine** (`f8be5949ff`) — true orphan (only consumer was its own unit test). Wired `prism_session:model_attribution_{record,summary,recent,find,badge}` — fleet model-provenance ledger. Pure in-memory. test PASS 2/0, 2-arm scrutiny PASS.
3. **OpusCapabilityEngine** (`5fe5ad5198`) — true orphan. Wired `prism_session:opus_assess_complexity` + `opus_stats` (PURE deterministic model-tier complexity router). LLM-backed `execute()` deliberately NOT wired — it routes to LLM sub-methods ("In production, this would call the actual LLM API"), so it is not honestly round-trip-testable; deferred to follow-up unit **U-OPUS-EXECUTE-WIRE** (needs a live Anthropic client + integration harness). test PASS 3/0, 2-arm scrutiny PASS.

**Why (R13 logical order):** wire the *verifiable core* (pure methods) on a proven foundation; LLM-backed entries are a separate integration unit, never faked into a green test. **How to apply:** when an orphan engine mixes pure + network methods, wire + round-trip-test the pure surface to close the orphan, and register the network surface as an explicit follow-up unit with a documented reason — do not skip it silently, and do not mock the SUT to fake coverage.

**R12 FINDING — shared-tree tsc baseline is NOT clean.** `tsc --noEmit` (16GB heap) reports **655 errors in 252 files** on `cad-fusion-live-ms0`. A prior session summary claimed "tsc clean project-wide / 654-baseline cleared" — that was stale/wrong. vitest is transpile-only so these never surface in tests; only `tsc --noEmit` catches them. My 5 edited/added files this session contributed **ZERO** new errors. The 2 errors in the file I edited (`sessionDispatcher.ts`: SwarmRunner TS2345, and `ok({success:true, ...result})` success-spread overwrite TS2783) are PRE-EXISTING peer bugs confirmed on HEAD, outside my edit regions. Surfaced for the papa/backend-helper lane to drive down. See [[feedback_prioritize_devtools_backend]] · [[feedback_high_roi_backend_first_slot_queue]].

Galaxy brain updated: `mcp-server/src/engines/hermes-zulu/MEMORY.md` §"Wired this session (2026-06-02)". Pattern + prior-session orphans: [[reference_zulu_governor_wire_2026_06_01]] · [[feedback_parallel_scrutiny_per_file]] · [[feedback_shared_tree_absorption_pattern]].
