# Corpus Cutting-Data Accounting (CORPUS-CUTTING-CORPUS)

**slot:romeo, 2026-06-14** -- the comprehensive answer to the operator directive:
*"run continuous loops until all tools and tool holders in our databases are
accounted for, for all materials with cutting parameters for different tool
paths in each material."*

Every tool + every holder in the **unified `ToolCatalogEngine` corpus** is
accounted for, with deterministic per-(material grade x toolpath) cutting
parameters computed by the same JM condition matrix that produced the JM Fusion
crib (`scripts/lib/jm-tool-condition-matrix.ts` -> `ultimateSpeedFeedEngine`).
The math is CODE (Kienzle/Taylor via the SFC engine), not an LLM per tool.

## Coverage (the proof is the number, not "looks done")

| metric | value |
|--------|-------|
| corpus tools accounted | **118,409 / 118,409 (100%)** |
| tool holders accounted | **1,164** |
| **accounted total** | **119,573** |
| tools that produced >=1 preset | 100,333 |
| tools enumerated but geometry-missing (dia=0) | 17,720 -> `ACCOUNTED-NO-GEOMETRY.csv` |
| tools with geometry but all grades gated out | 356 |
| **cutting presets emitted** | **7,151,954** |
| distinct brands | 38 |
| per-group presets | P 1,545,360 / M 1,544,420 / K 1,031,476 / N 1,514,474 / S 1,011,812 / H 504,412 |

Material grades: the 14 JM job-material grades (1018/1045/4140 steel; 304/316 SS,
17-4 PH, 2205 duplex; gray/ductile iron; 6061/7075 alum, brass, copper;
Ti-6Al-4V, Inconel; hardened tool steel) across ISO P/M/K/N/S/H.
Toolpaths: per tool family -- Rough / HEM Adaptive / Trochoidal / Slot / Ramp /
Semi / Finish / HSM for milling; Drill / Peck; Ream; Tap; Bore/Turn/Groove
Rough+Finish; Thread.

ISO applicability: gated by each tool's vendor-declared `iso_groups` when present
(so a tool rated for all 6 groups gets all 6), else the substrate coating
heuristic. Holders carry no cutting data -- "accounted for" = enumerated
collision geometry (taper, gauge/body length, max RPM, runout).

## Files

| file | committed? | contents |
|------|-----------|----------|
| `COVERAGE-LEDGER.json` | yes | the coverage proof (counts above) |
| `HOLDERS.csv` | yes | all 1,164 holders, collision geometry (inch) |
| `ACCOUNTED-NO-GEOMETRY.csv` | yes | the 17,720 dia=0 tools, enumerated |
| `by-group-sample/CORPUS-*.sample.csv` | yes | first 200 preset rows per group (schema sample) |
| `by-group/CORPUS-{P,M,K,N,S,H}.csv` | **gitignored** | the full ~1.2 GB / 7.15M preset rows |

The full `by-group/` set is `.gitignore`d because it is **deterministically
regenerable** (the ledger notes "rerun reproduces byte-identical given same
corpus") and ~1.2 GB is unfit for a git integration branch.

## Regenerate

```bash
cd mcp-server
npx tsx scripts/generate-corpus-cutting-corpus.ts --reset    # full ~1.2 GB
npx tsx scripts/generate-corpus-cutting-corpus.ts --holders-only   # holders + ledger patch only
npx tsx scripts/generate-corpus-cutting-corpus.ts --limit=2000     # proof batch -> _sample/
```

Preset CSV columns: `tool_id, brand, tool_type, grade_name, iso, toolpath, op,
cut, strategy, dia_in, flutes, vc_sfm, rpm, fz_in, feed_ipm, ap_in, ae_in,
coolant, css, hb_min, hb_max, flute_source, source_file` (JM inch view; vc in
SFM, feed in IPM). `flute_source=type-default` flags the 23,117 corpus tools
whose flute count was absent and defaulted by tool family.
