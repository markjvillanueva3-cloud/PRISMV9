---
name: reference_u_domain_rules_2026_05_16
description: U-DOMAIN-RULES — 5 mill/lathe/wedm/cam/cad pipeline rules + structural Wire-EDM exclusion + /lathe polysemy guard + deep-freeze contract + AGENT_RULES same-class fix + 5 canonical skill triggers. Closes RGS-TOOL-AUTOINVOKE-MS1's 42% generic-fallback gap.
aliases: reference_u_domain_rules_2026_05_16
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.237Z
---


**U-DOMAIN-RULES shipped 2026-05-16** in `RGS-TOOL-AUTOINVOKE-MS1` (slot lima, `claude-02436db5`, 8 files). 31/31 tests GREEN, per-file scrutiny addressed (Arm A FAIL → all P0/P1 fixed → re-verified; Arm B PASS WITH P1 → 1 deferred downstream).

**Punch-list line closed:** *"Pipeline rules: only 7 rules, no mill/lathe/wedm/cam/cad domain rules → 42% generic fallback; 'Wire EDM' units false-match `/wire-unwired`."*

**5 domain rules** in `scripts/lib/rgs-pipeline-rules.mjs`: mill→/mill (0.80), lathe→/lathe (0.80 — STRUCTURAL test fn, not regex, because bare `okuma`/`turning` are polysemous), wedm→/wedm (0.80), cam→/cam-strategy (0.75), cad→/cad-from-blueprint (0.80). All use `\b` word boundaries — verified safe for "milligrams"/"camera"/"windmill"/"cadence".

**Wire-EDM false-match fix** — the original `/wire|dispatcher|unwired|orphan|wiring/i` rule matched any unit containing "wire", routing every Wire-EDM unit to `/wire-unwired`. Replaced with a structural test that excludes wire-EDM context first (`\bwedm\b|\bwire[-\s]*edm\b|\bsinker[-\s]*edm\b`), then requires `\bunwired\b|\borphan\b|\bdispatcher\b|\bwiring\b`. **Same fix applied to AGENT_RULES wiring-review-agent** (Arm A P3-2 — exact same bug class three rules above the pipeline rule).

**`/lathe` polysemy guard** (Arm A P0-1) — bare `turning` matched "a turning point in the project"; bare `okuma` matched "Okuma operator manual" (Okuma builds MA-600/MB-46V/GENOS M460 mills + grinders too). Structural test fn requires okuma+model-token OR turning+manufacturing-context. The regex `\b(lt|lb)[-\s]?\d+\b` must use `\d+` not `\d` — `LB3000` has no boundary between `3` and `0`.

**Deep-freeze contract** (Arm A P0-2) — file-header docstring claimed "mutation throws in strict mode" but `Object.freeze` is SHALLOW; inner rule objects mutated silently. `deepFreezeArray()` helper freezes every entry; 2 regression-guard `assert.throws()` tests prove the contract now holds.

**Skill triggers registered** — added canonical `triggers:` YAML frontmatter to `mill.md`, `lathe.md`, `wedm.md`, `cam-strategy.md`, `cad-from-blueprint.md`. The `extract-skill-triggers.mjs` parser walks only the FIRST `---...---` block — for mill/lathe/wedm which have TWO frontmatter blocks, the `triggers:` key MUST live in the first (where `name:` is); for cam-strategy/cad-from-blueprint which have a nested `policy.triggers`, append a sibling top-level `triggers:` (the parser's `/^triggers:\s*$/` regex only matches column-0 declarations, so nested policy.triggers is ignored — no conflict).

**End-to-end bridge live-verified** via 3 smoke tests of the `skill-auto-trigger.mjs` hook: "milling adaptive paths on 5-axis VMC" → `/mill (0.80)`; "WEDM pass schedule for taper compensation" → `/wire-edm-studio (0.85)` + `/wedm (0.80)`; "CAD from blueprint" → `/cad-from-blueprint (0.80)`.

**Tests:** `scripts/lib/rgs-pipeline-rules.test.mjs` 22 → 31 cases (+13 — domain positives, polysemy guards, freeze-contract, mill-turn composite, milligrams edge, agent contrapositives, Okuma-LB-model positive). Run: `"H:/.claude/bin/portable-node" --test scripts/lib/rgs-pipeline-rules.test.mjs` → 31/31.

**Deferred** (in commit body + Arm B P1 note for next unit): `mean()` → `max()` in `scripts/lib/rgs-signal-fusion.mjs:194` — pre-existing aggregator bug the new multi-match-common pattern aggravates 5×. `DETERMINISTIC_CONF_CAP=0.6` absorbs most of the loss until a follow-up unit fixes it. Also deferred: textile-mill false-fire on `\bmill\b` (corpus-low; Beta re-rank will adjust), `/cam-strategy` skill content being a 1.7KB stub (not a rules-table issue).

**MS1 progress:** 3/8 complete (U-INTEG-FIX-P0 ✓ `b287c1614`, U-CRON ✓ `025d5c248`, U-DOMAIN-RULES ✓ this commit). P1 remaining: [[reference_u_dispatcher_2026_05_16|U-DISPATCHER]] (prism_dev wire), [[reference_u_feedback_forcing_2026_05_17|U-FEEDBACK-FORCING]] (composite-key fallback), U-RIE-ADAPTER (replace complexityFor heuristic), U-CALIBRATION (CAMConfidenceCalibrationEngine at ≥50 outcomes), U-TRANSFER (xproc_transfer priors).

**Sister memories:** [[reference_rgs_tool_autoinvoke_ms1_2026_05_16]] (parent milestone + U-INTEG-FIX-P0 + U-CRON), [[reference_rgs_tool_autoinvoke_ms0_2026_05_16]] (MS0 — the core-with-injected-readers design that needed the real-data E2E test MS1 added).
