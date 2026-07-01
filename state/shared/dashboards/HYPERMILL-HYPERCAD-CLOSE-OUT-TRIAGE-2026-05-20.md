# hyperMILL / hyperCAD Close-Out Triage — 2026-05-20

> Author: claude-3db3fb3d (slot=echo), 2026-05-20.
> Source: enumeration of 28 pending hyperMILL/hyperCAD units in
> `state/shared/specs/ROADMAP-CONSOLIDATED.json` during /goal "complete all
> remaining hypercad/hypermill related tasks" run.
>
> Status: **ADVISORY** — per CLAUDE.md doctrine, close-out audit NEVER
> auto-flips envelope status. Every candidate below must be operator-verified
> before running `scripts/close-out-milestone.mjs --milestone <ID>`.

## A. Silent-shipped — engine file exists, envelope says pending

These are the highest-confidence close-out candidates. The engine name in the
roadmap unit matches an existing file on disk.

| Unit ID | Milestone | Title | Verification |
|---|---|---|---|
| U-CAUT07 | CAD-AUTOMATION-MS0 | HyperMILLAutomationBridge — AC Python for .hmc | `H:/prism/mcp-server/src/engines/HyperMILLAutomationBridge.ts` exists (E1304, 373 LOC, peer-shipped) |
| U-CAMX05 | CAMX-MS11 | hyperMILL AC Add-In | Substantially covered by `HyperMillACBridgeEngine.ts` (this session) — operator should confirm scope match before flipping |
| U-CAMX01 | CAMX-MS9 | HyperMillAutomationCenterEngine | Covered by peer's `HyperMILLAutomationBridge.ts` + my `HyperMillACBridgeEngine.ts` — confirm scope |
| U-CAMX02 | CAMX-MS9 | HyperMillCodeGeneratorEngine | `H:/prism/mcp-server/src/engines/HyperMillCodeGeneratorEngine.ts` exists |
| U-CAMX03 | CAMX-MS9 | HyperMillToolExportEngine | `H:/prism/mcp-server/src/engines/HyperMillToolExportEngine.ts` exists |

**Operator action (per silent-shipped unit):**
```powershell
node H:/prism/scripts/close-out-milestone.mjs --milestone <ID> --unit <U-XXX>
# Updates 4 surfaces: envelope + roadmap-index + MILESTONE_PROGRESS + BUILD_STATE
```

## B. False-positive audit — should NOT be flipped to "shipped"; should be REJECTED

| Unit ID | Milestone | Title | Why reject |
|---|---|---|---|
| U-AUDIT-13-117623 | MS-AUDIT-DERIVED-2026-05-10 | Verify+remove dead-code: HyperCADSMockLayer.ts | **MockLayer is an active test fixture, NOT dead code.** Activated by `HYPERMILL_MOCK=true` env var; provides deterministic responses for CI runs without a hyperMILL license. Removing it would break the test infrastructure documented in `HYPERCAD-TEST-PLAYBOOK-2026-05-20.md` Tier 1. Audit was a false positive — keep the file. |

**Operator action:** mark `U-AUDIT-13-117623` as `status: rejected` with reason "active test fixture, not dead code" in its envelope.

## C. Multi-session work — cannot complete in a single chat session

These require training runs, large SDK enumeration, or neural-network design
work that genuinely needs dedicated sessions. They are appropriate for
`/checkin-<slot> /loop` runs on the relevant domain slot.

| Unit ID | Milestone | Why multi-session |
|---|---|---|
| U-AITRAIN-CAM-HYPER-MILL-DEEP-LEARNING | AI-TRAINING-FIRST-MS0 | Train `HyperMillDeepLearningEngine` on full pre-revenue corpus — JM-DIE 76K + MIT-OCW + v8.89 MIT kernels. Hours of training compute. |
| U-GAP-CAM-HYPERMILL-SDK | FEATURE-GAP-AUDIT-MS0 | hyperMILL SDK API mapper from ~2110 Python automation scripts under `Resources/OPEN MIND/Shared SDK`. Large-corpus extraction + classification. |
| U-CADC-NN03 | CAD-COMPLETE-MS0 | HyperCADSIntentNN — Feature-Technology-aware neural head. Needs labeled training data + GNN design. |
| U-CAM108 | CAM-EXHAUST-MS0 | hyperMILL LoRA adapter — system-specific fine-tune. Needs adapter training infrastructure. |
| U-CTE10 | CAD-TRAINING-EXTRACT-MS0 | Consolidate hyperMILL extractions into action sequences. Sequential design + validation work. |
| U-DASAL09 | CADCAM-DAGI-MS1 | HyperMillActionExecutorEngine — automation interface. Substantial design + the existing `HyperMILLAutomationBridge` may cover most of it; needs design analysis first. |
| U-DASAL10 | CADCAM-DAGI-MS1 | MastercamHyperMillIdiomLearnerEngine — commercial CAM idioms. ML-training work. |
| U06 | VL-MS0 | Tests + process hyperMILL E-Learning videos as validation. Requires hyperMILL training-video access. |
| U03 | PP-MS7 | Phase B Re-Optimizer for closed systems (hyperMILL, Tebis, Edgecam, any G-code source). Substantial post-processor design. |

**Operator action:** assign each to the appropriate `/checkin-<slot>` domain
based on the JULIETT slot-domain allocation (echo=cam, alpha=mill, etc.).

## D. Patch-siblings shipped this session — awaiting peer merge

| Patch sibling | Target file | Risk if not merged |
|---|---|---|
| `patches/HYPERMILL-AC-SCRIPT-EXECUTOR-MOCK-BRANCHES.md` | `HyperMillACScriptExecutor.ts` | Mock-mode extract/optimize routes return empty stdout — operator may misread Tier-1 test output |
| `patches/HYPERMILL-AC-SERVER-CONFIG-LOCALHOST-PIN.md` | `HyperMillACServerConfig.ts` | If operator overrides `host: "localhost"`, may bind IPv6 ::1 while client dials 127.0.0.1 |
| `patches/CLAUDE-MD-PATCH-cad-pipeline-audit.md` | `H:/prism/CLAUDE.md` | Two regression lines (verification-command bash-syntax + scorer-normalization) sit out of the project doctrine until merged |

## E. Already-shipped — credit not flipped to roadmap (this session's deliverables)

These are NEW units the session produced but are not yet in any milestone envelope. They should be REGISTERED, not closed-out:

| New deliverable | Suggested envelope |
|---|---|
| `HyperMillACBridgeEngine.ts` (loopback HTTP companion server) | CAD-FUSION-LIVE-MS0/U-ACBRIDGE-HTTP-SERVER |
| `prism_ac` Python host module | CAD-FUSION-LIVE-MS0/U-ACBRIDGE-PYTHON-MODULE |
| 4 dispatcher actions (`cam_hypermill_drive`, `cam_hypermill_ac_bridge_{start,stop,status}`) | CAD-FUSION-LIVE-MS0/U-ACBRIDGE-DISPATCHER |
| 31-case test suite + LIVE scaffold | CAD-FUSION-LIVE-MS0/U-ACBRIDGE-TESTS |
| HYPERCAD-TEST-PLAYBOOK runbook | CAD-FUSION-LIVE-MS0/U-ACBRIDGE-PLAYBOOK |

## Headline numbers

- **28 pending hyperMILL/hyperCAD units** in ROADMAP-CONSOLIDATED.
- **5 silent-shipped** (Section A) — operator-flip via `close-out-milestone.mjs`.
- **1 false-positive audit** (Section B) — mark `rejected`.
- **9 multi-session builds** (Section C) — assign to domain slots.
- **3 patch-siblings shipped** (Section D) — awaiting peer merge.
- **5 new deliverables** this session (Section E) — need envelope registration.

## See also

- `state/shared/specs/ACSERVER-BRIDGE-AUDIT-2026-05-20.md`
- `state/shared/specs/PRINT-TO-INSPECTION-PIPELINE-V2.md` (Routes A + B)
- `state/shared/specs/HYPERCAD-TEST-PLAYBOOK-2026-05-20.md` (Tier 1-4 test path for hyperCAD key)
- `state/shared/specs/CAD-PIPELINE-AUDIT-2026-05-20.md` (peer-reviewed parent audit)
- `state/shared/dashboards/patches/HYPERMILL-AC-SCRIPT-EXECUTOR-MOCK-BRANCHES.md`
- `state/shared/dashboards/patches/HYPERMILL-AC-SERVER-CONFIG-LOCALHOST-PIN.md`
- `state/shared/dashboards/patches/CLAUDE-MD-PATCH-cad-pipeline-audit.md`
