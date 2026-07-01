---
type: "chat-session"
source: "claude-code-cli"
session_id: "a198ff5f-9c3d-44ad-a040-50b918b0a91a"
title: "You are doing a PRISM-doctrine review of a fleet-launcher rewrite. Read these fi"
date: "2026-05-28"
first_ts: "2026-05-28T12:36:43.915Z"
last_ts: "2026-05-28T12:43:30.745Z"
cwd: "H:\\PRISM"
messages: 2
user_msgs: 1
assistant_msgs: 1
raw_file: "H:/.claude/projects/H--prism/a198ff5f-9c3d-44ad-a040-50b918b0a91a/subagents/agent-a8e0e7a19c8f0ce92.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:19"
---

# You are doing a PRISM-doctrine review of a fleet-launcher rewrite. Read these fi

> **claude-code-cli** | 2026-05-28 | 2 msgs (1 user / 1 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/a198ff5f-9c3d-44ad-a040-50b918b0a91a/subagents/agent-a8e0e7a19c8f0ce92.jsonl`

## Transcript

### User | 2026-05-28T12:36:43.915Z

You are doing a PRISM-doctrine review of a fleet-launcher rewrite. Read these files end-to-end before judging:

- `H:\Tools\prism-fleet\Launch-PRISM-Fleet.ps1`
- `H:\Tools\prism-fleet\slot-tab-boot.ps1`
- `H:\CHAT-SLOT-DOMAINS.md` (updated — has new ROMEO/UNIFORM/VICTOR entries + ZULU correction)
- `H:\prism\state\shared\chat-slots.json` (verifies slot schema is 26 NATO alpha..zulu, NOT alpha..zebra)
- `H:\PRISM\CLAUDE.md` (§PER-CHAT HANDOFF, §SESSION CONTINUITY STACK, §SLOT-RECLAIM, §FLEET-REAPER, §GOLF SLOT — the canonical doctrine the launcher must align with)
- `H:\prism\.claude\helpers\chat-slots.mjs` SLOT_NAMES export (canonical 26-slot list — verify it really is alpha..zulu and includes/excludes zebra as you expect)
- `H:\prism\.claude\hooks\session-start-auto-resume.mjs` (the hook that reads `PRISM_BOOT_SLOT` to inject slot-keyed handoff — verify the env-var name match)

**What to verify against PRISM doctrine:**

1. **Slot naming alignment** — chat-slots.json schema vs CHAT-SLOT-DOMAINS.md vs SLOT_NAMES in chat-slots.mjs. The doctrine doc historically used "ZEBRA" for the orchestrator role; the canonical schema uses "zulu". I updated CHAT-SLOT-DOMAINS.md to say ZULU. Verify the launcher uses `zulu` everywhere (no leftover `zebra` references in either ps1 file).

2. **`/checkin-<slot>` semantics** — When Tier 3 fresh-launches with `/checkin-<slot>`, this triggers the canonical /checkin pipeline: force-claim slot + commit-hygiene + position + drift + handoff read + pick. Is that the right thing to do for a slot the operator wants to RESUME (not start fresh)? Operator said "find the most up to date session" — does fresh /checkin satisfy that for slots with no prior session, or does it conflict?

3. **`claude --resume <id>` semantics** — When Tier 1 or Tier 2 resumes a session-id, the slot-claim machinery is NOT invoked. The session-start-auto-resume hook reads `PRISM_BOOT_SLOT` to inject handoff content, but does the SLOT itself get claimed? If not, chat-slots
... [+2711 chars truncated]

### Assistant | 2026-05-28T12:43:30.745Z

API Error: Unable to connect to API (ECONNRESET)
