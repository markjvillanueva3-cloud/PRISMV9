<!--
  U-VALIDATION-50-LIVE-RUN — BUILD-READY SPEC (slot:delta, 2026-06-27, session claude-f52932d6)
  Produced by an ultracode scoping Workflow (wf_2ab23bcc-046: 4 code-archaeologist probes + opus synth,
  662K subagent tokens) + on-disk verification. This is the "plan out the remaining unit" deliverable for
  the T2 validation-50 gate of CAD-DRAW-MAX-MS1 / CAD-COMPLETION. Build-ready; one gate (hyperCAD-S seat)
  blocks the REAL number. Companion: DELTA-CAD-TRAIN-TEST-READINESS-2026-06-27.md (the train+test brief).
-->

# U-VALIDATION-50-LIVE-RUN — Build-Ready Spec (T2 validation-50)

> **TL;DR:** The harness + corpus + rubric + dispatcher actions are ALL built. The gap is one thin
> dispatcher-round-tripping CLI driver that emits a machine-readable JSON verdict. **But two integrity
> issues gate it (R12): (1) the T2 gate detector is EXISTENCE-ONLY → trivially gameable; (2) a REAL
> accuracy number requires the hyperCAD-S live seat (headless = MOCK).** Build the driver to be
> *honest* (never flip the gate from a stub/12-case run); harden the detector to be *content-aware*.

---

## ⚠ GATE-INTEGRITY FINDING (R12 — the most important output; "existence != complete" made concrete)

`scripts/cad-completion-reconcile.mjs:136` (`artifactExists`) flips T2 `PENDING→SHIPPED` on **mere file
existence** — any JSON (even `{}`) named `state/shared/specs/cad-validation-50-*.json` OR
`cad-train-test-result-*.json` satisfies it. **The content is never read.** Consequences:
- The milestone `CAD-DRAW-MAX-MS1.json` is marked `status:"complete"` with exit-gate *"Live run against 50
  prints reports ≥70% accuracy"* — but it shipped a **12-case deterministic STUB** (`run-hypercad-validation.mjs:81`),
  not the real 50-print live run. The headline gate was **never actually satisfied**. (Read the body, not the title.)
- ANY driver that writes the probed filename will FALSELY mark T2 SHIPPED — even on 12 stub cases / mock seat.
- **TWO fixes are required for integrity:**
  1. **Driver honesty (this unit):** the driver MUST NOT write a gate-probed filename unless the run is
     genuinely gate-worthy (`orchestrator==='live'` AND `isFull` (≥ target cases) AND `passedGate`). Otherwise
     write a NON-probed name (e.g. `state/shared/CAD-DRAW-MAX-MS1-BASELINE.json`) + stamp `gameableGate:false`.
  2. **Detector hardening (separate follow-up `U-CAD-RECONCILE-CONTENT-AWARE`, fleet blast-radius — needs its
     own scrutiny):** make the T2 artifact probe read `{orchestrator!=='stub', isFull, passedGate, accuracy>=gate}`
     instead of existence-only. NOT done here (changing T1/T2/T3 computation fleet-wide warrants a dedicated,
     fully-scrutinized unit; flagged, not rushed).

---

## DEDUP VERDICT — EXTEND, do NOT build a new engine

Harness (`CADDrawAnyPartValidationHarnessEngine`), corpus (`cad-validation-corpus.ts`,
`JM_DIE_VALIDATION_CORPUS` 12 cases + `corpusByDomain`/`summarizeCorpus`), rubric
(`CADValidationRubricEngine`), and dispatcher actions (`cad_draw_any_part_validate`,
`cad_draw_any_part_validate_render`, `cad_validation_corpus_get`, `cad_validation_rubric_score_case`) ALL
exist + are wired. `duplicationGuardEngine` would THROW on any new `*ValidationHarness*`/`*Corpus*` engine.
**Build ONE new thin lib + supersede the existing stub script:**
- NEW: `scripts/lib/cad-validation-50-driver.mjs` (pure+importable — the testable unit)
- NEW: `scripts/lib/cad-validation-50-driver.test.mjs` (R9 tests, mock-injected)
- SUPERSEDE in place: `scripts/run-hypercad-validation.mjs` (currently inlines a stub + writes markdown-only;
  make it a thin CLI over the lib; move the legacy stub behind `--orchestrator=stub`; never delete — leave-a-copy).

## DRIVER CONTRACT
- **Args:** `--orchestrator live|mock|stub` (default `live`), `--domain mill|lathe|wedm|all`, `--gate 0.70`
  (via `clampAccuracyGate`), `--corpus jm-die` (reserved `jm-die-50`), `--out <json>`, `--md <md>`, `--json` (stdout).
- **Round-trip through the dispatcher (R15):** `cad_validation_corpus_get {domain}` → cases;
  `cad_draw_any_part_validate {cases, options:{gate, orchestrator}}` → `ValidationReport`;
  optional `cad_validation_rubric_score_case` → rich partial-credit per verdict.
- **tsx self-reexec guard** (Node-24 `.js`→`.ts` dynamic-import trap — copy `cad-hermes-builder-driver.mts:17-24`
  / `nn-graph-retrain-lifecycle.mjs`; the 2026-06-22 charlie regression). Engines are `.ts`; `dist` is stale (afdce4386a).
- **Honest output JSON** (fields mirror `ValidationReport`+`RichScoreBreakdown`; no invented fields):
  `{schemaVersion, milestone, unit, ranAtIso, orchestrator, corpus:{id,size,target:50,isFull,version}, gate,
  accuracy, passedGate, totals:{total,passed,failed,errored}, perDomain, richScore, verdicts[], provenance, gameableGate:false}`.
  **Never emit `size:50`/`isFull:true` while running 12 (R12 / ALL-means-ALL).**

## CORPUS (held-out source for the real 50 — `U-VALIDATION-50-EXPAND`, data work)
Today: 12 cases (`JM_DIE_VALIDATION_CORPUS`). For 50, stratify from verified on-disk sources:
`H:/PRISM/JM DIE/FUSION CAD AND CAM FILES/JM/HAAS AND HURCO/` (957 unique production STEP, per-customer) ·
`mcp-server/data/state/cad-corpus-manifest.json` (665 STEP/STP class-labelled) ·
`H:/PRISM/resources/CAD FILES/` (38 diverse). No holdout manifest exists — create one; stamp `heldOut:true`;
cross-check ids vs training manifest (advisory v1) so the measurement set never leaks into training.

## TEST PLAN (R9 — mock-injected, real reference values; ≥3 failure + ≥2 adversarial)
happy (all-export→accuracy 1.0, passedGate true; 4-case subset→total 4) · round-trip via real
`cad_validation_corpus_get` (size===12, perDomain sums to total) · FAIL: orchestrator throws (errored++,
no crash) · FAIL: below-gate (passedGate false, exit 1, JSON still written) · FAIL: empty corpus (0/0,
fail-loud, never silent-pass) · ADVERSARIAL: stub-masquerade (`orchestrator:"stub"` → gate-flip predicate
false) · ADVERSARIAL: count-lie guard (12 cases never emits `isFull:true`) · ADVERSARIAL: gate clamp 1.5/-0.2 (no NaN).

## BASELINE-RUN VERDICT (can it run now?)
- `stub`/`mock` modes: run NOW → prove wiring + emit a JSON artifact, but the number is MODELED/MOCK (not real).
- `live` mode: the ONLY real pre-train number — needs the **hyperCAD-S seat up** (NOT a trained adapter; the
  untrained orchestrator loop runs). Seat-gated like the Fusion add-in. Run when the operator's hyperCAD-S session is open.

## OPEN CONTRADICTION (R7 — operator to confirm)
"validation-50" could mean **drawing-accuracy** (this spec: intent→draw→binary export, `JM_DIE_VALIDATION_CORPUS`)
OR **geometry-fidelity** (delta's closed-loop: `geometry_hausdorff`/`CADGeometryComparisonEngine` vs reference STEP,
proven 0.00%/1.23% on `blisk.stp`). Different metric/corpus/gate. Specced the drawing-accuracy path (maps to
`U-VALIDATION-50*`). **Confirm which the T2 gate measures before the live run — they are not interchangeable.**

## SUPERSEDE ENUMERATION (run-hypercad-validation.mjs) -- read before doing build-order step 3 (slot:delta 2026-06-27)

The driver lib + tests SHIPPED (commits e724240d7c + 43854286d0; 19 tests, 2-arm scrutiny PASS). Step 3
(supersede the legacy stub script) was enumerated but DEFERRED -- it is NOT a trivial wrapper; it has 3
blast-radius trade-offs that warrant a deliberate build cycle, not a rushed one:

1. **RUNTIME**: `scripts/run-hypercad-validation.mjs` today runs under plain `node` (it INLINES corpus +
   probabilistic stub + scorer, lines 41-115; zero `.ts` imports). Routing it through
   `scripts/lib/cad-validation-50-driver.mjs::runValidation50` pulls in `.ts` corpus/harness imports -> it
   must then run under `tsx` (add a self-reexec guard mirroring the lib's CLI main, lines ~248-260). Any
   cron/dashboard that invokes it as `node ...` would break without the guard.
2. **SEMANTIC (R7)**: the legacy stub is a *probabilistic performance MODEL* (90/75/50% by id-hash, line 83)
   that emits a plausible-but-FAKE baseline number to `state/shared/CAD-DRAW-MAX-MS1-BASELINE.md` (the
   dashboard-read path, line 133). The lib's `stub` is honest/deterministic (all-export -> partial-fail on
   expectedOpLogMin). Superseding CHANGES the dashboard baseline's meaning (modeled -> honest stub-floor).
   That is an improvement (honest > fake) but a deliberate call -- do NOT silently swap it.
3. **DEDUP WIN vs RUNTIME**: dropping the inlined corpus/harness copies (the real goal) REQUIRES the `.ts`
   import (tsx). Keeping node-runtime means keeping the inline copies. Can't fully have both without the
   tsx-reexec guard. Recommended: route through the lib + add the reexec guard + keep the `.md` dashboard
   path (render markdown from the lib's JSON via the harness `renderMarkdown`) + ALSO emit the lib's
   gate-aware JSON (non-probed baseline name for a stub run). Preserve exit 0/1-on-gate.
4. **ASCII**: the legacy file contains em-dashes + check/x glyphs; the rewrite MUST be ASCII-only (ascii-guard).

Effort: ~1 focused unit (rewrite + a node-vs-tsx invocation test + verify the dashboard md still renders +
per-file scrutiny). Deferred here for token-budget (shipped at token-YELLOW/RED).

## BUILD ORDER
(1) `cad-validation-50-driver.mjs` lib + honest JSON schema → (2) `.test.mjs` (8 tests) → (3) supersede
`run-hypercad-validation.mjs` (stub behind flag) → (4) run `--orchestrator=mock` to prove wiring →
(5) `U-CAD-RECONCILE-CONTENT-AWARE` (harden the detector, separate scrutinized unit) →
(6) `--orchestrator=live` for the real number when the hyperCAD-S seat is open.

_Source: ultracode Workflow wf_2ab23bcc-046 (dedup + harness-api + gate-shape + held-out-sourcing, all file:line-cited) + on-disk verification._
