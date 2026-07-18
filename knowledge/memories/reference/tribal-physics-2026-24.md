---
type: tribal-consolidation
topic: physics
iso_week: 2026-24
cluster_size: 7
cluster_size_synthesized: 7
aggregate_confidence: 87.3
tags: ["wire-edm", "pulse-on", "mrr", "spark", "temperature", "voltage", "physics", "thermal"]
materials: ["P", "S"]
operations: ["wire_edm", "threading"]
_consolidatedAt: 2026-06-09T06:33:51.702Z
epistemic_only: true
consumed_by_machining: false
milestone: OBSIDIAN-COMPOUND-MS1/S6/U-TRIBAL-CONSOLIDATE
---
# Tribal: physics — 2026-24

_7 tips clustered on 'physics' with mean confidence 87.3/100. The vault is supposed to talk back; this is what it heard from the shop floor this week._

## Top Tips (7)

### 1. Wire EDM spark reaches 12,000°C — material removal via local melting and evaporation

- **id:** `wedm-web-001` · **confidence:** 95/100 · **usage:** 0
- **source:** runsom.com:wire-edm-process:2026
- **tags:** wire-edm, spark, temperature, voltage, physics, thermal



### 2. Pulse on time has strongest causal effect on MRR (strength 0.85-0.90)

- **id:** `wedm-ml-006` · **confidence:** 92/100 · **usage:** 0
- **source:** klocke_2013:ch8:causal_analysis
- **tags:** wire-edm, causal-inference, pulse-on, mrr, tradeoff



### 3. Longer pulse-on time reduces MRR due to ion energy sharing — shorter pulses more efficient

- **id:** `wedm-web-005` · **confidence:** 90/100 · **usage:** 0
- **source:** researchgate.net:wedm_optimization_review:2024
- **tags:** wire-edm, pulse-on, mrr, electron, ion, efficiency



### 4. Chvorinov solidification rule: sand ts~(V/A)² vs die ts~(V/A)¹

- **id:** `TK-DL-cast-005` · **confidence:** 85/100 · **usage:** 0
- **source:** document:mit2008-casting@solidification
- **tags:** casting, solidification, chvorinov, heat-transfer, riser-design

Solidification time follows Chvorinov's rule: ts = C(V/A)^n where V=volume, A=surface area. For sand casting n=2 (heat transfer limited by sand conductivity ~0.5 W/mK), for die casting n=1 (metal mold conductivity ~200 W/mK dominates). This…

### 5. Okuma incomplete thread length calculation

- **id:** `TK-DL-okuma-osp-programming-010` · **confidence:** 85/100 · **usage:** 0
- **source:** document:okuma-osp-programming
- **tags:** okuma, threading, runout, calculation, document-learned, doc:okuma-osp-programming

Delta > K × N × P where N=spindle RPM, P=thread lead (mm), K=machine constant (0.48-2.56 × 10^-3). Account for this when programming thread runout zones to prevent collisions.

### 6. Spring back in bending: increases with Y/E ratio and R/t

- **id:** `TK-DL-form-001` · **confidence:** 82/100 · **usage:** 0
- **source:** document:mit2008-deforming@spring-back
- **tags:** bending, spring-back, sheet-metal, forming, compensation, material:P

After bending, elastic recovery causes the part to spring back. The relationship is Ri/Rf = 1 - 3(Y/E)(Ri/t) + 4(Y/E)³(Ri/t)³ where Y=yield stress, E=Young's modulus, t=thickness, Ri=initial bend radius, Rf=final radius. Titanium (high Y/E …

### 7. Forging force with friction: F≈πR²Y(1+2µR/3h) — friction dominates for flat parts

- **id:** `TK-DL-form-002` · **confidence:** 82/100 · **usage:** 0
- **source:** document:mit2008-deforming@forging-force
- **tags:** forging, friction, force, upsetting, press-tonnage

Open-die forging force for axisymmetric upsetting with friction: F = πR²Y(1 + 2µR/3h) where R=radius, Y=yield stress, h=height, µ=friction coefficient. The friction term 2µR/3h becomes dominant for large R/h ratios (flat pancake shapes), po…

## Common Threads

Top tags across the cluster: `wire-edm`, `pulse-on`, `mrr`, `spark`, `temperature`, `voltage`, `physics`, `thermal`.

## Sources Cited

- runsom.com:wire-edm-process:2026 (1)
- klocke_2013:ch8:causal_analysis (1)
- researchgate.net:wedm_optimization_review:2024 (1)
- document:mit2008-casting@solidification (1)
- document:okuma-osp-programming (1)

## Citations

- [[wedm-web-001]]
- [[wedm-ml-006]]
- [[wedm-web-005]]
- [[TK-DL-cast-005]]
- [[TK-DL-okuma-osp-programming-010]]
- [[TK-DL-form-001]]
- [[TK-DL-form-002]]

