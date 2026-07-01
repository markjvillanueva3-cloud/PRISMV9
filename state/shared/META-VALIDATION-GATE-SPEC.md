# META-VALIDATION-GATE-SPEC

**Per work order Section 4.** Spec for Claude as final-line meta-validator on operator-bound output packages. Runtime enforcement is a follow-on implementation; this document is the authoritative spec.

---

## Why Claude is the meta-gate

PRISM has many validators — engines that compute, simulators that check collisions, hooks that block stubs, S(x) and Ω scoring. **None of them watch each other.** A package can pass every individual gate while still containing internal inconsistencies (SFC said one feed, post embedded another) or missing entirely (collision sim never ran).

Claude's job is to be the watcher of watchers. Verify that every gate fired, every chain is complete, every numeric claim traces to evidence, every uncertainty is surfaced. Claude does NOT recompute physics — that's the engines' job. Claude does NOT replace the operator. Claude just refuses to sign off when the system of checks has a hole.

## Roles (per work order Section 00.1)

- **Claude (master orchestrator):** opens runs, closes runs, refuses under uncertainty. Process auditor for the AI tier — NOT physics oracle, NOT simulation kernel, NOT operator replacement.
- **FullSystemAICoordinator:** runs cross-domain reasoning when Claude absent.
- **Domain Specialist AIs:** compute domain outputs with explicit confidence, cite sources, decline OOD tasks and escalate.
- **Physical-world validators:** Vericut/NCSimul, Okuma CAS, operator visual inspection, CMM/surface-finish gauge. Existing — not replaced by Claude.
- **Operator (final authority):** sees complete output package, has unconditional override, is the final gate before the spindle turns.

---

## §4.1 Generic meta-gate (any operator-bound output package)

For any `OperatorPackage` (G-code, quote, CAD part, setup package), Claude verifies:

### Evidence chain check

For every numeric claim → trace to (engine + invocation + result). For every safety claim → trace to (rule + check + pass/fail). For every confidence value → calibrated against validation history. **No gate may be skipped, bypassed, or marked `n/a` without justification recorded in the manifest.**

### Internal consistency check

Cross-component claims that must agree:

- SFC's S/F values match what Post embedded per-block
- Cycle time predicted by Post matches Cycle Time Estimator's prediction
- Tool selected by SFC matches tool referenced in G-code
- Material in physics calls matches material in setup sheet
- Machine specified in quote matches machine in post output
- **Machine identity matches a `JMFleetRegistry` entry** (or operator package is for a generic machine and tagged accordingly)

### Uncertainty surfacing

Confidence intervals must appear in the package. OOD flags visible. Calibration freshness reported per material/tool/machine. Known failure modes for the material/operation listed. **JM-machine-specific quirks for the target machine surfaced as advisories.**

### Threshold compliance

- S(x) ≥ 0.70 verified
- Ω ≥ 0.70 verified
- Evidence ≥ L3 verified
- `validate_anti_regression` passed for any file replacement
- All applicable hooks fired (no enforcement bypass)

### Operator-information completeness

Setup sheet matches G-code. Tool list matches G-code. WCS / probing routine present if required. First-article inspection plan for high-tolerance work. Risk callouts ranked by severity. Recommended overrides explicitly stated.

---

## §4.1.bis Collision and simulation oversight (HIGHEST-STAKES sub-gate)

**Unconditional for any G-code reaching a machine.** Not skippable. If the collision/sim system did not produce a current, complete, applicable result, the package is **REFUSED**.

### Inputs Claude must verify

**(1) Simulation engine identity and version**
- Which simulator ran: `CNCPredictiveSimulatorEngine`, `CollisionPreventionEngine`, `VericutBridgeEngine`, `NCSimulBridgeEngine`
- Engine version + last validation date
- Known-issue list at time of run

**(2) Inputs match the package**
- G-code hash sent to simulator == G-code hash in operator package
- Stock matches setup sheet
- Fixture matches setup sheet workholding
- Tool assemblies in sim match tool list (cutter geometry + holder + extension + gauge length + collet/sleeve)
- **Machine kinematic model matches target `JMFleetRegistry` entry**
- WCS / work offset values match

**(3) Coverage is complete**
- Every motion block traversed
- Sweep granularity appropriate per axis
- All collision categories checked:
    - tool-vs-fixture
    - holder-vs-fixture
    - spindle-vs-fixture
    - tool-vs-stock-rapid
    - head-vs-tailstock for lathe
    - turret-vs-chuck for lathe
    - tool-vs-tool for multi-channel mill-turn
    - B-axis swept envelope for 5-axis
- Lathe-specific checks: swing, grooving overhang, boring reach
- Mill-turn sub-spindle handoff modeled if present

**(4) Results are consistent**
- All applicable sub-checks fired:
    - `validate_tool_clearance`
    - `check_5axis_head_clearance`
    - `check_fixture_clearance`
    - `validate_rapid_moves`
    - `detect_near_miss`
    - `lathe_collision_check`
    - `lathe_swing_check`
    - `collision_check_full`
    - `collision_prevent_certify`
- Sub-check results agree (no engine says clear while another says hit)
- Near-misses flagged, NOT suppressed
- Marginal clearances reported with actual value

**(5) Simulation confidence**
- Simulator reported its own confidence
- OOD scenarios flagged
- Calibration freshness for the kinematic model

### Verdicts

- **Pass** — all five categories clean. Forward to operator review.
- **Pass with advisories** — acceptable, but specific near-misses, marginal clearances, or OOD flags exist. Appear as ranked advisories in the operator package.
- **Refuse** — any of:
    - sim didn't run
    - stale inputs
    - hash mismatch between sim G-code and package G-code
    - fixture/tool geometry incomplete
    - machine model mismatch
    - sub-checks bypassed
    - internal inconsistency unresolved
    - simulator reported degraded confidence
    - calibration freshness exceeded threshold for high-consequence operations

### What this gate does NOT replace

Unconditional regardless of sign-off:
- Operator's first-cut single-block dry run
- Operator's visual inspection of setup
- Operator's hand on the e-stop
- Vendor-published limits of the simulation engine
- Physical proving of any first-of-kind operation

**Sim sign-off authorizes the operator to *consider* running. It does NOT authorize machine execution.**

### Schema requirement (real finding from audit)

If existing collision/sim engines don't currently emit (G-code hash, per-block traversal records, sub-check disaggregation, near-miss values, self-reported confidence), this is a required schema extension flagged in `AUDIT-PRIORITIZED-GAPS.md`. Not a blocker for this spec — implement as a follow-on unit.

---

## §4.2 Three Claude verdicts (overall)

- **SIGN-OFF** — every gate fired, every chain complete, every check passed.
- **SIGN-OFF WITH ADVISORIES** — package complete but elevated uncertainty.
- **REFUSE** — evidence chain broken, gate bypassed, AIs disagree, internal inconsistency, threshold violated, uncertainty too high.

REFUSE is the gate working. Encourage refusal under uncertainty over approval under pressure.

---

## §4.3 Sign-off manifest schema

```yaml
sign_off_id: <uuid>
timestamp: <iso8601>
package_type: gcode | quote | cad_part | setup_package
target_machine: <jm_fleet_id or 'generic'>
verdict: sign_off | sign_off_with_advisories | refuse

gates_verified:
  - safety_score: <value>
  - omega_score: <value>
  - evidence_level: <value>
  - anti_regression: <pass | fail | n/a>
  - hooks_fired: [<list>]

collision_sim_verification:
  simulator: <engine_name>
  simulator_version: <version>
  inputs_hash_match: <true | false>
  machine_model_match: <jm_fleet_id | true | false>
  coverage_complete: <true | false>
  sub_checks_fired: [<list>]
  near_misses: [<list with line numbers + clearances>]
  advisories: [<list>]

ai_outputs_reconciled:
  - sfc: { confidence: <value>, sources: [<list>] }
  - post: { confidence: <value>, sources: [<list>] }
  - cad: { confidence: <value>, sources: [<list>] }

known_uncertainties: [<list>]
machine_specific_advisories: [<JMFleetRegistry quirks relevant to this run>]
operator_action_required: [<list>]
refused_reasons: [<list, only if verdict=refuse>]

claude_signature: <hash>
```

Manifest appended to operator package, also written to `H:/prism/state/shared/sign-offs/<id>.yaml`. Auditable forever.

---

## Implementation handoff

This spec is descriptive, not executable yet. Implementation requires:

1. **`MetaValidationGateEngine`** — new engine that consumes `OperatorPackage` + reaches into existing engines/dispatchers to verify gates, hashes, and consistency. Lives at `mcp-server/src/engines/MetaValidationGateEngine.ts`.
2. **`prism_safety:meta_gate_evaluate`** dispatcher action — primary invocation point.
3. **Schema extensions** to existing collision/sim engines (G-code hash, per-block records, sub-check disaggregation, near-miss values, self-reported confidence) — flagged in audit gaps.
4. **`SignOffManifestEngine`** — manifest writer + signature generation.
5. **Integration tests** — happy path, REFUSE on hash mismatch, REFUSE on missing kinematic model match, advisory propagation through to operator package.

Effort estimate: ~80h spread across 4–6 milestones. Track in roadmap as MS-META-GATE.

---

**Status:** Specification complete. Implementation queued behind the awareness backbone (which is already shipped).
