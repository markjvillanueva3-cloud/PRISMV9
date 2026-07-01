---
name: reference_min_is_okuma_lathe_not_wire_2026_05_31
description: ".MIN files in the JM Die WIRE EDM archive are MISFILED Okuma LATHE programs, NOT wire-EDM (Okuma doesn't make wire EDM). Never ingest .min as wire training data. Genuine text wire G-code in the archive = ~2-3 .NC + 1 .txt; everything else is binary Mastercam/Esprit"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.660Z
aliases: reference_min_is_okuma_lathe_not_wire_2026_05_31
---


# `.MIN` in WIRE EDM = misfiled Okuma LATHE, not wire (slot mike, 2026-05-31, operator-confirmed)

**Operator correction (definitive):** *".min is for okuma, they dont make wire edm."* The JM Die `WIRE EDM/` archive contains **19 misfiled Okuma lathe `.min` programs** (Acme/CNC-lathe screw-machine work). `.MIN` is the Okuma turning-control extension — it is **never** a wire-EDM program. Lathe `.min` belongs to **whiskey** (Lathe Wizard), not mike (wire).

**The contamination it caused (R12).** `WEDMLoRADatasetBuilderEngine.WEDM_EXTENSIONS` listed `.min` as a "wire dialect," so a dataset build pointed at `WIRE EDM/` scanned **23 files** (19 lathe `.min` + 3 `.nc` + 1 `.dat`) and ingested the turning programs as WIRE training data → domain contamination. (The active wire corpus is the knowledge corpus, so live impact was limited, but the archive path was contaminated.)

**Fix — U-WIRE-LATHE-DECONTAMINATE** (`WEDMLoRADatasetBuilderEngine.ts`): (1) removed `.min` from `WEDM_EXTENSIONS`; (2) added exported `looksLikeLatheNotWire(content)` content guard wired into `parseProgram` — **wire-first**: any FA-10S E-code / wire-EDM vendor name / taper-UV `G51` keeps the file; only with NO wire signal do turning-exclusive markers (`G96` constant-surface-speed — wire has no spindle; Okuma 6-digit `T######`) reject it. Catches misfiled lathe in ANY extension. Verified: 8/8 vitest + E2E archive scan **23→4** (lathe excluded), 4 genuine wire examples.

**Genuine text wire G-code in the archive (the honest inventory):** 3 `.NC` — `ITW SHAKEPROOF 500-30540-24000-04` + `NOZE TEST` (real FA-10S; NOZE = E28xx taper UV) + `Wire Program - 5 inch square` (generic XY skeleton, no discharge content) — plus 1 `.txt` cannelure (Choctaw/Fiocchi, the closely-spaced gotcha). The **3970 `.mcx`/`.mcx-8` + 14 customer `.zip`s + 28 `.esp`** are ALL binary CAM (Mastercam/Esprit) — no hidden text wire G-code (zip listings = pure `.mcx-8`). **Wire training data is genuinely scarce → the knowledge corpus (tribal + tech-tables) is the real substrate, not the program archive.**

**Reusable lesson (fleet):** when ingesting a shop archive for domain-specific LoRA training, **classify by CONTENT, not folder name or extension** — folders/extensions get misfiled (lathe `.min` in a WIRE EDM folder; Okuma `WIRE140-165.nc` lathe files named "WIRE"). A wire-first content guard prevents cross-domain contamination. Supersedes the `.min`-are-wire claim in [[reference_mike_wedm_archive_composition_data_gap_2026_05_29]]. Broadcast to india/whiskey/foxtrot/kilo.
