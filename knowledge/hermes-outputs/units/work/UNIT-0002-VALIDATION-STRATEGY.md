# UNIT-0002 — Domain 1 Validation Strategy (honest, data-grounded)
_Author: oscar · 2026-07-02 · Deliverable of UNIT-0002. R12: this re-bases the Domain-1 sub-unit acceptance criteria on data PRISM ACTUALLY possesses and names, loudly, the criteria that are unfalsifiable in-repo._

## The problem with the as-written criteria
UNIT-0003…0012 each carry a criterion of the form "predicted vs **measured** force/wear error < 5-8% on 10+ real JM Die jobs." **PRISM has no such measured dataset.** The JM Die corpus (`H:/PRISM/JM DIE/`, 24,545 files) is NC programs + customer folders — not dynamometer traces, chip metrology, or measured tool-wear curves. The only tool-life corpus, `state/shared/corpus/cam-tool-life-{tuples.jsonl,summary.json}` (726 tuples), is **SYNTHETIC** — generated FROM `V·T^n=C` itself (`"formula":"V*T^n=C with family multiplier"`), so validating a Taylor prediction against it is **circular**. Any "validated <5%" claim on that substrate would be a lie.

## Validation substrate PRISM DOES have (use these)
1. **Algebraic-invariant / silent-wrong oracles over the full input lattice** — `scripts/sfc-exhaustive-combinatorial-sweep.mjs` + `scripts/lib/sfc-sweep-oracle.mjs`, driven overnight-sharded by `scripts/sfc-overnight-driver.mjs`. This is the STRONGEST in-repo validator: it drove the real `ProductEngine.productSFC` across ~45M combinations and caught a genuine silent-wrong defect (`mrr_inconsistent`, fixed in `U-OSC-SFC-MRR-VC-IDENTITY` 2026-07-02) that no spot-test would. **Every Domain-1 acceptance criterion should be re-expressed as a checkable invariant** (e.g. JC flow stress monotone in strain-rate; Kienzle Fc monotone in ap/fz; Taylor life strictly decreasing in Vc; MRR = ap·ae·vf) not a fictitious "measured error < X%".
2. **Proven speed/feed mining** — `speed_feed_mine` (mined proven S/F from the JM program corpus): real shop-run parameters, usable as a plausibility band, not a force ground-truth.
3. **Calibration-persist actuals** — `speed_feed_calibration_persist`: operator-entered calibration deltas, the closest thing to measured feedback; bounded reconciliation multipliers.
4. **Tri-vendor parity** — `speed_feed_tri_compare` (SFC vs G-Wizard + HSMAdvisor + traditional): cross-tool agreement is a real external check the overnight driver already runs (workload 2).
5. **Cross-model invariants** — JC-flow-stress vs Kienzle-kc consistency; both must move the same direction with hardness/strain-rate. A divergence (like the open `U-JC-CONSTANT-RECONCILE`) is a real, in-repo-detectable defect.

## Per-criterion re-base (rule)
Replace **"predicted vs measured < N% on 10 jobs"** → **"(a) passes M algebraic invariants over the full combinatorial sweep with 0 silent-wrong oracle hits; (b) lands within the proven-S/F mined band on ≥K spanning JM configs; (c) agrees with the tri-vendor panel within the panel's own spread, reported WITH uncertainty."** Publishing a Domain-1 recommendation without an uncertainty band is on oscar's refuse-list.

## Unfalsifiable-in-repo (operator data-acquisition dependency)
These CANNOT be closed by code — they need shop-floor capture. Flag as blocked (R12), do not fake:
| Missing measured data | To unblock, capture | Feeds |
|---|---|---|
| Cutting-force (dynamometer) traces | Kistler/spindle-load logs per test cut (material, tool, ap/ae/fz, Fc) | Kienzle/JC force validation (0003, 0006) |
| Chip morphology | photos/measured chip thickness + shear angle per cut | serrated-chip / min-chip (0005, 0008) |
| Measured tool-wear curves | operator tool-change logs OR offset-table deltas over life | wear/life validation (0004, 0009–0012) |
| Reconditioning outcomes | before/after regrind performance records | 0010 |

## The "8–12 atomic units vs 6 existing" question
Recommend **amend Domain-1 to 6 units (0003–0008) + explicitly closing the one real gap (DSA, UNIT-0007) with justification**, rather than padding to 8–12. If two more are wanted, the highest-value candidates are: (1) **thermal partition / Peclet number** (chip-vs-tool-vs-work heat split — feeds white-layer + thermal-wear coupling); (2) **MQL/coolant chemistry** (mist/through-tool film behavior — feeds the coolant derate already in `ProductEngine`). Both are "extend" over existing thermal/coolant engines, not greenfield.

## One-line summary
Domain-1 physics is ~5/6 built+wired; validate it with **invariants + the exhaustive sweep oracle + tri-vendor parity + proven-S/F bands (all in-repo)**, build **DSA (0007)** as the sole real code gap, and mark measured-force/chip/wear datasets as an operator capture dependency — never claim "validated against measured JM data" that does not exist.
