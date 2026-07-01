# PROGRAM-PROOF-MS0 — Mathematical Program Proof Certificate

**Created:** 2026-05-24 · **Owner:** slot:charlie · **Baseline fleet:** JM Die's 21 machines

## Problem

Today PRISM ships toolpaths through partial safety checks (`ContinuousCollisionDetectionEngine`, `WorkEnvelopeEngine`, `WEDMWirePathCollisionEngine`, `MachineEnvelopeGuardEngine`, etc.) but no single surface produces an end-to-end **"this entire program is provably safe"** verdict before the user receives the G-code. The user-facing safety contract is therefore the *operator at the machine* — which is the wrong place for the guarantee.

Visual sim (Vericut) *samples* the toolpath, can skip between frames, and is expensive (license + minutes per check). Mathematical proof via interval arithmetic + continuous swept-volume + signed-distance-field can certify *every reachable state* in sub-second time, provably correct under FP rounding.

## Contract (user-facing)

> **No program is emitted to a user without a `verdict:safe` certificate from `ProgramProofCertificateEngine`. If the certificate fails, `ProgramAutoFixPlannerEngine` attempts the cheapest valid transform and re-certifies. If unfixable, the program is REJECTED with a per-witness explanation, not delivered.**

Every emitted program carries a `// PRISM-PROOF: <cert-sha256>` header. Bypass exists (`PRISM_PROGRAM_PROOF_BYPASS=1`) but is logged to `state/shared/program-proof-bypasses.jsonl` — never silent.

## Architecture

```
[program + machine_id + fixture + workpiece]
       │
       ▼
[U-PP01] JMDieMachineEnvelopeCatalogEngine ──► per-machine B-rep envelope
       │
       ▼
[existing] IK trajectory (MultiAxisKinematicEngine / InverseKinematicsSolverEngine)
       │
       ▼
[existing] swept volume (SweptVolumeEngine, ContinuousCollisionDetectionEngine, WEDMWirePathCollisionEngine)
       │
       ▼
[U-PP02] IntervalArithmeticPredicateEngine ──► safe-predicate layer (FP rounding-proof)
       │
       ▼
[U-PP03] ProgramProofCertificateEngine ──► { verdict, witnesses, margins, signedAt }
       │
       ├─ verdict=safe ──► [U-PP05] EMIT
       └─ verdict=unsafe
              │
              ▼
       [U-PP04] ProgramAutoFixPlannerEngine
              │
              ├─ cheapest valid transform: Z-lift / retract / SLERP / feed-clamp / setup-split
              ├─ re-certify (fixed-point, bound 8 iterations)
              └─ verdict=safe ──► [U-PP05] EMIT (with `// AUTO-FIXED` note in header)
                 OR unfixable ──► REJECT + per-witness report
```

## Units (6 total — see `mcp-server/data/milestones/PROGRAM-PROOF-MS0.json`)

| Unit | Title | Priority |
|---|---|---|
| U-PP01-FLEET-ENVELOPE-CATALOG | Ingest 21 JM Die machines into unified envelope catalog | p0 |
| U-PP02-INTERVAL-ARITHMETIC | FP-rounding-proof predicate layer (Moore 1966) | p0 |
| U-PP03-CERT-ORCHESTRATOR | The unified ProofCertificate orchestrator | p0 |
| U-PP04-AUTO-FIX-PLANNER | Cheapest-transform-first re-cert planner | p0 |
| U-PP05-PRE-EMIT-GATE | Wire cert into G-code emitter pipelines | p0 |
| U-PP06-WEDM-PILOT | Charlie-domain proof-of-concept on 3 real JM Die wire programs | p1 |

## Why this works (cross-domain synthesis)

1. **Formal methods** — the math is the same as software verification: prove a property holds over all reachable states via interval analysis. NC-toolpath state space is bounded (axis travel) so the proof always terminates.
2. **Computational geometry** — Minkowski sum (tool sweep + workpiece offset), GJK/EPA (continuous collision distance), BVH (broad-phase culling) — all in PRISM's algorithm tier already.
3. **Robotics** — kinematic reachability per Denavit-Hartenberg + workspace reach cones, already in `MultiAxisKinematicEngine`.
4. **Numerical analysis** — interval arithmetic with directed-rounding semantics (Moore 1966, Hickey-Ju-vanEmden 2001) eliminates the false-negative class that 64-bit FP comparison admits at micron scales.

## Accuracy honesty

The user asked for ".00002" (0.5 µm). The *math* runs at that resolution; the *data* is typically ±25-50 µm without per-machine laser-interferometer characterization (Renishaw ballbar + XL-80) — JM Die likely doesn't have one. So the certificate reports an `accuracyTier` per machine:

- `manufacturer-spec` (~25-50 µm) — current state for all 21 JM Die machines
- `interferometer-cal` (sub-µm) — aspirational, requires capital purchase, **out of scope for MS0**

The proof is still provably correct *within the declared envelope*; the user sees the margin and the tier, never a false single-µm claim.

## PSN synergy (full loop)

- **Leg #7 (Engines)**: U-PP03 is the unified entry point — one engine consumes 17 existing safety engines.
- **Leg #8 (Algorithms)**: U-PP02 adds the safe-predicate primitive.
- **Leg #10 (NN/GNN)**: U-PP04 auto-fix planner is a candidate for RL fine-tune via the PSN autonomy loop (just-shipped `PSNAutonomyLoopEngine`).
- **Leg #11 (PRISM AI)**: U-PP03 cert verdict feeds the new PSN trainer-manifest as a high-signal reward weight.

`verdict:safe` = +0.50 reward · `verdict:unsafe + auto-fix:successful` = +0.30 · `verdict:unfixable` = −0.50.
This wires program-safety success directly into the per-slot fine-tune signal — the system learns to emit safer programs over time.

## Out of scope (deferred)

- Per-machine laser-interferometer characterization (capital + day-per-machine).
- Visual sim parity reports (we're *replacing* visual sim for program-correctness, not complementing it).
- Multi-machine job sequencing certificates (cert is per-program for MS0).

## Doctrine references

- `feedback_always_build` — every unit ships real tests + real wiring, no stubs.
- `feedback_parallel_scrutiny_per_file` — every file in this milestone gets 2 parallel reviewer agents after generation.
- CLAUDE.md §SAFETY — shop_floor tier (Ω≥0.95, S(x)≥0.98) is the default for the certificate verdict threshold.
- Karpathy R5 — safety predicates live in code (deterministic), never in an LLM judgment call.
- Karpathy R12 — fail loud: `unfixable` is a real REJECT, not a "best-effort, ship it anyway".
