---
source: dev_protocol
section: Compaction Recovery (v21.1 — 3-layer automatic)
slug: compaction-recovery-v21-1-3-layer-automatic
indexed_at: 2026-04-28T02:50:03.666Z
---

## Compaction Recovery (v21.1 — 3-layer automatic)

- **L1 `_context`** — every MCP response includes `task/resume/next`.
  Always present, zero cost.
- **L2 `_COMPACTION_RECOVERY`** — 5-call injection on 30s gap OR
  session_boot-mid-session.
- **L3 Aggressive hijack** — first call after detection → response
  REPLACED with full recovery payload.
- If `_COMPACTION_DETECTED: true` → follow `_MANDATORY_RECOVERY`. DO NOT
  re-audit. DO NOT ask user.
- If unclear: read `/mnt/transcripts/` latest + `state/RECENT_ACTIONS.json`
  → continue.
- User should NEVER need to say "check your logs" or "continue".
