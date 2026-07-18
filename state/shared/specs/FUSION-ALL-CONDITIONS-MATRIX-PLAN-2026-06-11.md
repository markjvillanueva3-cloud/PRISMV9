# Fusion Tool Libraries -- ALL-Conditions Matrix (operator directive 2026-06-11, slot:romeo)

> Operator: "run in yolo-mode until all tools are accounted for for every single material
> type and cutting condition: roughing, semi finishing, hsm, hem, slotting, finishing,
> boring, tapping, drilling, reaming, threading, ramping, virtually [all] tool paths
> associated for that tool. we need specific parameters for all tool paths for all
> material types."

## Goal
For EVERY JM tool, emit a Fusion preset for EVERY (material grade x cutting condition)
combination applicable to that tool's type. A Fusion "preset" is a named cutting-parameter
set (vc/rpm/fz/feed/ap/ae/coolant) the operator picks when programming a toolpath -- there
is no operation-binding column, so per-toolpath = more named presets per tool.

## Foundation already shipped (slot:romeo)
- `U-MATCAT` (f949670776): per-material `presetMaterialCategory` (Fusion auto-select by stock).
- `U-MATGRADE` (705770801f): per-GRADE presets, SFM machinability-scaled from the group base
  via `MATERIAL_DB.machinability_factor` (pulled live from `getMaterialProfile`); HB hardness
  range per grade -> Fusion Filter-by-hardness. 14 grades across P/M/K/N/S/H. **Reuse this
  scaling infra for every (grade,condition) preset.**
- Generator: `mcp-server/scripts/generate-jm-fusion-tool-libraries.ts`.

## Condition -> SFC mapping
| Operator condition | SFC representation |
|---|---|
| roughing | cut_type=roughing |
| semi finishing | cut_type=semi_finishing |
| finishing | cut_type=finishing |
| HSM | strategy=hsm (STRATEGY_MODS modifier on milling) |
| HEM | strategy=adaptive / hpc |
| slotting | strategy=slot |
| ramping | strategy=plunge |
| boring | operation=turning (boring bars) / milling bore |
| drilling | operation=drilling |
| reaming | operation=reaming |
| tapping | operation=tapping |
| threading | operation=thread_milling (mill) / turning-threading (lathe) |

SFC enums: Operation = milling|turning|drilling|tapping|reaming|boring|thread_milling;
CutType = roughing|semi_finishing|finishing; strategies via STRATEGY_MODS (conventional,
adaptive, trochoidal, hsm, hpc, plunge, slot).

## SFC CUTTING_PARAMS coverage (audited 2026-06-11 -- `UltimateSpeedFeedEngine.ts`)
Present (34 keys): milling rough+finish all 6 ISO; milling semi_finishing P/M/N/S;
turning rough+finish all 6; drilling roughing P/M/N/S; tapping roughing P only.

### GAPS that MUST be filled with physics-correct data (oscar domain; physics-reviewed)
- drilling roughing: **K, H** (H already guarded -- silently fell back to P 344 SFM = 5x too fast)
- milling semi_finishing: **K, H**
- tapping roughing: **M, K, N, S, H** (only P exists)
- reaming roughing/finishing: **ALL 6**
- thread_milling roughing/finishing: **ALL 6**
(boring uses turning -- covered. Strategies are modifiers, no per-iso data needed.)

DANGER LESSON (R12): a missing CUTTING_PARAMS key silently falls back to another ISO group's
value (H drilling -> P drilling 344 SFM, tool-breaking). Every gap fill needs a physically
sane value from canonical sources (Machinery's Handbook / Sandvik / manufacturer), adversarially
sanity-checked (e.g. H drilling carbide ~ 8-15 m/min, NOT 100+).

## Build phases (logical order)
1. **SFC data completion** -- add the ~20 missing CUTTING_PARAMS combos (physics-correct,
   reviewed). Additive, low-regression (only fills nulls). Removes the H-drilling guard once
   H_drilling lands. *Cross-domain (oscar/SFC) -- coordinate via chat-bus.*
2. **Generator condition-matrix expansion** -- replace the single-op-per-tool loop with
   tool x grade x {applicable operations x cut_types x strategies}. Per-tool-type applicability
   matrix (end mill -> milling all cut_types x {adaptive/HEM, hsm/HSM, trochoidal, slot, plunge/ramp,
   conventional}; drill -> drilling; tap -> tapping; reamer -> reaming; boring bar -> turning bore
   rough/finish; turning tool -> turning rough/finish; threading tool -> threading). Strategy params
   (ap/ae/feed) from STRATEGY_MODS via calculate(). Preset name = "{grade} {condition}".
3. **Rename** outputs `-6groups.csv` -> `-allconditions.csv` (filename now stale); update merge
   script FILES + README.
4. Regenerate + verify per-(grade,condition) params differ sanely + scrutiny + commit.

## Verification gates
- No dangerous speeds (every emitted Vc sanity-bounded per material+op).
- Geometry + holder segments preserved verbatim (as in U-MATGRADE).
- Per-file 2-agent + physics review on the SFC data additions.
