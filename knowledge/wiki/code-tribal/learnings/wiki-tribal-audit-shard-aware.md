# Wiki-Tribal cross-ref audit: read the canonical shards, not the orphan monolith

**Slot:** india · **Date:** 2026-06-10 · **Commits:** `35acfb15b4` (fix) + the E2E repoint
**Class:** storage-layout-migration reader-rot (silent measurement bug + daily cron FATAL)

## Symptom
- Fleet SessionStart headline "Wiki<->Tribal coverage 69.2% / 13,228 missing" was wrong (stale).
- The daily `PRISM Wiki-Tribal Audit Regen` scheduled task had `LastResult=267011` = never executed
  (it was ENOENT-crashing).
- `embed-missing-wiki-batch.mjs` was fed an overstated work-list -> from-the-top runs hash-skip-wasted
  (`added=0`) because the list included files already present in the shards.

## Root cause
`scripts/wiki-tribal-cross-ref-audit.mjs` read the index with
`fs.readFileSync(TRIBAL_INDEX_PATH, "utf8")` where `TRIBAL_INDEX_PATH` is the MONOLITH
`state/shared/tribal-embed-index.json`. The tribal index **sharded on 2026-06-08** (it crossed V8's
512MiB string cap, `0x1fffffe8`); the canonical entries moved to `tribal-embed-index.shard-NNN.json`
(listed in `tribal-embed-index.manifest.json`) and the monolith became a stale, then **deleted**, orphan.
The audit was the **one monolith-only reader the shard migration missed** (cf. the `load-tribal-index.mjs`
readIndex fix `8bf1873577` and the tribal-rerank stream-fix). Reading the orphan understated the embedded
set; once the orphan was deleted the `readFileSync` ENOENT'd -> `FATAL` -> the daily cron crashed every run.

## Fix
Switch the read to `streamTribalEntries(TRIBAL_INDEX_PATH, onEntry)` from `scripts/lib/load-tribal-index.mjs`:
- **manifest-first** (reads the shards when the manifest exists, else falls back to the monolith),
- **O(1)-heap** (off-heap Buffer, one entry string-parsed at a time -- cap-safe at any shard size),
- project ONLY `{id, source, kind, path}` (the fields `tribalWikiPath()` reads) -- never the 768-float
  `embedding`, so the audit runs at default heap over 33.5K entries.

Pure-core `audit()` is unchanged.

## Validated (live)
Re-run after the fix: wiki files on disk 43,464 · tribal wiki entries **33,499** (shards, not the ~6.7K
monolith) · missing **13,228 -> 9,965** · stale 0 · coverage **69.2% -> 77.1%**. 26/26 tests pass.
3-of-3 scrutiny PASS; arm C confirmed the daily cron succeeds post-fix.

## Companion test fix
The "real-data E2E" test had silently skipped for months (it `existsSync`-checked the now-deleted monolith
path -> early return -> asserted nothing, and would not fail on a revert). Repointed to `streamTribalEntries`
(mirrors production), skip only if NEITHER layout exists, + an `entries>=1000` anti-dead-test floor.

## Lesson
A storage-LAYOUT migration must update **every** reader, not just the hot path. Cold readers (advisory
audits, daily crons) rot silently -- they read the orphan, or crash when it is finally deleted, and the wrong
numbers they emit drive downstream waste. When you shard/migrate a corpus: grep for every
`readFileSync(<old-path>` and every `existsSync(<old-path>)` skip-guard. A real-data E2E that skips on a
deletable path is a **dead test** that reports green while covering nothing -- guard it with a positive floor
(`entries>=N`), not just a skip.

Related: `[[reference_tribal_index_v8_string_cap_2026_06_08]]` · `[[reference_tribal_shard_read_clobber_2026_06_10]]` · `[[reference_wiki_tribal_coverage_17pct_2026_06_09]]`
