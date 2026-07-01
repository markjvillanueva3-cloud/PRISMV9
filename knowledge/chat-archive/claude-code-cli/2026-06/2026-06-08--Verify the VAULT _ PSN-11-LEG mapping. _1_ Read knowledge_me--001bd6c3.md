---
type: "chat-session"
source: "claude-code-cli"
session_id: "001bd6c3-283f-428a-ab3f-66fd01309443"
title: "Verify the VAULT ↔ PSN-11-LEG mapping. (1) Read knowledge/memories/feedback/feed"
date: "2026-06-08"
first_ts: "2026-06-08T20:00:17.851Z"
last_ts: "2026-06-08T20:00:36.455Z"
cwd: "H:\\prism"
messages: 7
user_msgs: 3
assistant_msgs: 4
raw_file: "H:/.claude/projects/H--prism/001bd6c3-283f-428a-ab3f-66fd01309443/subagents/workflows/wf_f3ac6b03-a5a/agent-a71c413abf70068cc.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:03"
---

# Verify the VAULT ↔ PSN-11-LEG mapping. (1) Read knowledge/memories/feedback/feed

> **claude-code-cli** | 2026-06-08 | 7 msgs (3 user / 4 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/001bd6c3-283f-428a-ab3f-66fd01309443/subagents/workflows/wf_f3ac6b03-a5a/agent-a71c413abf70068cc.jsonl`

## Transcript

### User | 2026-06-08T20:00:17.851Z

Verify the VAULT ↔ PSN-11-LEG mapping. (1) Read knowledge/memories/feedback/feedback_psn_definition.md for the canonical 11 legs + their canonical surfaces. (2) For each leg whose home is IN the vault (obsidian_brain=memories/, wiki=wiki/, memories=memories/<type>/, tribal=tribal/+wiki/code-tribal/), confirm that vault dir EXISTS and is populated (count files). (3) Flag any leg whose vault home is missing or empty. (4) Is the vault structure consistent with the PSN doctrine, or has it drifted (e.g. a leg pointing at a dir that no longer exists)? Report per-leg MATCH/DRIFT + fix. 
GROUND TRUTH (verified this session via direct file reads — re-verify with your own commands; never trust a claim you didn't run):

OBSIDIAN VAULT = H:/prism/knowledge (the Obsidian app opens this as the vault root; PSN leg #1 "Obsidian brain").
Vault top-level dirs (21): Materials, Skills, claude-md, code-index, data-index, decisions, errors, gsd, h-drive-atlas, hermes-outputs, lint-reports, memories, observations, relationships, roadmap, scripts, sessions, summaries, templates, tribal, wiki.
Vault memories/ subdirs (14): _index, _legacy-root, dreams, feedback, galaxies, inbox, mistakes, patterns, project, reference, scrutiny, uncategorized, user, weekly-synthesis.

CANONICAL GALAXY SET = 34 (the source of truth: every mcp-server/src/engines/<g>/MEMORY.md; master MEMORY.md carries 34 [galaxy:*] back-pointers; state/shared/galaxy-cards/ has 34 *.card.md files). The 34: academy, agent-orchestration, ai-training, backend-helper, blueprint-vision, bug-hunting, business, cad-fusion-live, cad, cam, compliance-safety, corpus-aggregation, database-expansion, discovery, dormant-data, fleet-hygiene, frontend-app, hermes-zulu, knowledge-conversion, lathe, mill, mit-curriculum, pdf-corpus-mill, pdf-corpus, post-processor, quality, quoting, shop-floor, speed-feed, system-viz, token-optimization, tribal-knowledge, wedm, wiring.

KNOWN DRIFT (precomputed): vault memories/galaxies/ has only 22 of the 34 g
... [+1982 chars truncated]

### Assistant | 2026-06-08T20:00:30.629Z

I'll verify the VAULT ↔ PSN-11-LEG mapping empirically. Let me start by reading the canonical PSN definition and confirming the vault structure.

### Assistant | 2026-06-08T20:00:31.576Z

[tool_use: Read]

### Assistant | 2026-06-08T20:00:31.913Z

[tool_use: Bash]

### User | 2026-06-08T20:00:32.782Z

[tool_result] 1	---
2	name: psn-definition
3	description: The PRISM Synergy Network — canonical 11-leg taxonomy. Every PSN-aware tool/hook/skill refers here for the leg list. Fixes the broken pointer referenced in MEMORY.md since at least 2026-05-19.
4	aliases: feedback_psn_definition
5	type: feedback
6	source: prism-memory
7	synced: 2026-06-08T19:52:04.631Z
8	---
9	
10	
11	# PSN — PRISM Synergy Network (canoni
... [+4779 chars truncated]

### User | 2026-06-08T20:00:35.424Z

[tool_result] KNOWLEDGE_EXTRACTION_PROTOCOL.md
Materials/
PRISM Knowledge Vault.md
PRISM-System-Map.canvas
Skills/
claude-md/
code-index/
data-index/
decisions/
errors/
extract_knowledge.ps1
gsd/
h-drive-atlas/
hermes-outputs/
index_schema.json
lint-reports/
memories/
observations/
relationships/
roadmap/
scripts/
session_2026-02-17_entries.json
sessions/
summaries/
templates/
test_entries.json
tribal/
voice-sp
... [+11 chars truncated]

### Assistant | 2026-06-08T20:00:36.455Z

API Error: Server is temporarily limiting requests (not your usage limit) · Rate limited
