---
type: "chat-session"
source: "claude-code-cli"
session_id: "b5de5424-ef1f-447a-a3f1-e5a8ce2cad24"
title: "You are creating the RESOURCE-ATLAS wiki for the PRISM \"shop-floor\" galaxy (owne"
date: "2026-06-10"
first_ts: "2026-06-10T19:51:47.327Z"
last_ts: "2026-06-10T19:52:08.614Z"
cwd: "H:\\prism"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_32aa7fc5-878/agent-a58363648c1705295.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:22"
---

# You are creating the RESOURCE-ATLAS wiki for the PRISM "shop-floor" galaxy (owne

> **claude-code-cli** | 2026-06-10 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_32aa7fc5-878/agent-a58363648c1705295.jsonl`

## Transcript

### User | 2026-06-10T19:51:47.327Z

You are creating the RESOURCE-ATLAS wiki for the PRISM "shop-floor" galaxy (owner: golf): knowledge/wiki/shop-floor/shop-floor-resource-atlas.md.

PURPOSE (operator directive -- all reputable sources linked for EASY ACCESS, do not stay stagnant): a single easy-access index that links EVERY resource for this domain -- the LOCAL stores/corpora, curated YouTube + free seminars/webinars + data reports, and reputable free online -- so a chat in this galaxy jumps straight to what it needs. This FUSES the local half (given) with the online/video half. It is DISTINCT from [[shop-floor-source-atlas]] (which is the free-college-course/textbook curriculum): the resource-atlas adds the LOCAL trove pointers + the video/seminar/data-report half + a one-stop cross-link hub.

LOCAL TROVE / STORES (pre-known -- LINK these exactly, do NOT fabricate or re-count; pathway = store/corpus + its index):
shop-floor engine (live machine status -> adaptive + ERP); JM DIE/ 21-machine fleet config (ShopConfigurationEngine); MES/OEE telemetry stores

YOUTUBE + SEMINARS to curate (WebFetch-VERIFY each before listing -- channel/playlist/page must resolve; drop on 404 after one retry): lean-manufacturing / TPM / MES channels + free seminars (Lean Enterprise Institute, Gemba Academy free content, MTConnect Institute, IMTS talks)
REPUTABLE FREE ONLINE to curate (same verify rule): free: NIST manufacturing resources, MTConnect open standard docs, lean.org, OSHA machine-safety, takt/SMED/TPM references
Prefer official + reputable educator/standards sources; FREE + LEGAL only (no LibGen/SciHub).
R12: NO numeric OEE/availability threshold promoted -- method/standard only, thresholds owner-gated to golf.

ABSOLUTE RULES (R12):
1. LOCAL section: reproduce the given store/corpus pointers verbatim (verified). For YouTube/online: ONLY list a source you CONFIRM resolves via WebFetch; drop dead ones (retry once). Never fabricate a URL.
2. Cross-link the sibling wiki layers: [[shop-floor-foundations]] (theory), 
... [+1188 chars truncated]

### Assistant | 2026-06-10T19:51:53.638Z

I'll start by checking the local trove pointers and sibling wiki files, then verify the online/video sources via WebFetch.

### Assistant | 2026-06-10T19:51:55.505Z

[tool_use: Bash]

### User | 2026-06-10T19:52:01.523Z

[tool_result] Exit code 2
/usr/bin/bash: eval: line 1: syntax error near unexpected token `('
/usr/bin/bash: eval: line 1: `ls "H:/prism/knowledge/wiki/shop-floor/" 2>/dev/null; echo "---SOURCE-ATLAS-HEAD---"; if exist "H:/prism/knowledge/wiki/shop-floor/shop-floor-source-atlas.md" (powershell -NoProfile -Command "Get-Content 'H:/prism/knowledge/wiki/shop-floor/shop-floor-source-atlas.md' -TotalCount 30") else 
... [+25 chars truncated]

### Assistant | 2026-06-10T19:52:08.614Z

API Error: Server is temporarily limiting requests (not your usage limit) · Rate limited
