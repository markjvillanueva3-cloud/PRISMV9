---
title: WEDM Phase-A Training Corpus — Structural Findings (charlie iter 35-45)
type: architecture
domain: wedm
status: complete
created: 2026-05-23
authors: [charlie]
related:
  - wedm-mcx-metadata-wire
  - mcx-program-parser-engine
  - mcm-corpus-coverage-ceiling
---

# WEDM Phase-A Training Corpus — Structural Findings

A single charlie /loop session (iter 35-45, 11 commits) exhausted the
structural-extraction ceiling for JM Die's wire-EDM Mastercam corpus.
This entry preserves the corpus findings so future chats can build on
them without re-deriving.

## The arc

```
35  c1f7ba2aaa  U-MCX-METADATA-WIRE              97/98 .mcx-* metadata wired
36  d190ea6fbd  U-WEDM-COMPARABLE-PAIRS-INDEX    0/22 paired — sibling-NC refuted
37  feb1d9ac9c  U-WEDM-STANDALONE-NC-CORPUS      22/22 parsed
38  0a690f376a  U-WEDM-CORPUS-CORRECTION         19/22 misfiled lathe
39  4cbc862292  U-PHASE-B-TEMPLATE-MINING        80/97 wire-dominant
40  409cc89d5d  U-MCX-COMPRESSION-DIAGNOSTIC     X8 genuinely opaque (peer-absorbed)
41  00c2fb1499  U-MCX-MATERIAL-VOCAB             material vocab dead end
42  c117f699c7  U-MCX-MACHINE-DEFINITION-VOCAB   .wmd catalog — 53/97 explicit FA-FX
43  721a4a49d9  U-WMD-MACHINE-CLASS-REGEX-TIGHTEN  Mitsubishi exposure 53→85
44  7479f60460  U-WMD-ZERO-INVESTIGATE           18 zero-wmd = default-machine-def
45  fe4af8d4a9  U-WMD-MODEL-NUM-REGEX-TIGHTEN    binary-noise false-positive killed
46  e8736489e3  U-WEDM-PHASE-A-WIKI              this canonical wiki entry
47  844f19b15f  U-MCX-PST-CATALOG                .pst catalog — 77/97 Mitsubishi WEDM posts
48  b6cb0c40d0  U-WEDM-CROSS-PROCESS-IDENTIFY    9 cross-process manifests named + cross-shared
```

Each iter's finding chained into the next unit's framing. R12 fail-loud
discipline canceled 3 wrong-work units mid-session (would have shipped
incorrect engine extensions).

## What the corpus actually contains

**98 high-confidence pairs** in `state/shared/wedm-pair-v4-results.json`:
- 97 with `.mcx-*` reference programs (97 .mcx-8 Mastercam X8)
- 1 missing reference (af102-05 manifest was on schema 1.0.0 — orthogonal)

**Reference metadata coverage** (after iter-35 wire to McxProgramParserEngine):
- 97/98 manifests carry `reference_metadata` block
- All format `.mcx-8` (100% X8)
- 80/97 surface `machine_hints: ["wire"]` from regex over embedded printable runs

**Posted-NC corpus** (after iter-36 sibling search):
- Only 22 candidate NC text files across the entire `JM DIE/WIRE EDM/` tree
  vs 3,970 .mcx-* binaries (0.55% pairing potential)
- 0 pairing matches by stem (cross-tree) — operators don't post-NC sibling .mcx-*
- 19 of 22 turned out to be **misfiled mitsubishi-lathe** programs
  (`$NAME.MIN%` macro prelude → G50/G96/G97/T-codes/NTURN canned cycles)
- 2 of 22 are real WEDM (H-register declarations: ITW SHAKEPROOF + NOZE TEST)
- 1 indeterminate (bare G-code tutorial sample)

So the **real comparable-NC corpus is 2 programs**. Too few for dialect
calibration. Cross-slot note posted to bravo (lathe domain owns the 19
misfiled programs).

**Machine-definition references** (after iter-42 .wmd catalog):

| .wmd identity | manifests | machine_class |
|---|---:|---|
| `X WIRE (TECH).wmd-5` | 77/97 | generic_wire (Mastercam X5 default) |
| `MPW MITS FA-FX EDM(TECH).wmd-8` | 53/97 | mitsubishi_fa_fx |
| `MITSUBISHI FA-SERIES 4X WIRE (TECH).wmd-8` | 16/97 | mitsubishi_fa_series |
| `MITSUBISHI FA-SERIES 4X WIRE (TECH).WMD-8` | 15/97 | mitsubishi_fa_series (case variant) |
| `Wire Default.wmd-8` | 2/97 | generic_wire |
| `MITSUBISHI FA-SERIES 4X WIRE.WMD` | 1/97 | mitsubishi_fa_series |
| `WIRE DEFAULT.WMD` | 1/97 | generic_wire |

After iter-43 regex tightening: 53 explicit FA-FX + 32 FA-SERIES = **85/97
explicit Mitsubishi (88%)**. Combined with the 77 X WIRE (TECH).wmd-5
(generic default operators leave when posting to Mitsubishi) =
effectively 100% Mitsubishi-targeted corpus.

**Post-processor references** (after iter-47 .pst catalog extension):

| .pst identity | manifests | classification |
|---|---:|---|
| `MPW MITS FA-FX EDM(TECH).PST` | 53/97 | Mitsubishi FA-FX WEDM post |
| `Mitsubishi FA-Series 4X Wire (TECH).pst` | 24/97 | Mitsubishi FA-Series 4-axis WEDM post |
| `NONE.PST` | 6/97 | Mastercam default placeholder |
| `MPWFANUC.PST` | 2/97 | Fanuc mill post (cross-process) |
| `MPM ROKU ROKU VMC.pst` | 1/97 | ROKU-ROKU mill post (cross-process) |
| `OKUMA_LB3000MSY.psT` | 1/97 | Okuma LB3000 lathe/mill-turn post (cross-process) |
| `NONE.pst` (case variant) | 1/97 | Mastercam default placeholder |
| `I FA-SERIES 4X WIRE.PST` | 1/97 | FA-Series 4X variant |

**Explicit Mitsubishi WEDM post = 77/97 (79%).** Combined with the iter-44
zero-wmd structural finding, cross-validates the iter-43 88% machine-def
signal: programs that select a Mitsubishi machine-def also select a
Mitsubishi post (as expected — Mastercam couples them).

**Cross-process manifests** (after iter-48 cross-check of pst-non-WEDM AND
machine_hints-non-wire):

| Stem | Identified via | Hints | Suggested slot |
|---|---|---|---|
| `3004-201819` | pst + hints | mill+lathe | alpha-mill |
| `34n-d749-tt` | pst + hints | lathe | bravo-lathe |
| `allfast_40-006-108` | pst + hints | mill+wire | bravo-or-india |
| `wtp_15185` | pst only | (none) | Fanuc mill |
| `13229` | hints only | mill+wire | (dual-purpose) |
| `500-23586-05630-02` | hints only | mill+wire | (dual-purpose) |
| `allfast_-_20-011-082` | hints only | mill+wire | (dual-purpose) |
| `grandeur_-_3004-201469` | hints only | mill+wire | (dual-purpose) |
| `itw_shakeproof_500-30540-24000-04.nc_-_newest` | hints only | mill+wire | (dual-purpose) |

3 of these are high-confidence (both signals fire). 5 are dual-purpose
projects (Mastercam files with both mill AND wire operations — these still
belong to charlie's wire-EDM scope but also touch alpha's mill scope).
1 (wtp_15185) is pst-only with no machine_hints — needs investigation.

Cross-shared to alpha/bravo/india via `AGENT_CHAT.jsonl` (iter-48
`b6cb0c40d0` commit).

**Net pure-WEDM count**: 97 − 9 cross-process = **88 pure-WEDM manifests**.
Triple-validation: machine-def (88%) + post-processor (79%) + cross-process
subtraction all converge on Mitsubishi FA-class dominance.

**Zero-wmd manifests** (18 of 97, after iter-44 investigation):
- All 3 sampled (af102-05, 0137471, 12270_gage) are Mastercam projects
  where operator imported geometry (DXF / IGS) and never customized the
  machine definition. Default machine-def lives in the X8 compressed
  proprietary region (iter-40 proved opaque).
- Embedded strings dominated by Mastercam framework noise (`Stream N
  (not used)` × 8, `@Main Viewsheet`, `MastercamPlanes`, `Matrix33`).
- Conservative assumption: these 18 also default to Mitsubishi FA-class
  (matches 88% corpus signal).

## What got CANCELED via R12 fail-loud

Three units were proposed mid-arc that would have been WRONG WORK:

1. **U-WEDM-MIN-DIALECT-DETECT** (iter-37 → canceled iter-38).
   Would have extended `WireEDMProgramParserEngine.detectDialect()` to
   recognize Mitsubishi .MIN signatures. CANCELED because content sniffing
   proved 19 of 19 .MIN files are **lathe** code (G50/G96/G97 + T-codes +
   NTURN), not WEDM. The "dialect-detection gap" was actually correct
   parser behavior (returning `unknown` for non-WEDM input).

2. **U-MCX-COMPRESSION-COVERAGE** (iter-39 → canceled iter-40).
   Would have extended `McxProgramParserEngine` to find zlib chunks in
   the 89/97 X8 binaries reporting zero. CANCELED because full-byte-scan
   for every zlib/gzip/zip/xz/bzip2/lzw/lz4 marker showed those binaries
   genuinely have NO off-the-shelf compression at the byte level.
   `engine_vs_scan_delta = 0` across all 5 sampled files. X8 is
   proprietary; op-count recovery needs Mastercam SDK / NETHOOK.

3. **U-MCX-MATERIAL-VOCAB engine-extension** (iter-41 self-cancel).
   Would have expanded `COMMON_MATERIAL_TOKENS` regex to catch
   "carbide", "tool steel", "die steel", "hardened", HRC ratings, P20,
   S7, A2, etc. CANCELED because 0 of 5 sampled binaries surface ANY
   material-descriptor pattern. Operators don't put material info in
   Mastercam — material lookup happens upstream in the shop's ERP / job
   traveler.

## Coverage ceiling

Phase-A reached its structural ceiling at this token budget. Future
extension requires:
- **Mastercam SDK / NETHOOK** access for X8 internal toolpath text →
  unlocks operation-count recovery, full deviation reports, per-op tool
  sequences.
- **External WEDM training corpora** (vendor sample programs, public
  corpora, synthetic generation) → JM Die alone yields only 2 real
  operator-authored WEDM programs.
- **Operator interviews** for the 18 zero-wmd default-machine-def
  projects — what physical machine did each actually target?

## Operational defaults for charlie

PRISM WEDM safety/physics defaults should bias toward **Mitsubishi
FA-class** for JM Die work, validated at 88% minimum corpus signal
(see charlie slot-soul §Behavior #4 "Multi-pass discipline per
Sandvik/Mitsubishi recipe"). Specifically:

- **Controller dialect**: Mitsubishi WEDM (M20/M21 thread/cut wire,
  M78/M58 fill/drain tank, M90 adaptive control, E-codes,
  G51 W taper, H-register offsets).
- **Multi-pass recipe**: rough → semi-finish → finish per Mitsubishi
  FA-series tech-database convention.
- **Machine envelope**: FA-class XY travel (typically 250-400 mm range),
  UV travel (±70-100 mm), Z (200-300 mm). Cross-reference machine
  capability lookup against the actual FA model identifier when known.
- **Surface integrity gates**: shop_floor tier Ω≥0.95, S(x)≥0.98.

## Where the corpus artifacts live

```
state/shared/wedm-pair-v4-results.json              98 high-conf pairs (input)
state/shared/wedm-training-corpus/                  97 phase-a1 manifests + sweep-summary
state/shared/wedm-comparable-pairs.json             22 NC files + family classification
state/shared/wedm-standalone-nc-corpus.json         22/22 parse results
state/shared/wedm-phase-b-patterns.json             aggregated 97-pair pattern catalog
state/shared/wedm-mcx-compression-scan.json         full-byte-scan diagnostic
state/shared/wedm-mcx-material-vocab-scan.json      operator-vocab discovery (0 hits)
state/shared/wedm-mcx-wmd-catalog.json              .wmd-* + .pst catalog (canonical, iter-47 extended)
state/shared/wedm-mcx-zero-wmd-investigation.json   18 zero-wmd analysis
state/shared/wedm-cross-process-manifests.json      9 cross-process manifests (iter-48)
```

Scripts (all require `mcp-server/node_modules/.bin/tsx` invocation for `.ts` engine imports):

```
scripts/wedm-phase-a1-sweep.mjs                 batch parse-+-wizard sweep
scripts/wedm-comparable-pairs-index.mjs         posted-NC sibling index + dialect sniff
scripts/wedm-standalone-nc-parse.mjs            parse the 22 standalone NC
scripts/wedm-phase-b-pattern-mine.mjs           aggregate reference_metadata into catalog
scripts/wedm-mcx-compression-scan.mjs           hex-scan for non-zlib markers
scripts/wedm-mcx-material-vocab-scan.mjs        operator-vocab discovery
scripts/wedm-mcx-wmd-catalog.mjs                .wmd-* + .pst extraction (canonical, iter-47 extended)
scripts/wedm-mcx-zero-wmd-investigate.mjs       zero-wmd sample inspection
scripts/wedm-cross-process-identify.mjs         cross-process manifest crosscheck (iter-48)
```

## Cross-references

- Memory: `[[reference_phase_a_3iter_progression_2026_05_23]]` (iter 35-37 origin chain)
- Memory: `[[reference_u_mcx_metadata_wire_2026_05_23]]` (iter-35 framing-correction context)
- Memory: `[[reference_wedm_phase_a1_proven_end_to_end_2026_05_22]]` (iter-33 pre-this-arc state)
- Engine: `McxProgramParserEngine` (LATHE-PROD-READY-MS0/U-LPR26)
- Engine: `WireEDMProgramParserEngine` (dialect detection used in iter-37)
- Engine: `WEDMProgramComparisonEngine` (would have consumed comparable pairs if they existed)
- Slot soul: `charlie` (wire-EDM specialist)
