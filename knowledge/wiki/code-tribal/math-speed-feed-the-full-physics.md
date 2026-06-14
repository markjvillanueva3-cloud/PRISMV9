---
schema: ideablock-v1
title: "Speed/feed — the full physics: Kienzle force, Taylor life, chip-thinning, power, MRR, stability lobes"
domain: "Machining mathematics"
category: machining-math
version_state: Current
confidence: 0.97
cluster_size: 1
canonical_sha256: authored-2026-05-21-hotel
sources:
  - Machinery's Handbook 31e §Cutting Speeds and Feeds + §Power Constants
  - O. Kienzle (1952) — specific cutting force model
  - F. W. Taylor (1907) — tool life equation
  - Y. Altintas "Manufacturing Automation" — stability lobe theory
  - PRISM physics/constants.ts (CANONICAL kc1.1, mc, Taylor C/n — never inline)
extracted_via: human-authored
extracted_at: 2026-05-21T14:10:00Z
authored_by: claude-8ed50f0a (slot:hotel, U-WIKI-MATH-SPEED-FEED)
---

## Question

What is the complete mathematical chain from a speed/feed/depth choice to cutting force, power, tool life, MRR, surface finish, and stability — every formula, with units?

## Answer (canonical — the speed/feed physics, end to end. All material constants live in `physics/constants.ts`; values shown here are EXAMPLES, never to be inlined in code.)

### 1. Cutting velocity ↔ spindle speed

```
Vc = π · D · n / 1000          [Vc in m/min, D in mm, n in rev/min]
n  = 1000 · Vc / (π · D)
```
For turning, D = workpiece diameter; for milling, D = cutter diameter. Constant-surface-speed (CSS / G96) holds Vc fixed and varies n as D changes; G97 holds n fixed.

### 2. Feed — per-tooth, per-rev, per-minute

```
vf = fz · z · n               [vf table feed in mm/min; fz feed per tooth mm; z tooth count]
fn = fz · z                   [fn feed per revolution, mm/rev — turning uses fn directly]
```

### 3. Uncut chip thickness + chip thinning

Nominal chip thickness for milling depends on radial engagement. At full slot, the average uncut chip thickness `h_m` relates to `fz` by the engagement angle. For radial engagement `ae < D/2`, the **chip-thinning correction** (Sandvik form) is:

```
fz_programmed = fz_desired · √( D / ae )       [for ae < D/2]
```
Worked example: Ø12 mm cutter, ae = 1.5 mm (12.5 % engagement), desired chip h = 0.05 mm →
`fz_programmed = 0.05 · √(12/1.5) = 0.05 · 2.83 = 0.141 mm/tooth`. The tool feeds 2.83× faster to hold the same true chip thickness.

### 4. Specific cutting force — the Kienzle model

The Kienzle equation gives specific cutting force `kc` as a function of uncut chip thickness `h`:

```
kc = kc1.1 · h^(-mc)           [kc1.1 = specific force at h=1mm,b=1mm; mc = Kienzle exponent]
```
`kc1.1` and `mc` are **material constants** — canonical per ISO group in `physics/constants.ts` (P≈1800, M≈2100, K≈1100, N≈700, S≈2800, H≈3200 N/mm² for kc1.1; the doc lists the per-group values — do NOT hardcode them in code, import them). The `h^(-mc)` term is the **size effect**: thinner chips have higher specific force (kc rises as h falls).

Total tangential cutting force:
```
Fc = kc · A = kc · b · h        [A = chip cross-section, b = chip width, h = chip thickness]
```

### 5. Cutting power + torque

```
Pc = Fc · Vc / 60000           [Pc in kW; Fc in N; Vc in m/min]
Pmotor = Pc / η                 [η = machine efficiency, typ 0.75-0.90]
M  = Fc · D / 2000              [M spindle torque in N·m; D in mm]
```
The power check: `Pmotor ≤ P_available(n)` — and the available power is RPM-dependent (the spindle power curve; constant-torque below base speed, constant-power above). See [[synthesis-rigidity-envelope]] for why power is rarely the true limit (rigidity usually binds first).

### 6. Material removal rate

```
MRR = ae · ap · vf             [milling; mm³/min]
MRR = ap · fn · Vc · 1000      [turning; mm³/min — ap depth, fn feed/rev]
```
MRR × specific energy ≈ cutting power: `Pc ≈ kc · MRR / 60000` — a useful cross-check.

### 7. Tool life — Taylor's equation

```
Vc · T^n = C                    [T tool life in min; n, C material/tool constants]
T = (C / Vc)^(1/n)
```
`n` and `C` are canonical in `physics/constants.ts`. Example (1045 steel, carbide): n ≈ 0.25, C ≈ 250. The **extended Taylor** form adds feed + depth dependence:
```
Vc · T^n · f^a · ap^b = C_ext
```
Worked example: at Vc=200, n=0.25, C=250 → T = (250/200)^4 = 1.25^4 = 2.44 min. At Vc=250 → T = (250/250)^4 = 1.00 min. A 25 % speed increase costs 59 % of tool life — the steep `1/n` exponent is why economic Vc sits well below max Vc (see [[machining-tactics-material-removal-economics]] for the Gilbert minimum-cost derivation).

### 8. Surface finish — theoretical roughness

For turning with nose radius `r` and feed `fn`:
```
Rt ≈ fn² / (8 · r)              [peak-to-valley, mm]
Ra ≈ fn² / (32 · r)            [≈ Rt/4 for a sinusoidal-ish profile; approximation]
```
Worked example: fn = 0.2 mm/rev, r = 0.8 mm → Rt ≈ 0.04/(6.4) = 0.00625 mm = 6.25 μm. Halving feed quarters the roughness — finish scales with `fn²`. This is the *theoretical* (kinematic) finish; real finish adds BUE, vibration, tool wear (always worse than theory).

### 9. Regenerative chatter — the stability lobe

Chatter is self-excited vibration from the regenerative effect (each tooth cuts the wavy surface left by the previous tooth). The critical (chatter-free) axial depth of cut:

```
ap_lim = -1 / (2 · Kc · Re[G(ω)])         [Kc cutting stiffness; G(ω) machine FRF]
```
The stability lobe diagram plots `ap_lim` vs spindle speed `n` — a series of lobes. Between lobes, stable `ap` is low; at the lobe peaks (where tooth-pass frequency aligns with a structural mode harmonic), stable `ap` is much higher. The practical use: if chatter occurs, *change the RPM* to climb onto a lobe peak — often a more effective fix than reducing `ap`. See [[machining-tactics-in-cut-adjustments]] §chatter.

Tooth-pass frequency:
```
f_tooth = z · n / 60           [Hz]
```
Chatter-free speeds occur where `f_tooth` (or a harmonic) aligns favorably with the dominant structural natural frequency `fn_struct`.

### 10. The full chain — putting it together

```
(Vc, fz, ae, ap, z, D)
    │
    ├─→ n = 1000·Vc/(π·D),  vf = fz·z·n                    [machine inputs]
    ├─→ h (from fz, ae) → kc = kc1.1·h^(-mc) → Fc = kc·b·h  [force]
    ├─→ Pc = Fc·Vc/60000,  M = Fc·D/2000                    [power, torque — check vs machine]
    ├─→ MRR = ae·ap·vf                                       [productivity]
    ├─→ T = (C/Vc)^(1/n)                                     [tool life]
    ├─→ Rt ≈ fn²/(8r)                                        [finish]
    └─→ ap_lim(n) from the stability lobe                    [chatter limit]
```
A speed/feed recommendation is *optimal* only when it satisfies the power/torque limit AND the rigidity limit AND `ap ≤ ap_lim(n)` AND the tool life supports the cost-per-part target AND the finish meets spec. PRISM's `prism_calc` dispatcher computes every term above; the safety gate verifies the constraints.

### Statistical layer — every term has a distribution

The formulas above give point estimates. In reality every input is a distribution: `kc1.1` varies ±10-15 % lot-to-lot, tool runout perturbs `h`, the machine FRF drifts with temperature. The honest speed/feed output is a *distribution*, not a number:
```
Fc ~ Normal(μ_Fc, σ_Fc)        where σ_Fc propagates from σ_kc, σ_h, σ_runout
```
Monte Carlo propagation (sample each input from its distribution, N=10⁴, measure the output spread) gives the confidence interval. PRISM's `sfc_stochastic` + `monte_carlo_*` actions do this. The cost-per-part decision should use the P95 force, not the mean — designing to the mean means half your cuts exceed the design point.

### Anti-patterns

- **"Use the handbook number."** The handbook gives a starting Vc for a material/tool pair. The *optimal* Vc is the Gilbert minimum-cost point, machine-rate-dependent — see [[machining-tactics-material-removal-economics]].
- **"Power is the limit."** Rarely — rigidity (`ap_lim`, deflection) usually binds first. Check the rigidity envelope before assuming a power ceiling.
- **"Chip thinning is optional."** At ae < 30 % engagement, ignoring chip-thinning means feeding 2-3× too slow — leaving huge MRR on the table.
- **"Taylor n is universal."** `n` is tool+material+condition specific; runout/coolant-failure/recutting lower the *effective* n. Calibrate from outcomes (`physics_calibrate_*`).
- **"One number per cut."** Every output is a distribution. Ship the P95, not the mean.

### Tie-ins

- [[math-cutting-mechanics-merchant-oxley]] — the shear-plane physics under the Kienzle `kc`
- [[machining-tactics-material-removal-economics]] — Gilbert minimum-cost Vc derivation
- [[machining-tactics-chip-control-and-evacuation]] — chip-thinning operational detail
- [[tooling-tool-life-and-wear-management]] — Taylor calibration + wear modes
- [[machining-tactics-in-cut-adjustments]] — stability-lobe RPM shift for chatter
- [[synthesis-rigidity-envelope]] — why rigidity binds before power
- [[wiring-pattern-engine-to-dispatcher]] — the prism_calc engines that compute this chain

## Provenance

Distilled from Machinery's Handbook 31e §Cutting Speeds and Feeds §Power Constants + Kienzle (1952) + Taylor (1907) + Altintas "Manufacturing Automation" stability theory. All material constants (kc1.1, mc, Taylor C/n) are canonical in PRISM `physics/constants.ts` — this entry shows EXAMPLE values for worked examples only; code must import, never inline. Authored 2026-05-21 by slot:hotel under U-WIKI-MATH-SPEED-FEED — **47th canonical entry**, first of the Phase-A mathematical-depth expansion (operator /goal: expand wiki to mathematical/statistical max across all domains). New `machining-math` category.

System injection: `tribal-by-domain-inject` + `master-index-precheck-inject` auto-surface on `speed feed`, `cutting velocity`, `Kienzle`, `kc1.1`, `specific cutting force`, `Taylor equation`, `tool life equation`, `chip thinning`, `MRR`, `cutting power`, `stability lobe`, `regenerative chatter`, `surface finish formula`, `Merchant` keywords. Zero new wiring required.

## Cross-references

- [[math-cutting-mechanics-merchant-oxley]] — chip-formation physics
- [[machining-tactics-material-removal-economics]] · [[machining-tactics-chip-control-and-evacuation]] · [[tooling-tool-life-and-wear-management]] · [[machining-tactics-in-cut-adjustments]] · [[synthesis-rigidity-envelope]] — tactical applications
- [[reference_pivot_wiki_tribal_2026_05_21]] — pivot session record
- [[feedback_do_optional_high_roi_work]] — standing rule
