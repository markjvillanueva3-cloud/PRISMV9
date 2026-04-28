---
source: gsd_micro
section: Token Economy
slug: token-economy
indexed_at: 2026-04-28T02:50:03.682Z
---

## Token Economy

### Profiles
```
backend  : 200k (compact at 150k)
physics  : 150k (compact at 110k)
refactor : 250k (compact at 180k)
frontend : 180k (compact at 130k)
```

### RTK prefix (Bash output savings 60-95%)
```
rtk vitest run         99% reduction
rtk tsc                83% reduction
rtk git status/log     59-80% reduction
rtk gh pr view/diff    79-87% reduction
rtk npm/pnpm install   70-90% reduction
```

### Semantic routing (per-call savings, INTEL milestone)
```
CLAUDE.md scan         3000 tok → 3 sections × 150 tok = 450 tok
Skill scan             10000 tok → 5 skills × 50 tok = 250 tok
Engine dedup           O(N) name compare → top-3 vector
Action search          6000 tok per dispatcher map → top-3 = 100 tok
Script source read     full file → 1-line summary = 100 tok
GSD docs               full doc → 3 chunks = 600 tok
Tribal knowledge       O(N) tip scan → kind=tip top-5 = 250 tok
```

### Caching
```
file-read-cache    ~4k bytes/hit
grep-result-cache  ~2.5k bytes/hit
bash-result-cache  ~1.5k bytes/hit
ComputationCache   3-tier LRU (30/120/300s)
DiffEngine         CRC32 dedup, skips redundant writes
```

### Tool selection
```
Multiple Grep                  → single Agent Explore
Bash find/grep                 → Glob/Grep native tools
Re-reading files               → trust context (hooks track changes)
Full file Read                 → Read offset/limit
Sequential tool calls          → parallel independent calls
```

### Ollama offload
Free local inference for non-cognitive tasks: code summarization,
documentation generation, classification. Telemetry at
`mcp-server/data/state/ollama-offload-stats.json`. Dashboard:
`scripts/ollama-offload-dashboard.mjs`.
