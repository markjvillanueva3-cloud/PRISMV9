---
name: reference_tribal_shard_read_clobber_2026_06_10
description: 4th tribal-brain clobber - readIndex/writeIndex were monolith-only, so the FIRST shard transition (index>480MiB) made readIndex return empty -> merge wrote staged-only -> shards deleted -> 29,723 entries dropped to ~11,500. Fixed manifest-aware (8bf1873577); all 7 sibling writers shard-safe (U-TRIBAL-SIBLING-WRITER-SHARD-SAFE). FIRST live shard transition then occurred CLEANLY 2026-06-10 (33,501 entries, ZERO loss) - the definitive R15 validation; monolith untracked via git rm --cached (f6e596b767).
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.229Z
aliases: reference_tribal_shard_read_clobber_2026_06_10
---


# Tribal brain CLOBBER #4 -- shard-transition read-blind (2026-06-10, slot:sierra, commit 8bf1873577)

**I caused this.** Running the wiki->tribal coverage batch (`tribal-embed-index.mjs --update`) to raise coverage grew the index past ~480 MiB, triggering its FIRST-EVER shard transition. That exposed a latent monolith-only blind spot and clobbered the brain **29,723 -> ~11,500 entries** before I caught it (killed at 11,500; embeddings intact, recoverable).

## Root cause (verified, 3-of-3 PASS)
`write-tribal-index.mjs` shards an index >480 MiB: it writes a `.manifest.json` + shard files and `retireSupersededArtifacts` REMOVES the monolith `tribal-embed-index.json`. But `tribal-embed-index.mjs`:
- `readIndex()` checked `if (!fs.existsSync(INDEX_PATH))` -- **the monolith .json ONLY**. Once sharded (monolith removed), it returned an EMPTY bootstrap base.
- `buildOrUpdate.persist()` then merged `staged` (this batch's embeds) onto that empty base and `writeIndex()`'d a sub-threshold monolith, whose `removeShardLayout` DELETED the shards. The 29,723 base (living in the shards) was destroyed; the index became staged-only and counted UP from there (log: 31739 -> 2000 -> 2500 -> ... = exactly the staged counter).
- `writeIndex()`'s clobber-guard had the SAME monolith-only `existsSync(INDEX_PATH)` -> it SILENTLY DID NOT RUN on a sharded index, so it couldn't catch the shrink either (double blind spot).

**Why latent:** the shard writer (U-TRIBAL-SHARD-WRITER, papa) shipped AFTER the 2026-06-08 readIndex/writeIndex fail-loud fixes, introducing a sharded on-disk shape those checks never accounted for. Dormant until the index FIRST crossed 480 MiB -- which my own streaming-rerank work (removing the per-prompt heap ceiling so the index could grow) first enabled. Also: `TaskStop` killed the bash wrapper but NOT the detached node child (PID survived) -- had to `Stop-Process` the node PID directly.

## Fix (commit 8bf1873577, 14/14 tests incl 2 forced-shard regression tests that fail pre-fix)
Made BOTH `readIndex` and `writeIndex`'s clobber-guard MANIFEST-AWARE: return empty / skip the guard ONLY when NEITHER the monolith `.json` NOR the sibling `.manifest.json` exists; otherwise `loadTribalIndex` (manifest-aware) reads the shards. A sharded index can no longer read as empty, and the shrink-guard now fires on a sharded prior.

## RESOLVED 2026-06-10 -- U-TRIBAL-SIBLING-WRITER-SHARD-SAFE (commits 46c07e9cd7 + b637bfb0c4 + 9fd0c8c7d1 + 1322c38364, slot:sierra)
All tribal-index writers now route through ONE shared shard-safe + clobber-guarded IO pair, `scripts/lib/tribal-index-guarded-io.mjs` (`readTribalIndexGuarded` manifest-aware/fail-loud + `writeTribalIndexGuarded` shrink-guard over `loadTribalIndex`/`writeTribalIndex`). 3-of-3 scrutiny PASS; 163 tests green (helper 15 + 7 writer suites). **LIVE-VALIDATED 2026-06-10 (R15 step-3, with numbers):** `node --max-old-space-size=8192 scripts/embed-all-wiki.mjs --apply --limit 250` on the REAL 470MB / 33,500-entry production brain grew it exactly **33,500 -> 33,501** via the guarded path (readTribalIndexGuarded read fresh inside withTribalIndexLock + writeTribalIndexGuarded), `done:1 failed:0`, 12s, monolith stayed under the 480MiB threshold (no shard transition), shrink-guard did NOT false-trip, zero corruption -- the shared guarded IO is proven on live data, not just hermetic tests. Brain is FULLY RECOVERED (33,500 >= pre-clobber 29,723). **Embedders REQUIRE `--max-old-space-size=8192`** -- a 470MB index materializes ~33.5K entries x 768-float embeddings (~1-2GB heap) so the default node heap OOMs on the monolith JSON.parse (pre-existing across ALL embedders + tribal-rerank monolith fast-path, NOT a regression; the streaming path only engages above the 512MiB string cap). Coverage gap (clause 3, deferred to a MONITORED full batch -- NOT session-tail per lesson #2): 39,358 of 43,358 wiki files unembedded, concentrated in the walk-order TAIL (first 250 were 249/250 covered). **7 writers fixed** (read manifest-aware, write shard-aware, manifest-aware existence gates, knowledge-store + embed-all-wiki gained the cross-process lock they never had):
- `embed-engines` · `embed-knowledge-store` · `embed-cited-tips` · `prune-stale` (allowShrink:true -- intentional shrink) · `retag-backend-dev` (in-place)
- `embed-wiki` (the P1 -- largest corpus, the incident writer) + `embed-all-wiki` (the 7th -- the PRODUCTION brain-refresh.mjs:54 full-corpus driver, the actual one that crosses 480MiB).

**LESSON: the original sibling inventory was INCOMPLETE.** Reviewer B's 3-of-3 scrutiny caught TWO offenders my first pass missed: round-1 it FAILED on embed-wiki (which I had listed only as a P1 aside) + prune/retag; round-2 it FAILED again on `embed-all-wiki.mjs` -- which was NOT in this memory's inventory at all yet is the single highest-risk writer (the production full-corpus driver). An "I fixed all the siblings" claim is only as good as the writer-enumeration behind it; grep ALL writers of the shared file (the helper docstring + `tribal-index-lock.mjs` both documented "FIVE writers" -- the truth was seven). The 3-of-3 gate earned its keep here.
(Read-only `tribal-density-router-bridge.mjs` was P3 read-only -- not a writer, no clobber risk, left as-is.)

## Recovery
Brain is at ~11,500 (functional, embeddings intact). Re-running `node --max-old-space-size=8192 .claude/scripts/tribal-embed-index.mjs --update` WITH the hotfix restores it from the intact wiki/mem source (stays monolith ~238MB with capped text, so no shard transition; the hotfix handles it regardless). Launched 2026-06-10 (bg bm6f017he).

## LESSONS (R12)
1. **A new on-disk layout (sharding) must be reflected in EVERY existence/guard check, not just the happy-path reader.** One unfixed check = a clobber vector.
2. **Do NOT run a long index-mutating batch on the live production brain unattended at session-tail.** My 3-of-3 reviewers had said "wire the lock first"; I removed every blocker I could see, but a LATENT one (shard-read-blind) I couldn't see fired. Running the batch is what exposed it. The brain has now been clobbered 4x (2026-05-22, 2026-06-08 x2, 2026-06-10) -- index mutation is high-risk; prefer monitored runs.
3. **TaskStop does not kill detached node children** -- verify with `Get-CimInstance Win32_Process` + `Stop-Process` the actual PID.
## FIRST LIVE SHARD TRANSITION -- definitive R15 validation (2026-06-10, slot:sierra, commit f6e596b767)
The index has SINCE crossed the 480MiB shard threshold on the live production brain for the FIRST TIME, and the shard-safe writers handled it CLEANLY -- the exact event that caused clobber #4, now executing correctly + attended. Sequence: an `embed-all-wiki --apply` (33,500 -> 33,501 entries) tipped `estimateMonolithBytes` past 503,316,480 B -> `writeTribalIndex` took the sharded path -> wrote `tribal-embed-index.manifest.json` (393 B) + `.shard-000.json` (503,314,708 B) + `.shard-001.json` (30,766,950 B) and `retireSupersededArtifacts` removed the monolith by design.
**NO DATA LOSS (verified with numbers):** `streamTribalEntries` via the manifest counts **33,501** entries (shard-000:31,570 + shard-001:1,931) = `manifest.totalEntries` 33,501, dim 768, model nomic-embed-text:latest -- the torn-shard guard did NOT throw. The brain survived the transition intact across shards. This is the ultimate live-validation of U-TRIBAL-SIBLING-WRITER-SHARD-SAFE: the read-blind/clobber vector that dropped 29,723 -> ~11,500 on the pre-fix transition is CLOSED, proven on the live brain, not just hermetic tests.
**Leave-a-copy false-positive resolved (commit f6e596b767):** the monolith retirement tripped `leave-a-copy-behind-guard` (tracked 66MB blob -> `D`, no copy at the monolith path). It was a false-positive -- the data moved to the shards, not lost. Durable fix: `git rm --cached state/shared/tribal-embed-index.json` (the `.gitignore:249` TODO explicitly assigned to sierra) untracks the stale blob so the `D` clears permanently; shards+manifest are gitignored (`.gitignore:251-252`), the live brain lives off-git + regenerable. Hook now returns `{continue:true}` clean.
**LESSON 4: a shard transition retires the monolith -- expect leave-a-copy + uncommitted-blob noise on every future 480MiB crossing.** The allowlist entry (since the 2026-04-29 seed) + the now-untracked blob both neutralize it; future crossings are silent. Do NOT "restore" the monolith -- the manifest+shards ARE the index.

Builds on [[reference_tribal_index_v8_string_cap_2026_06_08]] (clobbers #2/#3) + [[reference_tribal_index_keyscheme_clobber_2026_05_22]] (#1).
