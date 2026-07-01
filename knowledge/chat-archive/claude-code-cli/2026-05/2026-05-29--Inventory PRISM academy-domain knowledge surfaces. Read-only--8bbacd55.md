---
type: "chat-session"
source: "claude-code-cli"
session_id: "8bbacd55-9fad-41a3-8bfb-5479837d2bca"
title: "Inventory PRISM academy-domain knowledge surfaces. Read-only. Work against H:/pr"
date: "2026-05-29"
first_ts: "2026-05-29T02:38:41.672Z"
last_ts: "2026-05-29T02:41:33.938Z"
cwd: "H:\\prism-slot-lima"
messages: 21
user_msgs: 9
assistant_msgs: 12
raw_file: "H:/.claude/projects/H--prism-slot-lima/8bbacd55-9fad-41a3-8bfb-5479837d2bca/subagents/agent-af2dffd0f997bfcb1.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:01"
---

# Inventory PRISM academy-domain knowledge surfaces. Read-only. Work against H:/pr

> **claude-code-cli** | 2026-05-29 | 21 msgs (9 user / 12 assistant) | cwd: H:\prism-slot-lima
> Raw: `H:/.claude/projects/H--prism-slot-lima/8bbacd55-9fad-41a3-8bfb-5479837d2bca/subagents/agent-af2dffd0f997bfcb1.jsonl`

## Transcript

### User | 2026-05-29T02:38:41.672Z

Inventory PRISM academy-domain knowledge surfaces. Read-only. Work against H:/prism.

Tasks:
1. MEMORIES: ls C:/Users/wompu/.claude/projects/H--prism/memory/*lima*.md AND grep -l for "academy"/"course"/"curriculum"/"mit-ocw" across C:/Users/wompu/.claude/projects/H--prism/memory/*.md . Return the top ~12 most academy-relevant memory filenames (prefer lima-authored + academy-topic), each with a ≤12-word summary from its description frontmatter or first heading.
2. WIKI: ls H:/prism/knowledge/wiki/architecture/*academy* H:/prism/knowledge/wiki/architecture/prism-academy* and grep -rl "academy\|curriculum\|MIT-OCW\|course" H:/prism/knowledge/wiki/architecture/ H:/prism/knowledge/wiki/lessons/ (head -15). Return academy-related wiki entry paths + 1-line topic each.
3. TRIBAL: ls H:/prism/mcp-server/data/tribal/*.jsonl 2>/dev/null and grep for slot=lima or "academy"/"course" tagged tips in H:/prism/state/shared/tribal-embed-index.json (just report whether lima/academy tribal tips exist + rough count; do NOT dump entries).
4. CORPUS LOCATION (important — the buildout brief's path H:/PRISM/extracted/mit-ocw/ does NOT exist): find the REAL MIT-OCW corpus. Try: `find H:/prism -maxdepth 4 -type d -iname "*mit*ocw*" -o -iname "*mit-courses*" 2>/dev/null`; `ls H:/prism/mcp-server/data/ | grep -i mit`; `find H:/PRISM -maxdepth 3 -type d -iname "*ocw*" 2>/dev/null`. Also locate lima's pypdf 8,752-page PDF corpus (referenced in memories): grep memories for the corpus path. Report any MIT-OCW or PDF-corpus directory paths found (or "NOT FOUND" honestly).

Return a COMPACT digest (≤45 lines):
## Academy memories (top ~12)
- filename | summary
## Academy wiki entries
- path | topic
## Tribal
- lima/academy tips exist: ✓/✗ (count); tribal jsonl files present: <list>
## Corpus paths
- MIT-OCW: <path or NOT FOUND>
- pypdf PDF corpus: <path or NOT FOUND>
- JM Die academy/training subtrees: <path or NOT FOUND>
Honest NOT FOUND where applicable. No full dumps.

### Assistant | 2026-05-29T02:39:05.500Z

I'll inventory PRISM academy-domain knowledge surfaces. Running read-only discovery across the four task areas in parallel.

### Assistant | 2026-05-29T02:39:07.929Z

[tool_use: Bash]

### Assistant | 2026-05-29T02:39:10.289Z

[tool_use: Bash]

### Assistant | 2026-05-29T02:39:13.121Z

[tool_use: Bash]

### Assistant | 2026-05-29T02:39:17.594Z

[tool_use: Bash]

### User | 2026-05-29T02:40:01.956Z

[tool_result] C:/Users/wompu/.claude/projects/H--prism/memory/feedback_use_lima_pypdf_page_extractor.md  5.2K
C:/Users/wompu/.claude/projects/H--prism/memory/reference_ai_wire_ms0_lima_2026_05_22.md  3.8K
C:/Users/wompu/.claude/projects/H--prism/memory/reference_india_closeout_misattributed_lima_2026_05_23.md  3.2K
C:/Users/wompu/.claude/projects/H--prism/memory/reference_lima_academy_expansion_2026_05_24_sessi
... [+446 chars truncated]

### User | 2026-05-29T02:40:07.019Z

[tool_result] ---TRIBAL JSONL---
H:/prism/mcp-server/data/tribal/jm-die-corpus-pages.jsonl  16.7M
H:/prism/mcp-server/data/tribal/jm-die-corpus.jsonl  45.6K
H:/prism/mcp-server/data/tribal/jm-fleet-machines.jsonl  63.9K
H:/prism/mcp-server/data/tribal/machine-models-assembly.jsonl  131.5K
H:/prism/mcp-server/data/tribal/online-cad-cam-tips.jsonl  2.4M
H:/prism/mcp-server/data/tribal/youtube-toolpath-tribal.json
... [+134 chars truncated]

### User | 2026-05-29T02:40:12.324Z

[tool_result] ---WIKI ACADEMY LS---
H:/prism/knowledge/wiki/architecture/prism-academy-mobile-ms0.md  16.4K
H:/prism/knowledge/wiki/architecture/prism-academy-mobile-ms0.md  16.4K
---WIKI GREP ARCH---
H:/prism/knowledge/wiki/architecture/actions/dev/mcdl-find-relevant-courses.md
H:/prism/knowledge/wiki/architecture/actions/dev/mcdl-get-all-course-ids.md
H:/prism/knowledge/wiki/architecture/actions/dev/mcfi-get-
... [+1590 chars truncated]

### User | 2026-05-29T02:40:32.495Z

[tool_result] ---MIT-OCW DIRS H:/prism---
H:/prism/mcp-server/data/extracted-knowledge/mit-courses
---data dir mit---
---H:/PRISM ocw---
---PYPDF CORPUS in memories---
H:/PRISM/JM DIE/CNC
H:/PRISM/JM DIE/HAAS-HURCO/VALLEY
H:/PRISM/JM DIE/MACRO
H:/PRISM/JM DIE/OKUMA/JM
H:/PRISM/JM DIE/OKUMA/SETUPS/*.hmc
H:/PRISM/JM DIE/OKUMA/hyperCAD-S
H:/PRISM/JM DIE/POST
H:/PRISM/JM DIE/PRISM
H:/PRISM/JM DIE/TRIBAL
H:/PRISM/JM
... [+602 chars truncated]

### Assistant | 2026-05-29T02:40:38.224Z

I have enough to finish. Let me grab the corpus directory contents and the key memory summaries.

### Assistant | 2026-05-29T02:40:42.998Z

[tool_use: Bash]

### Assistant | 2026-05-29T02:40:46.008Z

[tool_use: Bash]

### User | 2026-05-29T02:40:49.943Z

[tool_result] ---MIT-COURSES CONTENTS---
(empty)
---COUNT---
1
---LIMA CORPUS PATH FROM MEMORY---
Compact grep - strips whitespace, truncates, groups by file

Usage: rtk grep [OPTIONS] <PATTERN> [PATH] [EXTRA_ARGS]...

Arguments:
---PYPDF OUTPUT PATHS---

      --context-only           Show only match context (not full line)
      --skip-env               Set SKIP_ENV_VALIDATION=1 for child processes (Next.js, 
... [+521 chars truncated]

### User | 2026-05-29T02:40:56.264Z

[tool_result] === reference_lima_academy_expansion_2026_05_24_session ===
---
name: reference-lima-academy-expansion-2026-05-24-session
[134 more lines]
=== reference_lima_pypdf_extraction_canonical_2026_05_26 ===
---
name: lima-pypdf-extraction-canonical-2026-05-26
[83 more lines]
=== feedback_use_lima_pypdf_page_extractor ===
---
name: use-lima-pypdf-page-extractor
[73 more lines]
=== reference_ai_wire_ms0_li
... [+840 chars truncated]

### Assistant | 2026-05-29T02:41:01.731Z

The MIT-courses extracted-knowledge dir exists but is EMPTY. The pypdf corpus is the JM Die corpus jsonl files. Let me grab the actual pypdf corpus output path + page count from the canonical memory, and the academy memory descriptions, then I have everything.

### Assistant | 2026-05-29T02:41:02.682Z

[tool_use: Read]

### Assistant | 2026-05-29T02:41:03.392Z

[tool_use: Read]

### User | 2026-05-29T02:41:06.501Z

[tool_result] 1	---
2	name: lima-pypdf-extraction-canonical-2026-05-26
3	description: "Lima's pypdf page-by-page extractor empirically dominated whiskey's pdf-parse heading-anchor method by 76× on the same 80-PDF corpus; codified as canonical method via feedback_use_lima_pypdf_page_extractor"
4	metadata:
5	  node_type: memory
6	  type: reference
7	  originSessionId: 2aaceebb-d2a5-4568-992f-963a60bf5b0e
8	---
9	
... [+2262 chars truncated]

### User | 2026-05-29T02:41:06.679Z

[tool_result] 1	---
2	name: reference-lima-academy-expansion-2026-05-24-session
3	description: 15-course academy expansion shipped 2026-05-24..25 lima iter25-iter39 (course-18 through course-32). 23/23 CAM entry + function-index ref + dual-level pedagogy template + complete toolpath catalog + programming paradigms + Operations Atlas Rosetta Stone + Math/Science Deep-Dive (Merchant + Komanduri + Archard + Bramme
... [+1037 chars truncated]

### Assistant | 2026-05-29T02:41:33.938Z

I have everything needed. Compiling the digest.

## Academy memories (top ~12)
- reference_lima_academy_expansion_2026_05_24_session.md | 15-course academy expansion (course-18..32), 87 modules, dual-level pedagogy, math/science deep-dives
- reference_lima_pypdf_extraction_canonical_2026_05_26.md | pypdf page-by-page extractor (canonical) — 8,752 page tribal entries, 12 domains
- feedback_use_lima_pypdf_page_extractor.md | Standing rule: all chats use lima's pypdf extractor; 76x deeper than pdf-parse
- reference_ai_wire_ms0_lima_2026_05_22.md | Lima AI-WIRE-MS0 — engine wiring milestone (academy-adjacent)
- reference_lima_loop_post_compact_2026_05_22.md | Lima autonomous /loop resume across /compact boundary
- reference_u_lima_a8_transfer_priors_2026_05_21.md | Lima A8 transfer-priors unit (learning/curriculum-adjacent)
- reference_u_lima_a7_calibration_2026_05_20.md | Lima A7 live physics calibration unit
- reference_india_closeout_misattributed_lima_2026_05_23.md | India close-out work misattributed to lima (provenance note)
- (Note: grep for academy|course|curriculum|mit-ocw across all memory/*.md returned ONLY lima files above — no other academy-tagged memories exist)

## Academy wiki entries
- knowledge/wiki/architecture/prism-academy-mobile-ms0.md | PRISM Academy mobile MS0 (apprentice-phone academy surface)
- knowledge/wiki/architecture/curriculumengine.md | CurriculumEngine (course definitions + RICH_MODULES backend)
- knowledge/wiki/architecture/courses-index.md | Master index of all academy courses
- knowledge/wiki/architecture/course-forge-conversions.md | MIT-OCW idea → routed → forged algorithm-node conversions
- knowledge/wiki/architecture/course-forge-stubs-emitter.md | Lane C forge-queue stub emitter (course → node)
- knowledge/wiki/architecture/college-courses-psn-incorporation.md | College courses incorporated into PSN
- knowledge/wiki/architecture/college-course-autogen-specs.md | Auto-generated college course specs
- knowledge/wiki/architecture/d
... [+2454 chars truncated]
