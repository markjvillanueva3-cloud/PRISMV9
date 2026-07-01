---
name: reference_jsonl_db_loader_regression_2026_06_06
description: "DatabaseRegistry JSON.parse'd .jsonl DBs → 20,736-entry vendor ledger silently dead fleet-wide; fixed line-by-line loader"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.629Z
aliases: reference_jsonl_db_loader_regression_2026_06_06
---


**JSONL DB loader regression (slot:romeo, 2026-06-06, commit on cad-fusion-live-ms0 `U-ROMEO-JSONL-DB-LOADER-FIX`).**

`DatabaseRegistry.loadDatabases` (`mcp-server/src/registries/DatabaseRegistry.ts:101`) ran
`JSON.parse(readFileSync(file))` on **every** `type:"file-backed"` DB — including `.jsonl`
files. A JSONL file (one JSON object per line) throws `Unexpected non-whitespace character
after JSON at position 244 (line 2 column 1)` on the second line, so the whole DB loaded as
`status:"error"`. Hit `jm-vendor-ap-ledger.jsonl` (**20,736 entries**, the JM Die vendor A/P
ledger, charlie/quoting) → silently dead in **every session** fleet-wide (WARN-only, never
surfaced). Same silent-data-loss class as the VLM leading-dot and truncation bugs.

**Surfaced by:** a new R15 proof test `dataDispatcher.db-served-live.test.ts` that round-trips
machine/tool/insert/holder searches through `prism_data` and asserts each DB returns ≥1 real
record — the registry-load WARN appeared during the run.

**Fix:** detect `.jsonl` extension → split lines, `JSON.parse` each, load the good rows, and
**fail loud on the skip count** (one bad line no longer drops the whole DB) rather than total
failure. General — unblocks ALL `.jsonl` file-backed DBs, not just the ledger.

**Lesson:** a DB-coverage / "is every database accounted for" audit must check `database_list`
for `status:"error"` entries — a registry can hold a DB that never parsed. Verify load status,
not just that the manifest entry + dispatcher wire exist. Related: [[reference_juliett_jm_die_database_2026_05_29]].
