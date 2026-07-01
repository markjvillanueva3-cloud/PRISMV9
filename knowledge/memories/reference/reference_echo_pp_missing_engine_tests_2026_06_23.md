---
name: reference_echo_pp_missing_engine_tests_2026_06_23
description: "Echo started U-PP-MISSING-ENGINE-TESTS — ~38 post-processor engines lack a companion test (NOT the ledger's stale \"7\"); shipped GCodeSnippetEngine.test.ts (13 tests) + logged a latent fill() injection-safety follow-up."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.564Z
aliases: reference_echo_pp_missing_engine_tests_2026_06_23
---


**U-PP-MISSING-ENGINE-TESTS** (slot:echo, 2026-06-23, commit `195785a944` on `cad-fusion-live-ms0`).

**Enumeration (R12 — corrected a stale count):** a live scan of `mcp-server/src/engines/`
for `*Post*` / `GCode*` / `MasterPost*` / `ControllerDialect*` engines WITHOUT a companion
`*.test.ts` found **~38 post-processor-domain engines lacking a test** — the ECHO ledger said
"7 absent engine tests", which was wrong. Cross-domain PHYSICS engines (ThermalWearCoupling,
SpeedFeedOrchestrator, ConstitutiveModel) are oscar/india, NOT echo's to test.

**Shipped:** `mcp-server/src/__tests__/GCodeSnippetEngine.test.ts` — 13 reference-value /
algebraic-invariant tests over the full public surface (get/fill/list/search/byCategory/
categories/getStats). Both per-file scrutiny arms PASS, 0 P0/P1.

**Reusable findings:**
- `GCodeSnippetEngine` is a pure Fanuc snippet library (10 snippets, 4 categories: setup/
  milling/drilling/utility). `fill(id, params)` does naive sequential `{key}` substitution:
  missing params leave `{placeholder}` literal (no validation); a value containing a later
  placeholder token gets re-substituted (value-injection cross-contamination). Characterized,
  not "fixed" — see follow-up below.
- **EOL hazard:** the engine source is CRLF, tests are LF. Byte-exact `toBe` on a template
  literal passes only because esbuild normalizes CRLF→LF at transform. Harden any byte-exact
  emit assert with `out.replace(/\r\n/g,"\n")` so a CRLF/LF flip can't silently diverge.
  [[feedback_edit_tool_crlf_flips_lf_files]]
- **Latent P2 follow-up logged (NOT inlined):** `U-PP-GCODE-SNIPPET-FILL-INJECTION-SAFE` —
  `fill` builds `new RegExp(\`\\{${key}\\}\`)` from the unescaped param KEY (a regex-metachar
  key would THROW) and uses `String(value)` as the replacement string (`$&`/`$\`` values trigger
  JS replacement-pattern substitution). Cannot fire today (all keys `[a-z_]+`, values numeric).
  Fix = literal `code.split(\`{${key}}\`).join(String(value))`; needs its own engine-change
  scrutiny, so it was deferred (P2 latent, not a bug "hit" during the task).

**Queue (one engine per iteration):** GCodeOptimizationEngine, GCodeBidirectionalOptimizerEngine,
GCodeValidationEngine, PostVersioningEngine, ... (~37 remain). Pick small + pure first.

**Lane:** commit `[MAIN-FORCE]` ATOMIC add+commit on the shared tree; if `.git/index.lock` is
held, WAIT for a peer commit to clear (don't delete) — both `add` and `commit` need it free.

**Progress (2 of ~38 done):**
- `GCodeSnippetEngine` (13 tests, commit `195785a944`).
- `GCodeOptimizationEngine` (16 tests, commit `426ace969f`) — analyze/optimize/compare + the
  rapid-Z-descent safety warning. Surfaced a 2nd follow-up `U-PP-GCODE-OPT-CLASSIFIER-TIGHTEN`:
  arc matcher `/G0?[23]/` FALSE-POSITIVES `G28`/`G30` machine-home → miscounts arcs + inflates
  feed distance ×1.5; rapid `/G0[0 ]/` misses compact `G0X10`. Locked via labeled characterization
  tests; engine regex fix (`(?![0-9])` lookahead) deferred to its own scrutiny.

**META-LESSON (fleet-wide, reusable):** VERIFY a per-file scrutiny FAIL's findings against ground
truth before complying — a reviewer agent can be wrong. `test-review-agent` FAIL'd GCodeOptimizationEngine
on two VERIFIED-FALSE claims: it misread `"A\n\n\nB".split("\n")` as 3 blank lines (it is 2 →
`["A","","","B"]`) and miscounted 16 `it` blocks as 9. Both were refuted by the engine source + the
green run + the independent `code-analyzer` arm (which PASS'd); re-dispatching the FAILing arm with the
refutation flipped it to PASS. Don't weaken a correct test to satisfy a spurious FAIL; recompute the
disputed value yourself. (R7 surface-don't-average; R12 fail-loud.) → [[feedback_verify_actual_contract_not_proxy]]
