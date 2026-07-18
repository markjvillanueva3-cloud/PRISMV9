---
source: project
section: ENGINE WIRING — WIRE TO ALL SOURCES (2026-04-28)
slug: engine-wiring-wire-to-all-sources-2026-04-28
indexed_at: 2026-06-23T02:05:18.083Z
---

## ENGINE WIRING — WIRE TO ALL SOURCES (2026-04-28)

> **R15 — Build it once, build it whole, build it everywhere (operator directive 2026-06-04).** ANYTHING you build (engine, hook, skill, script, schema, pattern) is "done" only after **WIRE → TEST → VALIDATE → APPLY-TO-ALL-GALAXIES**: (1) wire to every natural consumer in the same commit (no orphans); (2) real reference-value/invariant tests — happy + ≥3 failure + ≥2 adversarial, round-tripped through the dispatcher; (3) validate on LIVE data with numbers, never "looks fine"; (4) a general asset must cover/serve EVERY galaxy with proven coverage, a galaxy-specific one is cloned (not forked) to every galaxy that shares the need. Partial/one-galaxy = `[SCOPED]` only. Enforced by `comprehensive-build-enforce` + `stop_on_unwired_assets` + per-file 2-arm scrutiny. [[feedback_wire_test_validate_all_galaxies]].

When generating an engine, do NOT stop at one dispatcher. Wire to **every dispatcher that would naturally consume it**, in the same commit. Examples:
- New memory engine → `prism_memory` AND specialized consumer (e.g. `prism_guard:error_ledger_*`)
- New physics engine → `prism_calc` AND `prism_safety` (if it computes safety-relevant)
- New CAM engine → `prism_cam` AND vendor-specialized (mastercam, hypermill, etc.)
- New reasoning engine → `prism_ai` AND `prism_intelligence`

Verification:
- `stop-auto-wire.mjs` (Stop hook, NOW WIRED) audits new engines/hooks/skills, warns on missing dispatcher refs.
- `stop_on_unwired_assets.mjs` is the transcript-scoped orphan-block for NEW engines (an R15 enforcer) — but it is **currently bypassed fleet-wide by `PRISM_ALLOW_UNWIRED=1`** (the 2026-05-24 YOLO-bypass cluster, `settings.json:45`) AND has 0 direct settings.json Stop-block refs. It is preserved on disk + validated (`.claude/hooks/__tests__/stop_on_unwired_assets.wiring.test.mjs`, 4/4 — proves it blocks a real orphan when the flag is off), so it is **ready to arm** once the bypass is lifted and it is added to the Stop block. Until then the "no-orphans" guarantee is advisory, not enforced (R12: do not assume it fires). Known false-positive history: [[reference_stop_unwired_assets_false_positive_2026_05_23]] — re-verify before arming.
- Test acceptance criterion: round-trip E2E assertion through every wired dispatcher (not only the singleton).

If an engine is genuinely wrapped by a singleton (e.g. `QdrantMemoryEngine` ← `QdrantMemoryEngineSingleton`), tag it `// WIRE-EXEMPT: <reason>` naming the wrapper.
