---
type: "chat-session"
source: "claude-code-cli"
session_id: "db273e77-fb5e-418e-b0e1-d7ef98b97236"
title: "RECON for adding a \"cite file:line when referencing existing code\" practice to P"
date: "2026-06-08"
first_ts: "2026-06-08T17:12:38.789Z"
last_ts: "2026-06-08T17:15:55.167Z"
cwd: "H:\\prism"
messages: 32
user_msgs: 11
assistant_msgs: 21
raw_file: "H:/.claude/projects/H--prism/db273e77-fb5e-418e-b0e1-d7ef98b97236/subagents/workflows/wf_adbf59c4-b15/agent-aef768e0bf429a3b2.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:29"
---

# RECON for adding a "cite file:line when referencing existing code" practice to P

> **claude-code-cli** | 2026-06-08 | 32 msgs (11 user / 21 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/db273e77-fb5e-418e-b0e1-d7ef98b97236/subagents/workflows/wf_adbf59c4-b15/agent-aef768e0bf429a3b2.jsonl`

## Transcript

### User | 2026-06-08T17:12:38.789Z

RECON for adding a "cite file:line when referencing existing code" practice to PRISM (Article 3 working-signal #2; currently ABSENT — no doctrine, no hook). DO NOT BUILD — recon + design only.
STEPS (read actual files):
1. Confirm absence: Grep global + project CLAUDE.md for "file:line", "file_path:line", "cite". READ the surrounding HONESTY RULES block (global CLAUDE.md ~line 40-45) to find where a citation line would fit.
2. The harness ALREADY makes file_path:line clickable (it's in the base system prompt). So the gap is purely: nothing in PRISM doctrine asks Claude to cite it. Is a HOOK even sensible here (you can't reliably detect "referenced code without citation" mechanically), or is this doctrine-only (one line in the HONESTY RULES block)?
3. READ the global CLAUDE.md HONESTY RULES block in full and propose the exact one-line addition (it must fit the "≤8 lines deliberately" constraint noted there — so it likely FOLDS INTO the existing "Verify a symbol before claiming it exists" bullet rather than adding a new bullet).
DESIGN OUTPUT: the exact doctrine edit (verbatim before/after of the bullet), whether a hook is warranted (likely NO — recommend doctrine-only), and the file:line of where to edit. Flag that editing the root global CLAUDE.md is fleet-wide (mirrored C:->H:). Be honest if this is low-value.

### Assistant | 2026-06-08T17:12:53.126Z

I'll help you recon the absence of "cite file:line when referencing existing code" in PRISM and design the addition. Let me start by exploring the codebase.

### Assistant | 2026-06-08T17:12:53.176Z

[tool_use: Bash]

### User | 2026-06-08T17:13:21.962Z

[tool_result] ./.cache/npm/_npx/09002f125df728b2/node_modules/@claude-flow/mcp/CLAUDE.md
./.cache/npm/_npx/09002f125df728b2/node_modules/agentic-flow/docs/CLAUDE.md
./.claude/CLAUDE.md
./.claude/plugins/cache/claude-plugins-official/qodo-skills/0.6.1/CLAUDE.md
./.claude/plugins/cache/claude-plugins-official/qodo-skills/b1eb0389480e/CLAUDE.md
./.claude/plugins/cache/claude-plugins-official/supabase/0.1.4/CLAUDE.
... [+1078 chars truncated]

### Assistant | 2026-06-08T17:13:25.927Z

Let me find and read the global CLAUDE.md to understand the current HONESTY RULES block.

### Assistant | 2026-06-08T17:13:26.053Z

[tool_use: Read]

### User | 2026-06-08T17:13:26.878Z

[tool_result] 1	# PRISM Global CLAUDE.md — Operational Playbook v2.5
2	
3	> **Edit `C:\Users\<your-user>\.claude\settings.json` ONLY** — the `c-to-h-mirror` hook (`.claude/hooks/mirror-c-to-h.mjs`, INTEL-OLLAMA-OBSIDIAN-MS0/P6-U01, **wired into both settings.json 2026-05-15**) auto-replicates C: → H: on every Edit/Write/MultiEdit/NotebookEdit. One-way only; SHA-256 byte-equal skip; 2s throttle; excludes cache/l
... [+23176 chars truncated]

### Assistant | 2026-06-08T17:13:32.898Z

I already have the global CLAUDE.md content. Now let me search for any existing references to "file:line", "cite", or "citation" patterns in the project and also check the project's CLAUDE.md.

### Assistant | 2026-06-08T17:13:33.503Z

[tool_use: Bash]

### User | 2026-06-08T17:13:38.341Z

[tool_result] /usr/bin/bash: line 1: $null: ambiguous redirect

### Assistant | 2026-06-08T17:13:41.412Z

Let me fix the PowerShell syntax and search properly.

### Assistant | 2026-06-08T17:13:41.797Z

[tool_use: Bash]

### User | 2026-06-08T17:14:32.219Z

[tool_result] H:/prism/.cache/npm/_npx/09002f125df728b2/node_modules/agentic-flow/docs/quic/IMPLEMENTATION-COMPLETE-SUMMARY.md:   - File:line references
H:/prism/.cache/npm/_npx/09002f125df728b2/node_modules/agentic-flow/docs/quic/QUIC-STATUS-OLD.md:- ✅ Source code references (file:line)
H:/prism/.cache/npm/_npx/09002f125df728b2/node_modules/agentic-flow/docs/quic/QUIC-STATUS.md:- ✅ Source code references (file
... [+3042 chars truncated]

### Assistant | 2026-06-08T17:14:35.004Z

Now let me check the project CLAUDE.md file.

### Assistant | 2026-06-08T17:14:35.005Z

[tool_use: Read]

### User | 2026-06-08T17:14:36.174Z

[tool_result] 1	# PRISM — Manufacturing Intelligence Platform
2	
3	## EXPERT ROLE (ALWAYS ACTIVE)
4	<!-- DUPLICATE-CANDIDATE 2026-05-17 OBSOLESCENCE-CLEANUP-MS0/U-OBS-C2: parallel section in C:/Users/wompu/.claude/CLAUDE.md §EXPERT ROLE. Proposed canonical owner: GLOBAL. Collapse this body to pointer after 2026-05-24. Advisory: state/shared/specs/CLAUDE-MD-DUPLICATION-CANDIDATES-2026-05-17.md -->
5	You are the 
... [+32909 chars truncated]

### Assistant | 2026-06-08T17:14:39.455Z

Perfect. I can see task #11 is pending — "G2: file:line citation doctrine (fold into HONESTY RULES)". Let me now examine the HONESTY RULES block in the global CLAUDE.md to understand its structure and where a citation line would fit.

### Assistant | 2026-06-08T17:14:39.977Z

[tool_use: Read]

### User | 2026-06-08T17:14:40.806Z

[tool_result] 40	## CLAUDE.md RULES 5–13 — agent-era complement to Karpathy's 4 (src: @Mnilax X article, 2026-05)
41	
42	> Karpathy's original 4 (Think Before Coding · Simplicity First · Surgical Changes · Goal-Driven Execution) target the *moment code is written*. These 9 cover the agent-orchestration failure modes that template is silent on — they don't compete for the same attention budget, they patch differ
... [+5229 chars truncated]

### Assistant | 2026-06-08T17:14:45.098Z

Perfect. Now let me check if there's any existing "HONESTY RULES" block elsewhere that I should be aware of.

### Assistant | 2026-06-08T17:14:46.096Z

[tool_use: Bash]

### User | 2026-06-08T17:14:51.223Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-08T17:14:54.902Z

Let me search more broadly for patterns about verifying symbols or citing references in existing code.

### Assistant | 2026-06-08T17:14:55.348Z

[tool_use: Bash]

### User | 2026-06-08T17:15:21.672Z

[tool_result] H:/prism/.claude/agents/verifier.md:21:   - Verify no exported symbols removed
H:/prism/.claude/commands/macro-program.md:115:   - On FAIL: `{ passed: false, sxScore: <N.NNN>, failingChecks: [...] }`. Each failing check's `gate` + `detail` is printed. NEVER claim a file exists. NEVER suggest overriding the threshold.
H:/prism/.claude/commands/pick-task.md:51:- For each incomplete milestone ID, che
... [+2545 chars truncated]

### Assistant | 2026-06-08T17:15:24.504Z

Now let me look at the project-level CLAUDE.md to see if there's a HONESTY/INTEGRITY section that might be a better candidate.

### Assistant | 2026-06-08T17:15:24.819Z

[tool_use: Bash]

### User | 2026-06-08T17:15:29.853Z

[tool_result] 46:- 2026-06-04 | **[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-DB-GEN-MS0]/U-EMBED-POOL-LOCK + H-DRIVE-DB-CENSUS (slot:juliett): GPU embed-pool + cited-tips ...** | observed-in: a4648b64b | fix: see commit | verify: `git -C H:/prism show a4648b64b`
414:The ONLY roadmap is `PRISM-UNIFIED-ROADMAP-v2.md` (v2.1). Ignore everything in `data/docs/roadmap/` and `plans-archive/`. Task queue: `mcp-server/d
... [+142 chars truncated]

### Assistant | 2026-06-08T17:15:33.046Z

Let me now check the actual task #11 to see what was originally intended, and also verify the current state by looking at pre-review.md which mentions "cite file paths".

### Assistant | 2026-06-08T17:15:33.286Z

[tool_use: Read]

### User | 2026-06-08T17:15:35.471Z

[tool_result] 1	---
2	policy:
3	  tier: 2
4	  triggers:
5	    - "pre-review"
6	    - "pre review"
7	    - "r1 draft"
8	    - "deepseek draft"
9	consumes:
10	  - "prism_ai:pre_review"
11	  - "prism_context:coord_sqlite"
12	---
13	# /pre-review — DeepSeek-R1 drafts, Claude refines
14	
15	Manual invocation of the **pre-Claude review pattern** (sibling of automatic
16	hook P22-U02 + engine P22-U01): a local reasoni
... [+24463 chars truncated]

### Assistant | 2026-06-08T17:15:55.167Z

Excellent. Now I have the full context. Let me compile the recon findings.

## RECON SUMMARY: "cite file:line when referencing existing code" practice for PRISM

### 1. ABSENCE CONFIRMED
- **Global CLAUDE.md (`H:/.claude/CLAUDE.md`)**: Rules R5–R15 (lines 44–54) — **NO citation doctrine present**. The HONESTY RULES block is deliberately ≤20 lines per the article cited (line 42), so there's room for exactly ONE folded addition.
- **Project CLAUDE.md (`H:/prism/CLAUDE.md`)**: No "cite file:line" or "HONESTY RULES" section found.
- **Existing code references**: While `/pre-review.md` (line 163) says "cite file paths, function names, schema fields when known," this is task-specific guidance for R1 drafts, NOT fleet-wide doctrine.

### 2. HARNESS CAPABILITY CONFIRMED
The system prompt **already makes `file_path:line` clickable** (per the task description). The gap is **purely doctrine** — no hook needed. Reason: you cannot mechanically detect "referenced code without citation" (false positives from non-code contexts, comments, etc.).

### 3. WHERE THE CITATION LINE FITS
The existing **R8 — Read before you write** (line 47) is the natural anchor. It already teaches:
> "Before adding to a file: read its exports, the immediate caller, and obvious shared utilities. Don't understand why existing code is shaped that way? Ask first."

**The citation rule is a sibling of R8's verification step** — it says "after you *verify* the code exists, cite the location so peers can follow your reference."

### 4. DESIGN: EXACT ONE-LINE ADDITION

**File to edit:** `H:/.claude/CLAUDE.md` (global; fleet-wide via C:→H: mirror hook)  
**Line:** 47 (end of R8 bullet)

**BEFORE (current):**
```markdown
- **R8 — Read before you write.** Before adding to a file: read its exports, the immediate caller, and obvious shared utilities. Don't understand why existing code is shaped that way? Ask first. "Looks orthogonal to me" is the most dangerous phrase in the repo. → PRISM: `/dedup` + `duplicationGuar
... [+2816 chars truncated]
