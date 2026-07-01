---
name: reference_stop_unwired_array_dispatch_fix_2026_06_11
description: "stop_on_unwired_assets.mjs was blind to array-membership dispatch (FOO_ACTIONS.includes(action) -> sub-engine); false-flagged 21 machineLiveDispatcher actions as UNHANDLED, blocking every session that touched it. Added Pattern 4 + comment-strip + main-guard. 5 dispatchers affected fleet-wide."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.212Z
aliases: reference_stop_unwired_array_dispatch_fix_2026_06_11
---


# stop_on_unwired_assets: array-membership-dispatch blindness fixed (2026-06-11, slot:lima)

**Symptom.** The Stop gate `H:/prism/.claude/hooks/stop_on_unwired_assets.mjs` blocked session end with `WIRING ENFORCEMENT — UNHANDLED ACTIONS in machineLiveDispatcher.ts: machine_unregister, machine_connect, … (+16 more)`. Verified: NOT in my changeset (last touched by peer commit `a4916f0474`); a genuine pre-existing false positive.

**Root cause.** `checkDispatcherActionHandlers` recognized only 3 handler shapes: switch/`case "x":`, lookup-table key `x: handleX`, plain object key `x: <value>`. But machineLiveDispatcher routes via **array-membership dispatch**: `MACHINE_ACTIONS.includes(action)` → forwards the whole action string to a sub-engine (`getMachineLiveEngine("machineConnectivity")(action, params)`) that owns the per-action switch internally. So there is **no literal `case` for those actions in the dispatcher** — they were flagged as orphans even though they route correctly. Distinct from the 2026-05-23 `cam_bridge` false positive ([[reference_stop_unwired_assets_false_positive_2026_05_23]]) which had real cases at line 5000+; this pattern has **no case at all**.

**Fleet-wide.** 5 dispatchers use this pattern (all were vulnerable to the same false block): `diagnosisDispatcher`, `integrationDispatcher`, `knowledgeExtDispatcher`, `machineLiveDispatcher`, `productDispatcher`.

**Fix.**
1. Extracted pure exported `findUnhandledActions(rawBody)` (no disk I/O → unit-testable).
2. **Pattern 4:** a member of a `*_ACTIONS` array is "handled" iff the file uses that array as a dispatch guard — `NAME.includes(` or `(NAME as readonly string[]).includes(`. Sibling to the table-driven detection added earlier ([[reference_audit_unwired_engines_table_driven_action_map_detection]]).
3. **Comment-strip** (block + line) so a commented `.includes`/`case` can't falsely clear a real orphan. Line-strip requires whitespace/line-start before `//` so a URL scheme (`http://`) is never mistaken for a comment — per-file scrutiny caught that the naive strip could eat a `case` sharing a line with a URL (false-NEGATIVE, the dangerous direction).
4. **`main()`-guard** (`isDirectInvocation` via `fileURLToPath`) so the module is importable for tests without auto-running; fail-safe `catch → return true` (never silently disables the gate).
5. Removed now-dead `git()`/`execSync` (lint-confirmed; `listChangedFiles` is transcript-scoped).

**NOT a softening (proof).** Negative control: an injected orphan (`orphan_proof_xyz`) is STILL caught. Genuine-orphan + commented-guard + URL-on-case-line adversarial tests pin both directions. 15/15 tests; LIVE `findUnhandledActions(machineLiveDispatcher.ts)` = **21 → 0**; 2-reviewer per-file PASS.

**Honest scope correction.** The GNN ghost-classifier's label source is the SIBLING `scripts/audit-unwired-engines.mjs` (engine→consumer axis), which does NOT share this blindness — confirmed by reading its body. So this fix is a **Stop-gate accuracy / fleet unblock**, not directly a GNN-label-quality fix.

**Follow-up SHIPPED same session (2nd commit) — 5-pattern detector.** The Pattern-3 over-match was fixed + 2 more dispatch patterns added, after empirical validation across all 113 dispatchers:
- **Pattern 3 NARROWED** to require a QUOTED value (`action_name: "method"`) — the old `["'\`a-zA-Z_]` class cleared TS type fields (`calc_force: string`), Zod fields (`x: z.number()`), and result-object fields (`material_embedding: matEmbedding`) whose key coincided with an action name (false-NEGATIVE). The 6 real string-map dispatchers (forming/intelligence/machineSetup/materialProcessing/vibration/welding) all use quoted values → preserved.
- **Pattern 5 ADDED** — `if (action === "x")` if-equality dispatch (intelligence/machineSetup/materialProcessing), anchored on the literal `action` token (per-file scrutiny P1: a bare `\w` cleared any string-equality like `config.preset === "x"`).
- **Pattern 6 NOT added (documented limitation, R12).** The DOMINANT PRISM dispatch style is unconditional forward — `eng.calculate(action, params)` with no case/guard (machiningKnowledgeBase, cadDrawingKnowledge, pp, threadingPipeline, secondaryOps). These still false-flag ALL their enum actions, but CANNOT be regex-detected without over-clearing (every dispatcher calls `validateActionParams(action, ...)`) → needs AST-level analysis. The original 3-pattern audit ALSO flagged them, so the 5-pattern change introduces **ZERO net-new false positives** (validated: all 113 dispatchers, only those 5 forward-dispatchers flag, machineLive=0, the 3 if-eq dispatchers now clear). **Real next unit: AST-level forward-dispatch detection** (TS compiler API) to close Pattern 6.

19/19 tests; 2-reviewer (commit 1) + 1-reviewer (commit 2, P1 fixed) PASS. The unwired-assets audit's "handler must be in the dispatcher file" premise is fundamentally mismatched with forward-to-engine dispatch — the regex patterns are a stopgap; AST analysis is the real fix.

**Lesson.** An action-handler audit must treat array-membership dispatch as a valid handler shape. A comment-strip inside a safety gate must be string/URL-aware, or it flips from the safe direction (extra false positives) to the dangerous one (hidden handler → orphan slips). Files: `.claude/hooks/stop_on_unwired_assets.mjs` + `__tests__/stop_on_unwired_assets.array-dispatch.test.mjs`.
