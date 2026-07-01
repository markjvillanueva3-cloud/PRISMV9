# Perfect parts — print + CAD model + CNC program (everything we need)

**Generated:** 2026-06-08 (slot:xray) from `H:/PRISM/Docustrata/.index/blueprint-program-join-full-v6.jsonl` (76,205 part-number joins, built by juliett's Docustrata pipeline — SEARCHED, not re-OCR'd, per R8).
**Companion data:** `perfect-print-cad-program-parts.json` (full 91-part list with sample filenames).

## What "perfect" means here
A part number with all THREE legs present in the join: a **blueprint** (scanned/PDF print) + a **CAD model** (`kind:cad` — `.ipt`/`.stp`/`.step`) + a **CNC program** (`kind:program` — `.MIN`/`.mcx-8`/`.nc`). These are the parts where the full print→CAD→program chain exists on H:, ready to feed the closed-loop trainer (a real (print, CAD, program) supervision triple) and to serve as reference exemplars.

## Counts (verified)
| Filter | Count |
|---|---|
| Part numbers with ALL of {blueprint, CAD, NC program} | **236** |
| …at `exact` match confidence | **94** |
| …`exact` + sane file counts (bp≤12, cad≤20, nc≤30) — the clean set | **91** |
| …of the clean set, ALSO carrying a NEUTRAL STEP/IGES CAD (most reusable) | **11** |

Bare-numeric PNs (e.g. `24000`, `0003`) over-match (hundreds of unrelated prints — PN-normalization collision) and are excluded from the clean 91 by the count caps. Structured alphanumeric PNs (e.g. `T-11BT-27-250-GR5`, `B0762-87-01`, `10-010-140`) are the trustworthy ones.

## Top exemplar — VERIFIED end-to-end on disk (R12)
**`T-11BT-27-250-GR5`** (customer: Optimas) — bp=4, cad=4, nc=4, customer-corroborated 8×:
- **PRINT:** `H:\PRISM\Docustrata\_organized\SCANS\2023_08_03_15_55_20.pdf` (780 KB)
- **CAD (Inventor):** `H:\PRISM\JM DIE\HAAS-HURCO\OPTIMAS\T-11BT-27-250-Gr5.ipt` (922 KB)
- **CAD (neutral STEP):** `H:\PRISM\JM DIE\HAAS-HURCO\OPTIMAS\T-11BT-27-250-Gr5.stp` (52 KB)
- **CNC (Okuma OSP):** `H:\PRISM\JM DIE\CNC LATHE\OMG\CNC#1#2#3\CUSTOMERS\OPTIMAS\T-11BT-27-250-GR5.MIN` (2.9 KB)
- **CNC (Mastercam):** `…\OPTIMAS\T-11BT-27-250-GR5.mcx-8` (524 KB)
- **CNC (PRISM-upgraded posts):** `…\PRISM_UPGRADED\Okuma_{GENOS_L200E-M,L300-M,LB-3000EX,…}\T-11BT-27-250-GR5.nc` (7+ machine variants)

## The 11 gold parts (print + NEUTRAL STEP CAD + NC program)
| Part number | blueprints | cad | nc | cust-corrob | customer |
|---|---|---|---|---|---|
| T-11BT-27-250-GR5 | 4 | 4 | 4 | 8 | Optimas |
| B0762-87-01 | 5 | 6 | 1 | 7 | Air Industries |
| 05850 | 3 | 13 | 4 | 0 | — |
| 110206 | 1 | 12 | 3 | 0 | — |
| 9102741 | 1 | 8 | 6 | 0 | — |
| 113063 | 1 | 7 | 3 | 0 | Agrati Park Forest |
| 1648933 | 7 | 2 | 7 | 0 | SFS Group USA |
| 43210 | 3 | 1 | 5 | 0 | ITW Shakeproof |
| PFT-30262A-31 | 6 | 1 | 1 | 0 | — |
| A225051-002HK | 2 | 1 | 1 | 0 | — |
| T2358-621-2D2 | 6 | 1 | 1 | 0 | Accurate Threaded |

## Caveats (R12)
- The join stores **filenames, not absolute paths** — resolve a part's files by globbing `H:/PRISM/JM DIE` (CAD + programs) and `H:/PRISM/Docustrata` (prints) on the PN stem, as verified above for the top exemplar.
- `exact` confidence = the PN string matched identically across legs; `loose`/`ambiguous` (the other 142 of 236) need a human glance before trusting.
- Prints are scanned PDFs (filename = scan timestamp, not the PN) — the join's PN↔print link is via Docustrata's classifier, so spot-check the print actually depicts the part before using it as a label source.

## Use
- **Closed-loop training:** these 91 (esp. the 11 STEP-bearing) are the highest-value supervision triples — a real print + its CAD geometry + its proven CNC program. Feed via `xray-trainset-to-lora.mjs` once the print pages are OCR'd, with the CAD/program as cross-check ground truth.
- **Reference exemplars:** the 11 STEP-bearing parts are ideal for delta (CAD-regen round-trip), kilo (CAM strategy reference), and oscar (speed/feed validation against the real program).
- **Regenerate:** `node scripts/find-perfect-parts.mjs` (reproduces the exact 236/94/91/11 counts; flags: `--confidence any`, `--neutral-step-only`, `--max-bp/--max-cad/--max-nc`, `--limit N`). Pure classifiers `classifyJoinRecord`/`isCleanPerfect` are tested (`find-perfect-parts.test.mjs`, 8/8).
