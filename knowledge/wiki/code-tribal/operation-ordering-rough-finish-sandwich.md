---
schema: ideablock-v1
title: "Rough → stress-relief → finish — when the sandwich matters and when it doesn't"
domain: "Operation ordering"
category: operation-ordering
version_state: Current
confidence: 0.96
cluster_size: 1
canonical_sha256: authored-2026-05-20-hotel
sources:
  - Machinery's Handbook 31e §Machining Stresses + Residual Stress
  - Sandvik Coromant — Machining titanium / Inconel application guides
  - Stoneking & Coleman, "Residual stress in machined parts" (J. Manuf. Sci.)
  - 4245-tribal corpus operation-ordering subset (n=353)
extracted_via: human-authored
extracted_at: 2026-05-20T21:00:00Z
authored_by: claude-8ed50f0a (slot:hotel, U-WIKI-OPORDER-ROUGH-FINISH)
---

## Question

When do I need to stress-relieve between roughing and finishing, and when can I rough-then-finish straight through?

## Answer (canonical — the decision criteria)

### Always rough → finish in separate passes (not interleaved)

Independent of stress relief, **roughing and finishing are different cuts with different parameters**, and a single tool running both badly does neither well:

| Aspect | Rough | Finish |
|---|---|---|
| Goal | MRR (volume/min) | Surface finish + dimensional accuracy |
| DOC | Heavy (40–80 % of tool dia for endmills, 1–5 mm for inserts) | Light (0.05–0.5 mm) |
| Feed/tooth | High (0.10–0.30 mm) | Low (0.03–0.10 mm) |
| RPM | Low–mid | High |
| Tool | Roughing geometry, larger nose | Finishing geometry, sharp edge, smaller nose |
| Coolant | Flood (chip evac) | Often MQL or air-blast (avoid thermal shock) |
| Tool path | Trochoidal / adaptive / waterline | Constant-Z, scallop, or finish-pass parallel |

Mixing them = bad surface from roughing parameters or wrecked tool from finishing parameters in heavy stock.

### The stress-relief decision tree

```
Was > 50% of part volume removed?       NO  → skip stress-relief (rough → finish OK)
                ↓ YES
Material is wrought / rolled / forged?  NO  → skip (cast/sintered already low-stress)
                ↓ YES
Tolerance class M or tighter, OR        NO  → skip (loose tolerance survives drift)
finish Ra < 1.6 μm?
                ↓ YES
Part has L/D > 3 OR thin walls < 3 mm?  NO  → skip if symmetric stock removal
                ↓ YES
                ↓
INSERT STRESS-RELIEF between rough and finish.
```

### Stress-relief options ranked by cost vs effectiveness

| Method | Cost | Effectiveness | When to use |
|---|---|---|---|
| **Aging at room temp (24–48 h)** | $0, just time | 30–50 % residual stress reduction | Aluminum 6061/7075 after heavy roughing; works on tight-tolerance long-cycle parts |
| **Thermal stress relief (subcritical anneal)** | $$$ furnace cycle | 70–90 % | Steel parts, especially pre-hardened or weldments |
| **Vibratory stress relief** | $$ | 40–60 % | Large weldments, castings; faster than thermal |
| **Cryogenic** (immerse in LN2) | $$ | 50–70 % + carbide stabilization | Tool & die work, ultra-tight tolerances |
| **Shot peen** | $$ | adds compressive stress (counter to tensile) | Fatigue-critical surfaces (not bulk relief — different mechanism) |

### Anti-patterns from the floor

- **"Just leave 0.1 mm and finish."** On stress-prone materials this is naïve — the part may move 0.05–0.20 mm between operations. The 0.1 mm allowance becomes 0.0 or 0.2, depending on direction. Either you cut air (no finish on the surface) or you cut into the part (oversize from intended finish).
- **"We don't have time for a 24-hour age."** Build the queue around it — start the next setup while the roughed part ages. Aging is FREE labor (the part sits in a bin); the only "cost" is one part-day of inventory.
- **"Heat treat fixed it."** HT can fix dimensional creep IF the part was roughed symmetrically and the HT is full anneal. Partial-roughed parts going through HT bake in asymmetry forever.

### When you really CAN skip the sandwich

- Stock removal is small (< 30 % of volume) — the stress that's left is what was there in the raw stock, and you're not redistributing much.
- Material is cast / sintered / 3D-printed (DMLS) with HIP — already in a low-stress state.
- Tolerance is loose (IT12+) and finish is rough (Ra > 3.2 μm) — drift fits inside the tolerance.
- Part geometry is bulky / symmetric (cube, plate with no aspect-ratio extremes) — the stress redistributes uniformly.

### Tie-ins to the other operation-ordering canonical entries

- After roughing, **[[operation-ordering-datum-sequencing]] re-datum exception 3** (removed-stiffness change) may trigger. If you took > 0.5 mm of total stock from any single side on a low-aspect part, re-indicate datum A before the finishing pass.
- Finishing passes that include holes follow **[[operation-ordering-hole-sequence]]** — the spot-drill / drill / bore / ream order applies inside the finishing operation just like it would in a single-cut hole.

## Provenance

Distilled from the 353 operation-ordering tips in the 4245-tribal corpus + Machinery's Handbook 31e §Machining Stresses + Sandvik Ti/Inconel guides. Authored 2026-05-20 by slot:hotel under U-WIKI-OPORDER-ROUGH-FINISH — third canonical entry of the wiki+tribal high-ROI pivot session.

System injection: `tribal-by-domain-inject` (UserPromptSubmit hook) auto-surfaces on `rough`, `finish`, `stress`, `relief`, `anneal`, `cryogenic`, `aging`, or `Ti / Inconel` keywords. Zero wiring required.

## Cross-references

- [[operation-ordering-hole-sequence]] — sibling entry; hole-sequence applies inside the finishing pass
- [[operation-ordering-datum-sequencing]] — sibling entry; re-datum after roughing rule
- [[reference_tribal_coverage_audit_2026_05_18]] — coverage audit driving the pivot
- [[feedback_do_optional_high_roi_work]] — standing rule honored
