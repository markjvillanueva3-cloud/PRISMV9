---
type: "chat-session"
source: "claude-code-cli"
session_id: "087e5978-f3ed-4657-820e-aed49ae8aa0d"
title: "All 34 PRISM galaxy CLAUDE.md assessments have been written to H:/prism/state/sh"
date: "2026-06-13"
first_ts: "2026-06-13T15:17:32.740Z"
last_ts: "2026-06-13T15:27:45.372Z"
cwd: "H:\\PRISM"
messages: 87
user_msgs: 39
assistant_msgs: 48
raw_file: "H:/.claude/projects/H--prism/087e5978-f3ed-4657-820e-aed49ae8aa0d/subagents/workflows/wf_1ffcea80-1e1/agent-a5664cc09b7f7a770.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:04"
---

# All 34 PRISM galaxy CLAUDE.md assessments have been written to H:/prism/state/sh

> **claude-code-cli** | 2026-06-13 | 87 msgs (39 user / 48 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/087e5978-f3ed-4657-820e-aed49ae8aa0d/subagents/workflows/wf_1ffcea80-1e1/agent-a5664cc09b7f7a770.jsonl`

## Transcript

### User | 2026-06-13T15:17:32.740Z

All 34 PRISM galaxy CLAUDE.md assessments have been written to H:/prism/state/shared/slot-claude-md-assessment/*.md (one file per galaxy). You are the synthesis lead.

STEP 1: Glob H:/prism/state/shared/slot-claude-md-assessment/*.md and Read EVERY one (skip _TEMPLATE.md if present). These are domain-expert assessments of how each galaxy's CLAUDE.md should be set up.

STEP 2: Synthesize the CANONICAL per-slot CLAUDE.md TEMPLATE — a single consistent section skeleton that works across ALL 34 domains. For each template section give: the section heading, a 1-line purpose, and concrete guidance on what a galaxy fills in (with a mill or cad mini-example where it clarifies). The template must be token-LEAN (target ~80-160 lines per galaxy file) since it replaces a 530-line monolith per slot.

STEP 3: Also produce, in the same output file, these supporting parts:
- ## Slot→Galaxy Map — the table mapping each of the 26 NATO slots to its galaxy engine-dir (use the assessments' slot annotations; mark unassigned slots).
- ## Universal Core (stays in main CLAUDE.md) — the MINIMAL doctrine set every slot needs regardless of domain (safety rails, R1-R15, scrutiny 3-of-3, handoff/commit/units-first/no-stub, slot system). Everything else in main is a candidate to distribute to galaxy files.
- ## Cross-domain consistency findings — sections some galaxies have that others lack; recommended standardizations.
- ## Per-galaxy biggest-gap table — one row per galaxy: galaxy | slot | quality grade | the single biggest gap to fix.
- ## Enforcement+loader recommendations — concise notes on how a slot should LOAD its galaxy CLAUDE.md (SessionStart, slot→galaxy lookup) and how to hard-enforce "edit your own galaxy file, not main" (we have a dormant claude-md-golf-only-guard.mjs to activate + extend). Flag any risks (e.g. dropping universal safety rails would be unsafe).

WRITE the full result to H:/prism/state/shared/slot-claude-md-assessment/_TEMPLATE.md and then return its COMPLETE text as y
... [+57 chars truncated]

### Assistant | 2026-06-13T15:17:41.259Z

I'll start by reading all the galaxy assessment files. Let me first enumerate the full set.

### Assistant | 2026-06-13T15:17:41.704Z

[tool_use: Glob]

### User | 2026-06-13T15:17:47.243Z

[tool_result] state\shared\slot-claude-md-assessment\fleet-hygiene.md
state\shared\slot-claude-md-assessment\ai-training.md
state\shared\slot-claude-md-assessment\database-expansion.md
state\shared\slot-claude-md-assessment\cad.md
state\shared\slot-claude-md-assessment\post-processor.md
state\shared\slot-claude-md-assessment\business.md
state\shared\slot-claude-md-assessment\token-optimization.md
state\shared\s
... [+1448 chars truncated]

### Assistant | 2026-06-13T15:17:49.770Z

34 files, no _TEMPLATE.md present yet. Let me read all of them. I'll batch the reads.

### Assistant | 2026-06-13T15:17:50.240Z

[tool_use: Read]

### Assistant | 2026-06-13T15:17:50.767Z

[tool_use: Read]

### Assistant | 2026-06-13T15:17:51.185Z

[tool_use: Read]

### Assistant | 2026-06-13T15:17:51.652Z

[tool_use: Read]

### Assistant | 2026-06-13T15:17:51.985Z

[tool_use: Read]

### User | 2026-06-13T15:17:57.172Z

[tool_result] 1	# mill — slot:foxtrot
2	
3	_Assessed 2026-06-13 against live codebase. All engine names, dispatcher names, and file paths verified by Bash/Glob before citation._
4	
5	---
6	
7	## Current state
8	
9	**Size:** 16,658 bytes / 192 lines  
10	**Quality grade: GOOD**
11	
12	The file is well-structured and substantive — far beyond a stub. It has real domain physics (Kienzle constants, chip-thinning, 5-
... [+13324 chars truncated]

### User | 2026-06-13T15:17:57.205Z

[tool_result] 1	# cam — slot:kilo
2	
3	## Current state
4	
5	**Size:** 12,072 bytes · 129 lines  
6	**Quality grade:** PARTIAL
7	
8	**Accurate and load-bearing content found:**
9	- Domain scope definition (section 1) is correct and concise.
10	- Cross-galaxy PSN edges (blueprint-vision, cad, post-processor, mill/lathe/wedm, speed-feed, india) are well-articulated with bridge action names.
11	- India closed-loop
... [+17892 chars truncated]

### User | 2026-06-13T15:17:57.215Z

[tool_result] 1	# lathe — slot:whiskey
2	
3	## Current state
4	
5	**Size:** 15,869 bytes · 190 lines
6	**Quality grade:** GOOD
7	
8	The file is a genuine first-pass galactic center (authored by alpha/mill specialist, not whiskey). It is structurally sound — scope definition, constants reference, engine pointers, test commands, gotchas, tribal pointers, cross-galaxy edges, closed-loop integration stanza, and cro
... [+20424 chars truncated]

### User | 2026-06-13T15:17:57.230Z

[tool_result] 1	## cad — slot:delta
2	
3	### Current state
4	
5	**Size:** 20,573 bytes / 172 lines (galaxy CLAUDE.md at `mcp-server/src/engines/cad/CLAUDE.md`).
6	
7	**Quality grade: EXCELLENT**
8	
9	The cad galaxy CLAUDE.md is one of the strongest in the fleet. It was purpose-built for the Bibryam Context Cascade pattern and loaded with verified, specific content. No fabrications found. Specific findings:
10	

... [+15876 chars truncated]

### User | 2026-06-13T15:17:57.253Z

[tool_result] 1	# wedm — slot:mike
2	
3	## Current state
4	
5	**File:** `H:/prism/mcp-server/src/engines/wedm/CLAUDE.md`
6	**Size:** 16,459 bytes / 193 lines
7	**Quality grade:** PARTIAL
8	
9	### What's accurate and working
10	- Domain scope definition (§1) is correct: wire-EDM only; excludes sinker/fast-hole/micro-hole EDM and all chip-formation domains.
11	- Kienzle/Taylor exclusion rule (§2 + SOUL.md refuses
... [+18379 chars truncated]

### Assistant | 2026-06-13T15:18:00.043Z

These are detailed, high-quality assessments. Let me read the next batch.

### Assistant | 2026-06-13T15:18:00.515Z

[tool_use: Read]

### Assistant | 2026-06-13T15:18:00.997Z

[tool_use: Read]

### Assistant | 2026-06-13T15:18:01.461Z

[tool_use: Read]

### Assistant | 2026-06-13T15:18:02.406Z

[tool_use: Read]

### Assistant | 2026-06-13T15:18:02.410Z

[tool_use: Read]

### User | 2026-06-13T15:18:55.219Z

[tool_result] 1	# quoting — slot:charlie
2	
3	## Current state
4	
5	**Size:** ~181 lines, ~8.5KB  
6	**Quality grade:** GOOD  
7	
8	The file has genuine domain content built from real commit archaeology (QUOTING-SYNERGY-MS0 iter9-46+). Sections 1-7 are accurate and load-bearing. The "Cross-cutting methodology" block (§ after line 155) is generic fleet boilerplate injected uniformly across all 34 galaxies — it d
... [+16498 chars truncated]

### User | 2026-06-13T15:19:00.563Z

[tool_result] 1	# post-processor — slot:echo
2	
3	_Assessment date: 2026-06-13. Assessor: subagent (claude-sonnet-4-6). Sources read: CLAUDE.md, MEMORY.md, PATHS.md, TOOLBELT.md, SOUL.md, AWARENESS glob, main CLAUDE.md head (120 lines for universal/domain split)._
4	
5	---
6	
7	## Current state
8	
9	**Size:** 16,266 bytes / 149 lines.
10	
11	**Quality grade: GOOD**
12	
13	The file was rebuilt from an "HONEST ST
... [+16150 chars truncated]

### User | 2026-06-13T15:19:00.565Z

[tool_result] 1	# business — slot:hotel
2	
3	## Current state
4	
5	**Size:** 19,149 bytes / 187 lines  
6	**Quality grade:** GOOD
7	
8	The current file is the strongest of any galaxy CLAUDE.md assessed so far — it was written by alpha after real commit archaeology (not scaffolded). It has 8 well-structured sections covering domain scope, gotchas, tribal pointers, cross-galaxy edges, and closed-loop india integr
... [+15028 chars truncated]

### User | 2026-06-13T15:19:00.567Z

[tool_result] 1	## ai-training — slot:india
2	
3	### Current state
4	
5	**Size:** ~147 lines / ~7,800 bytes (CLAUDE.md as read 2026-06-13).
6	**Quality grade: GOOD**
7	
8	The file is substantively correct and domain-specific. It was scaffolded by slot:alpha (2026-05-28) and has been incrementally enriched by india sessions through 2026-06-11. It avoids the most common failure modes (no big-picture PRISM milesto
... [+14716 chars truncated]

### User | 2026-06-13T15:19:00.585Z

[tool_result] 1	# speed-feed — slot:oscar
2	
3	## Current state
4	
5	**File:** `H:/prism/mcp-server/src/engines/speed-feed/CLAUDE.md`
6	**Size:** ~6.5KB / 94 lines
7	**Quality grade:** PARTIAL
8	
9	The file was auto-populated 2026-06-09 by `scripts/fill-galaxy-claudemd-domain.mjs` (Ollama-distilled). It has a valid skeleton — scope, PSN edges, closed-loop integration, critic contract, AI-systems pointer — but t
... [+17572 chars truncated]

### Assistant | 2026-06-13T15:19:03.708Z

I have a clear pattern emerging. Let me continue reading the remaining files in larger batches to be efficient.

### Assistant | 2026-06-13T15:19:04.490Z

[tool_use: Read]

### Assistant | 2026-06-13T15:19:05.033Z

[tool_use: Read]

### Assistant | 2026-06-13T15:19:05.512Z

[tool_use: Read]

### Assistant | 2026-06-13T15:19:05.895Z

[tool_use: Read]

### Assistant | 2026-06-13T15:19:06.204Z

[tool_use: Read]

### User | 2026-06-13T15:20:05.103Z

[tool_result] 1	## blueprint-vision — slot:xray
2	
3	### Current state
4	
5	**Size:** 21,104 bytes / 164 lines.
6	
7	**Quality grade: EXCELLENT**
8	
9	The existing galaxy CLAUDE.md is the strongest example in the assessment set so far. It was fully asset-verified by 3 parallel inventory agents on 2026-05-29, correcting a 21-engine hallucination class from the alpha seed. All engine names, dispatcher actions, an
... [+16849 chars truncated]

### User | 2026-06-13T15:20:05.288Z

[tool_result] 1	## cad-fusion-live — fleet-managed
2	
3	### Current state
4	
5	**Size:** ~95 lines / ~4,200 bytes (CLAUDE.md). MEMORY.md ~101 lines. PATHS.md ~115 lines. TOOLBELT.md ~29 lines. SOUL.md ~47 lines. AWARENESS.md ~37 lines.
6	
7	**Quality grade: PARTIAL**
8	
9	Issues found in the current CLAUDE.md:
10	
11	1. **Engine list in §"Key engines (grounded in PATHS.md)" is mostly false positives.** The PATH
... [+15545 chars truncated]

### User | 2026-06-13T15:20:05.349Z

[tool_result] 1	# academy — slot:lima
2	
3	## Current state
4	
5	**Size:** 148 lines / ~7.4 KB (CLAUDE.md only; the galaxy has PATHS.md + TOOLBELT.md + MEMORY.md + SOUL.md + AWARENESS.md as companion files — the full doctrine surface is well-structured).
6	
7	**Quality grade: GOOD**
8	
9	The current CLAUDE.md is the most domain-specific galaxy file reviewed so far. It has real engine names (all verified present
... [+15341 chars truncated]

### User | 2026-06-13T15:20:07.237Z

[tool_result] 1	# system-viz — slot:sierra
2	
3	## Current state
4	
5	**File:** `H:/prism/mcp-server/src/engines/system-viz/CLAUDE.md`
6	**Size:** ~7,800 bytes / 130 lines
7	**Quality grade: GOOD**
8	
9	The file is substantively correct and domain-specific. It was scaffolded by alpha then completed + corrected by sierra (2026-05-29). Key facts are verified on disk. The structure is solid: anti-patterns, operati
... [+15809 chars truncated]

### User | 2026-06-13T15:20:07.238Z

[tool_result] 1	# frontend-app — slot:quebec
2	
3	## Current state
4	
5	**Size:** 88 lines, ~4.1 KB.
6	**Quality grade:** PARTIAL
7	
8	**Accurate + load-bearing content found:**
9	- Scope declaration (Next.js dashboards, React Native mobile, operator kiosks, customer portal) is directionally correct but contains a stale tech-stack claim (see below).
10	- Anti-patterns section is domain-relevant and enforced by 
... [+14180 chars truncated]

### Assistant | 2026-06-13T15:20:11.302Z

I'm the synthesis lead for the galaxy CLAUDE.md template task (not the alpha autonomous loop — that handoff is stale context). Continuing to read the remaining assessment files.

### Assistant | 2026-06-13T15:20:12.262Z

[tool_use: Read]

### Assistant | 2026-06-13T15:20:12.880Z

[tool_use: Read]

### system

... [7 middle messages omitted -- see raw_file] ...

### User | 2026-06-13T15:20:41.247Z

[tool_result] 1	# hermes-zulu — slot:bravo (+ zulu/zebra orchestrator)
2	
3	## Current state
4	
5	**Size:** ~119 lines, ~5.8KB  
6	**Quality grade:** GOOD
7	
8	The current CLAUDE.md is accurate and owner-maintained (bravo corrected stale mill/domain_filter drift on 2026-06-03). No fabricated engine names found — all 9 Hermes/Zulu engines cited in PATHS.md are verified on disk (`HermesParallelFanoutPlannerEngine
... [+13999 chars truncated]

### Assistant | 2026-06-13T15:20:44.732Z

I have a very strong pattern now. Let me read the remaining 14 files to capture all slot annotations and any unique sections.

### Assistant | 2026-06-13T15:20:45.660Z

[tool_use: Read]

### Assistant | 2026-06-13T15:20:46.135Z

[tool_use: Read]

### Assistant | 2026-06-13T15:20:46.631Z

[tool_use: Read]

### Assistant | 2026-06-13T15:20:47.073Z

[tool_use: Read]

### Assistant | 2026-06-13T15:20:47.561Z

[tool_use: Read]

### User | 2026-06-13T15:21:22.317Z

[tool_result] 1	## backend-helper — slot:papa
2	
3	### Current state
4	
5	**Size:** CLAUDE.md is 111 lines / ~6.3 KB. MEMORY.md is 98 lines. PATHS.md is 77 lines. TOOLBELT.md is 29 lines. SOUL.md is 47 lines. AWARENESS.md exists (not read — small by pattern).
6	
7	**Quality grade: PARTIAL**
8	
9	The current CLAUDE.md has a good core concept (cross-cutting build assist, not a domain specialist) and the anti-patt
... [+13033 chars truncated]

### User | 2026-06-13T15:21:25.321Z

[tool_result] 1	## bug-hunting — slot:uniform
2	
3	### Current state
4	
5	**Size:** 127 lines, ~5.9 KB.
6	**Quality grade: GOOD**
7	
8	The current CLAUDE.md is one of the better galaxy files in the fleet. It has genuine domain content: a 10-class bug taxonomy, a verified anti-pattern list, Karpathy 5-step adapted to bug-hunting work, related-galaxy bridges, and dispatcher bridge-OUT declarations. It does NOT re
... [+11632 chars truncated]

### User | 2026-06-13T15:21:25.512Z

[tool_result] 1	## wiring — slot:romeo
2	
3	### Current state
4	
5	**File:** `H:/prism/mcp-server/src/engines/wiring/CLAUDE.md`
6	**Size:** ~5,950 bytes · 134 lines
7	
8	**Quality grade: GOOD**
9	
10	The file is substantively better than most galaxy CLAUDE.md files: it has a real domain identity, a concrete wiring discipline checklist, a meaningful anti-patterns list, Karpathy 5-step adapted to wiring work, liv
... [+16088 chars truncated]

### User | 2026-06-13T15:21:25.513Z

[tool_result] 1	## dormant-data — slot:victor
2	
3	### Current state
4	
5	**Size:** ~130 lines / ~6.5 KB  
6	**Quality grade:** GOOD
7	
8	The current CLAUDE.md is one of the stronger galaxy files in the fleet. It was hand-authored by slot:alpha at galaxy birth (2026-05-28), contains real operational doctrine, and has been enriched by subsequent cross-cutting passes (galaxy-enrichment-program, AI-systems-state s
... [+12413 chars truncated]

### User | 2026-06-13T15:21:26.031Z

[tool_result] 1	# agent-orchestration — fleet-managed
2	
3	## Current state
4	
5	**Size:** ~61 lines / ~3.6KB (CLAUDE.md). Supporting docs verified on disk: MEMORY.md (~118 lines), PATHS.md (~119 lines), TOOLBELT.md (~29 lines), SOUL.md (~46 lines), AWARENESS.md (~37 lines), AGENTIC-SYSTEMS-SOURCE-KNOWLEDGE.md (large operator corpus, 2026-06-10).
6	
7	**Quality grade: GOOD**
8	
9	The file was a stub until 2026-
... [+16017 chars truncated]

### Assistant | 2026-06-13T15:21:29.693Z

Now the final batch — the 6 corpus/curriculum/quality/safety/shop-floor/tribal galaxies (several of these are golf-managed per MEMORY.md).

### Assistant | 2026-06-13T15:21:30.190Z

[tool_use: Read]

### Assistant | 2026-06-13T15:21:31.153Z

[tool_use: Read]

### Assistant | 2026-06-13T15:21:31.646Z

[tool_use: Read]

### Assistant | 2026-06-13T15:21:32.119Z

[tool_use: Read]

### Assistant | 2026-06-13T15:21:32.563Z

[tool_use: Read]

### Assistant | 2026-06-13T15:21:33.032Z

[tool_use: Read]

### Assistant | 2026-06-13T15:21:33.969Z

[tool_use: Read]

### Assistant | 2026-06-13T15:21:34.447Z

[tool_use: Read]

### Assistant | 2026-06-13T15:21:34.690Z

[tool_use: Read]

### User | 2026-06-13T15:21:44.709Z

[tool_result] 1	# quality — fleet-managed
2	
3	## Current state
4	
5	**Size:** 11,305 bytes · 84 lines
6	**Quality grade:** GOOD
7	
8	The file was a phantom stub before 2026-06-08; alpha claimed and populated it from real engine behavior. It is accurate for what it covers and explicitly retracts the phantom path citations it replaced. No fabricated engine names or dispatcher actions found in the body (the MEMOR
... [+14202 chars truncated]

### User | 2026-06-13T15:21:52.182Z

[tool_result] 1	## compliance-safety — fleet-managed
2	
3	### Current state
4	
5	**Size:** 8,530 bytes · 82 lines
6	**Quality grade:** PARTIAL
7	
8	**What is present and useful:**
9	- Scope block with S(x) gate at 0.70, Omega tier ladder, cobot/OSHA/ISO 14955 domain declaration — accurate.
10	- Hard constraint on never weakening safety thresholds — correct and load-bearing.
11	- Cross-galaxy edges (mill/lathe/w
... [+18685 chars truncated]

### User | 2026-06-13T15:21:52.834Z

[tool_result] 1	## shop-floor — fleet-managed
2	
3	### Current state
4	
5	**Size:** 9,511 bytes · 110 lines
6	**Quality grade:** PARTIAL
7	
8	The file has a useful §1 domain scope and §Related galaxies list. The auto-populated GALAXY-CLAUDEMD-FILL block adds some load-bearing pointers (Ollama offload, loop discipline, vault recall, LoRA/CAG/RAG harness, algorithm primitives). The cross-cutting methodology, Crit
... [+16464 chars truncated]

### User | 2026-06-13T15:21:53.021Z

[tool_result] 1	# knowledge-conversion — fleet-managed
2	
3	> Assessment date: 2026-06-13 | Assessor: subagent (sonnet-4-6) | Branch: cad-fusion-live-ms0
4	
5	---
6	
7	## Current state
8	
9	**Size:** ~80 lines, ~3.8 KB
10	**Quality grade: PARTIAL**
11	
12	The file has a correct skeleton — scope, cross-galaxy edges, Ollama cross-cutting methodology block, and Critic/keep-working contract pointer. However the "Ke
... [+14250 chars truncated]

### User | 2026-06-13T15:21:54.371Z

[tool_result] 1	## corpus-aggregation — fleet-managed
2	
3	### Current state
4	**Size:** 8,569 bytes / 82 lines.
5	**Quality grade: PARTIAL**
6	
7	Issues found:
8	- The TOOLBELT.md has a blank dispatcher section: "_(owning slot lists the domain's prism_* dispatcher actions here)_" — the dispatchers ARE known and verifiable but were never filled in.
9	- PATHS.md §Domain dispatchers states "_(none cited in CLAUDE
... [+14448 chars truncated]

### User | 2026-06-13T15:21:54.794Z

[tool_result] 1	# tribal-knowledge — fleet-managed
2	
3	## Current state
4	
5	**Size:** ~3,800 bytes / 85 lines (CLAUDE.md). MEMORY.md ~4,100 bytes / 110 lines.
6	
7	**Quality grade: PARTIAL**
8	
9	The file was auto-populated 2026-06-09 by `scripts/fill-galaxy-claudemd-domain.mjs` (Ollama distillation from PATHS/MEMORY/synthesis). It has real structure and several accurate pointers but has significant problems:
... [+15638 chars truncated]

### User | 2026-06-13T15:21:54.978Z

[tool_result] 1	## mit-curriculum — fleet-managed
2	
3	### Current state
4	
5	**Size:** 95 lines / ~4,400 bytes (CLAUDE.md as read 2026-06-13).
6	**Quality grade:** PARTIAL
7	
8	**Stale / inaccurate / fabricated content found:**
9	
10	1. **§2 Constants reference** cites `mcp-server/src/data/mit-courses-registry.ts` — this file does NOT exist on disk (confirmed by MEMORY.md §Key engines note: "does NOT exist on 
... [+13668 chars truncated]

### User | 2026-06-13T15:21:54.984Z

[tool_result] 1	# pdf-corpus — fleet-managed
2	
3	> Assessment date: 2026-06-13. Assessed by: subagent (sonnet-4-6). All engine names, dispatcher actions, and file paths verified by Grep/Read/Bash before citation.
4	
5	---
6	
7	## Current state
8	
9	**Size:** 9,335 bytes / 95 lines.
10	
11	**Quality grade: PARTIAL**
12	
13	The file has a solid structural skeleton but suffers from these concrete problems:
14	
15
... [+16664 chars truncated]

### User | 2026-06-13T15:21:54.995Z

[tool_result] 1	# pdf-corpus-mill — fleet-managed
2	
3	## Current state
4	
5	**Size:** CLAUDE.md = ~83 lines / ~4.1 KB. MEMORY.md = ~94 lines / ~3.8 KB.
6	
7	**Quality grade: PARTIAL**
8	
9	The current CLAUDE.md is a lightly-populated Ollama-distillation stub (auto-generated 2026-06-09 by `fill-galaxy-claudemd-domain.mjs`) that carries several concrete problems:
10	
11	1. **Fabricated / wrong engine list.** The
... [+14291 chars truncated]

### Assistant | 2026-06-13T15:22:07.434Z

I have now read all 34 assessments. I have a complete, consistent picture. Let me extract the slot→galaxy map from the assessment headers, then synthesize the canonical template.

Slot annotations gathered from the assessment headers:
- mill → foxtrot
- cad → delta
- cam → kilo
- lathe → whiskey
- wedm → mike
- quoting → charlie
- business → hotel
- post-processor → echo
- speed-feed → oscar
- ai-training → india
- blueprint-vision → xray
- cad-fusion-live → fleet-managed (delta/kilo touch it)
- academy → lima
- frontend-app → quebec
- system-viz → sierra
- database-expansion → juliett
- hermes-zulu → bravo (+ zulu orchestrator)
- token-optimization → alpha
- fleet-hygiene → golf
- discovery → tango
- backend-helper → papa
- bug-hunting → uniform
- wiring → romeo
- dormant-data → victor
- agent-orchestration → fleet-managed (zulu de-facto)
- quality → fleet-managed
- compliance-safety → fleet-managed
- shop-floor → fleet-managed
- knowledge-conversion → fleet-managed
- corpus-aggregation → fleet-managed (kilo de-facto)
- tribal-knowledge → fleet-managed
- mit-curriculum → fleet-managed
- pdf-corpus → fleet-managed
- pdf-corpus-mill → fleet-managed

That gives 24 named work-slot owners. NATO slots are alpha..zulu (26). Let me verify which slots are unassigned. Named: alpha, bravo, charlie, delta, echo, foxtrot, golf, hotel, india, juliett, kilo, lima, mike, oscar, papa, quebec, romeo, sierra, tango, uniform, victor, whiskey, xray. That's 23 named. november, yankee, zulu are the 3 not claimed as a galaxy primary (zulu = orchestrator overlay on hermes-zulu/agent-orchestration; november and yankee unassigned). Let me write the synthesis.

### Assistant | 2026-06-13T15:22:07.800Z

[tool_use: TaskUpdate]

### User | 2026-06-13T15:22:17.883Z

[tool_result] Updated task #2 

### Assistant | 2026-06-13T15:25:19.772Z

[tool_use: Write]

### User | 2026-06-13T15:25:29.631Z

[tool_result] File created successfully at: H:/prism/state/shared/slot-claude-md-assessment/_TEMPLATE.md (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-13T15:25:32.526Z

The synthesis is complete and written. Let me mark the task done and return the full text.

### Assistant | 2026-06-13T15:25:32.527Z

[tool_use: TaskUpdate]

### User | 2026-06-13T15:25:33.328Z

[tool_result] Updated task #2 status

### Assistant | 2026-06-13T15:27:45.372Z

Written to `H:/prism/state/shared/slot-claude-md-assessment/_TEMPLATE.md`. Complete text follows.

---

# CANONICAL PER-SLOT GALAXY CLAUDE.md TEMPLATE

> Synthesis lead output, 2026-06-13. Source: 34 domain-expert galaxy assessments in this directory (`state/shared/slot-claude-md-assessment/*.md`), every one read end-to-end. This file is the LOCKED skeleton every galaxy `mcp-server/src/engines/<galaxy>/CLAUDE.md` is rewritten to. Target per-galaxy size: **80–160 lines** (replaces the ~530-line monolith load per slot).

---

## 0. WHY THIS TEMPLATE (the cross-assessment verdict)

All 34 assessments converged on the same 5 findings — the template is built to fix all 5:

1. **Same boilerplate in all 34 files wastes tokens every cascade load.** Four blocks are byte-identical fleet-wide and were flagged DROP in 30+ assessments: `## Cross-cutting methodology` (PC specs / Ollama tier table / loop discipline / vault / LoRA-CAG-RAG, ~15–30 lines), `<!-- AI-SYSTEMS-STATE -->`, `<!-- CRITIC-KEEPWORKING-STANZA -->`, and the verbatim `## Closed-loop integration with india` xproc block. These collapse to a single **Universal-core pointer line** + a 2-line domain-specific closed-loop callout. (Est. savings ~30–50 lines/file.)
2. **Auto-filled `## Key engines` lists are keyword-match noise.** 12/34 files copied PATHS.md's name-heuristic engine dump verbatim — full of false positives (e.g. cad-fusion-live's 236-engine list, pdf-corpus-mill's mill engines, knowledge-conversion's CAD routers). Template mandates a **verified** engine table only (file existence confirmed by Glob/Read; cite or mark `// UNVERIFIED`).
3. **The single highest-value MISSING section across the fleet is the dispatcher action quick-ref.** ~28/34 assessments said "the daily-use dispatcher actions are absent from CLAUDE.md, buried in TOOLBELT.md/MEMORY.md." Template makes §4 Dispatcher quick-ref mandatory and verified.
4. **The second-most-missing section is "What NOT to do" (domain refuses).** ~30/34 added it. T
... [+28537 chars truncated]
