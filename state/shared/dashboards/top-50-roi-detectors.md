# Top-50 High-ROI Token-Savings Detectors

**Generated:** 2026-05-24 (slot:alpha, TOKEN-SAVINGS docs)
**Source:** Synthetic seed (no `token-savings-top-roi-candidates.json` on disk yet — populated by `scripts/lib/token-savings-corpus-collector.mjs` once it ships).
**Replaces:** When the candidates JSON materializes, regenerate via the same script. This file is the synthetic seed for the bandit-tune cold start.

## Methodology

ROI = `suggested_coverage × estimated_tokens_saved_per_fire`. Coverage is fleet-wide call frequency observed in transcripts (chat-bus + scrutiny ledger + RTK gain history). Tokens-saved-per-fire is the average delta between raw stdout and the RTK / Ollama / MCP-route equivalent on benchmarked samples (see `state/shared/audit-token-savings-2026-05-17.md`).

Three classes, ranked by compound ROI:

- **RTK passthroughs** (60-99% reduction) — bash-level rewrite. Hook-transparent, no operator action.
- **MCP routes** (~30-50% reduction) — replace Grep/Glob/Agent exploration with a precomputed index hit.
- **Ollama offloads** (~100% Claude-token savings — they don't bill against the Claude budget at all).

## Top-50 Table

| Rank | ID | Category | Suggested Coverage | Est. Tokens Saved / Fire |
|-----:|----|----------|-------------------:|-------------------------:|
| 1 | `rtk vitest run` | RTK | 0.95 | 12000 |
| 2 | `rtk npm run build` | RTK | 0.90 | 8500 |
| 3 | `rtk git status` | RTK | 0.98 | 1800 |
| 4 | `rtk git log` | RTK | 0.85 | 4200 |
| 5 | `rtk git diff` | RTK | 0.85 | 5200 |
| 6 | `rtk tsc` | RTK | 0.80 | 6800 |
| 7 | `rtk gh pr view` | RTK | 0.70 | 3800 |
| 8 | `prism_session:master_index_query` | MCP | 0.90 | 4500 |
| 9 | `prism_session:dispatcher_map_compact` | MCP | 0.65 | 3200 |
| 10 | `/ollama-summarize` | Ollama | 0.75 | 6500 |
| 11 | `/ollama-explain` | Ollama | 0.70 | 5800 |
| 12 | `rtk gh pr checks` | RTK | 0.65 | 2400 |
| 13 | `rtk gh run list` | RTK | 0.60 | 2200 |
| 14 | `rtk docker logs` | RTK | 0.55 | 4800 |
| 15 | `rtk docker ps` | RTK | 0.50 | 1200 |
| 16 | `rtk grep` | RTK | 0.80 | 2100 |
| 17 | `rtk find` | RTK | 0.55 | 1800 |
| 18 | `rtk ls` | RTK | 0.70 | 900 |
| 19 | `prism_calc:calc_cutting_force` | MCP | 0.45 | 2800 |
| 20 | `prism_calc:calc_speeds_feeds` | MCP | 0.55 | 3100 |
| 21 | `prism_safety:validate_physics` | MCP | 0.50 | 2400 |
| 22 | `prism_ai:reason` | MCP | 0.40 | 3600 |
| 23 | `prism_ai:explain` | MCP | 0.45 | 4200 |
| 24 | `/ollama-docstring` | Ollama | 0.55 | 4200 |
| 25 | `/ollama-classify` | Ollama | 0.50 | 3800 |
| 26 | `rtk cargo build` | RTK | 0.35 | 5600 |
| 27 | `rtk cargo test` | RTK | 0.35 | 7200 |
| 28 | `rtk cargo clippy` | RTK | 0.30 | 4400 |
| 29 | `rtk lint` | RTK | 0.60 | 3800 |
| 30 | `rtk prettier --check` | RTK | 0.55 | 2200 |
| 31 | `rtk next build` | RTK | 0.30 | 8800 |
| 32 | `rtk playwright test` | RTK | 0.40 | 9200 |
| 33 | `rtk pnpm install` | RTK | 0.45 | 6400 |
| 34 | `rtk pnpm list` | RTK | 0.40 | 2800 |
| 35 | `rtk pnpm outdated` | RTK | 0.30 | 1900 |
| 36 | `rtk prisma` | RTK | 0.25 | 3200 |
| 37 | `rtk git show` | RTK | 0.55 | 3800 |
| 38 | `rtk git add` | RTK | 0.85 | 600 |
| 39 | `rtk git commit` | RTK | 0.85 | 600 |
| 40 | `rtk git push` | RTK | 0.80 | 500 |
| 41 | `rtk git fetch` | RTK | 0.55 | 700 |
| 42 | `rtk git branch` | RTK | 0.65 | 1100 |
| 43 | `rtk git stash` | RTK | 0.20 | 1400 |
| 44 | `rtk git worktree` | RTK | 0.35 | 1600 |
| 45 | `rtk gh issue list` | RTK | 0.35 | 2600 |
| 46 | `rtk gh api` | RTK | 0.30 | 3200 |
| 47 | `rtk kubectl get` | RTK | 0.15 | 2400 |
| 48 | `rtk kubectl logs` | RTK | 0.15 | 4800 |
| 49 | `rtk curl` | RTK | 0.45 | 2100 |
| 50 | `rtk wget` | RTK | 0.20 | 1800 |

## Notes

- **Coverage values are seed estimates.** The bandit-tune lib (`scripts/lib/detector-bandit-tune.mjs`) reweights these from live observation over the first ~200 fires per detector — operators do nothing.
- **Tokens-saved-per-fire is per-invocation.** Total fleet-wide daily savings = `coverage × fires-per-day × tokens-saved`. At rank-1 (vitest), one chat doing ~6 test runs/day = ~68K tokens saved/day from a single detector.
- **The router table** (`scripts/lib/token-savings-router-table.mjs`) consumes this list, not the raw JSON — adding a detector means appending one row here and rebuilding the table (idempotent).
- **Ollama entries don't bill against Claude at all.** Coverage on those is gated by whether the local Ollama daemon is up (see `ollama-docker-health.mjs`).
