# DELTA CAD — Remaining-Units Plan to "Train & Test CAD Model + Print Generation"

> **Author:** slot:delta (session 66d55bba), 2026-06-28. **Status:** advisory plan; reconciles
> `state/shared/specs/ROADMAP-CONSOLIDATED.md` + `state/shared/BUILD_STATE.md` +
> `knowledge/memories/patterns/cad_synthesis.md` + this session's verified work. Answers the
> operator goal: *"plan out remaining units to fully complete the features ... so that we can
> finally train and test cad model and print generation."*
>
> **R12 honesty:** each unit is tagged **BUILT** (with commit evidence), **IN-CONTROL** (delta can
> self-build), or **GATED** (blocked on a specific operator/install action, named). Prior-galaxy
> "built" claims are cited to their source and flagged *verify-before-trust* where not personally
> re-confirmed this session.

## TL;DR — the ONE blocker to closed-loop CAD training

The text→CAD **generation prompt** is fully built and shop-knowledge-rich (4 advisory loaders:
tribal + learned-risk + dim-prior + archetype-recipe). The **execution + validation** half cannot
run because **build123d / cadquery is not installed in the portable Python** — so a generated
`model.py` is staged but never executed → no `model.step` → no geometry to validate → **no
GEN→outcome training pairs**. Everything downstream (closed-loop self-learning, LoRA fine-tune on
GEN outcomes) waits on this single install.

- **UNBLOCK (operator/install):** `H:/Tools/python/python.exe -m pip install build123d cadquery`
  (or land `U-QUEBEC-MCP-CADQUERY-MERGE`). The execution branch in `cad-text-to-cadquery.mjs`
  **self-activates** the moment either import succeeds (`pythonCadAvailable()` probes at runtime).
- Until then the loop runs on the LIVE-FUSION bridge path (`:18362`, confirmed healthy this session,
  5/5 roundtrip @ 0.000%), which validates the bridge-buildable primitive families but NOT arbitrary
  GEN output.

## BUILT this session (delta, cad-fusion-live-ms0) — the GEN-prompt + validation scaffolding

| Unit | Commit | What |
|------|--------|------|
| Live-Fusion roundtrip validator | (prior session) | `cad-fusion-live-roundtrip.mjs` — analytic geometry vs `:18362` /geometry; stale-add-in guard. Re-validated this session 5/5 @ 0.000%. |
| STEP dim extractor trailing-dot fix | `26a5bd978b` | `step-dimension-extract.mjs` — trailing-dot reals (`20.`) no longer silently dropped. |
| Spark-gap bug fix (3 layers) | (prior session) | prompt doctrine + tribal electrode-gate + `toTokens` stopword filter — stopped ~16% of GEN parts being undersized. |
| Dim-correction PRODUCER | `7c74398cd5`+ | `cad-gen-dim-correction.mjs` + run harness — finds GEN dim divergences → fix-ledger rows. |
| Dim-prior injection | (prior session) | `loadClassDimPrior` — learned per-class envelope, suppressed when explicit dims present. |
| **Archetype recipe injection** | `09704278fd` | `classifyRequestArchetype` + `loadArchetypeRecipe` (op-verbs only) + buildPrompt 7th param. 3-of-3 PASS. |
| Recipe docs + P2 hoist | `baa961e445` | wiki `cadgen-archetype-recipe-injection.md` + classifier-call hoist. |

The GEN prompt now carries: canonical codegen prompt + JM doctrine + feature-templates (RAG-lite) +
**build-recipe (op order)** + tribal draw-rules + learned failure-modes + learned dimensions. All
advisory, all fail-soft.

## REMAINING UNITS — dependency-ordered to the "train & test" milestone

### Phase 1 — UNBLOCK execution (GATED, operator/install)
- **G1 [GATED] Install build123d/cadquery** in portable Python → activates GEN execution +
  `cad-analyze-step` validation. *The keystone; everything in Phase 2 depends on it.*
- **G2 [GATED] LoRA `--apply`** of the verified dim-correction divergences:
  `node scripts/cad-gen-dim-correction-run.mjs --apply --stamp <iso>` → feeds the fix-ledger →
  `cad-fix-training-corrections` LoRA source. (Operator-gated: writes training data.) Addresses
  `cad_synthesis` open-thread [3] / the "cross-session correction loop gap."
- **G3 [GATED] Cron the dim-correction producer** after each GEN batch (persistent config →
  operator authorization).

### Phase 2 — closed-loop TRAINING (IN-CONTROL once G1 lands)
- **P2-1 [IN-CONTROL after G1]** GEN→STEP→validate→outcome wired end-to-end on the real corpus
  (existing `ingestGenerationOutcome` + `cad-analyze-step` already coded; just needs execution).
- **P2-2 [IN-CONTROL]** Generate GEN/validation pairs over the H-drive corpus (existing CAD files,
  Fusion files, prints, CNC programs) → the goal's "full test suite for closed-loop training."
- **P2-3 [IN-CONTROL]** Overnight regen of the ~45 spark-gap-corrupted validation parts with the
  fixed prompt (cosmetic; confirmed NOT training-poisoning — those staged parts don't feed training).

### Phase 3 — in-control units NOT gated (buildable now)
- **P3-1 [IN-CONTROL] Open-thread [17] gate-integrity (R12):** artifact-gate detector flips
  PENDING→SHIPPED on mere file existence — a fail-loud-class bug. *Verify against source memory,
  then fix.* High-value (correctness).
- **P3-2 [IN-CONTROL] Open-thread [18] coverage-meter:** `cad-gen-coverage-meter.mjs` misses
  root-level CAD engines → duplicate capability builds. Broaden scan scope. *Verify first.*
- **P3-3 [IN-CONTROL] U-INV-CAD-02 TopOpt/ToPy sidecar** (topology-optimized geometry) — net-new,
  no live dep; a Python sidecar like the cadquery path.
- **P3-4 [IN-CONTROL] Broaden `classifyRequestArchetype` keyword coverage** if real GEN requests
  reveal misroutes (data-driven; low-priority until GEN runs produce request logs).

### Phase 4 — cross-domain + frontend (other slots own; delta provides the backend)
- **U-BRIDGE-CAD-CAM-HANDOFF** — CAD-gen AI → CAM-programming AI (kilo boundary).
- **U-REV-CAD-SFC-03/04/05** CadViewer3DPage / NL-to-CadQuery Page / BlueprintToCadPage — **quebec**
  (frontend). Two PENDING_MERGE CAD frontends in BUILD_STATE: `cqask-orion-cad`,
  `mcp-cadquery-frontend` (quebec to merge/version-align).
- **RES-MS10 CAD part library**, **RES-MS4 OEM STEP models** — corpus/revenue (juliett/business).

## Bridge-endpoint limitation (why "extend the live roundtrip" is low-value)

The Fusion live bridge (`:18362`) exposes `/new /sketch(circle,rect) /extrude /revolve /geometry
/status` — it builds cylinder, box/plate, and revolved-ring families. **No fillet / shell / hole /
chamfer / loft endpoints.** Expanding live archetype coverage beyond these primitives requires a
**Fusion add-in change** (GUI/operator), not a script change. So the existing 5-spec roundtrip
already spans the bridge's buildable space; adding more same-family specs is low marginal value.

## Recommended immediate path

1. **Operator:** clear **G1** (pip install build123d cadquery) — unlocks Phases 2. Then authorize
   **G2/G3** (LoRA apply + producer cron) to close the cross-session learning loop.
2. **Delta (in-control, no wait):** **P3-1** (gate-integrity R12 fix) → **P3-2** (coverage meter) →
   **P3-3** (TopOpt sidecar). These advance without the install.
