# WEDM Print→Program — Comprehensive Validation Report (JM Die)

**Date:** 2026-06-01 · **Slot:** mike (WEDM domain) · **Machine target:** Mitsubishi FA-10S / W31MV-2 controller
**Operator goal:** "prove 100% accuracy of print→CNC for all wire programs in the JM system" + "ensure data is optimized" + verify thickness / hardness / compound-material coverage.
**Scope:** the print→program training corpus (`wedm-print-program/corpus.jsonl`), the JM Die parametric oracle (`jm-die-wedm-tech-tables.ts`), the bi-material engine (`EDMBiMaterialCompensationEngine.ts`), and the closed-loop training proof (0.5B LoRA).

> **One-line verdict:** print→program is **proven as a closed training loop, not as a shop-ready oracle.** The model learns; the data it learns from is a 5-record broken seed, and the physics oracle is constant-output on all three axes the operator named. Gate-pass 86.7% measures structural fidelity, not metric-print correctness. Distance to true 100% is a **data + physics** gap, not a model gap.

---

## Current accuracy

### Closed-loop training (PROVEN — model side)
| Metric | Value | Meaning |
|---|---|---|
| Model | 0.5B LoRA (Qwen2.5-class) | Smallest tier; trains locally, no download gate |
| Final train loss | **0.10** | Converged — model reliably reproduces the corpus mapping |
| Gate-pass | **86.7%** (13 of 15 held-out checks) | Structural validity of emitted program text |
| Instruction family | `print_to_program` | Single family; no multi-machine generalization tested |

**What 86.7% actually certifies:** the model emits FA-10S-shaped program text — correct `%`/`L001` header, H-offset register block, `M91→M20→M78→M80→M82→M84` thread/flood startup, per-pass `E#### H# F.##` cascade, and `M85 M83 M81 → M21 → M58 → M02` shutdown. It is a **structural** pass: "does the output look like a real W31MV-2 program."

**What 86.7% does NOT certify:** that the chosen E-code family, H-offset cascade, and feed overrides are *physically correct for the print's actual thickness, material hardness, and material composition.* No held-out check varies thickness or hardness, because the corpus carries neither.

### Structural-vs-real accuracy (the honest split)
| Dimension | Structural accuracy | Real (metric-print) accuracy |
|---|---|---|
| Program skeleton (header/startup/shutdown/M-codes) | **~100%** — 4 real programs transcribed verbatim | ~100% (these are real FA-10S programs) |
| Pass cascade shape (E-code last-digit = pass index, H decreasing) | **~100%** | ~100% (pattern holds across all 3 verbatim cascades) |
| E-code family selection vs. **thickness** | n/a | **0%** — constant 1 mm…215 mm (P0-1) |
| Power/feed selection vs. **hardness** | n/a | **0%** — no HRC parameter exists (P0-2) |
| Bi-material (carbide-in-steel) zoning | n/a | **0%** — engine exists, unwired (P0-3) |
| Print-field → program coupling | n/a | **~0%** — corpus `input` carries no dimensions/tolerances/GD&T/finish |

**Corpus integrity (the data the 86.7% trained on):** 5 records in `mcp-server/data/training/wedm-print-program/corpus.jsonl`, and the file is structurally broken on **both** sides:
- **`input`** carries only Mastercam title-block text (`customer, description, drawing_no, part_no, revision, material`) — **no dimensions, no tolerances, no GD&T, no surface finish**, despite the instruction promising all five. Material present in 3/5 only (`25% CARBIDE`, `D-70`, rest blank). `print_context_length` 63–224 chars; record 1's "1073" is the token `D-Block` repeated ~55× (garbage). Record 3 has no description and `drawing_no:"B"`.
- **`output`** is **NOT the `.NC` G-code** the instruction asks for — it is the raw binary `.mcx-8`/`.MCX` Mastercam file dumped as mojibake UTF-8 (280–448 KB of `�`/record). A model cannot learn to emit runnable NC from this.

**Net:** the 0.10 loss / 86.7% gate is a real, reproducible *engineering* result on a *broken* dataset. It proves the pipeline works; it does not prove print→program is correct.

---

## Physics correctness (severity-ranked)

Source of truth: physics audit of `jm-die-wedm-tech-tables.ts` (the JM oracle) + `EDMBiMaterialCompensationEngine.ts` + `mitsubishi-fa-advance-extracted.ts`. **Clean file:** `wedm-build-strategies.ts` — no findings. All defects are in the oracle and its `selectECodeFamily()` selector.

### P0-1 — THICKNESS functionally ignored (feeds/offsets/E-codes constant 1 mm → 215 mm)
`selectECodeFamily()` (lines 132–167) uses `thickness_mm` in exactly **one** place — a boolean nudge past 50 mm into the heavy family. After that branch every per-pass value is a frozen constant: `getShopFeedForPass(E12XX_HEAVY_5PASS, 1)` returns **1.52 mm/min** whether the stock is 6 mm or 210 mm.
- **Physics violated:** sparking-frequency-limited feed scales inversely with height — `v_feed ≈ MRR_vol / (kerf_width × thickness)`. The codebase's *own* `EDMBiMaterialCompensationEngine` encodes exactly this (`thickFactor = sqrt(25/thickness)`, `feedRate = mrr/thickness`, lines 338–341), and `mitsubishi-fa-advance-extracted.ts` carries **11 thickness-indexed records (5,10,20,30,40,50,60,70,80,90,100 mm)** for precisely this reason. The JM oracle discards all of it.
- **Error magnitude:** apply the CHOCTAW-calibrated E1281 rough feed (1.52 mm/min) to a 12 mm plate → **3–5× too slow** (cycle-time loss, recast over-thick from dwell). Apply E1221 standard feed (3.05 mm/min) to a 150 mm D2 block → over-drive the gap → debris packing → **wire break**. One 50 mm threshold cannot span a 1–215 mm machine.
- **Compounding:** the only production caller (`WireEDMDeepAIHardeningEngine._selectECodeFamily`, lines 1423–1492) routes thickness through the FA-Advance records and **never calls the JM oracle at all** → the oracle's thickness branch is dead in prod, and the two selectors have **diverged** (see P1-3).

### P0-2 — HARDNESS does not exist in the oracle (D2-at-62HRC == annealed-4140)
`selectECodeFamily` takes `material: string`, matched only by substring against an applicability list (lines 139–144). **No `hardness_hrc` parameter, no HRC term, no temper distinction.** D2@62HRC and annealed D2 (~22HRC) → identical E12xx family, identical feeds.
- **Why P0, not pedantry:** EDM removal rate is genuinely weakly hardness-dependent (thermal, not mechanical — WEDM's headline advantage), *so constant rough power is defensible*. BUT **recast/HAZ cracking and feed-stability margin ARE microstructure-dependent.** The discharge energy that leaves an acceptable ~8 µm recast on annealed stock will **micro-crack the white layer** on 62 HRC tool steel; residual-tensile HAZ propagates into the die edge. Hardened die steel needs a **skim-energy de-rate** (lighter final E-code / lower t_on) and often an added trim pass. The oracle offers no lever.
- **Codebase already models it:** `EDMBiMaterialCompensationEngine` line 316 — `hardnessFactor = 1 + (hardness_hrc − 40)×0.005` drives peak current + break-risk, with explicit `>55 HRC` and `>65 HRC` branches (lines 364, 373). The JM oracle is the **one surface that should carry hardness and is the only one that doesn't.**
- **Folded material-list bug (P1-grade):** `E12XX_HEAVY_5PASS.materials` (line 83) = `["D2","A2","S7","M2","H13"]`; standard adds `4140,4340,O1,W1`. **There is no carbide family at all.** A tungsten-carbide blank silently gets a steel recipe (machinability 0.90 vs carbide's real ~0.40 — a **2.25× MRR error**) → stall or wire break. On-ramp to P0-3.

### P0-3 — NO bi-material (carbide-in-steel) path; the engine exists but is fully unwired
`EDMBiMaterialCompensationEngine.ts` is a physically excellent **42 KB** engine: per-zone `t_on`/`t_off`/current/servo-V/wire-speed/wire-tension, silver-braze melt-back guard at **780 °C**, transition ramps with servo-response-derived `L_ramp`, carbide flush-pressure ×1.4. **Zero linkage to the JM oracle in either direction:**
- `selectECodeFamily` has no `zones[]` input, no carbide branch, no call into the bi-material engine.
- `EDMBiMaterialCompensationEngine` never imports `jm-die-wedm-tech-tables` — it computes from its own `BASELINE`, not JM's calibrated E-codes.
- Grep: the JM oracle's functions are consumed only by `WireEDMDeepAIHardeningEngine` (different table) + tests. **No production engine bridges the two.**
- **Consequence:** a JM steel die body with brazed WC inserts (a common JM job class) submitted to the oracle gets a uniform steel recipe — the braze-line melt-back guard, per-zone power, and flush ramp never fire.

### P1 findings
- **P1-1 — Thickness not back-filled on the 4 source programs.** The verbatim programs (ITW SHAKEPROOF, NOZE TEST, CHOCTAW 38 CAL CANNELURE) carry no explicit thickness/material token — material/thickness is implicit in the E-family + filename + date comment only. Without measured thickness per program, even a thickness-aware oracle has **no anchor points** to calibrate the feed curve.
- **P1-2 — Material carried implicitly, not as a field.** No explicit material/thickness token in any real file. The oracle's `material: string` match is therefore against descriptive guesses, not print-extracted ground truth.
- **P1-3 — Selector divergence.** JM oracle `selectECodeFamily` vs `WireEDMDeepAIHardeningEngine._selectECodeFamily` are two different tables; prod uses the latter. Risk: fixes to one silently never reach production.

### P2 findings
- **P2-1 — Single 50 mm threshold** is the only thickness lever (subsumed by P0-1 fix).
- **P2-2 — `H175` global trim** is a single uniform knob applied to every pass; correct as transcribed, but offers no per-pass / per-thickness adaptivity once feeds become thickness-keyed.

**Severity headline:** 3× P0, 3× P1, 2× P2.

---

## Coverage gaps (real programs / materials / thicknesses NOT covered)

### Program corpus coverage
| Asset class | On disk | In training corpus | Gap |
|---|---|---|---|
| Mastercam SOURCE `.MCX`/`.MCX-8` | **3,970** | 5 (as binary outputs) | CAM source dominant; not runnable NC |
| ESPRIT SOURCE `.esp` | 28 | 0 | binary project files, untapped |
| **Real posted FA programs** (`E#### H#` signature) | **7** (3 `.NC` + 4 `.txt`) | **0** in corpus.jsonl | the only ground-truth runnable programs are **not in the training set** |
| CAD geometry (`.DWG`/`.DXF`) | 4 | 0 | only Anderson + Grandeur; no print pairing |
| PDF/TIF prints in `WIRE EDM/` | **0** | 0 | **the prints do not live with the programs** |

**The single biggest coverage gap:** only **7 confirmed runnable FA-10S programs survive on disk** (verified by `grep -rlE 'E[0-9]{4} H[0-9]'` across 137 subfolders), and the corpus contains **none** of them as proper `{print → NC}` pairs. The 5 corpus records pair empty prints to binary `.mcx` blobs. So the training set has **zero true print→runnable-program pairs.**

### Material coverage
| Material class | Oracle support | Real JM presence | Gap |
|---|---|---|---|
| Tool steel (D2/A2/S7/M2/H13) | E12xx family | yes (die steel) | covered structurally; **hardness-blind** |
| Alloy steel (4140/4340/O1/W1) | E12xx standard | yes | covered structurally; hardness-blind |
| **Tungsten carbide** | **none** | yes (`25% CARBIDE` in corpus rec) | **no carbide E-family at all** (P0-2/P0-3) |
| **Bi-material (steel + brazed WC)** | none in oracle | yes (JM job class) | engine exists, **unwired** (P0-3) |
| E28xx family (NOZE TEST recipe) | present in tables | yes | covered; mapping to material/thickness unknown |

### Thickness coverage
- **Oracle:** effectively 1 bucket (≤50 mm vs >50 mm) → constant output across the FA-10S's full **215 mm** Z-envelope.
- **Available curve (unused):** FA-Advance extracted table = **11 points (5→100 mm)**. Above 100 mm and up to 215 mm: **no data at all** — extrapolation territory.
- **Real programs:** thickness **undocumented** on all 4 → no measured anchors in the 5–215 mm band.

### Print-side coverage
- `Docustrata` holds the real prints: **201 classified PRINT docs** (182 `JMD Prints_1` + 16 AltracsTaptite + 2 JMD Scans) and **13,316 docs with verified print pages** (`phase20-verified-prints-by-doc.jsonl`) out of 111,745 exported docs. **None of this is joined to the 7 runnable FA programs.** The print corpus and the program corpus live in different trees and are unpaired.

---

## Data-optimization plan (prioritized path to 100%)

**Principle:** the gap to 100% is **data + physics**, not model capacity. Fix the data and the oracle first; scale the model last. Sequence in dependency order (R13).

### Phase 1 — Repair the corpus (unblocks everything; P0)
1. **Replace binary `.mcx` outputs with real NC text.** Rebuild `corpus.jsonl` so each `output` is actual W31MV-2 G-code (the `E#### H# F.##` cascade), not a mojibake `.mcx` dump. Seed from the **7 confirmed runnable programs** (3 `.NC` + 4 `.txt`) — these are the only true ground truth on disk.
2. **Populate real print `input` fields.** Join each runnable program to its Docustrata print (201 classified / 13,316 verified-page docs) and extract the five promised fields — **dimensions, tolerances, GD&T, material, surface finish** — via the lima pypdf page-by-page extractor (canonical). No more title-block-only scraping.
3. **Back-fill measured thickness + material + hardness per program** (closes P1-1/P1-2). Without per-program thickness anchors, no thickness-aware oracle can be calibrated.

### Phase 2 — Pair more real prints (scale the corpus; P0/P1)
4. **Mine the 7 runnable programs → N pairs.** Each multi-contour program (e.g. ITW SHAKEPROOF runs the 4-pass cycle twice) yields multiple pass-cascade examples.
5. **Harvest Docustrata at scale.** Target the 13,316 verified-print docs; auto-join to programs by part-number / drawing-number where a runnable NC exists. Realistic near-term: tens of true pairs, not thousands (only 7 runnable programs exist) — so prioritize **print-field richness per pair** over pair count.
6. **Extract additional FA programs from ESPRIT `.esp` (28) where re-postable**, and recover any `.NC` lost in `MCAM X8`/`X2` staging dirs.

### Phase 3 — Make the oracle physically correct (P0 physics)
7. **Thickness-key the feed table.** Make per-pass `feed_mm_min` a function of thickness: interpolate against the existing **11-point FA-Advance curve (5→100 mm)**, anchored so the 4 known programs land on measured feeds at measured thickness. Extend/extrapolate 100→215 mm with the inverse-thickness model (`v ∝ 1/t`), flagged as extrapolated until validated. (Offset cascade is thickness-robust — leave it.)
8. **Add `hardness_hrc?` to `selectECodeFamily`.** Gate a **skim-energy de-rate above ~55 HRC** (lighter final E-code / lower t_on, optional added trim pass). Reuse `EDMBiMaterialCompensationEngine`'s `hardnessFactor = 1 + (hrc−40)×0.005` and its `>55`/`>65 HRC` branches rather than re-deriving.
9. **Add a carbide E-family + carbide recognition path.** A WC blank must not silently get a steel recipe (2.25× MRR error). Tag machinability 0.40 and route to the lighter-power family.
10. **Wire the bi-material engine into the oracle.** Add `zones[]` input to `selectECodeFamily`; on a steel+brazed-WC job, delegate per-zone power to `EDMBiMaterialCompensationEngine` (780 °C braze guard, ×1.4 carbide flush, servo-derived `L_ramp`). Bridge the two surfaces in **one** production engine.
11. **Converge the two selectors (P1-3).** Make `WireEDMDeepAIHardeningEngine` consume the (now thickness/hardness-aware) JM oracle, or formally deprecate one. Eliminate divergence so a fix lands in production.

### Phase 4 — Scale the model + re-prove (after data + physics are sound)
12. **Re-train the 0.5B LoRA on the repaired corpus.** Re-measure gate-pass — but now against **metric-print correctness checks** (does emitted E-code/feed match the physics oracle for the print's thickness+hardness), not just structural shape.
13. **Move to 7B when downloadable.** The 0.5B proved the loop; 7B captures the richer print→program mapping once real prints carry dimensions/tolerances/GD&T. Gate the upgrade on a measurable metric-accuracy lift, not assumed capacity.
14. **Add physics-grounded gate checks.** Every held-out check must vary thickness and/or hardness and assert the emitted recipe tracks the oracle — so future gate-pass certifies *correctness*, not *shape*.

### Phase 5 — Close the loop
15. **Feed shop-floor outcomes back.** Wire-break / recast-thickness / cycle-time per real cut → corrects the feed curve anchors and the hardness de-rate thresholds. This is the only path to a *validated* (not just modeled) 215 mm feed curve.

---

## Bottom line

**Is print→program shop-ready? No — not yet, and the 86.7% gate-pass should not be read as "ready."**

- **What IS proven:** the closed training loop works end-to-end. A 0.5B LoRA converges (loss 0.10) and emits structurally valid FA-10S program text at 86.7% gate-pass. The program *skeleton* (header, thread/flood startup, `E#### H# F.##` pass cascade, `M85 M83 M81 → M21 → M58 → M02` shutdown) is faithfully reproduced from 4 real programs. `wedm-build-strategies.ts` is clean.
- **What is NOT proven (the gap to 100%):**
  1. **Data** — the corpus is a 5-record broken seed: empty print `input` (no dimensions/tolerances/GD&T/finish) and binary `.mcx` `output` (not NC). **Zero true print→runnable-program pairs.** Only **7 runnable FA programs exist on disk**, none in the corpus. The real prints (201 classified / 13,316 verified-page Docustrata docs) are unpaired.
  2. **Physics** — the oracle is constant-output on all three operator-named axes: **THICKNESS ignored** (same feed 1→215 mm, P0-1), **HARDNESS absent** (D2@62HRC == annealed, P0-2), **BI-MATERIAL unwired** (excellent 42 KB engine, zero linkage, P0-3). The thickness curve (11 FA-Advance points, 5→100 mm) and the hardness model both already exist in the codebase — they are simply not connected to the JM oracle.
- **Distance to true 100%:** a **data + physics** program, not a model program. Repair the corpus (Phase 1–2), make the oracle thickness/hardness/bi-material-correct using assets already in the tree (Phase 3), then re-prove with physics-grounded gate checks and scale to 7B (Phase 4–5). The 0.5B loop is the proof-of-mechanism; everything blocking 100% is upstream of the model.

**Headline number to track:** today, **structural** accuracy ~100% / **metric-print** accuracy effectively **0%** on thickness, hardness, and bi-material. Closing that is the whole job.
