---
name: reference-psn-aliases-backfill-2026-05-24
description: 2026-05-24 sierra — deterministic bulk-backfill of aliases:[] frontmatter across the memory vault. C: source coverage jumped 6/9266 (0.06%) → 536/539 (99.4%) durable. H: side races with the obsidian-feeder Stop hook; converges over a few Stop cycles as the feeder propagates C:→H:.
type: reference
slot: sierra
source: prism-memory
synced: 2026-06-27T20:30:47.124Z
aliases: reference_psn_aliases_backfill_2026_05_24
---


## What shipped

| artifact | purpose |
|---|---|
| `scripts/backfill-memory-aliases.mjs` | Deterministic bulk-add of `aliases:[]` frontmatter to memory `.md` files. Pure, idempotent, atomic-write, `--dry-run` / `--limit` / `--flat` / `--vault-root` flags. Supports both H: namespaced layout (`{feedback,reference,...}/`) and C: flat layout. Skips MEMORY.md / MEMORY-ARCHIVE.md / `node_*` synthetic pointers / already-aliased files. |
| `scripts/backfill-memory-aliases.test.mjs` | 21 node:test cases — generateAliases (8) + injectAliasesLine (4) + planBackfillFile (3) + runBackfill E2E (4) + edge cases. All passing. |

## Algorithm

For each memory `.md` file with frontmatter and NO existing `aliases:`:

1. Strip namespace prefix (`feedback_`, `reference_`, ...) from filename slug
2. Strip trailing date pattern (`_YYYY_MM_DD` or `_YYYY-MM-DD`)
3. Generate variants (case-insensitive deduped, ≤6 per file):
   - kebab-case (`psk-kernel`)
   - UPPER-snake (`PSK-KERNEL`)
   - Title Case with acronym detection (3-4-char tokens uppercased: `PSK Kernel`, `MS0`)
   - all-lower kebab
   - frontmatter `name:` field if distinct from slug (curated authoritative form)
4. Skip if zero distinct aliases generated (e.g. slug already IS the kebab form)
5. Inject `aliases: [a, b, c]` after `description:` line (or after `name:`, or at end of FM)
6. Atomic write via tmp+rename

## Coverage delta

| surface | before | after | %  |
|---|---|---|---|
| **C: source** (`C:\Users\...\memory\`) | 6 / 538 | **536 / 539** | **99.4%** |
| **H: vault** (`H:/prism/knowledge/memories/`) | 6 / 720 | **~447 / 720** | **~62%** (racing with feeder) |

C: coverage is DURABLE — that's the operator-side source, not git-tracked, owned by the Claude auto-memory subsystem. H: coverage converges to C: over the next few Stop cycles via `stop-obsidian-memory-feed.mjs`.

## R12 disclosures

- **harness false-255 timeout pattern (still active):** every backfill run > ~2 min returns exit 255 with empty output but the writes actually land. Mitigated by chunking with `--limit 150` (~30 s per chunk). Same class as the prior 284040 ms backfill in [[reference_lima_loop_post_compact_2026_05_22]].
- **obsidian feeder race:** H: writes get reverted when the Stop hook `stop-obsidian-memory-feed.mjs` rewrites H: from C: between my apply and next dry-run. Per [[feedback_auto_memory_feeds_obsidian_stophook]] — canonical fix is to edit C: side (now done) and let feeder propagate. Coverage WILL grow as the feeder catches up; no action needed.
- **`node_*` synthetic-pointer skip:** `knowledge/memories/reference/node_*.md` files (~8500 of them) are auto-generated from the system-graph by a separate feeder; backfilling them would race with regen + the EPERM-lock during regen. The aliases ROI on synthetic pointers is also low — the graph node ID already encodes the searchable name. Skipped by design.
- **EPERM on rename:** initial run hit EPERM on `node_*` files (above) — added the skip filter as the fix, not retry-with-backoff.
- **2 C: files with no frontmatter:** unaddressable by this script (the script requires a `---` opener). Operator can manually frontmatter them later if they're load-bearing.
- **script + test files NOT YET COMMITTED:** index.lock held by active peer chat for full session; per [[feedback_conflict_fork_rule]] the working-tree files (scripts/backfill-memory-aliases.mjs + .test.mjs) will commit on next non-contested cycle, or via a hygiene chat (golf).

## End-to-end verification

After rebuilding the sidecar (`9281 records, 538 ms`), 4 alias-promoted queries:

| query | top hit | score |
|---|---|---|
| `Always build never skip` | feedback_always_build.md | 32 |
| `PRISM Syscall Kernel` | feedback_psk_kernel.md | 16 |
| `conflict fork rule` | feedback_conflict_fork_rule.md | 23.5 |
| `SVI Psi ranking` | feedback_svi_psi.md | 23 |

All four files now have alias-bearing frontmatter. Pre-backfill these queries either missed or scored ~6-8 (name+body only). Post-backfill the W_ALIAS=3.0 contribution per matching token compounds the score.

## Why this answers "can we speed up the memories having aliases?"

**Yes — one bulk deterministic pass.** The bottleneck pre-backfill was operator-by-operator manual addition (~5 min per file × 540 files = ~45 hours). The script does it in ~3-5 min of backgrounded chunks, idempotent, never overwrites operator-curated aliases, generates 3-5 high-signal variants per file from the slug + `name:` form. Future runs just sweep new files (already-aliased are skipped).

## Closes

- `PSN-ENHANCE-MS0::U-PSN-ALIASES-BACKFILL-2026-05-24` — sierra iter that delivered the bulk-backfill in response to operator directive *"can we speed up the memories having aliases?"*
