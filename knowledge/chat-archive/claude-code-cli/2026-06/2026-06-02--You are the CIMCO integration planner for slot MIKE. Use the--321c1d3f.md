---
type: "chat-session"
source: "claude-code-cli"
session_id: "321c1d3f-573b-4b70-b640-f87f9336e18a"
title: "You are the CIMCO integration planner for slot MIKE. Use the capability brief be"
date: "2026-06-02"
first_ts: "2026-06-02T15:16:03.916Z"
last_ts: "2026-06-02T15:16:21.460Z"
cwd: "H:\\PRISM"
messages: 2
user_msgs: 1
assistant_msgs: 1
raw_file: "H:/.claude/projects/H--prism/321c1d3f-573b-4b70-b640-f87f9336e18a/subagents/workflows/wf_0b33138a-b21/agent-a2c9455c80bffb3de.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:09"
---

# You are the CIMCO integration planner for slot MIKE. Use the capability brief be

> **claude-code-cli** | 2026-06-02 | 2 msgs (1 user / 1 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/321c1d3f-573b-4b70-b640-f87f9336e18a/subagents/workflows/wf_0b33138a-b21/agent-a2c9455c80bffb3de.jsonl`

## Transcript

### User | 2026-06-02T15:16:03.916Z

You are the CIMCO integration planner for slot MIKE. Use the capability brief below + your galaxy context to (a) plot what this galaxy builds/does to fully utilize CIMCO, and (b) DRAFT wiki + tribal knowledge establishing that CIMCO checks programs/posts + simulates.

FRAMING: MACHINING - WEDM (be honest about limits): CIMCO Edit supports wire NC edit/backplot but full kinematic MACHINE-sim of wire-EDM is likely limited. Map where CIMCO helps (edit, file-compare, wire-path backplot) vs where PRISM\u2019s own WEDM sim stays authoritative.

First read your galaxy memory if present: mcp-server/src/engines/wedm/MEMORY.md (and skim the galaxy CLAUDE.md in the same dir). Read relevant CIMCO local files under H:/prism/resources/cimco-2026/CIMCOEdit/ as needed.

=== CIMCO CAPABILITY BRIEF ===
Six recon reports merged. Five hit the session limit; only PRISM OVERLAP and WINMAX PATTERN carry usable evidence. I will produce the authoritative brief from CONFIRMED evidence, marking everything from the four limited reports as UNVERIFIED. No fabrication.

# CIMCO 2026 CAPABILITY BRIEF — Single Source of Truth (Phase Handoff)

**Synthesist note:** 4 of 6 recon arms (LOCAL INVENTORY, CONTROL SURFACE, UIA MAP, SIM ORACLE) hit session limit and returned NO evidence. This brief is built from the 2 arms that completed (PRISM OVERLAP, WINMAX PATTERN). Every CIMCO-internal claim is therefore **UNVERIFIED pending local file/web confirmation** unless explicitly cited. The PRISM-side overlap is **CONFIRMED** (file headers + dispatcher grep read on disk). Downstream planners: do NOT treat UNVERIFIED CIMCO schema details as build-ready — they are leads, not contracts.

---

## (1) CIMCO CONTROL SURFACES — RANKED API-FIRST + COMMAND CATALOG

> **CONFIDENCE: LOW/UNVERIFIED for all of section 1.** No CONTROL SURFACE or UIA MAP recon completed. The only locally CONFIRMED fact is `CIMCOEdit.exe` exists at the install root (per PRISM OVERLAP arm). Everything below is the *expected* surface based on t
... [+13305 chars truncated]

### Assistant | 2026-06-02T15:16:21.460Z

API Error: Server is temporarily limiting requests (not your usage limit) · Rate limited
