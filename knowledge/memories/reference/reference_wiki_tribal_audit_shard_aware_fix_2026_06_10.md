---
name: reference-wiki-tribal-audit-shard-aware-fix-2026-06-10
description: "BUG FIX (slot:india, 2026-06-10): wiki-tribal-cross-ref-audit.mjs read the orphan MONOLITH (tribal-embed-index.json) via readFileSync instead of the canonical SHARDS -- the one monolith-only reader the 2026-06-08 shard migration missed. It understated the embedded set (wrong fleet coverage headline + overstated embed-driver work-list = skip-waste) and, once the orphan monolith was deleted, ENOENT-FATAL'd the daily PRISM Wiki-Tribal Audit Regen cron (matches the LastResult=267011 never-runs in reference_wiki_tribal_coverage_17pct_2026_06_09). Fix: streamTribalEntries (manifest-first, O(1)-heap). LIVE: coverage 69.2->77.1pct, missing 13228->9965. Commits 35acfb15b4 + the E2E repoint."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.264Z
aliases: reference_wiki_tribal_audit_shard_aware_fix_2026_06_10
---


2026-06-10 (slot:india, cross-galaxy authority). While converging the wiki-RAG embedding gap
([[reference_fleet_ai_systems_audit_2026_06_10]]) I found the measurement substrate itself was lying.

**THE BUG.** `scripts/wiki-tribal-cross-ref-audit.mjs:167` did
`const raw = fs.readFileSync(TRIBAL_INDEX_PATH, "utf8"); JSON.parse(raw)` where TRIBAL_INDEX_PATH is the
MONOLITH `state/shared/tribal-embed-index.json`. The tribal index SHARDED on 2026-06-08 (it crossed V8's
512MiB string cap); the canonical entries moved to `tribal-embed-index.shard-NNN.json` (manifest-listed) and
the monolith became a stale, then DELETED, orphan. So the audit:
1. Computed the fleet-wide "Wiki<->Tribal coverage 69.2pct" headline + the `embed-missing-wiki-batch.mjs`
   work-list against the WRONG (stale/partial monolith) embedded-set -> coverage understated, missing
   OVERSTATED by ~3263 files (already-sharded files the monolith read could not see -> the embed driver was
   fed them and hash-skip-wasted, which I observed live as added=0 from-the-top runs).
2. Once the orphan monolith was deleted (mid-session), the `readFileSync` ENOENT'd -> "FATAL: tribal index
   read failed" -> the daily `PRISM Wiki-Tribal Audit Regen` scheduled task was crashing every run (this is
   the `LastResult=267011` "NEVER executed" in [[reference_wiki_tribal_coverage_17pct_2026_06_09]]).

This is the SAME class as the other shard-migration misses (load-tribal-index.mjs readIndex monolith-only fix
`8bf1873577`, the tribal-rerank stream-fix). The cross-ref audit was the one monolith-only reader the
migration missed.

**THE FIX (commit 35acfb15b4).** Replace the monolith read with `streamTribalEntries(TRIBAL_INDEX_PATH, ...)`
from `scripts/lib/load-tribal-index.mjs` -- manifest-first (reads shards when the manifest exists, else the
monolith), O(1)-heap (off-heap Buffer, one entry parsed at a time), projecting ONLY the four fields
`tribalWikiPath()` reads (`id, source, kind, path`) -- never the 768-float embedding. Pure-core `audit()`
unchanged.

**VALIDATED LIVE (R15).** Fixed audit re-run: wiki files on disk 43464, tribal wiki entries 33499 (the
shards, not the ~6.7K monolith), missing 13228->9965, stale 0, coverage 69.2->77.1pct. 26/26 tests pass.
3-of-3 scrutiny PASS (all arms verified on live data; arm C confirmed the daily cron now succeeds).

**E2E TEST FIX (2nd commit, the P1 both scrutiny arms flagged).** The "real-data E2E" test
(`wiki-tribal-cross-ref-audit.test.mjs`) had silently SKIPPED for months: it `existsSync`-checked the
monolith path (now absent) -> early return -> asserted nothing, AND would not fail on a revert. Repointed it
to `streamTribalEntries` (mirrors production), skip only if NEITHER layout exists, + an `entries>=1000`
anti-dead-test guard so a silent-empty read fails loud. E2E now executes (no skip) against the live shards.

**LESSON.** A storage-LAYOUT migration (monolith -> shards) must update EVERY reader, not just the hot-path
ones. The cold readers (an advisory audit, a daily cron) rot silently: they read the orphan, or crash when it
is finally deleted, and the wrong numbers they emit drive downstream waste (the embed work-list). When you
shard/migrate a corpus, grep for EVERY `readFileSync(<the-old-path>` + every `existsSync(<old-path>)` skip
guard. And a test that `existsSync`-skips on a path that a migration can delete is a DEAD test that reports
green while covering nothing -- guard real-data E2Es with a positive floor (entries>=N), not just a skip.
See [[reference_tribal_index_v8_string_cap_2026_06_08]] + [[reference_tribal_shard_read_clobber_2026_06_10]]
+ [[feedback_always_update_wiki_on_bug_finding]].
