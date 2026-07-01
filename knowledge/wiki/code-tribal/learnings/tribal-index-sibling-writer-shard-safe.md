---
title: Tribal-index writers must ALL route through one shard-safe guarded IO
unit: U-TRIBAL-SIBLING-WRITER-SHARD-SAFE
slot: sierra
date: 2026-06-10
commits: [46c07e9cd7, b637bfb0c4, 9fd0c8c7d1, 1322c38364, 8f7c60674b]
tags: [tribal-index, v8-string-cap, sharding, clobber-guard, brain-safety, scrutiny]
supersedes_followup_of: [reference_tribal_shard_read_clobber_2026_06_10, reference_tribal_index_v8_string_cap_2026_06_08]
---

# Tribal-index writers must ALL route through one shard-safe guarded IO

## The bug class (4 brain clobbers: 2026-05-22, 2026-06-08 x2, 2026-06-10)

`state/shared/tribal-embed-index.json` is PRISM's vector recall brain (PSN leg #5,
read every UserPromptSubmit). It crosses **V8's 512 MiB max string length**
(`0x1fffffe8`) once enough wiki/memory content is embedded, so it gets **sharded**:
`scripts/lib/write-tribal-index.mjs` writes a `.manifest.json` + `.shard-NNN.json`
files and **removes the monolith `.json`**. Any writer that does the old
monolith-only idiom -- `fs.existsSync(INDEX_PATH)` gate + `JSON.parse(fs.readFileSync(INDEX_PATH))`
+ raw `writeFileSync`/`atomicWriteJSON` -- then:
1. **reads an EMPTY base** (monolith gone) -> next splice+write drops the whole brain, OR
2. **fail-opens to empty** on `!existsSync` (the 2026-06-08 clobber 1:1), OR
3. **leaves stale shards shadowing** a fresh monolith write (the write silently vanishes;
   `loadTribalIndex` keys off the manifest first), OR
4. **throws** -- `JSON.stringify` of a >512 MiB object also exceeds the cap.

## The fix: ONE shared guarded IO pair, every writer routes through it

`scripts/lib/tribal-index-guarded-io.mjs` (parameterized by `indexPath`):
- **`readTribalIndexGuarded`** -- manifest-aware (empty base ONLY when neither the
  monolith NOR the manifest exists); **fail-LOUD** when the index exists but won't
  load (never the fail-open empty that clobbers).
- **`writeTribalIndexGuarded`** -- >50% shrink clobber-guard (bypass:
  `PRISM_TRIBAL_ALLOW_SHRINK=1` / `allowShrink` for intentional prunes) then
  `writeTribalIndex` (monolith below ~480 MiB, shards above, retires the superseded layout).
  Pass `prevCount` (count BEFORE the splice) to skip a second full read inside a lock.

All **7** writers now route through it (read manifest-aware, write shard-aware,
manifest-aware existence gates; `embed-knowledge-store` + `embed-all-wiki` gained the
cross-process `withTribalIndexLock` they never had):
`embed-engines` - `embed-knowledge-store` - `embed-cited-tips` - `embed-wiki` -
`embed-all-wiki` (the production `brain-refresh.mjs` full-corpus driver) -
`prune-stale` (`allowShrink:true`) - `retag-backend-dev` (in-place). The canonical
`.claude/scripts/tribal-embed-index.mjs` carries the equivalent inline guard
(commit `8bf1873577`).

## THE lesson (why the 3-of-3 scrutiny gate earned its keep)

**An "I fixed all the siblings" claim is only as good as the writer-enumeration behind it.**
The original incident-memory inventory listed 3 siblings + named `embed-wiki` as a P1
*aside*; it did NOT list `embed-all-wiki` at all -- yet that is the single
**highest-risk** writer (the production full-corpus driver, the one that actually
crosses 480 MiB). The adversarial 3-of-3 completeness reviewer FAILED the unit twice,
each time correctly finding an unwired writer (`embed-wiki` round 1, `embed-all-wiki`
round 2) before passing on round 3. The helper docstring AND `tribal-index-lock.mjs`
both documented "FIVE writers"; the truth was seven.

**Prevention:** before claiming a shared-resource fix is complete, **grep every writer
of that resource** (`grep -rn "atomicWriteJSON\|writeFileSync(INDEX_PATH\|JSON.parse(fs.readFileSync(INDEX_PATH"`),
classify each hit (live writer of THIS file vs sidecar/test-temp/different-index), and
route every live writer through the single guarded IO. Do NOT patch `existsSync` one
file at a time. Clone the forced-shard regression test (write a real sharded layout via
`writeTribalIndex(..., {shardThresholdBytes: 2000})` with entries large enough to exceed
the threshold, then assert the reader returns NON-empty).

## Don't repeat

- Do NOT run a long index-mutating batch on the LIVE production brain unattended
  (the 2026-06-10 clobber was self-inflicted by exactly that).
- `gpt-oss:20b` is LIVE-REJECTED for narrative generation (empty `.response` harmony
  format + 38s cold-load over the 30s timeout); `U-VIZ-WIKI-NARRATIVE` uses
  `qwen2.5-coder:32b` warm (~1.25s).

Related: [[reference_tribal_shard_read_clobber_2026_06_10]] - [[reference_tribal_index_v8_string_cap_2026_06_08]] - [[feedback_always_update_wiki_on_bug_finding]]
