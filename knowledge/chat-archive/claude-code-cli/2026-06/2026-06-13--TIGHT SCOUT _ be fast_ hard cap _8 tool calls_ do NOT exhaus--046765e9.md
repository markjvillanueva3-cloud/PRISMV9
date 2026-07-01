---
type: "chat-session"
source: "claude-code-cli"
session_id: "046765e9-1878-49aa-b195-de74c14c3930"
title: "TIGHT SCOUT — be fast, hard cap ~8 tool calls, do NOT exhaustively chase downstr"
date: "2026-06-13"
first_ts: "2026-06-13T06:31:18.274Z"
last_ts: "2026-06-13T06:32:15.458Z"
cwd: "H:\\prism-slot-india"
messages: 6
user_msgs: 3
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism-slot-india/046765e9-1878-49aa-b195-de74c14c3930/subagents/agent-aca27a21273c3b8e6.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:56"
---

# TIGHT SCOUT — be fast, hard cap ~8 tool calls, do NOT exhaustively chase downstr

> **claude-code-cli** | 2026-06-13 | 6 msgs (3 user / 3 assistant) | cwd: H:\prism-slot-india
> Raw: `H:/.claude/projects/H--prism-slot-india/046765e9-1878-49aa-b195-de74c14c3930/subagents/agent-aca27a21273c3b8e6.jsonl`

## Transcript

### User | 2026-06-13T06:31:18.274Z

TIGHT SCOUT — be fast, hard cap ~8 tool calls, do NOT exhaustively chase downstream scripts. Read these two skill files FULLY, then answer:
- H:/prism/.claude/commands/pdf-learn.md
- H:/prism/.claude/commands/video-learn.md

Report concisely, CITING file:line:
1. **Per-item command** — the EXACT command/script/dispatcher-action each skill runs for ONE pdf / ONE video. Required inputs (path? URL? watchlist?).
2. **Outputs** — what artifacts each produces (paths + format: tribal tips / wiki / training pairs / embeddings / JSONL).
3. **Downstream consumers NAMED in the skill** — just list the scripts/hooks the skill says ingest its output (do NOT go read them — name + 1-line each).
4. **Batch/corpus mode** — does either support batch over a directory or a watchlist (VIDEO_WATCHLIST.md)? Any resume/dedup/cursor support? Quote the relevant lines.
5. **Cost gates** — Ollama (which model)? VLM? GPU? external (yt-dlp/whisper)? Anything that throttles corpus-scale fan-out.

Keep it under ~400 words. Raw cited findings only.

### Assistant | 2026-06-13T06:31:30.522Z

[tool_use: Read]

### Assistant | 2026-06-13T06:31:30.813Z

[tool_use: Read]

### User | 2026-06-13T06:31:42.485Z

[tool_result] 1	---
2	name: video-learn
3	description: Video Learn — Video Tutorial to PRISM Components Pipeline
4	composes_with:
5	  - "/autopilot"
6	  - "/digest-all"
7	  - "/forge"
8	  - "/forge-engines"
9	  - "/forge-postflight"
10	  - "/material-lookup"
11	  - "/navigate"
12	  - "/rgs"
13	  - "/scrutinize"
14	---
15	# Video Learn — Video Tutorial to PRISM Components Pipeline
16	
17	You are running a specia
... [+21140 chars truncated]

### User | 2026-06-13T06:31:42.688Z

[tool_result] 1	---
2	name: pdf-learn
3	description: PDF Learn — Document to PRISM Components Pipeline
4	composes_with:
5	  - "/autopilot"
6	  - "/digest-all"
7	  - "/forge"
8	  - "/forge-engines"
9	  - "/forge-postflight"
10	  - "/material-lookup"
11	  - "/navigate"
12	  - "/rgs"
13	  - "/scrutinize"
14	  - "/video-learn"
15	consumes:
16	  - "prism_dev:vision_extract"
17	---
18	---
19	name: pdf-learn
20	descri
... [+28918 chars truncated]

### Assistant | 2026-06-13T06:32:15.458Z

Here are the cited findings from both skill files:

---

## 1. Per-item command

**pdf-learn** (pdf-learn.md:156-163, 207-213):
- Vision pre-pass: `node H:/prism-iooms0/mcp-server/scripts/batch-pdf-extract.ts --limit=1 --vault=<VAULT_ROOT>`
- Python ingestion: `from src.document_extract import extract_from_document(file_path, title, force_domain, document_id)`
- Required input: file path, directory, or `mit:<course_id>`. No watchlist concept.

**video-learn** (video-learn.md:66-80):
- Local file: `videoLearningEngine.processVideo(videoPath, opts)` (TypeScript, VideoLearningEngine)
- YouTube: `python -c "from video_ingest import ingest; ..."` via `H:/prism/cad-engine/src/`
- Required input: local path, directory, YouTube URL, or search topic string.

---

## 2. Outputs

**pdf-learn** (pdf-learn.md:321, 392-408):
- `H:/prism/knowledge/ingested/<slug>.md` — vault markdown with frontmatter (hybrid vision output)
- `H:/prism/cad-engine/output/<doc_id>/knowledge.json` — extracted knowledge items
- `H:/prism/cad-engine/output/<doc_id>/component_specs.json` — ranked component specs
- Appends tribal tips to `TribalKnowledgeEngine.ts` KNOWLEDGE_BASE; writes new `.ts` engines/algorithms/hooks, `.md` skills, `.py` scripts, `.json` schemas/formulas
- Updates `H:/prism/cad-engine/knowledge_store/_registry.json` and `H:/prism/mcp-server/data/video-learned/learning-registry.json`

**video-learn** (video-learn.md:164, 218, 282-294):
- `H:/prism/cad-engine/output/<video_id>/pipeline_result.json`
- `H:/prism/cad-engine/output/<video_id>/knowledge.json`
- `H:/prism/cad-engine/output/<video_id>/component_specs.json`
- Same component write targets as pdf-learn; schemas go to `mcp-server/data/video-learned/`, formulas to `mcp-server/data/formulas/`
- Registry: `H:/prism/mcp-server/data/video-learned/learning-registry.json`

---

## 3. Downstream consumers named in the skill

Both skills name the same consumers (pdf-learn.md:576-580, video-learn.md:455-459):
- `/forge-engines audit` — inge
... [+1956 chars truncated]
