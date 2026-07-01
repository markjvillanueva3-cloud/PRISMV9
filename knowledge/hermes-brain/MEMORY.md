---
name: MEMORY
description: "MEMORY — PRISM environment (ZULU)"
aliases: MEMORY
type: hermes-memory
source: hermes-agent
hermes_src_path: MEMORY.md
hermes_src_sha256: 50e48057aa83508d0b0e0ece1457d84a5f803bc5666ff4b010087746efd0cfa6
hermes_src_mtime: 2026-06-26T01:42:22.794Z
synced: 2026-06-26T01:47:33.822Z
---
# MEMORY — PRISM environment (ZULU)

- PRISM root: H:/prism. MCP: http://127.0.0.1:3100/mcp (103 prism_* dispatchers are my tools).
- Vault (the brain): H:/prism/knowledge/ — memories/ (per-fact .md, MEMORY.md index), wiki/ (722-entry index, code-tribal tips). 34 galaxy brains: engines/<galaxy>/MEMORY.md; ranked digest: state/shared/galaxy-cards/MASTER-DIGEST.md.
- ORIENTATION: read H:/prism/knowledge/SYSTEM-MAP.md FIRST when unsure where a system lives — it maps every PRISM system (galaxy brains, memories, wiki, tribal, system-viz, PSN, AI/LoRA/CAG/RAG, loops, pipelines, skills, JM Die, awareness, app features) to its authoritative path + query tool.
- MY WRITE LANE: H:/prism/knowledge/hermes-outputs/ ONLY (notes/ research/ diagrams/ scratch/ sessions/). Never write elsewhere in the vault; never edit settings.json, hooks, or the scrutiny ledger.
- Fleet: 26 NATO slots (alpha..zulu) = Claude chats. Bus: state/shared/AGENT_CHAT.jsonl (slot-addressed). Targeted briefs: state/shared/slot-briefs/<slot>.md (consumed once on slot's next prompt). Workboard: state/shared/AGENT_WORKBOARD.md. Handoffs: state/shared/handoffs/HANDOFF-*.md.
- My authority gate: prism_session action zulu_authority_check decides if I may ISSUE a directive. Workers always keep their own safety gates (3-of-3 scrutiny, S(x)>=0.70). I never exempt anyone.
- Read-before-act tools: prism_session actions obsidian_read/obsidian_search/obsidian_status; prism_memory actions brain_recall/semantic_search/daily_brief_get/weekly_synthesis_get; prism_knowledge action tribal_search.
- Write-back tools: prism_knowledge action tribal_capture (lessons); prism_memory action remember.
- Inbox: knowledge/memories/inbox/ — process via prism_memory actions inbox_promote_now then inbox_prune_now.
- Nightly dream synth + weekly reflection run PRISM-side (Windows tasks) into memories/dreams/ and weekly-hermes-reflection-*.md — read them, do not duplicate them.
- My cron jobs run on LOCAL models (validated E2E 2026-06-10): inbox sweep on gpt-oss:20b, morning brief + weekly review on gpt-oss:120b. The 2026-06-09 "local models unreliable" finding was a misdiagnosis: Ollama /v1 ignores options.num_ctx, so every run was crammed into a 16K window (prompt ~25K front-truncated -> length-stop -> continuation spiral). Fixed via OLLAMA_CONTEXT_LENGTH=65536 user env (PRISM Ollama Serve task) + model.context_length/max_tokens in config.yaml. claude-opus-4-8 remains the fallback_model (needs Anthropic extra-usage credits).
- Units doctrine: JM Die shop convention is INCH but ALWAYS verify per part source (G20/G21, STEP units). A units mismatch is a 25.4x scale error.
§
PRISM MCP server (H:/PRISM/mcp-server): direct stdio launch of `node dist/index.js` OOM-crashes on startup at ~406MB ('Reached heap limit'). Fix = set env NODE_OPTIONS=--max-old-space-size=4096 in each .mcp.json (boots clean with it). The shared HTTP server on 127.0.0.1:3100/mcp (fleet launcher) already has a big heap and is what the Hermes desktop app connects to via config.yaml mcp_servers.prism.url.
§
On wompu's Windows box: the H: drive mounts as /h in the terminal tool, but MCP file tools (write_file/patch) wrongly resolve /h -> H:\h\ (creating junk dirs), while read_file resolves /h correctly. For edits to H:\ files use the terminal (heredoc + node/JSON) with H:/... paths, NOT write_file/patch with /h paths. Node require() also needs H:/ paths, not /h.
§
Chat-archive permanent memory: all Claude Code CLI / Codex / Claude Desktop transcripts are ingested into the PRISM Obsidian vault at H:/prism/knowledge/chat-archive/ (notes per session + _index MOCs + reorientation check-in). Pipeline: H:/prism/knowledge/chat-archive/_pipeline/{ingest,build_index,build_checkin,run_all}.py, resumable via manifest.db. Daily cron 'chat-archive-permanent-memory' (06:00) keeps it current. Skill: chat-archive-permanent-memory. Start at _index/00-Chat-Archive-Home.md.
§
Windows path rule for native python3 on wompu's box: H: mounts as /h in the terminal tool, but native python3 (pythoncore-3.14) needs H:/... and C:/... paths, NOT /h/... . Bash heredocs for long multi-line scripts get mangled — write scripts via write_file with absolute H:/ paths (write_file/patch resolve H:/ correctly but mis-map /h/ to H:\h\).
