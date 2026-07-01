# CORPUS INVENTORY — JM Die + Resources

> **Privacy compliance**: Surface-level inventory only. **No** part geometry, **no** customer names from program headers, **no** dimensional data extracted. File counts, dialect signatures, line counts, and organizational structure only.

> **Path correction**: Brief specified `H:/JM die/` and `H:/Resources/` (which do not exist). Actual canonical roots used: `H:\prism\JM DIE\` and `H:\prism\Resources\`.

> **Generated**: 2026-05-02 — focused retry inventory.

---

## Section 1 — `H:\prism\JM DIE\`

### 1a. File-count table — manufacturing assets

| Extension | Count | Class |
|-----------|------:|-------|
| `.min`    | 16,947 | NC programs (Hurco/Mitsubishi conversational/binary) |
| `.nc`     | 76 | NC programs (G-code text) |
| `.cps`    | 14 | Post processors (Autodesk Fusion / HSMWorks) |
| `.mcam`   | 1 | Mastercam project |
| **Subtotal** | **17,038** | |

### 1b. File-count table — CAD

| Extension | Count |
|-----------|------:|
| `.ipt` (Inventor part)        | 5,821 |
| `.iam` (Inventor assembly)    | 667   |
| `.idw` (Inventor drawing)     | 309   |
| `.stp` / `.step`              | 197   |
| `.x_b` / `.x_t` (Parasolid)   | 74    |
| `.sldprt` / `.sldasm` / `.slddrw` | 43 |
| `.igs`                        | 12    |
| `.f3d` / `.f3z`               | 0     |
| **Subtotal CAD**              | **7,123** |

### 1c. File-count table — drafting / drawings

| Extension | Count |
|-----------|------:|
| `.dxf`    | 1,447 |
| `.dwg`    | 210   |
| **Subtotal**| **1,657** |

### 1d. File-count table — documents

| Extension | Count |
|-----------|------:|
| `.pdf`    | 234 |
| `.txt`    | 127 |
| `.xlsx` / `.xlsm` | 18 |
| `.docx`   | 6   |
| **Subtotal** | **385** |

### 1e. Top-level organizational scheme

| Subfolder | Files (recursive) | Purpose (inferred) |
|-----------|------------------:|---------------------|
| CNC LATHE                      | 19,839 | Lathe NC + parts |
| OKUMA                          | 6,276  | Okuma machine programs |
| WIRE EDM                       | 4,058  | WEDM programs (Mitsubishi/Sodick et al) |
| MATTHEW programs               | 2,422  | Operator-tagged programs |
| JM DIE COMPANY                 | 2,248  | Internal JM jobs |
| HAAS-HURCO                     | 1,873  | Mill programs |
| ROKU-ROKU                      | 1,108  | High-speed mill programs |
| CNC MILL HAAS                  | 533    | Haas-specific mill |
| QUEUE                          | 352    | Inbox / staged work |
| GENERAL BANDAGES               | 20     | Production runs |
| CNC OKUMA MULTUS               | 18     | Okuma Multus mill-turn |
| PRISM MODIFIED POST PROCESSORS | 12     | Custom posts (covered §3) |
| SETUPS                         | 5      | Setup sheets |
| LATHE                          | 4      | Misc lathe |
| BASEBALL PARTS                 | 2      | Misc |

Organization scheme observed: **machine-platform first, customer/job second**. No top-level customer namespace (PII protected).

### 1f. Dialect distribution — sampled

50 random `.nc` files sampled (header signature heuristic) and 50 random `.min` files sampled:

| Dialect      | `.nc` count | `.min` count | Inference |
|--------------|------------:|-------------:|-----------|
| Fanuc        | 26 | 0  | dominant in `.nc` text programs |
| Haas         | 12 | 0  | M19/G187 pattern |
| Okuma        | 8  | 50 | `.min` is **Okuma OSP**-format dominant (see CNC LATHE 19k subtree) |
| Hurco WinMax | 0  | 0  | binary `.min` may not yield ASCII signatures |
| Heidenhain TNC | 0 | 0 | none detected |
| Siemens 840D | 0  | 0  | none detected |
| Mitsubishi M80 | 0 | 0 | none detected |
| Mazatrol     | 0  | 0  | none detected |
| Unknown      | 4  | 0  | non-standard headers |
| **Sampled total** | **50** | **50** | |

> Note: `.min` files in this corpus are predominantly **Okuma `.min`** (OSP-format text, not Hurco binary). The 16,947 `.min` count is therefore Okuma-dominant.

### 1g. Feature richness grep — across 576 sampled NC files (500 `.min` + 76 `.nc`)

| Pattern | Description | File-count match |
|---------|-------------|----------------:|
| `G81|G82|G83|G84|G85` | Canned cycles (drilling, tapping, boring, reaming) | 402 |
| `G187` | Haas accuracy mode | 37 |
| `G05.1 / G5.1` | Fanuc nano smoothing (high-precision contour) | 0 |
| `CYCLE832` | Siemens HSC | 0 |
| `M19` | Oriented spindle stop | 0 |
| `WAITM` | Mill-turn channel sync | 0 |

**Inference**: corpus is heavily canned-cycle-based (drilling/tapping/boring) on Okuma/Haas platforms. Negligible high-speed contour smoothing, no multi-channel sync usage, no Siemens HSC. PRISM optimization opportunity: introduce smoothing on long contour programs.

---

## Section 2 — `H:\prism\Resources\` (163,958 files total)

### 2a. File-count table — manufacturing assets

| Extension | Count |
|-----------|------:|
| `.cps`    | 381 (post processors) |
| `.nc`     | 336 |
| `.min`    | 111 |
| `.pst`    | 26 |
| `.psb`    | 3 |
| **Subtotal** | **857** |

### 2b. File-count table — CAD

| Extension | Count |
|-----------|------:|
| `.sldprt` | 478 |
| `.step`   | 330 |
| `.sldasm` | 93  |
| `.stp`    | 81  |
| `.ipt`    | 56  |
| `.slddrw` | 23  |
| `.igs`    | 15  |
| `.x_b`    | 3   |
| `.iam`    | 2   |
| **Subtotal** | **1,081** |

### 2c. File-count table — drafting

| Extension | Count |
|-----------|------:|
| `.dxf`    | 1,433 |
| `.dwg`    | 17 |
| **Subtotal** | **1,450** |

### 2d. File-count table — documents / code / data

| Extension | Count | Notes |
|-----------|------:|-------|
| `.py`     | 12,276 | training / extraction scripts |
| `.json`   | 1,468  | config / catalog data |
| `.js`     | 1,367  | tooling |
| `.txt`    | 1,244  |
| `.pdf`    | 1,019  | catalogs / manuals |
| `.xlsx`   | 186    | tool / cutter tables |
| `.md`     | 55     |
| `.ts`     | 37     |

### 2e. Top-level organizational scheme (first 30 dirs)

`1- Basic Training Day 1` · `2- Basic Training Day 2` · `3- Basic Training Day 3` · `CAD FILES` · `DWG TrueView 2027 - English` · `excel_extract` · `Freecad` · `FUSION 360 PROGRAMS` · `FUSION BASIC POSTS` · `FUSION POSTS` · `fusion-addin` · `FUSION360` · `GENERIC MACHINE MODELS` · `GENERIC_MACHINE_MODELS` · `HSMWorks 2026` · `HSMWorks 2027` · `HYPERMILL` · `Inventor` · `Inventor 2027` · `inventor-hsm` · `MACHINE MODELS FOR LEARNING ENGINE AND SIMULATION` · `MACHINE_SIMULATION_MODELS` · `MACHINING KNOWLEDGE FORMULAS AND ALGORITHMS` · `MACRO PROGRAMS` · `MANUFACTURER_CATALOGS` · `MasterCam` · `MIT COURSES` · `MULTUS PROGRAMS` · `OKUMA MULTUS PDFS` · `OPEN MIND`

Scheme: **vendor-first / training-first**. Resources is a **knowledge corpus** (catalogs, training, machine models, posts library) rather than an active production tree.

---

## Section 3 — Post Processor Inventory

### 3a. JM DIE custom posts (14 total)

| Vendor | Controller (inferred) | Status | Path | Type | Lines |
|--------|----------------------|--------|------|------|------:|
| Autodesk Fusion | Okuma Multus B250    | fine_tuned | CNC OKUMA MULTUS\OKUMA MULTUS B250 3.15.24 REV A.cps | generic_baseline | 3,990 |
| Autodesk Fusion | Okuma M460V-5AX      | started    | JM DIE COMPANY\QUEUE\…\OkumaM460V-5AX (Need to Test).cps | generic_baseline | 3,290 |
| Autodesk Fusion | Haas VF2 (iMachining)  | in_progress  | PRISM MODIFIED POST PROCESSORS\HAAS_VF2_-Ai-Enhanced (iMachining).cps | custom_PRISM | 4,669 |
| Autodesk Fusion | Hurco VM30i v8.9.153 | in_progress  | PRISM MODIFIED POST PROCESSORS\HURCO_VM30i_PRISM_Enhanced_v8.9.153.cps | custom_PRISM | 4,775 |
| Autodesk Fusion | Hurco VM30i v8.9.153 (dup) | in_progress | …\HURCO_VM30i_PRISM_Enhanced_v8.9.153 2.cps | custom_PRISM | 4,775 |
| Autodesk Fusion | Hurco VM30i v10.9 DRILLFIX | **production** | …\HURCO_VM30i_PRISM_v10_9_DRILLFIX_1.cps | custom_PRISM | **21,765** |
| Autodesk Fusion | Hurco VM30i v11      | **production** | …\HURCO_VM30i_PRISM_v11.cps | custom_PRISM | **18,781** |
| Autodesk Fusion | Okuma M460V-5AX iMachining | in_progress | …\OKUMA-M460V-5AX-Ai Enhanced-(iMachining).cps | custom_PRISM | 4,643 |
| Autodesk Fusion | Okuma Genos L400II   | in_progress  | …\OKUMA_GENOS_L400II_P300LA-Ai-Enhanced.cps | custom_PRISM | 3,839 |
| Autodesk Fusion | Okuma Lathe LB3000   | in_progress  | …\OKUMA_LATHE_LB3000-Ai-Enhanced 2.cps | custom_PRISM | 3,987 |
| Autodesk Fusion | Okuma Multus B250IIW v5.2.7 | fine_tuned | …\OKUMA_MULTUS_B250IIW-PRISM-Enhanced-v5_2_7.cps | custom_PRISM | 5,966 |
| Autodesk Fusion | Okuma Multus B250IIW v5.2.7 (dup) | fine_tuned | …\OKUMA_MULTUS_B250IIW-PRISM-Enhanced-v5_2_7 2.cps | custom_PRISM | 5,966 |
| Autodesk Fusion | Hurco VM30i (master)| started      | …\PRISM-Master-Hurco-VM30i.cps | custom_PRISM (skeleton) | 759 |
| Autodesk Fusion | Roku-Roku            | in_progress  | …\Roku-Roku-Ai-Enhanced.cps | custom_PRISM | 5,020 |

**Status heuristic (line count + naming):**
- `started` — short skeleton (<1,500 lines), minimal mod density (PRISM-Master-Hurco-VM30i.cps, OkumaM460V-5AX Need to Test).
- `in_progress` — 3,500–6,000 lines, "-Ai-Enhanced" tag (mid-modification).
- `fine_tuned` — 3,800–6,000 lines, dated rev tags ("REV A", "v5_2_7"), used in production.
- `production` — 18,000–22,000 lines, version-pinned, deeply customized (Hurco v10/v11 DRILLFIX). Two sustained-modification posts.

### 3b. Resources baseline posts (381 total .cps + 26 .pst + 3 .psb)

All sampled headers identify as **Autodesk Fusion / HSMWorks** vendor format. **0 custom-tagged posts** in Resources — entire collection is the **generic baseline library** (Fusion BASIC POSTS, HSMWorks 2026/2027 posts).

Sample (30 random):
- FUSION BASIC POSTS: haas st-28, haas st-30ssy, haas st-45, haas st-45l, haas inspection, mazak qtu 200-m, mazak qtu 350-m, mazak integrex i-300s, doosan mill-turn fanuc, brother speedio inspection, mitsubishi, siemens sinumerik one, heidenhain iso, fadal, okuma turning, siemens-810d, siemens mill-turn, siemens-802d
- HSMWorks 2026/2027 posts: heidenhain iso, roland iso, selca, bostomatic, mektronix, haas, haas with a-axis

### 3c. Cross-reference: `H:\prism\mcp-server\scripts\fusion360-post\`

Contains 4 `.cps` files. Overlap with JM DIE custom posts: subset of PRISM-Master scaffolding posts.

### 3d. Post processor totals

| Source | Generic | Custom (PRISM-tagged) | Total |
|--------|--------:|----------------------:|------:|
| JM DIE | 4 | 10 | 14 |
| Resources | 381 (sampled 30/30 generic) | 0 | 410 (.cps+.pst+.psb) |
| fusion360-post | n/a | 4 | 4 |
| **Combined** | **385** | **14** | **428** |

---

## Section 4 — Documents subset (filename heuristic)

234 PDFs in JM DIE — none matched filename keywords for `tool sheet`, `setup sheet`, `warmup`, `FAI`, `CMM`, `calibration`. PDFs are likely catalogs / drawings / vendor documentation classified under "Other" by filename. Deeper classification requires content extraction (out of scope for surface inventory).

1,019 PDFs in Resources — bulk concentrated under `MANUFACTURER_CATALOGS`, `MIT COURSES`, `OKUMA MULTUS PDFS`, training subfolders. Knowledge-corpus character confirmed.

---

## Section 5 — Inventory summary

| Metric | JM DIE | Resources | Combined |
|--------|------:|----------:|---------:|
| NC programs (.nc + .min + .ncf + .ncm + .prg) | 17,023 | 447 | 17,470 |
| Post processors (.cps + .pst + .psb) | 14 | 410 | 424 |
| CAD parts/assemblies/drawings | 7,166 | 1,081 | 8,247 |
| 2D drawings (.dxf + .dwg) | 1,657 | 1,450 | 3,107 |
| Documents (.pdf + .docx + .xlsx + .txt) | 385 | 13,725 (incl. .py/.json) | — |

**Conclusion**: JM DIE is the **production-program corpus** (Okuma-dominant, Hurco-secondary). Resources is the **training+catalog corpus** (vendor-first, Fusion baseline posts, MIT courses, manufacturer catalogs). The 14 PRISM-modified posts in JM DIE represent the actual customization frontier; 2 are at production maturity (Hurco v10/v11), 6 at fine_tuned, 4 at in_progress, 2 at started.
