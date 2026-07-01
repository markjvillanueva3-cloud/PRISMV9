# FORGE-AUDIT-V2/U-OBR01 — [MAIN] [FORGE-AUDIT-V2]/U-OBR01: Ollama+Obsidian routing audit + META artifact — 65.6% Ollama hook orphan ratio empirically measured

**Commit:** `3608593aa2e2` · **By:** markjvillanueva3-cloud · **At:** 2026-05-18T12:39:10-05:00
**Tags:** forge-audit-v2, u-obr01, auto-distilled

## Subject
[MAIN] [FORGE-AUDIT-V2]/U-OBR01: Ollama+Obsidian routing audit + META artifact — 65.6% Ollama hook orphan ratio empirically measured

## Body
```
[MAIN] [FORGE-AUDIT-V2]/U-OBR01: Ollama+Obsidian routing audit + META artifact — 65.6% Ollama hook orphan ratio empirically measured

Boris-discipline /forge-audit-v2 deliverable. User brief: 'find skills/scripts/hooks to auto-fire and route through ollama or obsidian for even bigger token savings. Expand on what we already have.'

R8 dedup found 30 Ollama-routing hooks already on disk (broader body-scan: 96). Confirms [[feedback_ollama_docker_pipeline_dead_code_2026_05_16]] memory finding (88% unwired) — empirically measures 65.6% with broader recall regex.

Shipped:
  scripts/ollama-hook-fire-audit.mjs  - META artifact, 4 pure helpers, --json mode, c-to-h-mirror drift detection
  scripts/ollama-hook-fire-audit.test.mjs  - 25 node:test cases, 100% pure-helper coverage
  state/shared/specs/OLLAMA-OBSIDIAN-ROUTING-AUDIT-2026-05-18.md  - audit doc, 6 findings each with verification channel

6 findings, every one with a re-runnable verification tool:
  F1 - 65.6% Ollama hooks unwired-on-disk (META ships verification this commit)
  F2 - Obsidian feed is one-way only (auto-memory -> vault); user-written notes never inject into prompts
  F3 - Ollama/NIM autostart races (3+ fires per session); needs cross-hook coalesce
  F4 - BM25 sidecar precomputation (lib docstring already names this gap)
  F5 - /find could auto-redirect Glob/Grep for symbol-shaped queries
  F6 - Stop-hook bundle re-parses 363MB graph per sub-hook (no shared cache)

R12 honest caveats:
- hook-fire-counts.jsonl has selection bias - 0-fire-in-telemetry != didn't fire
- peer-reviewer DEFERRED (context pressure); audit marked unreviewed-by-peer
- /loop re-run NOT auto-scheduled (would need user-approved cron entry)
- HTML companion deferred (audit is text-only, no diagrams worth SVG)

Memory: [[feedback_ollama_docker_pipeline_dead_code_2026_05_16]]
Sister: [[reference_hook_fire_counts_selection_bias_2026_05_18]]
```

## Files touched (4)
- scripts/ollama-hook-fire-audit.mjs                 | 259 +++++++++++++++++++++
- scripts/ollama-hook-fire-audit.test.mjs            | 182 +++++++++++++++
- .../OLLAMA-OBSIDIAN-ROUTING-AUDIT-2026-05-18.md    | 150 ++++++++++++
- 3 files changed, 591 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 3608593aa2e2`
- Milestone envelope: `mcp-server/data/milestones/FORGE-AUDIT-V2.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._