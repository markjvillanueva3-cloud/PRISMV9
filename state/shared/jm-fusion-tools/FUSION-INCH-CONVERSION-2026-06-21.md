# Fusion tool libraries → INCHES + dimension re-check (JM Die) — 2026-06-21

**Operator request:** *"ensure the tool and tool-holder libraries you built are imported into Fusion in the **cloud** folder so my coworkers can access them. Double-check dimensions — it seems like you prioritize metric, we do everything in inches."*

Slot: romeo · branch `cad-fusion-live-ms0`.

---

## TL;DR

1. **Dimensions were already physically correct — there was NO 25.4× scale error.** A 1/2″ end mill was stored as `12.7 mm` (which *is* 1/2″). The values were right; they were just **labeled metric**, which reads wrong to an inch shop.
2. **All the libraries I built are now native INCHES.** 19 brand libs + the combined `PRISM_JM_Milling` lib were converted (length geometry ÷ 25.4; angles, flute counts, and feeds handled correctly). Verified on live data.
3. **Residual mis-parses cleaned:** 223 brand + 17 legacy tools had impossible OAL / flute-length / shank values (e.g. a 0.25″ tool with a 25,374 mm shank) — those fields are now nulled/repaired (the usable cutting diameter is kept).
4. **Your Fusion `Local/` folder is now inch-consistent:** 44 of 45 PRISM tool libraries are inches.
5. **Cloud import cannot be done from here** — Fusion Cloud libraries are synced through your Autodesk account, not a file on disk. The libraries are staged in `Local/`; you (or I, guided) upload `Local → Cloud` inside Fusion. **Steps below.** Uploading to Cloud makes them visible to coworkers, so I'm leaving that final action to you.

---

## Part B — dimensions / inches (DONE + verified)

### What was wrong (and what wasn't)
- **NOT wrong:** the cutting diameters. The brand catalogs normalize every source value to mm internally; a 1/2″ tool is correctly 12.7 mm. No 25.4× data error existed.
- **The real issue:** the Fusion `.tools` files carried `unit: "millimeters"`, so an inch shop saw metric numbers. JM is an inch shop (`feedback_always_check_units_vs_part_and_print`), so the libraries should be inches.
- **Also found:** ~223 brand tools (0.5%) + 17 legacy tools had **impossible secondary dimensions** — overall-length/flute-length > 1 m, or shank diameters of thousands of mm — source parse artifacts. These are now sanitized.

### What changed (durable, in the generators — survives the nightly regen)
| Surface | Change |
|---|---|
| `scripts/lib/brand-tool-catalog.mjs` | physical length ceilings (OAL/flute ≤ 1000 mm, shank ≤ 250 mm); a value past its ceiling is **nulled** — the tool is kept, only the garbage field is dropped |
| `scripts/lib/tool-unit-convert.mjs` (new) | field-selective mm→inch: scales **only length** geometry (DC, SFDM, LCF, OAL, RE, …); **angles (HA, thread-profile-angle) and flute counts (NOF) are never touched.** Refuses feed-bearing tools unless given an explicit feed converter |
| `scripts/emit-brand-tool-libraries.mjs` | Fusion lane now **defaults to inches** for JM (`--unit mm` to override). hyperMILL/Mastercam stay mm |
| `scripts/convert-jm-milling-to-inch.mjs` (new) | converts the combined `PRISM_JM_Milling` lib — including its **feed presets** (`f_n` feed/rev ÷ 25.4; `n` RPM unchanged) — and refuses any preset with an unverified feed field |

### Verified on live data
- 19 brand libs (41,309 tools): `unit: inches`, **0** non-inch, **0** garbage OAL/LCF, angles preserved (HA still 30°). Sample Helical 1/2″: `DC 0.5, LCF 0.625, OAL 4.0, RE 0` inches. ✅
- `PRISM_JM_Milling` (14,160 tools): all inches, feeds scaled (1/4″ tool → `n 10026 RPM, f_n 0.000984 in/rev`), 17 garbage dims repaired. ✅
- **`Local/` sweep: 44 inches, 1 mm.** ✅
- 124 automated checks pass (104 unit tests + 20 self-test).

### Two items for YOUR categorization review
- **`PRISM_UPSET_H13.tools`** (5 tools, H13 face mills, vendor "PRISM") is the **1 remaining mm** library. I did **not** build it, and it uses geometry fields (`LB`, `TP`, `HAND`) my converter doesn't yet classify — converting it blind could leave `LB` (a length) in mm. **Want me to convert it?** I'll classify those fields first.
- **3 large face mills** (ISCAR F45 / Kennametal, 250–315 mm) are typed `flat end mill` in Fusion because the Fusion type map has no face-mill branch. Dimensionally fine; a labeling nuance to confirm.

---

## Part A — getting them into the Cloud (shared) folder

**This cannot be done by copying files.** Fusion's **Cloud** tool libraries live in your Autodesk Fusion Team hub (account-synced); there is no local file path to write them to, and no API bridge is wired here. The Local libraries are the file-writable tier — and they're now done and inch-correct.

**Upload `Local → Cloud` (Fusion 360, Manufacture workspace):**
1. **Manufacture** workspace → **Manage** → **Tool Library** (opens the Tool Library dialog).
2. Left tree: **Local** (your machine) and **Cloud** / your **Fusion Team hub** (shared with coworkers).
3. (Optional) under Cloud, right-click your hub/project → **New Library** → name it e.g. `PRISM Brand Tooling (in)`.
4. Select the PRISM Local libraries to share (e.g. `PRISM_HELICAL`, `PRISM_ISCAR`, … `PRISM_JM_Milling`).
5. **Right-click → Copy**, select the Cloud library, **Right-click → Paste** — *or* drag the Local library onto the Cloud node.
6. Fusion syncs them to the hub; coworkers on the same Team/project now see them under **Cloud**.

*(Exact menu labels vary slightly by Fusion version. If "Copy/Paste" isn't offered, use the Local library's **⋯ → Export** to a `.tools` file, then select the Cloud library and **Import** it.)*

Because uploading to Cloud publishes these to your coworkers, I've left that step to you. Say the word and I'll walk it live (or investigate a Fusion API path) — just confirm you want them shared.
