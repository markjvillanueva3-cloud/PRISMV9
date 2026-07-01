---
type: "chat-session"
source: "claude-code-cli"
session_id: "001bd6c3-283f-428a-ab3f-66fd01309443"
title: "Verify VAULT STRUCTURAL HYGIENE. (1) Are there ORPHAN/legacy dirs in the vault t"
date: "2026-06-08"
first_ts: "2026-06-08T20:00:17.852Z"
last_ts: "2026-06-08T20:00:21.641Z"
cwd: "H:\\prism"
messages: 2
user_msgs: 1
assistant_msgs: 1
raw_file: "H:/.claude/projects/H--prism/001bd6c3-283f-428a-ab3f-66fd01309443/subagents/workflows/wf_f3ac6b03-a5a/agent-a18689eb69e3c74d3.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:03"
---

# Verify VAULT STRUCTURAL HYGIENE. (1) Are there ORPHAN/legacy dirs in the vault t

> **claude-code-cli** | 2026-06-08 | 2 msgs (1 user / 1 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/001bd6c3-283f-428a-ab3f-66fd01309443/subagents/workflows/wf_f3ac6b03-a5a/agent-a18689eb69e3c74d3.jsonl`

## Transcript

### User | 2026-06-08T20:00:17.852Z

Verify VAULT STRUCTURAL HYGIENE. (1) Are there ORPHAN/legacy dirs in the vault that shouldn't be there (e.g. memories/_legacy-root/, memories/uncategorized/ — how many files, are they stale)? (2) The h-drive-atlas/ dir — is it current (built by build-h-drive-atlas.mjs)? (3) Top-level dirs: do all 21 have a clear purpose, or are any orphaned/empty? (4) Is the .obsidian/ config sane (graph.json, the REST API plugin)? (5) Check for the sync lock .obsidian-memory-sync.lock state + whether the 3-min feed is healthy (recent writes to memories/). Report structural issues + cleanup fixes (per 'never delete only disable' — propose archive/annotate, not rm). 
GROUND TRUTH (verified this session via direct file reads — re-verify with your own commands; never trust a claim you didn't run):

OBSIDIAN VAULT = H:/prism/knowledge (the Obsidian app opens this as the vault root; PSN leg #1 "Obsidian brain").
Vault top-level dirs (21): Materials, Skills, claude-md, code-index, data-index, decisions, errors, gsd, h-drive-atlas, hermes-outputs, lint-reports, memories, observations, relationships, roadmap, scripts, sessions, summaries, templates, tribal, wiki.
Vault memories/ subdirs (14): _index, _legacy-root, dreams, feedback, galaxies, inbox, mistakes, patterns, project, reference, scrutiny, uncategorized, user, weekly-synthesis.

CANONICAL GALAXY SET = 34 (the source of truth: every mcp-server/src/engines/<g>/MEMORY.md; master MEMORY.md carries 34 [galaxy:*] back-pointers; state/shared/galaxy-cards/ has 34 *.card.md files). The 34: academy, agent-orchestration, ai-training, backend-helper, blueprint-vision, bug-hunting, business, cad-fusion-live, cad, cam, compliance-safety, corpus-aggregation, database-expansion, discovery, dormant-data, fleet-hygiene, frontend-app, hermes-zulu, knowledge-conversion, lathe, mill, mit-curriculum, pdf-corpus-mill, pdf-corpus, post-processor, quality, quoting, shop-floor, speed-feed, system-viz, token-optimization, tribal-knowledge, wedm, wiring.

KNOW
... [+2053 chars truncated]

### Assistant | 2026-06-08T20:00:21.641Z

API Error: Server is temporarily limiting requests (not your usage limit) · Rate limited
