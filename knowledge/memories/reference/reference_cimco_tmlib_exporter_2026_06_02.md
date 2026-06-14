---
name: reference_cimco_tmlib_exporter_2026_06_02
description: "PRISM → CIMCO Edit 2026 tool-library (.tmlib) exporter — keystone of filling CIMCO's tool database from PRISM's tool corpus (slot romeo)"
type: reference
slot: romeo
source: prism-memory
synced: 2026-06-09T14:54:09.066Z
aliases: reference_cimco_tmlib_exporter_2026_06_02
---


PRISM can now **fill CIMCO Edit 2026's Tool Library database** from its own tool corpus.
Built by slot romeo (CIMCO-TOOLDB-FILL-MS0 / U-CTF-LIB+EXPORT, commit on `cad-fusion-live-ms0`).
This is the concrete build of the "ingest .tmlib" need flagged in [[reference_cimco_install_corpus_2026_06_02]].

## What shipped
- `scripts/lib/cimco-tmlib.mjs` — pure PRISM-tool → CIMCO `.tmlib` XML emitter. The `.tmlib`
  schema was **reverse-engineered from real installed bytes** (`ToolLibs/Predefined/*.tmlib`,
  `<Library Version="4">`): 6 cutter/holder types — **EndMill, CommonDrill** (TipAngle 140),
  **SpotDrill** (TipAngle 90 + TipDiameter), **Countersink, TapRightHand, Holder** — each with
  the exact ordered `<Parameter Type=...>` set. Key formula: **ThreadPitch = 25.4²/TPI =
  645.16/TPI** (verified vs `Inch Taps.tmlib`: 1/4-20→32.258, 1/4-28→23.04).
- `scripts/export-tools-to-cimco-tmlib.mjs` — units-first exporter. `EXTRACTED_DETAILED_TOOLS`
  (720 recs in `prism-reference-db/tools.json` `stores`) verified **INCH-native**; the script
  converts native→mm, then emits in the chosen output unit. Refuses stores whose native unit is
  unverified (no 25.4× guess) + skips records outside 0.05–200 mm post-conversion. First run:
  **720 → 620 EndMill cutters**, lossless inch round-trip (Harvey 0.015″ → FluteDiameter 0.015).
- 19/19 `node:test` (`scripts/lib/__tests__/cimco-tmlib.test.mjs`) incl. a test that parses the
  **real installed `Inch Mills.tmlib`** + the explicit 25.4× units check.
- Operator guide for all 4 CIMCO DBs: `state/shared/specs/CIMCO-EDIT-2026-DB-FILL-GUIDE.md`.

## Why / how to apply
**Why:** CIMCO Machine Simulation is PRISM's verification oracle; the tool library is the one
CIMCO DB that PRISM's 54K-tool corpus genuinely enriches, and a wrong native-unit read is the
25.4× scale class the units-guard exists to prevent — so units detection is verified-or-refused.
**How:** `node scripts/export-tools-to-cimco-tmlib.mjs [--store <k> --native inch|mm --units imperial|metric]`
→ `mcp-server/data/cimco-export/toollibs/*.tmlib` → import in CIMCO Tool Manager.

## Open / follow-ups
- **U-CTF-WIRE** — wire `cimco_toollib_export` as an MCP dispatcher action (romeo domain; verify via `prism_session:dispatcher_map_compact`).
- Scrutiny 3-of-3 was **deferred** at commit (subagent reviewers were account-rate-limited fleet-wide 2026-06-02; same limit hit echo's workflow). Run on HEAD when limits clear.
- Machine-config (#2) = clone-a-template; NC-Base (#4) = MariaDB SQL ingest — both separate romeo/juliett units.
- Confirm the exact Tool Manager "import library" menu wording in-app (format + folder verified).
