# JM DIE archive top-level layout audit

**Generated:** 2026-05-26T10:06:33.752Z by quoting-jm-die-layout-audit.mjs (iter36)
**Root:** H:\PRISM\JM DIE
**Total top-level dirs scanned:** 21

## Bucket counts

- LIKELY_CUSTOMER: 0
- LIKELY_MACHINE:  8
- LIKELY_CONFIG:   9
- UNKNOWN:         4

## LIKELY_MACHINE

| Name | childDirs | childFiles | dominantType | sample children |
|---|---:|---:|---|---|
| `CNC LATHE` | 118 | 93 | mixed | ACME, ACUMENT, ADDISON FASTENERS |
| `CNC MILL HAAS` | 58 | 1 | dir-heavy | acronic, Agrati-Medina, AIR INDUSTRIES COMPANY |
| `CNC OKUMA MULTUS` | 3 | 10 | file-heavy | ACCURATE THREADED, AIR-INDUSTRIES, ITW |
| `HAAS-HURCO` | 64 | 62 | mixed | ACCURATE THREADED FASTENERS, ACUMENT GLOBAL TECHNOLOGIES, AFI INDUSTRIES |
| `LATHE` | 2 | 0 | dir-heavy | HI-PERFORMANCE, OPTIMAS |
| `OKUMA` | 9 | 0 | dir-heavy | FINALIZED SETUPS, hyperCAD-S and hyperMILL Online Training, JM Die Company |
| `ROKU-ROKU` | 78 | 43 | mixed | ACME, AFI, AGRATI |
| `WIRE EDM` | 99 | 38 | dir-heavy | ACME, ACUMENT SPENCER, AGRATI |

## LIKELY_CONFIG

| Name | childDirs | childFiles | dominantType | sample children |
|---|---:|---:|---|---|
| `HURCO CNC PROGRAMS` | 0 | 23 | file-heavy | (none) |
| `MACRO PROGRAMS` | 0 | 4 | file-heavy | (none) |
| `MATTHEW programs` | 2 | 704 | file-heavy | jm, New folder |
| `POST PROCESSORS` | 2 | 1 | dir-heavy | 1. CONSOLIDATED, 2. PRISM ENHANCED |
| `PRISM MODIFIED POST PROCESSORS` | 1 | 17 | file-heavy | mcp-server |
| `QUEUE` | 14 | 84 | file-heavy | AutoDraw-rev, CHAT-GPT TEST PROMPT PARTS, CLAUDE -  3D MODELS |
| `REVERSE ENGINEERING` | 2 | 33 | file-heavy | New folder, OldVersions |
| `SETUPS` | 1 | 4 | file-heavy | OldVersions |
| `_PART LIBRARY` | 473 | 3 | dir-heavy | AAAMECONINGPIN, AAAS, AAFAS |

## UNKNOWN

| Name | childDirs | childFiles | dominantType | sample children |
|---|---:|---:|---|---|
| `BASEBALL PARTS` | 1 | 1 | mixed | OldVersions |
| `GENERAL BANDAGES` | 1 | 12 | file-heavy | OldVersions |
| `JM DIE COMPANY` | 12 | 10 | mixed | $RECYCLE.BIN, Downloads, EAGLESTONE PARTS |
| `PRISM CAD TESTING` | 0 | 1 | file-heavy | (none) |

## Calibration hints for iter9 extractor

### Suggested NON_CUSTOMER_SUBDIRS additions (verify against iter35 list)

- _All LIKELY_CONFIG entries already covered by iter35 regex extension._

### Likely customer dirs (LIKELY_CUSTOMER bucket) — these should resolve through extractor as customers


### UNKNOWN bucket — operator manual triage required

- `BASEBALL PARTS` — childDirs=1 childFiles=1 (mixed)
- `GENERAL BANDAGES` — childDirs=1 childFiles=12 (file-heavy)
- `JM DIE COMPANY` — childDirs=12 childFiles=10 (mixed)
- `PRISM CAD TESTING` — childDirs=0 childFiles=1 (file-heavy)

### Recommended extractor policy

Per iter34 F2: the assumption `/JM DIE/{CUSTOMER}/{MACHINE}/{file}` is only partially true. The actual layout is mixed-mode:

- Some top-level subdirs ARE customers (most LIKELY_CUSTOMER bucket)
- Some top-level subdirs are machine-class collections that contain customer subdirs at depth=2 (LIKELY_MACHINE bucket — e.g. `CNC MILL HAAS/{CUSTOMER}/...`)
- Some top-level subdirs are pure config (LIKELY_CONFIG — extractor should skip)

**Conservative extractor policy:** walk `/JM DIE/` looking for the FIRST segment that:
- is NOT in NON_CUSTOMER_SUBDIRS (iter9+iter35 regex)
- AND is NOT in MACHINE_RE — if it IS a machine, descend one level and use depth-2 as customer

This matches what iter9 already does. The findings above confirm the policy is sound — what was broken was the regex coverage, which iter35 has now fixed.