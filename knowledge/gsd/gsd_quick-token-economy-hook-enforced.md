---
source: gsd_quick
section: TOKEN ECONOMY (HOOK-ENFORCED)
slug: token-economy-hook-enforced
indexed_at: 2026-04-28T02:50:03.658Z
---

## TOKEN ECONOMY (HOOK-ENFORCED)

```
Budget Profiles:
  backend: 200k tokens (compact at 150k)
  physics: 150k tokens (compact at 110k)
  refactor: 250k tokens (compact at 180k)

Waste Detection:
  - Duplicate reads → blocked by file-read-cache
  - Broad searches → warned by token-economy-hook
  - Large outputs → flagged for compression

Cache Performance:
  - file-read-cache: ~4k bytes saved per hit
  - grep-result-cache: ~2.5k bytes saved per hit
  - bash-result-cache: ~1.5k bytes saved per hit

Semantic Routing (NEW — INTEL P3):
  - skills:  503 skills → top-5 per prompt (~1000 tok saved/session)
  - scripts: 364 scripts → cached 1-line summary (~400 tok per call)
  - engines: 3013 engines → top-3 dedup (replaces O(N) fuzzy)
  - actions: 6346 actions → top-3 per verb-object (~70% search overhead saved)
  - rules:   ~30 CLAUDE.md sections → top-3 per prompt (vs full 3000 tok)
  - gsd:     28 GSD sections → top-3 (vs full DEV_PROTOCOL.md)
```
