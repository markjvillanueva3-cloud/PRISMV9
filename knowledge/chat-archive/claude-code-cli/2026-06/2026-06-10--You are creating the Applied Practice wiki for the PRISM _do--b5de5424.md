---
type: "chat-session"
source: "claude-code-cli"
session_id: "b5de5424-ef1f-447a-a3f1-e5a8ce2cad24"
title: "You are creating the Applied Practice wiki for the PRISM \"dormant-data\" galaxy ("
date: "2026-06-10"
first_ts: "2026-06-10T10:38:56.849Z"
last_ts: "2026-06-10T10:40:33.488Z"
cwd: "H:\\prism"
messages: 28
user_msgs: 11
assistant_msgs: 17
raw_file: "H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_e23c4f2a-bb2/agent-a5d0f32f82c5d471d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:23"
---

# You are creating the Applied Practice wiki for the PRISM "dormant-data" galaxy (

> **claude-code-cli** | 2026-06-10 | 28 msgs (11 user / 17 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_e23c4f2a-bb2/agent-a5d0f32f82c5d471d.jsonl`

## Transcript

### User | 2026-06-10T10:38:56.849Z

You are creating the Applied Practice wiki for the PRISM "dormant-data" galaxy (owner: victor): knowledge/wiki/dormant-data/dormant-data-applied-practice.md.

PURPOSE: the PRACTITIONER-KNOWLEDGE ("tribal knowledge") layer -- the hard-won CS-engineering gotchas, FAILURE MODES, and TECHNIQUE DECISIONS that pure theory does not teach. DISTINCT from dormant-data-foundations.md (theory) -- read it first so you do not repeat it; this entry is "what goes wrong in practice and how an expert avoids it."

FOCUS for dormant-data: GC/storage-lifecycle practitioner gotchas: refcount misses cycles (tracing needed), premature reclaim of still-referenced data, age != unreachable (a 1-year-old hot row), a full scan demoting hot data, TOCTOU race on delete (file recreated between check and unlink), retention-policy gap losing required records. Free: OSTEP, database-storage courses.
CS-engineering claims here are papa-verifiable -- cite course/docs/paper. Leave any benchmark-specific number owner-gated.

ABSOLUTE RULES (R12 honesty):
1. ONLY state a claim you CONFIRM by WebFetch on a reputable free/legal source (OSTEP, MIT/Stanford courseware, official docs, man pages, arXiv, NIST/OSHA, reputable engineering reference). Never fabricate. If a fetch fails, retry once then drop it.
2. Aim for 8-12 cited gotchas/technique notes across 4-5 themed sections. Each = the gotcha + WHY + the expert's avoidance, source cited inline. Map each to how THIS PRISM galaxy hits it (one line).
3. Legal free sources ONLY. All ASCII in code; markdown fine in the body.
4. Frontmatter: title, galaxy: dormant-data, owner_slot: victor, status: VERIFIED-PARTIAL, verified_by: "papa-applied-practice-meta (2026-06-10)", verification_method, tags. End with "## Owner-gate (NOT promoted)" + "## Sources".
5. Do NOT run git/commit, do NOT register in the index. If a file-claim hook blocks the Write, report it and skip.

Return ONLY this exact plain-text block:
GALAXY: dormant-data
FILE: knowledge/wiki/dormant-data/dorm
... [+266 chars truncated]

### Assistant | 2026-06-10T10:39:04.334Z

I'll create the Applied Practice wiki for the dormant-data galaxy. Let me first read the foundations file (theory) to avoid repeating it, then verify claims via WebFetch.

### Assistant | 2026-06-10T10:39:04.898Z

[tool_use: Bash]

### User | 2026-06-10T10:39:10.381Z

[tool_result] total 24
drwxr-xr-x 1 wompu 197611     0 Jun 10 03:46 ./
drwxr-xr-x 1 wompu 197611     0 Jun 10 05:11 ../
-rw-r--r-- 1 wompu 197611 15642 Jun 10 03:46 dormant-data-foundations.md
---
H:/prism/knowledge/wiki/dormant-data/dormant-data-foundations.md
FOUNDATIONS EXISTS

### Assistant | 2026-06-10T10:39:19.609Z

Let me read the foundations file to understand what theory is already covered.

### Assistant | 2026-06-10T10:39:19.977Z

[tool_use: Read]

### User | 2026-06-10T10:39:21.408Z

[tool_result] 1	---
2	title: Dormant-Data Foundations — data lifecycle, storage tiering, garbage collection, orphan detection, retention + reclamation
3	galaxy: dormant-data
4	owner_slot: victor
5	status: VERIFIED-PARTIAL
6	verified_by: "papa-meta-create-workflow (2026-06-10)"
7	verification_method: CS/storage foundations WebFetch-confirmed against free/legal primary sources (MIT OpenCourseWare 6.172 CC-BY-NC-S
... [+15353 chars truncated]

### Assistant | 2026-06-10T10:39:26.080Z

The foundations file covers theory thoroughly. The applied-practice entry must focus on PRACTITIONER GOTCHAS — what goes wrong operationally that theory doesn't teach. The foundations already names cycles/dangling/leak as taxonomy; my entry should go deeper into the *operational failure modes* (TOCTOU races, full-scan demoting hot data, age != unreachable, premature reclaim, retention gaps, the empirical practice of how to avoid each).

Let me verify claims via WebFetch on reputable free sources. I'll fetch in parallel.

### Assistant | 2026-06-10T10:39:28.955Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T10:39:31.139Z

[tool_use: WebFetch]

### User | 2026-06-10T10:39:34.903Z

[tool_result] # O_CREAT with O_EXCL and TOCTOU Races

The man page does not directly discuss O_EXCL preventing TOCTOU (time-of-check-to-time-of-use) races. However, it does describe O_EXCL's atomicity:

**O_EXCL atomicity:**
The documentation states: "Ensure that this call creates the file: if this flag is specified in conjunction with O_CREAT, and path already exists, then open() fails with the error EEXIST."

... [+721 chars truncated]

### User | 2026-06-10T10:39:36.805Z

[tool_result] # CWE-367: Time-of-check Time-of-use (TOCTOU) Race Condition

## Core Description

"The product checks the state of a resource before using that resource, but the resource's state can change between the check and the use in a way that invalidates the results of the check."

## The Vulnerability Gap

The weakness creates a window of opportunity where an attacker can modify a resource after it has b
... [+1025 chars truncated]

### Assistant | 2026-06-10T10:39:39.801Z

Both confirmed. Let me fetch more sources for the remaining gotchas.

### Assistant | 2026-06-10T10:39:44.512Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T10:39:47.259Z

[tool_use: WebFetch]

### User | 2026-06-10T10:39:50.847Z

[tool_result] # Cache Pollution and Scan Resistance in Cache Replacement Policies

## 1. Cache Pollution / Scan-Based Eviction

Yes, the article explicitly mentions cache pollution. Here's the relevant passage:

**Direct mention:** "Many cache algorithms (particularly LRU) allow streaming data to fill the cache, pushing out information which will soon be used again (cache pollution)."

The article also describe
... [+1038 chars truncated]

### User | 2026-06-10T10:39:52.348Z

[tool_result] # Reference Strength in Java Garbage Collection

## The Four Levels

The article explains that Java defines four reference strengths in order from strongest to weakest: **strong, soft, weak, phantom**.

## How Each Affects Garbage Collection

The article states: "the garbage collector will always collect weakly referenced objects, but will only collect softly referenced objects when its algorithms
... [+1049 chars truncated]

### Assistant | 2026-06-10T10:40:01.031Z

Both confirmed. Let me fetch the remaining sources for retention-gap (legal hold) and the full-scan / generational cost, plus a NIST/records source.

### Assistant | 2026-06-10T10:40:04.806Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T10:40:07.210Z

[tool_use: WebFetch]

### User | 2026-06-10T10:40:10.236Z

[tool_result] # Legal Hold: Preservation Override

## Definition

A legal hold (litigation hold) is a preservation requirement that suspends normal records management practices when litigation is pending or reasonably anticipated.

## Key Suspension of Routine Deletion

The article states that a legal hold is "initiated by a notice or communication from legal counsel to an organization that **suspends the norma
... [+987 chars truncated]

### User | 2026-06-10T10:40:13.724Z

[tool_result] # Write Amplification and Garbage Collection on SSDs

## Write Amplification Defined

Write amplification occurs when the actual data written to flash memory exceeds what the host system intended to write. As the article states: "the actual amount of information physically written to the storage media is a multiple of the logical amount intended to be written."

## Garbage Collection's Role

Garba
... [+1172 chars truncated]

### Assistant | 2026-06-10T10:40:17.977Z

Both confirmed. I now have 6 strong sources. Let me fetch 2-3 more to reach 8-12 gotchas: one on stale/age-based assumptions (working set / thrashing already in foundations — I need something distinct), and one on incremental GC concurrency (write barrier / concurrent modification during collection), plus disk free-space / soft-delete.

### Assistant | 2026-06-10T10:40:22.236Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T10:40:26.218Z

[tool_use: WebFetch]

### User | 2026-06-10T10:40:27.276Z

[tool_result] You've hit your session limit · resets 7:30am (America/Chicago)

### User | 2026-06-10T10:40:33.180Z

[tool_result] # Concurrency and Correctness Hazards in Garbage Collection

## (1) Lost-Object Problem & Tri-Color Invariant

The article addresses incremental/concurrent collection risks through tri-color marking. It states:

> "Some variations on the algorithm do not preserve this invariant but use a modified form for which all the important properties hold."

The core safeguard is explained: "no black objects
... [+1222 chars truncated]

### Assistant | 2026-06-10T10:40:33.488Z

You've hit your session limit · resets 7:30am (America/Chicago)
