---
name: reference_cad_t2_gate_gameable_2026_06_27
description: "R12 gate-integrity bug (slot:delta, 2026-06-27): the CAD-COMPLETION T2/T1/T3 artifact gate detector in cad-completion-reconcile.mjs:136 (artifactExists) flips a gate PENDING->SHIPPED on mere FILE EXISTENCE — content never read. Any JSON (even {}) named state/shared/specs/cad-validation-50-*.json or cad-train-test-result-*.json marks T2 SHIPPED. Consequence: CAD-DRAW-MAX-MS1 is falsely status:complete (shipped a 12-case deterministic stub via run-hypercad-validation.mjs:81, NOT the headline '50 prints live >=70%' gate). Any future validation driver must NOT write the probed filename from a stub/12-case/mock run (would game the gate). Fix = content-aware detector (U-CAD-RECONCILE-CONTENT-AWARE, fleet blast-radius, needs own scrutiny)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.497Z
aliases: reference_cad_t2_gate_gameable_2026_06_27
---


# CAD T2 validation gate is EXISTENCE-ONLY → gameable + a falsely-"complete" milestone (2026-06-27, slot:delta)

Found while scoping the validation-50 CLI driver (U-VALIDATION-50-LIVE-RUN) via an ultracode Workflow
(wf_2ab23bcc-046) + on-disk verification. The "existence != complete — read the body" doctrine, made
concrete in PRISM's OWN gate system.

## The bug
`scripts/cad-completion-reconcile.mjs` computes the CAD-COMPLETION terminal gates T1(train)/T2(val-50)/T3(print-gen).
For `artifact`-type units it calls `artifactExists(probes)` (line 136) → `probes.some(p => findFile(dir, frag, ext))`.
`findFile` (lines 75-95) is a recursive name match: `filename.includes(frag) && filename.endsWith(ext)`. **It never
opens or parses the file.** So T2 (probes: frag `cad-validation-50` / `cad-train-test-result`, ext `.json`, dir
`state/shared/specs`) flips PENDING→SHIPPED the instant ANY such file exists — even `{}`.

## Why it matters (R12)
- `mcp-server/data/milestones/CAD-DRAW-MAX-MS1.json` is `status:"complete"` with exit-gate *"Live run against 50
  prints reports >=70% accuracy"* — but the shipped run (`scripts/run-hypercad-validation.mjs:81`) was a **12-case
  deterministic STUB orchestrator**, markdown-only, never the real 50-print live run. The headline gate was NEVER met.
  "complete" is the title; the body never measured it.
- Any driver that writes the probed filename FALSELY marks T2 SHIPPED — even from 12 stub cases or a MOCK seat.

## The two-part honest fix (do NOT game the gate)
1. **Driver honesty (U-VALIDATION-50-LIVE-RUN, spec'd):** the validation driver MUST NOT write a gate-probed
   filename unless the run is genuinely gate-worthy (`orchestrator==='live'` AND `isFull` (≥ target cases) AND
   `passedGate`). Otherwise write a NON-probed name (e.g. `state/shared/CAD-DRAW-MAX-MS1-BASELINE.json`). Never
   emit `corpus.size:50`/`isFull:true` while running 12 (ALL-means-ALL).
2. **Detector hardening (U-CAD-RECONCILE-CONTENT-AWARE — NOT yet built):** make the artifact probe read content
   (`orchestrator!=='stub'`, `isFull`, `passedGate`, `accuracy>=gate`) instead of existence-only. This changes
   T1/T2/T3 computation FLEET-WIDE (could flip currently-"SHIPPED" gamed gates to PENDING) → it is its own
   scrutinized unit, deliberately NOT rushed at the tail of a long session.

## Also surfaced (seat gate)
The validation orchestrator drives the **hyperCAD-S live seat** (`HyperCADSLiveBridgeEngine`); headless runs use the
`codegen.executeScript()` MOCK path → a MOCK accuracy, NOT a real seat number. A REAL pre-train baseline needs the
hyperCAD-S seat open (operator/seat-gated, same class as the Fusion add-in activation). No trained adapter needed for
the baseline — the untrained orchestrator loop runs.

Spec: `state/shared/specs/U-VALIDATION-50-LIVE-RUN-BUILD-SPEC.md`. Related: [[reference_delta_cad_traintest_readiness_2026_06_27]] · [[reference_delta_cad_completion_roadmap_2026_06_26]] · [[feedback_read_full_content_not_titles]]
