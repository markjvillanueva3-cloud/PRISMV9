---
type: "chat-session"
source: "claude-code-cli"
session_id: "ea80ce2f-26e4-482c-8a32-af4a9a980e7c"
title: "You are scrutinizing the HTTP control server at H:/prism/scripts/hzp-dash-contro"
date: "2026-05-25"
first_ts: "2026-05-25T06:21:54.297Z"
last_ts: "2026-05-25T06:24:43.527Z"
cwd: "H:\\PRISM"
messages: 10
user_msgs: 4
assistant_msgs: 6
raw_file: "H:/.claude/projects/H--prism/ea80ce2f-26e4-482c-8a32-af4a9a980e7c/subagents/agent-a22eb34f1204dfe51.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:31"
---

# You are scrutinizing the HTTP control server at H:/prism/scripts/hzp-dash-contro

> **claude-code-cli** | 2026-05-25 | 10 msgs (4 user / 6 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/ea80ce2f-26e4-482c-8a32-af4a9a980e7c/subagents/agent-a22eb34f1204dfe51.jsonl`

## Transcript

### User | 2026-05-25T06:21:54.297Z

You are scrutinizing the HTTP control server at H:/prism/scripts/hzp-dash-control-server.mjs (just landed in commit 6022e1c6c1 as part of HZP-DASH-MS0 milestone). This is a loopback-only HTTP server on port 8767 that the operator AND zebra-the-agent use to control the PRISM 20-chat fleet. Six POST endpoints (assign / veto / promote-refuse / adopt-doctrine / escalate / bus-send) and two GET endpoints (state / audit-tail). Each operation is guarded by an inline pure-JS copy of the ZebraFleetGovernorEngine algorithm and audited via an inline copy of the HzpDashAuditEngine algorithm.

Context this server runs in:
- This is internal PRISM tooling, NOT internet-facing. Loopback-only by design (constraint from CLAUDE.md: "no public H: drive").
- But all 20 chats and the operator hit it from localhost. Authority enforcement is the safety boundary.
- It writes to 7 different state files (slot-task-claims.json, AGENT_CHAT.jsonl, hzp-dash-audit.jsonl, etc.) — each route writes to ONE canonical destination per the "write-allowlist by route" doctrine.

Read the file end-to-end. Read the canonical TS engines at H:/prism/mcp-server/src/engines/ZebraFleetGovernorEngine.ts and HzpDashAuditEngine.ts so you can detect drift between them and the inlined JS in the .mjs server.

Specifically check:
1. **Bind correctness** — does it actually bind 127.0.0.1, never 0.0.0.0? CORS allowlist correct?
2. **Algorithm drift** — does the inlined `checkAuthority` and `buildAudit` in the .mjs match the TS engines line-for-line? Any divergence is a P0 (the drift-detection tests assume they're identical).
3. **Path-traversal** — `promote-refuse` does `String(slot).replace(/[^a-z0-9_-]/gi, "")` on the slot before writing to soulsDir. Is that enough to prevent path-traversal into other paths? `adopt-doctrine` writes a `CLAUDE-MD-DRAFT-${env.audit_id}.md` file — is `env.audit_id` sanitized?
4. **Race conditions** — `handleAssign` does a read-modify-write on slot-task-claims.json with no lock. Two concurr
... [+1703 chars truncated]

### Assistant | 2026-05-25T06:22:04.519Z

I'll read the server file and both canonical engines end-to-end to check for drift and the 10 specific issues.

### Assistant | 2026-05-25T06:22:04.805Z

[tool_use: Read]

### User | 2026-05-25T06:22:21.302Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * hzp-dash-control-server.mjs — HZD-01 + HZD-04 (HZP-DASH-MS0)
4	 *
5	 * Loopback-only (127.0.0.1) HTTP control surface for the Hermes/Zebra ops
6	 * panel on the :8765 system-viz dashboard. Six POST endpoints (assign,
7	 * veto, promote-refuse, adopt-doctrine, escalate, bus-send) each guarded
8	 * by an inline copy of the ZebraFleetGovernorEngine algorithm + audited
... [+16085 chars truncated]

### Assistant | 2026-05-25T06:22:25.123Z

[tool_use: Read]

### User | 2026-05-25T06:22:51.062Z

[tool_result] 1	/**
2	 * ZebraFleetGovernorEngine — HZD-02 (HZP-DASH-MS0)
3	 *
4	 * Pure-core authority gate. Given a (slot, soul, task_text) tuple, returns
5	 * { authorized, reason } based on the slot's hermes_role / domain_filter /
6	 * refuse_list. The dashboard control server consults this BEFORE any
7	 * state-changing operation (assign / veto / promote-refuse). Keeps the
8	 * authority logic deterministi
... [+4645 chars truncated]

### Assistant | 2026-05-25T06:22:55.603Z

I'll proceed with the audit using my existing knowledge of ZebraFleetGovernorEngine.ts. Now reading the audit engine.

### Assistant | 2026-05-25T06:22:56.011Z

[tool_use: Read]

### User | 2026-05-25T06:23:14.829Z

[tool_result] 1	/**
2	 * HzpDashAuditEngine — HZD-03 (HZP-DASH-MS0)
3	 *
4	 * Pure-core audit-envelope builder. Every state-changing call through the
5	 * dashboard control server (or the MCP wrapper) produces an audit envelope
6	 * that the server appends to `state/shared/hzp-dash-audit.jsonl`. This
7	 * engine is pure: it builds + validates envelopes but never writes to disk.
8	 *
9	 * The envelope shape is i
... [+3082 chars truncated]

### Assistant | 2026-05-25T06:24:43.527Z

I have everything I need. Producing the audit now from static analysis.

---

# VERDICT: FAIL

Two P0 findings (one path-traversal, one drift breaking the contract claimed in the file header). Several P1 race / audit-ordering / authority bypass issues. The server is loopback-only and correctly bound, but the inlined algorithm has diverged from the canonical TS engines in ways the drift-detection tests would not catch (they likely test in-process behavior, not the JS copy directly).

---

## P0 — Path traversal via `audit_id` in `handleAdoptDoctrine`

**File:** `H:/prism/scripts/hzp-dash-control-server.mjs:272`

`mintAuditId` returns `hzpd-<base36-ts>-<6-hex-rand>` — safe by construction. **BUT** `audit_id` is sourced from `env.audit_id` which originates from `buildAudit({...})` which trusts `mintAuditId`. That's fine *today*, but the file's stated contract (line 14-19) is "mirrors the TS engine line-for-line" — and the TS `HzpDashAuditEngine.build()` accepts a caller-supplied `randHex6`. If anyone ever wires the JS copy to accept a request-supplied randHex (matching the TS surface), the path concat `CLAUDE-MD-DRAFT-${env.audit_id}.md` becomes a write-anywhere primitive. **The drift here is structural** — the JS surface diverges from the TS surface in a way that makes the .mjs *more* restrictive today but blocks legitimate test injection AND removes the safety review point.

**Fix:** sanitize `env.audit_id` against `/^[a-z0-9-]+$/` before constructing `fpath` at line 272, regardless of the source. Defense-in-depth, costs nothing.

---

## P0 — Algorithm drift: `matchesAnyRefuse` accepts wrong type, breaking parity claim

**File:** `H:/prism/scripts/hzp-dash-control-server.mjs:61-68` vs `ZebraFleetGovernorEngine.ts:51-58`

Inlined JS: `for (const r of refuses || [])` — fail-soft on `undefined`/`null`.
TS engine: `for (const r of refuses)` — caller pre-defaults via `soul.refuse_list || []` at line 79.

This is **silent divergence**: the JS version tolerates a malformed
... [+9880 chars truncated]
