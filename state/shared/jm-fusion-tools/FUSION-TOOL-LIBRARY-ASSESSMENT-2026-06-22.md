# Fusion 360 Tool Library -- Assessment for JM Die (2026-06-22)

_Slot: romeo. Operator ask (this /checkin): "do a full assessment of fusion tool library for JM die.
we currently use the cloud libraries. check the tool libraries you made to ensure accuracy relative
then get them imported into fusion so I can assess categorization."_

_This supersedes `FUSION-TOOL-LIBRARY-ASSESSMENT-2026-06-20.md` + `FUSION-INCH-CONVERSION-2026-06-21.md`
with LIVE-verified numbers re-checked today against the actual Fusion `Local/` tree + the source CSVs.
Re-run: `node scripts/assess-fusion-tool-libraries.mjs`._

---

## TL;DR (verified 2026-06-22, first-hand)

1. **Your tools are accurate.** The PRISM cribs reproduce JM's 7 real Fusion CSV exports **byte-for-byte**
   on geometry + holder collision data -- **parity 7/7, 0 scale errors**. The added per-material presets
   are physics-backed (Kienzle/Taylor) starting points layered ON TOP of your verbatim geometry.
2. **They are imported and ready to assess RIGHT NOW** -- 49 PRISM libraries / **57,666 tool presets** are
   in Fusion's **`Local/`** tree (`%APPDATA%\Autodesk\Autodesk Fusion 360\CAM\Libraries\Local\`). Restart or
   refresh the Tool Library tree to see them alongside your Cloud libraries.
3. **Units: inches** -- 57,602 of 57,661 presets are inches. The 59 millimeter entries are **ISO turning
   toolholders** (e.g. `SXZCR2020K15` = 20x20 mm shank) where **mm is the correct ISO convention** -- NOT a
   conversion gap, do not "fix" them.
4. **Cloud upload is the one step I cannot do from here** (Autodesk account-synced, no disk path / API bridge)
   -- it is a 30-second manual drag in Fusion, steps in section 4. I leave it to you because it publishes to
   coworkers.

---

## 1. What is in Fusion (three tiers)

| Tier | Libraries | Presets | What it is | Trust |
|------|----------:|--------:|------------|-------|
| **JM machine cribs** (`PRISM_JM_VMC-01..05`, `PRISM_JM_LTH-01..07`, okuma/haas/hurco named variants) | 25 | 16,302 | Your real per-machine tooling, **inches**, real holders (REGO-FIX Capto C6 / BIG DAISHOWA ER / Techniks ER collision segments). | **High** -- verbatim from your crib. |
| **Brand catalogs** (`PRISM_ISCAR`, `PRISM_SUMITOMO`, `PRISM_HELICAL`, `PRISM_SANDVIK`, `PRISM_KENNAMETAL`, ... 19 brands) | 19 | 41,277 | The buyable vendor universe, inches, tools-only (no Fusion holders). | **Medium** -- browse/select; ~0.04% mis-parses (sec. 3). |
| **Generic** (`PRISM-PRISMGeneric-*`, `PRISM_GENERIC`, `prism-base-tools`) | 5 | 87 | Fallback parametric geometry. | Reference only. |

## 2. Accuracy vs JM's source crib (the "ensure accuracy relative" check)

Ground truth = the 7 real Fusion CSV exports in `resources\PRISM FOLDER FROM HOME\FUSION TOOL LIBRARY\`
(218 production tools). **All 7 reproduce at 100% parity** -- same tool count, geometry + `holder_segments`
copied byte-identical, then physics presets ADDED per ISO group (P/M/K/N/S/H):

| Family | Source tools | Generated | Parity |
|--------|-------------:|----------:|:------:|
| 130 DEG INSERT DRILLS | 51 | 51 | OK |
| 180 DEG INSERT DRILLS | 51 | 51 | OK |
| BORING BARS FINISHING | 14 | 14 | OK |
| BORING BARS ROUGHING | 14 | 14 | OK |
| END MILLS FOR MACHINE 4 | 5 | 5 | OK |
| TURNING TOOLS | 30 | 30 | OK |
| TWIST DRILLS | 53 | 53 | OK |

**Verdict: the tooling that reproduces your actual crib is accurate. No 25.4x scale error exists** -- a 1/2"
end mill stores as 12.7 mm internally, which IS 1/2", and the `.tools` files are now labeled `inches` so an
inch shop reads them correctly.

## 3. Findings (honest -- R12)

- **STALE-CLAIM CORRECTIONS (prior assessment docs were out of date -- re-verified today):**
  - `PRISM_UPSET_H13.tools` was reported as "the 1 remaining mm library." **It is already inches** (5 tools,
    face/end/ball mills + drill). No conversion needed.
  - The 8 `PRISM_JM_okuma-*` named clones were reported "holder-less." **They carry full holder collision
    `segments` and are inches.** Not holder-less.
- **Residual mis-parses: 22 tools** (ISCAR 15, KENNAMETAL 7) typed as end mills with impossible cutting
  diameter (>160 mm) -- a source-catalog parse artifact in the **browse-only brand catalogs** (your JM cribs
  and the material-group CSVs are clean, 0 flagged). Negligible (0.04% of 57,666) and isolated to vendor
  browsing; full list in `BRAND-TOOL-MISPARSE.{json,csv}`. **Offer:** I can run
  `scripts/clean-fusion-tools-misparse.mjs` on those 2 catalogs to drop them -- say the word (it edits your
  live Fusion `Local/` files, so I left it for your go-ahead).
- **Categorization naming (for YOUR review):** `PRISM_JM_Milling` is *named* like a JM crib but is actually the
  legacy vendor-milling extract (mm-origin, vendor universe). Recommend renaming `PRISM_BRAND_Milling` so the
  tree cleanly separates your real crib from the buyable universe.

## 4. How to assess categorization + share to coworkers (Cloud)

**Assess now (Local):** Manufacture -> Manage -> Tool Library -> expand **Local** -> the 49 `PRISM_*`
libraries. Start with `PRISM_JM_VMC-0x` / `PRISM_JM_LTH-0x` (your real machine cribs). For a single clean
import of your whole crib with all material presets, right-click a library -> Import ->
`state\shared\jm-fusion-tools\material-group-libraries\JM-CRIB-ALL-families.csv`.

**Share to coworkers (Cloud) -- 30 sec, must be done by you (account-synced, no disk path):**
1. Manufacture -> Manage -> Tool Library.
2. In the left tree: **Local** (this machine) and **Cloud** / your Fusion Team hub (shared).
3. (Optional) under Cloud, right-click your hub/project -> New Library -> e.g. `PRISM JM Tooling (in)`.
4. Select the PRISM Local libraries to share -> right-click -> **Copy**; select the Cloud library ->
   right-click -> **Paste** (or drag Local onto the Cloud node). Fusion syncs to the hub.
   (If Copy/Paste is missing: Local library -> ... -> **Export** to a `.tools`, then **Import** into Cloud.)

Speeds/feeds in the presets are Kienzle/Taylor starting points -- verify on the machine for rigidity, coolant,
and finish. Geometry + holder collision columns are verbatim from your proven CSVs (no unit conversion ->
no scale risk).

_Assessment tooling: `scripts/assess-fusion-tool-libraries.mjs`. Regenerate everything from the source crib:
`npx tsx mcp-server/scripts/generate-jm-fusion-tool-libraries.ts`._
