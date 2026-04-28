---
source: gsd_quick
section: TOKEN ECONOMY (HOOK-ENFORCED)
slug: token-economy-hook-enforced
indexed_at: 2026-04-28T02:29:29.160Z
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
```
