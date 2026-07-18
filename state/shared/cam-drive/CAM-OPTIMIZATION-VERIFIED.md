# CAM Optimization — VERIFIED Knowledge Base (adversarial-cleared)

**Owner:** kilo · **Date:** 2026-06-01 · **Unit:** U-CAM-OPT-VERIFIED
**Scope:** JM = 100% Okuma OSP lathes, INCH (G20 convention), shop_floor safety gate Ω≥0.95, S(x)≥0.98.
**Inputs synthesized:** 8 per-family adversarial verdicts against `CAM-OPTIMIZATION-RULES.json` (the machine-consumable rules the resolver executes), cross-checked vs `CAM-OP-TEMPLATE-MATRIX.json` (Fusion templates), `CAM-CORPUS-PROFILE.md` (observed JM practice), `CAM-OPTIMAL-REFERENCE-FINDINGS.md` (PRISM_UPGRADED physics-optimal + the R12 single-material finding), `mcp-server/src/physics/constants.ts` (kc1.1 P=1800/M=2100/K=1100/N=700/S=2800/H=3200; CANONICAL_TURNING_SPEEDS).
**Consumer:** `cam-turning-recipe-resolver.applyOptimizationRules(recipe, rules) → recipe.optimization_plan[]`. `material_dependent` rules emit `pending` when `inputs.material_iso_group` is absent — no silent default (verified clean across all 8 families).

**Fleet verdict:** 2 PASS (OD_finishing, parting_cutoff) · 6 FAIL (facing, OD_roughing, ID_boring, drilling_centering, grooving, threading) — **2 P0, 16 P1**. All FAILs are *completeness* gaps (missing guards / missing rules / one false rationale string), NOT physics errors in the moves that exist. SFM/feed/DOC guidance is physically correct per ISO group everywhere; no physics constant is inlined in any rule (all cutting numbers `physics_delegate:true` or tagged historical/observed).

---

## (1) PER-FAMILY VERIFIED TABLE

| Family | Verdict | Verified optimization move(s) | Safety guards (verified present / **REQUIRED add**) | Key edge case |
|---|---|---|---|---|
| **facing** | **FAIL** (2×P1) | `face-sfm`: SFM from physics for {ISO,grade,facing}, material-dependent (no inline number) ✅ · `face-passes`: single rough + single finish, rough-pass count from true stock (kills 2-3 air passes) ✅ | G50 max-rpm cap under G96 ✅ · **ADD** rigidity/L-D + interrupted-cut derate on `face-passes` deeper-DOC move | Face always reaches **dia=0** → below `min_diameter_for_css` G50 clamps and effective SFM **collapses toward zero at centerline** — the dominant case, not an edge. `face-css` rationale ("speed holds to center") is physically false there. |
| **OD_roughing** | **FAIL** (1×P0, 3×P1) | `odr-air`: stock-aware Fusion roughing computes pass count (observed 3 G1 at same Z, only pass 1 cuts, 15-30s/part) ✅ · `odr-sfm`: physics SFM per ISO, do-NOT-blanket-raise, H~180 / P 600-1000+ ✅ · `odr-doc`: deeper radial DOC toward physics-optimal → fewer passes ✅ (move sound; target number must drop) | torque/power envelope + insert max DOC on `odr-doc` ✅ · **ADD (P0)** L/D radial-deflection gate on `odr-doc` · **ADD** stock-model-trust on `odr-air`, interrupted/ISO-S derate on `odr-sfm` | Slender OD shaft: deflection δ=FL³/3EI / chatter / taper is the **binding constraint**, trips long before spindle torque. Deep DOC greenlit by a torque-only guard fractures tolerance. |
| **OD_finishing** | **PASS** (2×P1 deferrable) | `odf-feed`: finish feed from Ra via **Ra=f²/(8·nose_R)** (Brammertz cusp, geometric, material-independent) ✅ · `odf-sfm`: physics SFM per ISO+grade ✅ · `odf-g50`: G50 cap at true safe-max, not defensive habit ✅ | G50 cap still mandatory under G96 ✅ · **ADD (P1)** min-chip-load floor on `odf-feed`, high-L/D derate on `odf-sfm` | Fine finish (Ra≤8µin → f≈0.0028 in/rev) can fall **below insert min chip load** → rubbing/heat/work-hardening. Floor lives only in matrix, not in the consumed rule object. |
| **ID_boring** | **FAIL** (3×P1) | `idb-sfm`: raise SFM off observed 50-75 toward physics-optimal per ISO, **derated by bar deflection** ✅ · `idb-css`: G96 where bore dia varies ✅ · `idb-bar`: shortest bar that reaches depth (min L/D) ✅ | **L/D ≤ 4 steel / ≤ 6 carbide** on `idb-sfm` ✅ (only family that correctly carries it) · **ADD** G50 small-bore over-speed wording on `idb-css`; **ADD** `idb-peck` deep-bore rule; **ADD** `idb-finish-feed` Ra-bounded rule | Blind deep bore at raised feed re-cuts packed chips → **bar snap** (no peck rule). Finish bar feed is Ra-bounded not time-bounded — raising it burns the bore tolerance. |
| **drilling_centering** | **FAIL** (1×P1, 1×P2) | `drl-rpm`: scale rpm **with** dia, rpm=SFM·12/(π·dia) (observed 0.14in & 0.375in run near-identical, 10-25% waste) ✅ · `drl-peck`: peck depth ∝ dia + chip-breaking, not fixed 0.15in ✅ | `drl-peck` peck mandatory L/D>~3 ✅ · drilling correctly stays **G97** (no CSS-on-axial violation) ✅ · **ADD (P1)** max-rpm cap on `drl-rpm` | rpm=SFM·12/(π·dia) **explodes as dia→0** (0.062in drill ≈ 6160 rpm at 100 SFM → snap). Geometric — fires even *after* material resolved, so the `pending` safeguard does NOT cover it. |
| **grooving** | **FAIL** (2×P0, 3×P1) | `grv-g75` **[SUPERSEDED 2026-06-01 → `grv-peck-shift`: G74 peck-and-shift / G81-G82 LAP; the 16,558-program corpus showed G75 is ABSENT in Okuma OSP — this row's "G75 auto-depth" was Fanuc contamination, see U-CAM-CORPUS-DEEP-STRUCTURE]**: ~~Okuma G75 auto-depth cycle~~ vs manual multi-pass (observed 1 file = 41 hand-coded blocks; 5-10× less code) ✅ · `grv-sfm`: raise off observed ~70 per physics — **direction right only after a derate is added** | `grv-g75` depth>3× insert-width → peck ✅ · **ADD (P0)** groove-derate Vc + upper-bound guard; **ADD (P0)** insert_width driver + `grv-feed`; **ADD** G50/G96 + L/D + interrupted-cut guards | Grooving insert engages **full width** (h=f, no lead angle, closed-slot chip evac, narrow weak blade) → safe Vc sits **20-30% below OD-turn Vc**. ISO-H/S ceiling is low; uncapped "raise" = fast fracture. |
| **parting_cutoff** | **PASS** (1×P1 deferrable) | `prt-g50`: trim defensive double-limit (observed G96 S250 + redundant G50 S600) to true safe-max, reclaims 15-25% spindle ✅ · `prt-taper`: feed taper to center for burr control ✅ · `prt-peck`: peck deep cutoff + reduce air rapids (30-50% of a 0.2in cutoff is positioning) ✅ | `prt-g50` G50 cap MANDATORY (CSS spikes rpm as dia→0) ✅ · `prt-peck` depth>3× blade width → peck ✅ · **ADD (P1)** part-support gate on `prt-peck` rapid-reduction | Unsupported thin/long-overhang sever: retract clearance + conservative aggression prevent **stub-grab/whip/launch**; `prt-peck` "reduce air rapids" is unguarded against `part_support_present`. |
| **threading** | **FAIL** (1×P0, 3×P1) | `thr-doc`: decreasing-DOC infeed (constant chip area), adapt by pitch (observed fixed 0.003in wastes coarse / chatters fine) ✅ · `thr-rpm`: pitch/dia-aware rpm or G96 (observed constant 250-300 → SFM swings 25-123) ✅ | `thr-rpm` spindle-sync feed=pitch (not overridable) ✅ · `thr-doc` multi-pass, no full-depth single pass ✅ · **ADD (P0) G50 cap under G96 on `thr-rpm`**; **ADD** hard-material derate + fine-pitch min-chip-load floor on `thr-doc`; **ADD** ID-thread L/D guard | ID / decreasing-pitch-dia thread under G96 spikes rpm as effective dia→0 on a **spindle-synced pass** → guaranteed over-speed/crash/scrapped thread. Worst G96 case; the one rule that offers G96 omits the G50 cap all siblings carry. |

---

## (2) CORRECTION PUNCH-LIST — every P0/P1 in CAM-OPTIMIZATION-RULES.json

> Format: **rule id (severity)** → issue → exact fix. New rules give the full JSON object to insert into the family's `rules[]`. Cutting numbers stay physics-delegated (`physics_delegate:true`); derates route to `speed_feed` / whiskey `lathe_safety_predicate_evaluate` so no constant is inlined.

### P0 (2) — safety-invariant / binding-constraint, must fix before resolver trusts these families

1. **`thr-rpm` (P0 — G50-under-G96 invariant omission)** — move offers "or G96 CSS" but `guard` is only `"spindle-sync feed = pitch (not overridable)"`; it omits the G50 max-rpm cap that the global invariant and every other G96 rule (`face-css`, `odf-g50`, `idb-css`, `prt-g50`) carry. ID / decreasing-pitch-dia threading under CSS spikes rpm as effective dia→0 on a synchronized pass → overspeed/crash.
   **Fix:** set
   `"guard": "spindle-sync feed = pitch (not overridable); G50 max-rpm cap MANDATORY whenever G96 selected — ID/decreasing-pitch-dia spikes rpm as dia -> 0"`.
   Also mirror the G50 cap into matrix `threading.safety_gates` (currently also missing it).

2. **`odr-doc` (P0 — missing L/D radial-deflection gate)** — deepening DOC toward physics-optimal is gated only on `"torque/power within machine envelope; respect insert max DOC"`, but for slender OD shafts the binding constraint is radial deflection (δ=FL³/3EI → chatter/taper), per profile §4 and the ID_boring sibling. Rule greenlights a deep DOC that fractures tolerance / chatters on high-L/D parts.
   **Fix:** set
   `"guard": "torque/power within machine envelope (prism_safety); respect insert max DOC; L/D radial-deflection gate (whiskey lathe_safety_predicate_evaluate) — cap DOC / escalate on slender OD, deflection governs not MRR"`.

3. **`grv-sfm` (P0 — no groove-derate, no upper bound)** — "raise SFM off observed ~70 per physics where groove dia + rigidity allow" carries no ceiling and no grooving derate; on ISO-H (kc1.1=3200) and ISO-S (kc1.1=2800) this reads as license to climb toward the OD-turn envelope. Grooving Vc must sit **20-30% below** OD-turn Vc (full insert-width engagement, h=f, closed-slot chip evac, narrow blade) → over-speed on a narrow insert = fast fracture.
   **Fix:** add a derate driver + guard and delegate the derate to physics with `op="grooving"`:
   `"groove_derate": "Vc_groove = 0.70-0.80 * Vc_turn(ISO,grade) — computed by speed_feed op='grooving', not inlined"`,
   `"guard": "do NOT exceed material Vc envelope after groove-derate; ISO-H/S ceiling is LOW; direction is 'off floor toward derated optimum', never toward OD-turn SFM; below insert min chip load -> rubbing/heat"`.

4. **`grv-sfm` (P0 — driver omits `insert_width`)** — Vc/feed for grooving is governed by insert width + full-width engagement, not just `groove dia + rigidity`. (Companion: feed is in/REV light and width-driven — a units-first / IPR-vs-IPM concern.)
   **Fix:** change the SFM driver to `{ISO group, grade, "grooving", groove_dia, insert_width}` and add the missing `grv-feed` rule (see P1 grooving below — feed is the dominant fracture lever on a narrow blade).

   *(Items 3 and 4 are both on `grv-sfm` and are jointly the grooving P0; counted as the 2nd P0 family.)*

### P1 (16)

**facing**
- **`face-css` (P1 — false rationale near center)** → "G96 CSS so cutting speed holds as the tool approaches center" is physically wrong below `min_diameter_for_css`: once G50 clamps, effective SFM **drops toward zero at the centerline** — the opposite of the claim, and facing always reaches dia=0. Safety (G50 guard) is fine; the *rationale* oversells. **Fix:** restate move →
  `"move": "use G96 CSS for the bulk of the face; below min_diameter_for_css the G50 clamp holds capped rpm and effective SFM falls — accept reduced finish near center OR drop to G97 / feed-taper in the center region"`. Keep the existing `"guard": "G50 max-rpm cap mandatory under G96"`.
- **`face-passes` (P1 — no rigidity / interrupted-cut guard)** → deeper rough DOC (toward ~0.059 in) on a thin/long/low-rigidity or interrupted (cross-hole/non-round) face causes deflection/chatter/edge-chipping and destroys the Z-datum flatness facing exists to set. No guard (unlike `odr-doc`). **Fix:** add
  `"guard": "derate DOC + feed on low-rigidity/thin/high-L-D or interrupted face; escalate whiskey lathe_safety_predicate_evaluate; respect insert max DOC + torque/power envelope (prism_safety)"`.

**OD_roughing**
- **`odr-doc` (P1 — hardcoded ~1.5mm target)** → "optimal ~1.5mm (0.059in)" is sourced from the PRISM_UPGRADED **single-material ISO-H finishing-geometry** run and stated as the roughing target; it is not a validated per-ISO roughing DOC and contradicts the matrix `variable_params` note (`0.060-0.100in where rigidity allows`). **Fix:** drop the number from the move →
  `"move": "increase radial DOC toward physics-optimal per {ISO,grade,rigidity,L/D} (source speed_feed) -> fewer passes"` (keep it directional so the number stays physics-delegated and isn't read as a constant).
- **`odr-air` (P1 — no stock-model-trust precondition)** → "let Fusion stock-aware roughing compute pass count from the stock model" has no guard; on cast/forged/irregular stock a wrong model plunges full-DOC into uncut stock (profile §4). **Fix:** add
  `"guard": "stock model verified (turned-bar default OK; cast/forged/irregular stock must confirm true stock envelope before trusting auto pass count)"`.
- **`odr-sfm` (P1 — no interrupted / ISO-S derate)** → correctly pends on absent ISO, but omits the interrupted-cut / ISO-S derate profile §4 calls out (interrupted OD or Ti/Inconel → derate SFM + tougher grade + lighter feed). **Fix:** add
  `"guard": "interrupted cut (cross-hole/flat/spline) or ISO-S -> derate SFM, do not apply smooth-OD envelope"`.

**OD_finishing** *(deferrable — resolver still calls physics+safety surfaces; Ω≥0.95/S(x)≥0.98 catches an unsafe finish op at validate_physics)*
- **`odf-feed` (P1 — no min-chip-load floor in the consumed object)** → Ra=f²/(8R) for Ra≤8µin → f≈0.0028 in/rev can fall below insert minimum chip load → rubbing/heat/work-hardening/worse finish. Floor exists only in matrix `safety_gates`, not the rule object. **Fix:** add
  `"guard": "finish feed >= insert min-chip-load; if Ra-derived f < min-chip-load, switch to larger nose R / wiper insert, do not lower feed"`.
- **`odf-sfm` (P1 — no slender-part deflection guard)** → on a long/thin OD a physics-optimal SFM raise (esp. ISO-P 600-1000+) + light finish feed lengthens time under deflection → chatter/taper. **Fix:** add
  `"guard": "high L/D (slender shaft) -> derate SFM + support (steady/follower rest); escalate whiskey lathe_safety_predicate_evaluate before raising"`.

**ID_boring**
- **`idb-css` (P1 — small-bore over-speed wording)** → guard `"G50 cap if G96"` omits the small-bore failure mode (CSS spikes rpm as bore dia→small). **Fix:** →
  `"guard": "G50 max-rpm cap MANDATORY under G96; small-bore dia drives rpm up — below min-dia hold capped rpm, do not chase CSS"`.
- **ID_boring family (P1 — missing deep-bore peck rule)** → every other deep-cut family carries a peck invariant (`drl-peck`, `grv-g75`, `prt-peck`); ID_boring has none, yet a blind deep bore at raised feed re-cuts packed chips → bar snap. **Fix:** add rule:
  ```json
  { "id": "idb-peck", "axis": "peck", "move": "peck/retract on deep blind bore for chip evacuation; no single deep G1 plunge at raised feed", "roi": "safety", "physics_delegate": false, "material_dependent": false, "guard": "depth > ~3x bore dia OR blind bore -> peck mandatory" }
  ```
- **`idb-sfm` (P1 — finish-feed safety hole)** → "raise SFM ... derated by bar deflection" has no carve-out for the finish bar, where feed is Ra-bounded (Ra≈f²/(8·nose_R)) not time-bounded; raising it burns the bore tolerance. **Fix:** scope `idb-sfm` to rough/semi-finish and add rule:
  ```json
  { "id": "idb-finish-feed", "axis": "feed", "move": "finish-bar feed from required Ra via Ra=f^2/(8*nose_R), never raised for time; keep above insert min-chip-load to avoid rubbing", "roi": "accuracy", "physics_delegate": true, "material_dependent": false }
  ```

**drilling_centering**
- **`drl-rpm` (P1 — no max-rpm cap)** → rpm=SFM·12/(π·dia) explodes as dia→0; small drills (0.062in ≈ 6160 rpm at 100 SFM) snap. Geometric — fires even *after* material is resolved, so the `pending`-on-missing-material safeguard does NOT cover it. Lone speed-scaling rule with `guard` absent (siblings `prt-g50`/`idb-sfm`/`idb-css`/`face-css` all carry one; matrix line 188 carries "no over-speed on small drills (snap)"). **Fix:** add
  `"guard": "rpm <= min(spindle_max, drill_mfr_max_rpm); small drills are torque/runout-limited — cap, never SFM-scale uncapped"`.

**grooving** *(beyond the P0 derate/driver above)*
- **grooving family (P1 — 3 dropped rules present in the matrix `variable_params`)** → `feed_per_rev` (insert_width + material, light), `width_passes` (groove_width / insert_width step-over), `finish_pass` (side+bottom for tight seal/snap-ring tolerance). **Fix:** add:
  ```json
  { "id": "grv-feed", "axis": "feed", "move": "groove feed in/REV (G95) light, driven by insert_width + material — source speed_feed op='grooving'", "roi": "accuracy", "physics_delegate": true, "material_dependent": true, "guard": "below insert min chip load -> rub; in/REV not in/min (units-first)" },
  { "id": "grv-width-step", "axis": "passes", "move": "width_passes = groove_width / insert_width plunge step-over for wide grooves", "roi": "time", "physics_delegate": false, "material_dependent": false },
  { "id": "grv-finish", "axis": "passes", "move": "side+bottom finish pass when groove-width/Ra tolerance tight — single roughing plunge won't hold", "roi": "accuracy", "physics_delegate": false, "material_dependent": false }
  ```
- **grooving family (P1 — missing G50/G96 + L/D + interrupted-cut guards)** → `grv-g75` carries only the peck guard; face-groove under G96 (swept-dia CSS over-speed) and slender/high-L:D radial-plunge deflection are unguarded (parting_cutoff carries the G50 guard — inconsistent). **Fix:** add to the grooving rules:
  `"guard": "G50 max-rpm cap MANDATORY if face-groove uses G96 (swept-dia CSS over-speed)"`,
  `"guard": "L/D deflection gate on slender/long-overhang -> whiskey lathe_safety_predicate_evaluate; derate feed/SFM, do NOT deepen peck"`,
  `"guard": "interrupted cut (keyway/cross-hole/flat) -> reduce SFM+feed, never raise"`. Assert grooving rules apply only to op family `grooving`; route part-off to `parting_cutoff` (`prt-taper`).

**parting_cutoff** *(deferrable)*
- **`prt-peck` (P1 — unguarded rapid-reduction on unsupported sever)** → "reduce air-cut retract rapids" has no tie to part-support state; on an unsupported thin/long/high-L-D-overhang sever the retract clearance + conservative aggression prevent stub-grab/whip/launch. **Fix:** add
  `"guard": "gate rapid-reduction + aggression on part_support_present (part-catcher/sub-spindle/tailstock); on unsupported overhang keep full retract clearance and reduce feed near center (matrix safety_gates 'support/part-catcher for sever')"`.

**threading** *(beyond the P0 G50 above)*
- **`thr-doc` (P1 — no hard-material derate)** → `material_dependent:false` is fine for the schedule *shape* (geometry/pitch), but per-pass infeed *magnitude* is force-bounded; for ISO-H/hardened (kc1.1=3200, canonical turning SFM only 80/130) aggressive infeed cracks the carbide crest. **Fix:** add
  `"guard": "first-pass/per-pass infeed force-bounded by ISO group via prism_safety torque/force check (derate ISO-H/S — high kc1.1); never raise infeed on interrupted/hard cut"` (force is delegated, no inline constant).
- **`thr-doc` (P1 — no fine-pitch min-chip-load floor)** → decreasing-DOC to constant chip area, unfloored, drives final passes below insert edge-radius min chip load on fine pitch (≥20 TPI) → rubbing/work-harden/edge wear. **Fix:** add
  `"guard": "floor final DOC >= insert min chip-load (edge radius); single intentional spring pass only — do not shrink last passes to ~0"`.
- **`thr-rpm` / `thr-doc` (P1 — ID-thread L/D guard absent)** → matrix `threading.applies_when` covers ID single-point thread (boring-bar-class tool), but neither rule carries the L/D ≤4 steel / ≤6 carbide gate that `idb-sfm` and the global invariant mandate. ID thread + raised SFM/infeed → bar deflection → pitch/dia taper, chatter. **Fix:** add to both:
  `"guard": "ID thread: boring-bar L/D <= 4 steel / <= 6 carbide -> derate or escalate whiskey lathe_safety_predicate_evaluate"`.

### P2 (deferrable, not blocking)
- **`drl-peck` (P2)** → `material_dependent:false` understates chip-breaking material coupling (gummy 304SS / aluminum vs cast iron need different peck retracts at identical dia/depth). Defensible as a depth-geometry rule; flag, don't block.

---

## (3) CROSS-CUTTING LESSONS

**L1 — SFM is material-dependent; resolve ISO group from the print FIRST (the R12 single-material trap).**
The single largest correction across all 8 families. The PRISM_UPGRADED "optimal" corpus is **one material applied uniformly** — every block is ISO-H/tool_steel at **180 SFM / 1.5mm DOC**, varying only by machine spindle clamp. Copying it teaches "always 180 SFM / 1.5mm" — correct for genuine hardened tool steel, **wrong for the aluminum/brass/soft-steel JM also runs**. Canonical envelope per `constants.ts` makes the spread concrete: ISO-H turning 80/130 SFM vs ISO-P 220/320 vs ISO-N 400/600 vs ISO-S 35/70 — a ~17× range. So the old generic "raise SFM to 600-1000" is right *only* for soft ISO-P and dangerous for H/S. **Verified discipline:** every SFM/feed rule that touches material carries `material_dependent:true, physics_delegate:true` and the resolver emits `pending` (no silent `tool_steel` default) when `material_iso_group` is absent. This held clean in all 8 families — the gaps are missing *guards*, never inlined SFM. The upstream requirement: the generator must resolve ISO group + real material from the blueprint before calling `UltimateSpeedFeedEngine`.

**L2 — The G50-under-G96 cap is a global invariant; it is the most-violated one (recurs in 4 families).**
Wherever G96 CSS is offered, a G50 max-rpm cap is **mandatory** because CSS commands rpm→∞ as effective diameter→0. Verified present: `face-css`, `odf-g50`, `prt-g50`, `idb-css`(weak wording). Verified **missing/weak**: `thr-rpm` (P0 — worst case, ID/decreasing-pitch synchronized pass), `idb-css` (P1 small-bore wording), grooving face-groove (P1). Corollary caught in facing: the G50 cap satisfies *safety* but does **not** make CSS "hold speed to center" — below the clamp dia effective SFM collapses. Any rule claiming constant speed to center is making a false accuracy claim while only the safety half is true.

**L3 — Deflection (L/D), not torque/MRR, is the binding constraint on slender work — and it is systematically under-guarded.**
δ=FL³/3EI governs long before spindle torque on slender OD shafts, deep boring bars, ID threads, thin faces, and long-overhang parts. Only `idb-sfm` carries the explicit L/D ≤4 steel / ≤6 carbide gate. **Missing:** `odr-doc` (P0), `odf-sfm`, `face-passes`, grooving slender plunge, ID threading. Recommendation: a shared L/D-deflection guard delegated to `whiskey lathe_safety_predicate_evaluate` should be attached to every aggressive radial/axial move, mirroring `idb-sfm`.

**L4 — Deep-cut families need a peck/chip-evac invariant; one family is missing it.**
"Depth > ~3× width/dia → peck" recurs as `drl-peck`, `grv-g75`, `prt-peck`. **ID_boring has none** (P1) — a blind deep bore at the raised feed `idb-sfm` exists to enable re-cuts packed chips → bar snap. Adding `idb-peck` closes the family-asymmetry.

**L5 — Guards-in-prose ≠ guards-in-the-consumed-object.** The recurring failure mode behind most P1s: a guard exists in `CAM-OP-TEMPLATE-MATRIX.json` `safety_gates` or in the family's prose analysis, but is **absent from the rule object the resolver actually executes** (`applyOptimizationRules` reads the rules JSON, not the matrix prose). Examples: `drl-rpm` snap cap (matrix line 188 only), `odf-feed` min-chip-load floor (matrix only), grooving `feed_per_rev`/`width_passes`/`finish_pass` (matrix `variable_params` only), thread G50 (neither). Verification rule going forward: **a guard is only "present" if it is in the rules JSON rule object** — the matrix and prose are not load-bearing for the resolver.

**L6 — Interrupted cut + ISO-S are a recurring "never raise" edge case.** Cross-hole / keyway / flat / spline interruptions and Ti/Inconel (ISO-S) appear as derate-only conditions in OD_roughing, grooving, threading, and facing. The safe direction is always *down* (reduce SFM + feed, tougher grade), never the "raise toward optimum" the time-ROI moves default to. None of the affected rules currently express it; the punch-list adds an interrupted/ISO-S guard to each.

**L7 — Min-chip-load floor (finish/light-feed regime) recurs as the opposite failure to over-speed.** On finish passes the danger inverts: feed driven by Ra=f²/(8·nose_R) or by a decreasing-DOC thread schedule can fall **below** the insert edge-radius minimum chip load → rubbing/heat/work-hardening — not chipping. Affects `odf-feed`, `idb-finish-feed` (new), grooving `grv-feed` (new), `thr-doc` fine pitch. Standard remedy is encoded once: floor the feed, and if Ra demands lower, switch to larger nose R / wiper insert rather than lowering feed below the floor.

**L8 — Units-first (IPR vs IPM) is latent across the corpus.** 70/77 JM programs declare neither feed mode (G94/G95) nor units (G20/G21) — they rely on the Okuma OSP power-on default (likely IPR + inch per JM convention, unconfirmed; tracked as #43). Feed optimization stays gated `pending` rather than guessing — a wrong IPR↔IPM guess is the 10× error class, sibling to the 25.4× inch↔mm scale error. The grooving `grv-feed` and parting feed rules explicitly tag in/REV (G95) to keep this front-of-mind.

---

## PSN / provenance
Reuses real corpus only (no synthetic): observed `H:/PRISM/JM DIE/CNC LATHE/<customer>/*.MIN`, physics-optimal `<customer>/PRISM_UPGRADED/<machine>/*.nc`. Physics backend `UltimateSpeedFeedEngine` + whiskey `prism_turning`/`prism_thread` + `prism_safety` (Ω≥0.95, S(x)≥0.98). Pairs with `CAM-OPTIMIZATION-RULES.json` (the object under correction), `CAM-OP-TEMPLATE-MATRIX.json`, `CAM-CORPUS-PROFILE.md`, `CAM-OPTIMAL-REFERENCE-FINDINGS.md`. Memory: [[reference_cam_optimization_verified_2026_06_01]] · [[reference_cam_optimal_reference_single_material_2026_06_01]].
