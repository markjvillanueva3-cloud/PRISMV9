---
type: "chat-session"
source: "claude-code-cli"
session_id: "87d96286-aba0-4263-85de-26771e812c92"
title: "CRITICAL: the PRISM MCP server is DOWN this session — every mcp__prism__* / pris"
date: "2026-05-29"
first_ts: "2026-05-29T04:20:12.860Z"
last_ts: "2026-05-29T04:24:21.352Z"
cwd: "H:\\prism-slot-mike"
messages: 17
user_msgs: 7
assistant_msgs: 10
raw_file: "H:/.claude/projects/H--prism-slot-mike/87d96286-aba0-4263-85de-26771e812c92/subagents/workflows/wf_fe50bd56-d22/agent-acf9e5d3602662c23.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:01"
---

# CRITICAL: the PRISM MCP server is DOWN this session — every mcp__prism__* / pris

> **claude-code-cli** | 2026-05-29 | 17 msgs (7 user / 10 assistant) | cwd: H:\prism-slot-mike
> Raw: `H:/.claude/projects/H--prism-slot-mike/87d96286-aba0-4263-85de-26771e812c92/subagents/workflows/wf_fe50bd56-d22/agent-acf9e5d3602662c23.jsonl`

## Transcript

### User | 2026-05-29T04:20:12.860Z

CRITICAL: the PRISM MCP server is DOWN this session — every mcp__prism__* / prism_* tool call WILL FAIL. Use ONLY native tools: Read, Grep, Glob, Bash (git-bash, forward-slash paths). Do not call any prism_* dispatcher. Root tree is H:/prism (branch cad-fusion-live-ms0, most current). The mike slot worktree is H:/prism-slot-mike (branch slot/mike). Read from H:/prism for current state.

CONTENT-MINING TASK for the WEDM galaxy brain. You are mining VERIFIED wire-EDM (electrical-discharge) content — NEVER write mill-analog guesses.

1. Read mcp-server/src/data/wedm-knowledge-tips.ts FULLY (it is the canonical 122-entry tribal source — all knowledge/tribal/wedm-knowledge-tips-*.md regenerate from it). Also read mcp-server/src/data/jm-die-wedm-tech-tables.ts (E12xx + E28xx FA-10S per-pass tables) and mcp-server/src/data/jm-die-wedm-program-patterns.ts (ground-truth NC program analyses).
2. From those, extract the TOP 10-14 verified discharge-physics gotchas with citation (tip id, NC program name, or engine). These fill the galaxy CLAUDE.md §5 (currently empty stub). Topics: pulse-on/off ratio vs surface finish, wire-tension vs straightness vs breakage, flushing pressure & chip evacuation, recast-layer depth vs spec, taper-cut wire-deflection compensation, no-core sequencing, multi-pass H-offset cascades (E12xx 0.0085/0.0064/0.0058/0.0053), brass vs zinc-coated wire selection, dielectric conductivity, corner strategy, thermal HAZ.
3. List the top 10 [[memory-name]] pointers most relevant to WEDM. Search C:/Users/wompu/.claude/projects/H--prism/memory/ for filenames containing wedm/edm/wire (e.g. wedm_wire_consumption, wedm_select_wire, wedm_thin_wire_derate, reference_wire_domain_atlas_for_mike). Return as [[name]] (strip .md).
4. List top 6-8 wiki cross-refs: ls H:/prism/knowledge/wiki/code-tribal/wedm-*.md + knowledge/wiki/lessons/wedm-*.md — pick the highest-signal. Return as [[code-tribal/wedm-...]] etc.
5. Summarize what wedm-knowledge-tips.ts contains.

Return stri
... [+19 chars truncated]

### Assistant | 2026-05-29T04:20:23.750Z

I'll mine the verified WEDM content. Let me start by reading the three canonical source files in parallel.

### Assistant | 2026-05-29T04:20:24.241Z

[tool_use: Read]

### Assistant | 2026-05-29T04:20:25.205Z

[tool_use: Read]

### Assistant | 2026-05-29T04:20:25.369Z

[tool_use: Read]

### User | 2026-05-29T04:20:28.027Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-720 of 1505 total (44411 tokens, cap 25000). Call Read with offset=721 limit=720 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	/**
2	 * Wire EDM Tribal Knowledge Tips
3	 *
4	 * Expert-level WEDM tips sourced from:
5	 *   - Klocke (2
... [+55813 chars truncated]

### User | 2026-05-29T04:20:29.006Z

[tool_result] 1	/**
2	 * JM Die Company — Mitsubishi FA-10S Wire EDM Technology Tables
3	 *
4	 * Extracted from real production programs:
5	 *   - ITW SHAKEPROOF 500-30540-24000-04.NC (D2, 4-pass straight)
6	 *   - NOZE TEST.NC (SS taper, 5-pass UV)
7	 *   - CHOCTAW DEFENSE 38 CAL CANNELURE (D2, 5-pass heavy)
8	 *   - FIOCCHI 38 CAL CANNELURE (D2, 5-pass heavy)
9	 *
10	 * Also validated against Mastercam X8 Mit
... [+9547 chars truncated]

### User | 2026-05-29T04:20:29.012Z

[tool_result] 1	/**
2	 * JM Die Company — Wire EDM Program Pattern Analysis
3	 *
4	 * Extracted from real production programs in H:/PRISM/JM DIE/WIRE EDM/
5	 * Total archive: 4,058 files across 100+ customer folders
6	 * NC/MIN programs analyzed: 22 files
7	 *
8	 * Programs analyzed:
9	 *   - ITW SHAKEPROOF 500-30540-24000-04.NC (D2, E12xx 4-pass straight)
10	 *   - NOZE TEST.NC (SS taper, E28xx 5-pass UV)
11	 
... [+20554 chars truncated]

### Assistant | 2026-05-29T04:20:33.389Z

I have the tech tables and program patterns fully. The tips file is 1505 lines and I've read lines 1-720. Let me read the rest to extract all verified discharge-physics gotchas, and in parallel discover the memory and wiki files.

### Assistant | 2026-05-29T04:20:34.412Z

[tool_use: Read]

### Assistant | 2026-05-29T04:20:36.935Z

[tool_use: Bash]

### User | 2026-05-29T04:20:40.248Z

[tool_result] 721	  {
722	    id: "jm-die-003",
723	    title: "JM Die E12xx heavy 5-pass for thick stock and cannelure dies — E1281-E1282-E1283-E1284-E1285",
724	    body: "For thicker tool steel (>2\" up to 6\") and cannelure (thread roll) dies that require superior surface finish, JM Die uses the E12xx heavy 5-pass sequence: E1281-E1285. The E128x family has higher power settings than E122x for roughing but 
... [+55998 chars truncated]

### User | 2026-05-29T04:22:52.030Z

[tool_result] feedback_dont_wire_for_wiring_sake_2026_05_16.md  3.4K
feedback_echo_stub_wired_is_dark.md  1.1K
reference_ai_wire_ms0_lima_2026_05_22.md  3.8K
reference_b3_hmemv06_dispatcher_wire_closeout_2026_05_28.md  4.8K
reference_bash_orphan_cleaner_wired_2026_05_16.md  3.3K
reference_cad_pipeline_wire_ms0_2026_05_24.md  4.6K
reference_cag_hook_inject_peer_wire_2026_05_26.md  3.1K
reference_course_13_wedm_p
... [+5472 chars truncated]

### Assistant | 2026-05-29T04:23:02.369Z

I now have the complete picture. I've read all 122 tips (verified the count by the id ranges), the full E-code tech tables, the program patterns, the memory files, and the wiki files. Let me verify a couple of the high-signal wiki files exist and check the two best code-tribal tactics docs before finalizing.

The two `wedm-tactics-*.md` files in code-tribal are the highest-signal synthesized docs (7.9K + 8.0K). The `domain-wedm.md` (13.8K) and `dispatcher-edm.md` (10.2K) in architecture are comprehensive. The `hybrid-post-merge-half-wire-bug-class` is the only WEDM lesson. I have everything needed.

Let me now extract the verified discharge-physics gotchas with citations. I have full coverage:
- Tips wedm-kb-001..030 (handbook-sourced physics)
- Tips wedm-jmd-001..008, jm-die-001..020 (JM Die NC programs)
- Tips wedm-mcam, wedm-sp, wedm-ml, wedm-web, wedm-research
- E12xx/E28xx FA-10S tech tables with exact per-pass H-offsets and feeds
- NC program analyses (ITW SHAKEPROOF, NOZE TEST, FIOCCHI cannelure)

I have verified, discharge-physics-grounded gotchas (not mill analogs). Submitting structured output.

### Assistant | 2026-05-29T04:24:09.118Z

[tool_use: StructuredOutput]

### User | 2026-05-29T04:24:10.167Z

[tool_result] Structured output provided successfully

### Assistant | 2026-05-29T04:24:21.352Z

Structured output submitted successfully. I mined the three canonical WEDM source files and returned strict JSON with:

- **14 verified discharge-physics gotchas**, each citing a specific tip id (e.g. wedm-jmd-006), NC program (NOZE TEST.NC, FIOCCHI cannelure), or tech-table source. Coverage spans every requested topic: pulse-on/off vs Ra-MRR tradeoff, wire-tension-vs-power break sequencing, flushing 1/sqrt(thickness) degradation + per-pass pressure scheduling, recast Carslaw-Jaeger depth vs AMS 2628 spec, taper UV wire-deflection (zero-H-register rule), closely-spaced/no-core sequencing, the exact E12xx 0.0085/0.0064/0.0058/0.0053 H-cascade, brass-vs-zinc-coated wire, dielectric resistivity/conductivity, corner strategy, and thermal HAZ distortion. No mill-analog guesses.
- **Top 10 WEDM [[memory]] pointers** (wire domain atlas, lathe-to-wedm pivot, phase-A proof, fixture dependency, etc.).
- **8 wiki cross-refs** (the two highest-signal code-tribal tactics docs + domain-wedm + dispatcher-edm + phase-A corpus + the only WEDM lesson).
- **Tribal source summary** documenting the 122-entry structure, the 5 entry families, and the companion E12xx/E28xx FA-10S tech tables + program patterns.

Key files read (absolute paths):
- `H:/prism/mcp-server/src/data/wedm-knowledge-tips.ts` (1505 lines, 122 entries)
- `H:/prism/mcp-server/src/data/jm-die-wedm-tech-tables.ts`
- `H:/prism/mcp-server/src/data/jm-die-wedm-program-patterns.ts`
