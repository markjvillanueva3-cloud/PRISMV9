---
title: MaterialRegistry silently empty under concurrency -- EMFILE + async-init race (bug class)
type: lessons
galaxy: shared-core
slot: whiskey
created: 2026-06-26
tags: [material-registry, emfile, concurrency, async-init, in-flight-guard, fleet-wide, bug-class, file-handles]
related:
  - "[[reference_whiskey_jm_stock_turning_state_2026_06_26]]"
  - "[[lathe-closed-loop-tribal-findings-2026-06-26]]"
---

# MaterialRegistry silently empty under concurrency (fleet-wide bug, fixed 2026-06-26)

Surfaced by the lathe closed-loop harness (slot:whiskey); the bug is in **shared core**, so it degraded
EVERY physics consumer, not just the lathe path. Two commits fixed it: `U-W10-MATERIAL-EMFILE-FIX`
(concurrency cap) + `U-W11-MATERIAL-INFLIGHT-GUARD` (async-init guard).

## Symptom
`mcp-server/src/registries/MaterialRegistry` logged `FileSystemError: File system error during parse`
for every `H:/PRISM/data/materials/*/*.json`, yet those files parse FINE standalone (`tool_steel.json`
4.4MB -> valid JSON, 314 materials). Under load the registry held **0 materials**, so consumers fell back
to canonical-ISO `CANONICAL_KIENZLE` defaults everywhere (SAFE, but no per-grade enrichment). The lathe
harness OOM'd / timed out.

## Root cause (a trio -- confirmed by a temporary `error.code` diagnostic)
1. **`utils/files.ts readJsonFile`** catches read+parse together and only special-cases `ENOENT`; any
   other error (here **`EMFILE: too many open files`**) falls through and is MISLABELED op "parse". The
   files weren't malformed -- the *reads* were failing. (Still open, low priority -- the error label.)
2. **`MaterialRegistry.load()`** ran `Promise.all` over 7 ISO groups, each `loadISOGroup` running its own
   `Promise.all` over ~40 files = ~300 concurrent `fs.readFile` -> **EMFILE** (4806 occurrences in one run).
3. **No async-init in-flight guard.** `load()` guarded only on `if (this.loaded) return`. It is a
   singleton, but the harness calls `load()` concurrently (parallel program generation); callers raced
   past that check before the first load set `loaded=true`, each starting its OWN full load -> N redundant
   full loads (which also multiplied the open-handle count). When a load returned 0 materials, the "W5"
   guard deliberately did NOT set `loaded=true` ("retry next call") -> an infinite per-call reload storm
   -> heap OOM.

## Fix
- `load()` loads ISO groups SEQUENTIALLY; `loadISOGroup` reads files in bounded batches of 8
  (`READ_CONCURRENCY=8`) -> peak <=8 open handles. (U-W10)
- Standard async-init in-flight guard: `load()` shares one `loadPromise`; concurrent callers await the
  same load; `doLoad()` holds the original body. Public contract unchanged. (U-W11)
- Result (validated via the harness at DEFAULT 4GB heap): EMFILE 4806->0, `MaterialRegistry loaded: 3989
  materials` (was 0), full loads 4+ ->1, EXIT 0 in **5s** (was OOM/240s-timeout), accuracy unchanged.

## Reusable lessons (bug classes)
- **EMFILE from unbounded `Promise.all` over file reads.** Fanning out `fs.readFile` over hundreds of
  files at once exhausts handles on Windows. Bound it (batch / p-limit ~8); ~40 concurrent already trips it
  here once other I/O is counted.
- **A read error mislabeled as a parse error** hides the real `errno`. When a file "fails to parse" but
  parses fine standalone, log the raw `error.code` (EMFILE/EACCES/EBUSY...) before trusting the label.
- **Singleton async-init needs an in-flight `loadPromise` guard, not just a boolean.** `if (this.loaded)
  return` does NOT protect against concurrent callers racing before the first init finishes -> redundant
  inits. Share one promise.
- **A "retry on failure" guard (W5) without backoff turns a transient error into an infinite storm.** If
  init can fail transiently, cap retries or back off -- never re-run the full init on every call.
- **Shell gotcha:** backticks inside a bash double-quoted `git commit -m "..."` are command-substituted and
  silently dropped from the message. Use a quoted heredoc (`-F - <<'MSG'`) for messages with code refs.
