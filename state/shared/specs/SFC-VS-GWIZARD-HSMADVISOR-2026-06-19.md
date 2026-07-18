# PRISM SFC vs G-Wizard vs HSMAdvisor — Capability + Validation Comparison

> **Author:** slot:oscar (Speed & Feed Calculator) · **Date:** 2026-06-19 · **Purpose:** launch-readiness
> **Methodology:** every number in §3 is computed **live** from the repo via
> `mcp-server/scripts/sfc-vendor-validation-fair.ts` against the curated published-reference DB in
> `SpeedFeedBaselineComparatorEngine.ts`. Capability claims in §2 are marked `[repo]` (verified in code)
> or `[pub]` (from the vendors' public docs / operator account / general machinist knowledge).
> R12: no claim here is asserted that was not either run or cited.

---

## 0. TL;DR — launch verdict

**PRISM's SFC physics is sound and competitive — but the out-of-box DEFAULT recommendation is
too conservative, and the public "validation harness" was measuring the wrong thing.**

- The headline has TWO halves and only ONE is an artifact: the **"6% in-envelope"** (1/17 all-axis) IS a
  **methodology artifact** -- `sfc-baseline-compare-run.ts` requires Vc AND fz AND MRR all within +/-15%
  simultaneously, pins PRISM to its `balanced` goal on a default **g6_3 holder (12,000-RPM cap)**, and
  compares that against published numbers that are **aggressive / max-MRR data on balanced holders + HSM
  spindles**. The **"33% mean Vc deviation," however, is REAL** -- it is the default-goal Vc gap and reflects
  a genuine product-default-conservatism issue (gap #3 below), not an artifact.
- Compared at the **best of {customer-default} U {3 goals on an unclamped reference machine}**, PRISM agrees
  with the published vendor data on **12/17 cells within +/-15% Vc (mean dev 13.5%)** and **brackets the
  catalog number within its recommendation range on 12/17 (71%)**. The core carbide-milling-roughing cases
  are excellent: 1018 steel **-7%**, 304SS **+14%**, **6061 aluminum -3%**, CBN hard-turn **+1%**, Inconel **+6%**.
- **Gaps before "works perfectly" (physics-reviewer adjudicated):** (1) P-group steel milling Vc ceiling
  ~14-19% below coated-carbide catalogs — CONFIRMED, physics-approved fix `[90,140,185]→[100,160,220]`, safe;
  (2) HSS-on-steel was a FALSE ALARM (correctly calibrated; the real HSS over-speed was cast iron, already
  fixed); (3) the default product goal under-shoots — the customer's out-of-box number is conservative (the
  #1 lever; operator product decision).
- **Structural reality (verified):** a fully-automated "every input" numeric comparison to G-Wizard /
  HSMAdvisor is **impossible** — neither app persists computed speeds/feeds (see §4). The only automatable
  vendor reference is published tables (~17 curated cells today, OCR-expandable to ~192+).

**Net: not "broken," but not yet "launch-perfect."** The fixes are calibration + product-default + harness
methodology, not a physics rewrite.

---

## 1. What each product is

| | **PRISM SFC** | **G-Wizard (CNCCookbook)** | **HSMAdvisor (eMastercam)** |
|---|---|---|---|
| Model basis | Physics-first: Kienzle force, Taylor tool life, Merchant, Altintas SLD chatter, Weibull life `[repo]` | Empirical material DB + tortoise-hair/HSM heuristics `[pub]` | Force/torque/deflection model + adaptive chip-thinning `[pub]` |
| Delivery | MCP dispatcher + engines + (coming) web/phone app `[repo]` | Closed desktop/web UI, subscription `[pub]` | Desktop app, perpetual + cloud `[pub]` |
| Persists S&F numbers? | Yes — full result object + outcome ledger `[repo]` | **No** — computed on-demand in UI only `[repo, verified]` | **No** — tool/pref library only, zero S&F fields `[repo, verified]` |

---

## 2. Capability matrix

Legend: ✓ full · ~ partial · — none. Source tag per PRISM row.

| Capability | PRISM SFC | G-Wizard | HSMAdvisor | Source |
|---|:---:|:---:|:---:|---|
| ISO P/M/K/N/S/H material groups | ✓ | ✓ | ✓ | `[repo]` base tables P/M/K/N/S/H |
| Tool materials: carbide / HSS / ceramic / CBN / PCD | ✓ | ✓ | ~ | `[repo]` toolMatFactor live |
| Operations: mill / turn / drill / thread / tap | ✓ | ✓ | ~ (mill-led) | `[repo]` BASE_PARAMS per op |
| Multi-goal (cost / balanced / productivity / tool-life) | ✓ | ~ (tortoise-hare) | ~ (rough/finish) | `[repo]` `optimize_for`/Gilbert |
| Cutting-force / power / torque | ✓ Kienzle | ~ | ✓ | `[repo]` |
| Tool deflection | ✓ | ✓ | ✓ | `[repo]` deflection engines |
| Chatter / stability-lobe (SLD) | ✓ Altintas | ~ | ✓ | `[repo]` ChatterStabilityLobe |
| Tool-life prediction (Weibull / Taylor) | ✓ | ~ | ~ | `[repo]` StochasticToolLife |
| Surface-finish (Ra) prediction | ✓ | ~ | ~ | `[repo]` SurfaceFinishPredictor |
| Holder-balance / RPM-safety derate (ISO 1940 G-class) | ✓ | — | ~ | `[repo]` BALANCE_CLASS_MAX_RPM |
| Coolant model (flood / mist / through-tool / dry / cryo) | ✓ | ~ | ~ | `[repo]` coolantFactor live |
| Machine-rigidity axis | ✓ | — | ~ | `[repo]` rigidity low/med/high |
| Confidence interval / uncertainty on output | ✓ | — | — | `[repo]` UncertaintyCI / Monte-Carlo (GUM-cited) |
| Closed-loop learning from shop outcomes | ~ | — | — | `[repo]` outcome-capture bridge WIRED; not yet demonstrated folding live JM actuals back into calibration |
| Export catalog INTO the other apps | ✓ (41,209 tools) | n/a | n/a | `[repo]` exporter engines |
| Large purchased-tool crib | ~ (JM corpus) | ✓ (huge) | ✓ (huge) | `[pub]` |
| Mature polished GUI | building | ✓ | ✓ | `[pub]` |
| Offline desktop app | — (server/app) | ~ | ✓ | `[pub]` |

**Honest read:** PRISM's *physics breadth* (chatter SLD, Weibull life, holder-balance safety, CI, closed-loop,
multi-process) **exceeds** both commercial tools. Where PRISM trails is **GUI maturity, the size of the
purchased-tool crib, and validated default calibration** — exactly the launch gaps.

---

## 3. Validation — PRISM vs published vendor data (live numbers)

Runner: `mcp-server/scripts/sfc-vendor-validation-fair.ts` over the 17 cells returned by
`listBaselines()` (Sandvik / Kennametal / CNCCookbook / HSMAdvisor-public / Titans-of-CNC / NTK / Iscar /
Tungaloy). Verified live: **17 entries, 17 scored, 0 unmatched**.

| Metric | Result |
|---|---|
| **Default goal** (what the customer sees out-of-box), Vc within +/-15% | **4/17 (24%)**, mean dev **32.8%** |
| **Best of {default} U {3 goals, reference machine}** (fidelity ceiling), Vc within +/-15% | **12/17 (71%)**, mean dev **13.5%** |
| **Catalog Vc contained in PRISM's full Vc range** | **12/17 (71%)** |

> Notes: (a) the older `sfc-baseline-compare-run.ts` reports **1/17** because its `in_envelope` requires **all
> three axes** (Vc, fz, MRR) simultaneously within +/-15%; the table above is **Vc-only** to isolate the speed
> axis. (b) "best" is the min |deviation| over the customer-default AND the three goals run on an unclamped
> reference machine -- so turning cells that already match at default (CBN, Inconel) are credited at their
> default, not penalized by a forced HSM-spindle goal. (c) "contained" using min/max of a wide mode spread is
> the LOOSEST of the three metrics -- read it as a bracket check, not a fidelity claim.

Representative cells (core carbide-milling-roughing — PRISM's bread-and-butter use case):

| Material | pub Vc | PRISM default | best (any goal/cond) |
|---|---|---|---|
| AISI 1018 (P) 12mm | 220 | 140 (-36%) | **204 (-7%)** |
| AISI 304 SS (M) 12mm | 135 | 100 (-26%) | **154 (+14%)** |
| 6061-T6 Al (N) 10mm | 775 | 365 (-53%) | **754 (-3%)** |
| Ti-6Al-4V (S) 10mm | 55 | 46 (-16%) | **51 (-8%)** |
| CBN hard-turn 60HRC | 180 | 182 (+1%) | 182 (+1%) |
| Inconel SiAlON finish | 400 | 423 (+6%) | 423 (+6%) |

**Why default differs so much from best-matched:** the aluminum case is the clearest proof — at the default
**g6_3 holder (~11,600-RPM cap)** a 10mm tool computes Vc=365; with a **g2_5 balanced holder on a 24k
spindle**, PRISM computes **754 m/min vs catalog 775 (-3%)**. The "-53%" was a **holder-balance + spindle-RPM
constraint that is physically correct** — the catalog number simply assumes better tooling. PRISM was right;
the comparison didn't specify the conditions the catalog assumed.

### The genuine gaps (physics-reviewer adjudicated 2026-06-19)
1. **P-group steel milling Vc ceiling — CONFIRMED under-calibrated (aggressive index only).** Even at
   productivity + HSM spindle, 1018 tops at ~204 vs catalog 220; `P_milling_roughing.vc[aggressive]=185` is
   ~14-19% below the modern coated-carbide catalog median (Sandvik 230 / Kennametal 215 / MH31 ~215). It also
   **disagrees with the engine's OWN** `CANONICAL_MILLING_SPEEDS.P.rough=200` + `taylor_C(1018)=360`.
   **Physics-approved fix:** `P_milling_roughing.vc [90,140,185] → [100,160,220]`. **SAFE direction** — Kienzle
   `Fc` is Vc-independent so workholding/deflection clamps are unchanged; tool-life halving (`1.19^4≈2x`) is the
   intended aggressive trade; the +19% spindle power is bounded by the existing RPM/S(x) clamps. CAVEAT: verify
   the +19% power against the lowest-power JM machine before defaulting productivity mode to it.
2. **HSS calibration — FALSE ALARM for steel (no change needed).** Physics-reviewer verdict: PRISM's HSS-in-1018
   (0.35 ratio → ~35-54 m/min) is **correctly calibrated to modern HSS-Co data**; the 24 m/min reference is the
   old plain-HSS floor, not the right anchor. The real prior HSS over-speed was **cast iron (K-group)**, ALREADY
   fixed by the `hss:{K:0.13}` override. Only second-order: if gap #1 raises the P base, HSS-aggressive inherits
   it (~85) — optional `hss:{P:0.30}` override caps it. The "+45%" in earlier drafts was the wrong-baseline trap.
3. **Product default is conservative (the #1 launch lever)** — the customer's out-of-box goal under-shoots
   catalog-aggressive references (24% in-envelope). Decide the launch default (balanced vs a "shop-recommended"
   that sits ~80% toward productivity). Operator product decision.

---

## 4. The structural vendor-data reality (verified, R12)

A fully-automated, numeric "every input" comparison to G-Wizard / HSMAdvisor is **structurally impossible**:

- **G-Wizard** `toolcrib.csv` (`%APPDATA%/GWizard*/Local Store/`) = 41,210 rows, **all `sfm=ipt=0`** — geometry
  only; speeds/feeds are computed on-demand in the closed UI and **never persisted**. `[repo, verified commit 16e010cada]`
- **HSMAdvisor** `%APPDATA%/HSMAdvisor/*.xml` = tool definitions + preferences only, **zero sfm/ipt/chipload
  fields**. `[repo, verified]`
- => The only automatable vendor reference is **published tables** (~17 curated cells today; OCR-expandable to
  ~192+ via the Kennametal/Sandvik public catalogs). For every other input the comparison is `prism_only`.

PRISM already exports its 41,209-tool catalog + 12 machines **into** both apps (exporter engines from CATALOG-APP-WIRING / U-GWIZARD-TOOLCRIB-EXPORT + U-HSMADVISOR-SETTINGS-EXPORT; exact dispatcher action names not re-verified here)
so their on-demand calcs align with PRISM's geometry — but their *output numbers* cannot be read back programmatically.

**Implication for launch:** the credible competitive claim is **capability + physics-fidelity-vs-published-data**,
not "we match their every number" (their numbers aren't accessible, and aren't ground truth anyway).

---

## 5. Recommendations (launch-ordered)

1. **Fix the validation harness** (P0, methodology): tag each `BASELINE_DB` cell with a `reference_regime`
   (`conservative|balanced|aggressive`) and have `compare()` run PRISM at the **matching** goal per cell, on an
   unclamped reference machine. Today's harness pins balanced+g6_3 and silently drops `optimize_for`, producing
   the misleading 6%. (Engine change → own unit, physics-reviewer + 3-of-3.)
2. **Decide + set the launch default goal** (P0, product): the out-of-box recommendation should land near
   "shop-aggressive" so customers see numbers competitive with their catalogs, with explicit conservative/
   aggressive toggles. 24% → target >70% default in-envelope just by choosing the right default.
3. **Raise the P-group steel milling Vc ceiling** (P1, physics — APPROVED 2026-06-19): apply
   `P_milling_roughing.vc [90,140,185] → [100,160,220]` (Sandvik 230 / Kennametal 215 / MH31 ~215; also
   reconciles the engine's own `CANONICAL_MILLING_SPEEDS.P.rough=200`). Direction safe (Kienzle Fc Vc-independent;
   +19% power bounded by RPM/S(x) clamps). Verify +19% power vs the lowest-power JM machine, then ship. Optional
   `hss:{P:0.30}` override so HSS-aggressive doesn't inherit the higher base.
4. **HSS calibration: NO ACTION (physics-reviewer cleared it)** — HSS-on-steel (0.35 ratio) is correctly
   calibrated to modern HSS-Co; the real HSS over-speed (cast iron / K-group) is already fixed by `hss:{K:0.13}`.
5. **Expand published-reference coverage** (P2): Blackwell vision-OCR the Kennametal 271MB / 2032pp catalog →
   ~192+ reference cells → statistically meaningful validation across the full ISO x diameter x op space.
6. **Frontend** (next): the web/phone SFC UI should surface the [cost..productivity] **range** + the holder/
   spindle assumptions (so users understand the aluminum-RPM-cap effect), the confidence interval, and a
   one-click "compare to my catalog" using the published-reference table.

---

## 6. Frontend launch-readiness — oscar findings for quebec (R12, repo-verified)

The SFC physics is sound, but the **customer-facing contract does not expose the controls/context that make
it correct** -- a customer would hit exactly the conservatism + aluminum-confusion this report root-caused.

**6a. Triple-surface fragmentation (pick ONE canonical for launch):**
- `web/src/pages/CalculatorPage.tsx` (12,909 LOC monolith, web/CLAUDE.md calls it "main speed/feed calculator")
- `web/src/pages/SfcCalculatorPage.tsx` -> route `/speed-feed-calc` -> REST `/api/v1/sfc` (`createSfcRouter`)
- `web/src/pages/SpeedFeedPage.tsx` -> route `/speed-feed` -> REST `/api/v1/speed-feed` (`createSpeedFeedRouter`)

Three SFC surfaces + two backend routers = inconsistent results + maintenance hazard. Launch needs ONE.

**6b. The `SfcCalculateRequest`/`Result` contract omits the decisive fields (`web/src/types/sfc.ts:2-22`):**
- **Request has NO `optimize_for`** -> the customer cannot choose cost/balanced/productivity; they are pinned
  to the conservative default -- the exact reason the out-of-box number reads ~33% under catalog (gap #3).
- **Request has NO `machine_max_rpm` / `holder_balance_class`** -> high-Vc materials are silently RPM-capped
  (aluminum 365 not 754) with no way to declare an HSM spindle / balanced holder.
- **Result exposes only `cutting_speed/feed_per_tooth/spindle_speed/feed_rate` (+ safety/meta)** -- NO
  confidence interval, NO [cost..productivity] range, NO surfaced holder/spindle assumption. The customer
  sees a bare number with zero context for WHY (the same apples-to-oranges trap that fooled the validation).

**6c. Recommended contract extension (the frontend half of "works perfectly"):**
- Request: add `optimize_for` (goal selector), `machine_max_rpm`, `holder_balance_class` (+ `operator_has_balancer`).
- Result: add `ci_95 {low,high}`, `goal_range {cost,balanced,productivity}`, `applied_rpm_cap` + a one-line
  `assumption_note` (e.g. "RPM-limited to 11,600 by g6_3 holder; raise holder balance for higher Vc").
- UI: goal toggle (default to "shop-recommended" ~80% productivity per gap #3), machine/holder inputs, and
  render the range + CI + assumption note so the number is self-explaining.

This is a vertical-slice unit for quebec (frontend owner) + oscar (engine): types -> api -> REST router ->
dispatcher passthrough -> page. Engine already computes all of it; only the contract + UI surface is missing.

## Appendix — reproduce
```
cd mcp-server && npx tsx scripts/sfc-vendor-validation-fair.ts   # the §3 numbers
cd mcp-server && npx tsx scripts/sfc-baseline-compare-run.ts     # the legacy all-axis 1/17 view
```
Engines: `SpeedFeedBaselineComparatorEngine.ts` (published baselines), `UltimateSpeedFeedEngine.ts`
(`BASE_PARAMS` tables L737+), `SpeedFeedNineAxisOrchestratorEngine.ts` (mode→goal, holder-balance RPM cap).
Memories: [[reference_oscar_sfc_full_assessment_2026_06_15]] · [[reference_gwizard_abstains_on_generic_combos_2026_06_04]] · [[reference_oscar_quad_lane_comparator_2026_06_02]].
