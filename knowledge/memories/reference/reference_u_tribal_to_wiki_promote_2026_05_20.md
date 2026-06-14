---
name: reference-u-tribal-to-wiki-promote-2026-05-20
description: "H1 of SYNERGY-AUDIT-CONTINUE shipped 2026-05-20 by echo: scripts/promote-tribal-to-wiki.mjs auto-promotes confidence>=90 tribal tips (628 of 3919 candidates) into knowledge/wiki/code-tribal/ with subdomain field preserving cam_strategy/speeds_feeds. 25/25 tests, first-batch shipped 5 entries, atomic write, idempotent skip-existing."
aliases: reference_u_tribal_to_wiki_promote_2026_05_20
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.026Z
---


H1 of [[audit-system-synergy-2026-05-09]] shipped. Bridge from `knowledge/tribal/*.md` (3919 manufacturing tribal-knowledge tips) → `knowledge/wiki/code-tribal/tribal-<id>.md` (previously: 42 hand-authored backend-dev patterns only).

**Filter**: confidence ≥ 90 (628 of 3919 currently above threshold, ~16%).

**Output frontmatter** distinguishes the two corpora coexisting in the same dir:

| Field | Pre-existing 42 entries | New auto-promoted entries |
|---|---|---|
| `category` | `code-tribal` | `code-tribal` |
| `domain` | `backend-dev` | `tribal-knowledge` |
| `subdomain` | (n/a) | original tribal category (`cam_strategy`, `speeds_feeds`, ...) |
| `source` | (n/a) | original URL / vendor reference |
| `promoted_from` | (n/a) | `knowledge/tribal/<file>.md` |
| `promoted_at` | (n/a) | ISO timestamp |

Wiki recall filters can target one corpus or the other via `domain:`. Future tribal-recall surfaces can union both.

**Files shipped:**
- `scripts/promote-tribal-to-wiki.mjs` — pure-core + injected-IO; 5 exports (`parseTribalFrontmatter`, `shouldPromote`, `buildWikiEntry`, `enumerateTribalFiles`, `runPromotion`); `--dry-run` default; atomic `.tmp.{pid}+rename`
- `scripts/promote-tribal-to-wiki.test.mjs` — 25 node:test cases (parser 6 + filter 4 + builder 7 + enumerator 2 + e2e fake-fs 5 + real-disk roundtrip 1), 270ms hermetic
- `knowledge/wiki/code-tribal/tribal-bc-{001,002,003,004,010}.md` — first 5 promoted entries (all BobCAD adaptive-roughing / chip-thinning, confidence 90-93)

**Safety properties** (R12 honest scope):
- Idempotent (existsSync skip prevents re-overwrite on re-run)
- Atomic writes (.tmp.{pid}+rename — readers never see partial files)
- Dry-run is default (operator must explicitly `--apply`)
- No deletion (promotion adds, source file stays)
- Quarantine subdir (`auto-ingested-quarantine/`) skipped automatically
- subdomain preserves original tribal category — no semantic coercion

**Known throughput limitation**: cold-scan of 3919 files takes ~13min under heavy fleet load (Windows fs on shared tree). Acceptable for an operator-driven batch tool; not suitable for hot-path UserPromptSubmit. If a sidecar fast-path becomes needed (similar to [[reference_u_memory_index_sidecar_2026_05_20|U-MEMORY-INDEX-SIDECAR]]), a `promote-tribal-cache.json` pre-built sidecar mirrors the master-index pattern.

**Wiring status**: CLI-only at ship time. Plausible future wirings (deferred):
- Stop hook with weekly throttle (auto-batch new tribal entries)
- /wiki-morning skill body invocation (during the existing wiki-maintenance pass)
- Scheduled task for weekly batch (~50 entries/week to drain the 623 backlog)

**Outstanding**: ~623 more candidates above threshold (628 found - 5 promoted). Operator runs `node scripts/promote-tribal-to-wiki.mjs --apply --limit N` to ship more batches as desired. The 13min cold-scan suggests batches of 50-100 at a time.

**R8 lesson from this session**: when planning H1, I initially worried that the "code-tribal" naming meant the audit wanted DEV tribal promotion (not manufacturing). Probing the existing 42 entries revealed all are `domain: backend-dev`. The audit's literal `wiki/code-tribal/` was correct as the path — the `domain:` field is how the two corpora coexist semantically.

Related:
- [[audit-system-synergy-2026-05-09]] — parent audit (Track H §H1)
- [[tribal-to-wiki-promotion]] — wiki canonical doc
- [[tribal-by-domain-inject]] — live tribal-recall hook (vector search; reads source tribal directly)
- [[reference_u_memory_index_sidecar_2026_05_20]] — sister H-track ship (memory-index sidecar)
- [[reference_i_track_not_phantom_2026_05_20]] — R12 correction sibling
