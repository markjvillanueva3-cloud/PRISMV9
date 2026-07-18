# LEGO-STACKING-MS0 — Remaining Gap Inventory

**Generated:** 2026-05-25 (slot:romeo iter33)
**Operator question:** "we wired and bridged all logical nodes possible?"
**Honest answer:** No. We built the substrate that *maps* the remaining work. The actual wiring of the 593 unwired engines is a separate, much larger effort.

This document is the R12-honest accounting of what's done vs what remains so the next chat picking up this slot has a clean target list.

---

## What this session shipped

### Production code (real wirings, not synthetic)
- **30 of top-30 cross-DOMAIN bridges** from iter23's PRISM-BRIDGE-GRAPH closed via 3 generic-bridge engines (iter24-26): `GenericTribalContextBridgeEngine`, `GenericDomainBridgeEngine`, `GenericBridgeUniversalEngine`. Composition pattern — each engine reuses ~5-10 already-built engines via lazy import, no re-implementation.
- **Stage 3 `CohortBridgeShimEngine`** (mcp-server/src/engines/) — primitives: `applyNodeNextSuffix`, `rewriteSourceImports`, `buildShapeCoerceShim`, `recommendShimsForTopBridges`. 23/23 vitest concrete-value assertions pass.
- **/system-viz restored + extended** — `_server.cjs` rebuilt (was missing pre-2026-05-25 despite docs assuming it existed); `/api/snapshot` + `/api/graph-snapshot` endpoints added; `dashboard.html` rewritten as live thin client; `viz3d.html` new Three.js InstancedMesh viewer at `/3d` (5,000-node downsampled point cloud, layer-stratified, search + hover + click); `.gitignore` exception added for the 3 viz source files so they don't silently disappear again.

### Substrate (advisory, mustHumanVerify)
- **Stage 1 cohort-detector** → `PRISM-COHORTS.json` (12 cohorts, 3,501 engines classified by import-style + mtime quartile + iter tags)
- **Stage 2 batch-compat-scorer** → `COHORT-COMPAT-MATRIX.json/md` (132 cohort pairs scored: 0 LOW, 10 MEDIUM, 122 HIGH)
- **Stage 4 bridge-shim-emit** → 10 synthetic `cohort-shim-bridge` edges in `bridge-edges-auto.jsonl` (97 cumulative across all bridge generators)
- **Stage 5 stop-cohort-drift-watch** Stop hook (T3 advisory, 24h throttle) → fires when cohort taxonomy shifts ≥10% or new cohort names appear

### Verified-empirically findings (R12 — gates the substrate's leverage estimates)
The Stage 2 matrix predicted the **esm-js ↔ esm-plain NodeNext shim** as the highest-ROI bridge at **1,872 engines** combined. Empirical scan via `scripts/nodenext-bulk-migrate.mjs --all-engines` (3,534 .ts files):
- **0 files need any NodeNext path rewrite.** PRISM is already 100% NodeNext-compliant.
- The 1,872 number was a **cohort-membership count**, not a **rewrite-need count**. Engines in the "esm-plain" cohort were classified by file-header heuristics, not by whether they actually have relative imports lacking `.js` suffix. Most have zero relative imports (they only `import { x } from "zod"` / `"node:fs"`).
- **Conclusion:** the top "leverage" estimate from Stage 2 was optical. The matrix correctly *ranks pairwise compatibility* but `combinedEngineCount` is not a usable leverage proxy.

This finding is in `state/shared/specs/LEGO-NODENEXT-MIGRATION-LOG.md` (per-run artifact).

---

## What's actually still unwired (the real gap)

| Surface | Count | What needs to happen | Why we didn't close it this session |
|---|---:|---|---|
| Engines with no dispatcher reference (`NEEDS_WIRING`) | **593** | Each needs a dispatcher case + zod schema + test | Each is a per-engine decision — autonomous mass-wiring is risky; needs operator approval per engine or per domain cluster |
| HIGH-cost cohort pairs (rewrites required, no shim viable) | **122** | Full rewrites per cohort, not adapters | Out of scope for shim layer; needs domain expert per pair |
| cjs-era engines (preESM, needs migration not adapter) | **7** | Per-engine ESM rewrite | Stage 3 explicitly returns empty shims for preESM — correct by design |
| Shape-coerce shim methodMaps | **0 of 10 emitted** filled | Operator supplies the actual method-name correspondence | Stage 3 ships scaffolds + `mustHumanVerify`; no automated method-map inference (would be guessing) |
| NN/GNN tier-5 (PSN leg #10) | UNGRADED | Resolve embeddingSource mismatch per U-NN-PREDICTOR-EMBED-WIRE | Pre-existing, untouched — independent track |

---

## Why "wire everything" can't responsibly happen in one autonomous pass

1. **Dispatcher wiring is contract-changing.** Each new dispatcher case adds an action that other chats + the registry assume to be stable. Mass-wiring 593 engines simultaneously would commit 593 contract changes — every one needs a name, a zod schema, a test, and an action-search index update. Operator sign-off per engine is correct discipline.
2. **The cohort taxonomy is a layered model, not a wiring blueprint.** The taxonomy clusters engines by *vintage* (when they were written, what import style they use). The wiring decision is *semantic* (what dispatcher serves this engine's role). The two don't map 1:1.
3. **HIGH-cost pairs need domain expertise.** A cjs-era `LegacyToolPathEngine` → modern `ToolpathOrchestrator` migration isn't a mechanical rewrite — it's a redesign that requires understanding what the old engine actually did in production.

---

## Next-most-leverage moves (in priority order)

1. **Per-domain wiring sprint** — pick one of the top unwired domains from BUILD_STATE.json (`Other: 123, Lathe: 62, Machine: 12, Multi: 9, Shop: 8`), audit each engine for a viable dispatcher action, batch-commit per domain. Slot:foxtrot has been running lathe/wedm/wire-edm tribal corpus work — pairing this with a wiring sprint per slot's domain is natural.
2. **Build a "wiring candidate" recommender** that takes an engine name + scans existing dispatcher cases for shape-similar actions, then proposes the closest match. Surfaces to operator as a 1-click "wire it into X" prompt instead of 593 autonomous decisions.
3. **Resolve PSN leg #10 (NN/GNN)** — `U-NN-PREDICTOR-EMBED-WIRE` is named in CLAUDE.md as the blocker. Closing it unblocks the GraphSAGE wiring-inference tier-5 cascade, which would itself help auto-classify the 593 NEEDS_WIRING engines by shape similarity to wired ones.

---

## Doctrine captured this session

- **Cohort membership ≠ rewrite-need.** A cohort taxonomy that classifies engines by file-header signals does not predict whether any specific engine needs a particular rewrite. Always verify the leverage estimate against actual scan output before scheduling work based on it. (R12.)
- **`state/shared/system-viz/` source files need explicit gitignore exceptions.** The whole directory was gitignored for auto-generated graph artifacts; the server binary + viewer HTML lived there too, unversioned, and silently disappeared at some point. Added explicit `!_server.cjs` / `!dashboard.html` / `!viz3d.html` exceptions so they can't vanish again.
- **PreCompact[]` matcher = empty string fires on BOTH manual `/compact` AND autocompact.** `precompact-handoff.mjs` at position [2] is wired correctly — autocompact does NOT bypass it.
- **Cross-tree commit absorption is still happening** (per `feedback_commit_to_slot_worktree`). Of the 12 files this session's lego-stacking work created, 4 were absorbed by peer commit `807d882c03` (foxtrot, welding-tribal-corpus). Attribution lost but content preserved. The slot-worktree migration is the documented fix; for global META infrastructure that legitimately belongs on the shared branch, `[BOOTSTRAP-SLOT-ENFORCE]` tag is the workaround.

---

**Status of /goal `[ complete all stages ]`:** Stages 1–5 of LEGO-STACKING-MS0 are committed (`ff0ece0ace` + this gap doc + the bulk-migrate runner). The pipeline is self-perpetuating: cohort-detector → batch-compat-scorer → bridge-shim-emit produces shim-edges that surface in the 3D viewer; stop-cohort-drift-watch nudges the next operator when the engine population shifts. The 593-engine wiring gap is OUT of scope for this milestone and explicitly named here so it doesn't get silently forgotten.
