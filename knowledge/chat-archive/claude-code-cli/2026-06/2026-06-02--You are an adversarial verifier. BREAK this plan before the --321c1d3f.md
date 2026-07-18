---
type: "chat-session"
source: "claude-code-cli"
session_id: "321c1d3f-573b-4b70-b640-f87f9336e18a"
title: "You are an adversarial verifier. BREAK this plan before the fleet builds on it. "
date: "2026-06-02"
first_ts: "2026-06-02T15:18:40.537Z"
last_ts: "2026-06-02T15:18:50.374Z"
cwd: "H:\\PRISM"
messages: 2
user_msgs: 1
assistant_msgs: 1
raw_file: "H:/.claude/projects/H--prism/321c1d3f-573b-4b70-b640-f87f9336e18a/subagents/workflows/wf_0b33138a-b21/agent-a7bfe05e04df625ae.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:09"
---

# You are an adversarial verifier. BREAK this plan before the fleet builds on it. 

> **claude-code-cli** | 2026-06-02 | 2 msgs (1 user / 1 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/321c1d3f-573b-4b70-b640-f87f9336e18a/subagents/workflows/wf_0b33138a-b21/agent-a7bfe05e04df625ae.jsonl`

## Transcript

### User | 2026-06-02T15:18:40.537Z

You are an adversarial verifier. BREAK this plan before the fleet builds on it. The last workflow on this codebase shipped a foundation claim that was circular/false - do not let that recur.

PLAN:
API Error: Server is temporarily limiting requests (not your usage limit) · Rate limited

CAPABILITY BRIEF (cross-check claims against this):
Six recon reports merged. Five hit the session limit; only PRISM OVERLAP and WINMAX PATTERN carry usable evidence. I will produce the authoritative brief from CONFIRMED evidence, marking everything from the four limited reports as UNVERIFIED. No fabrication.

# CIMCO 2026 CAPABILITY BRIEF — Single Source of Truth (Phase Handoff)

**Synthesist note:** 4 of 6 recon arms (LOCAL INVENTORY, CONTROL SURFACE, UIA MAP, SIM ORACLE) hit session limit and returned NO evidence. This brief is built from the 2 arms that completed (PRISM OVERLAP, WINMAX PATTERN). Every CIMCO-internal claim is therefore **UNVERIFIED pending local file/web confirmation** unless explicitly cited. The PRISM-side overlap is **CONFIRMED** (file headers + dispatcher grep read on disk). Downstream planners: do NOT treat UNVERIFIED CIMCO schema details as build-ready — they are leads, not contracts.

---

## (1) CIMCO CONTROL SURFACES — RANKED API-FIRST + COMMAND CATALOG

> **CONFIDENCE: LOW/UNVERIFIED for all of section 1.** No CONTROL SURFACE or UIA MAP recon completed. The only locally CONFIRMED fact is `CIMCOEdit.exe` exists at the install root (per PRISM OVERLAP arm). Everything below is the *expected* surface based on the WinMax-bridge precedent and CIMCO's publicly documented automation model — confirm before building.

Ranked best-path per the WinMax 4-transport doctrine (prefer API > IPC > UIA > screenshot):

| Rank | Surface | Status | Best for |
|------|---------|--------|----------|
| 1 (BEST) | **DDE/COM automation API** (CIMCO Edit documents an OLE/DDE command interface) | UNVERIFIED — needs doc/web confirm | Headless NC load/compare/backplot, scripted batch 
... [+13387 chars truncated]

### Assistant | 2026-06-02T15:18:50.374Z

API Error: Server is temporarily limiting requests (not your usage limit) · Rate limited
