---
name: reference_cad_topology_iter14_17_2026_05_25
description: CAD-PIPELINE-WIRE-MS0 iter+14..+17 on slot:delta 2026-05-25 — tooling layer (env-overridable caps + --dry-run + cad-dry-run-corpus.mjs bulk predictor + FILE_DESCRIPTION provenance). Reveals 262 slugs cap-bound on planes = largest leverage for future cap raises.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.498Z
aliases: reference_cad_topology_iter14_17_2026_05_25
---


# CAD topology pipeline — iter+14..+17 arc (tooling + diagnostics)

4 commits on slot:delta (9eb84a982f → cbb88968aa → cd96a5450b → iter+17). Coverage numbers unchanged (66.2% normalized median) — these iters built diagnostic + tuning infrastructure on top of the iter+13 baseline.

## Iter-by-iter

| iter | commit | headline |
|---|---|---|
| iter+14 | 9eb84a982f | plane cap 100→200 + iter+8..+13 wiki/memory doc |
| iter+15 | cd96a5450b | cone + plane bbox-fallback placements (long-tail capture) |
| iter+16 | cbb88968aa | env-overridable caps + --dry-run + FILE_DESCRIPTION provenance |
| iter+17 | (this commit) | cad-dry-run-corpus.mjs bulk predictor + wiki/memory final reflection |

## Bulk dry-run predictor reveal (iter+17)

`node scripts/cad-dry-run-corpus.mjs` over 558 slugs with default caps:
- cyls: 49,890 (89.4/slug avg, 137 cap-bound at 256)
- **planes: 60,210 (107.9/slug avg, 262 cap-bound at 200)** ← largest leverage
- cones: 7,203 (12.9/slug avg, 168 cap-bound at 32)
- blades: 9,182 (16.5/slug avg, 141 cap-bound at 48)
- TOTAL FACES: 587,631 (avg 1053.1/slug)

262/558 = 47% of corpus is plane-cap-bound. Raising PRISM_CAD_PLANE_CAP=400 (or removing cap) would meaningfully expand coverage on nearly half the corpus.

## Env tuning surface

```
export PRISM_CAD_CYL_CAP=256
export PRISM_CAD_PLANE_CAP=200
export PRISM_CAD_CONE_CAP=32
export PRISM_CAD_BLADE_CAP=48
export PRISM_CAD_CYL_MIN_RADIUS=0.1
```

Precedence: `opts.max ?? (Number(env) || default)`. No code edits required to tune coverage.

## Cross-refs

- [[reference_cad_topology_emitter_2026_05_25]] — iter+1 base
- [[reference_cad_topology_iter5_7_2026_05_25]] — iter+5..+7
- [[reference_cad_topology_iter8_13_2026_05_25]] — iter+8..+13
- Scripts: `cad-emit-impeller-fusion-step.mjs` (--dry-run + env caps), `cad-dry-run-corpus.mjs` (bulk predictor)
- Wiki: [`knowledge/wiki/architecture/cad-pipeline-closed-loop.md`] — 17-iter table + operator tuning surface

## Next-phase priorities (post iter+17 — empirically ranked)

1. **PRISM_CAD_PLANE_CAP raise** (262 slugs gain) — largest single lever
2. **PRISM_CAD_CONE_CAP raise** (168 slugs gain)
3. **PRISM_CAD_BLADE_CAP raise** (141 slugs gain) — but watch over-emission per iter+12
4. Real NURBS blade emission (curved surfaces, qualitative not quantitative)
5. Source EDGE_LOOP extraction (replaces plane-slab heuristic)
