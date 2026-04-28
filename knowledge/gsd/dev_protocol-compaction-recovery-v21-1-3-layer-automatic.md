---
source: dev_protocol
section: COMPACTION RECOVERY (v21.1 — 3-layer automatic)
slug: compaction-recovery-v21-1-3-layer-automatic
indexed_at: 2026-04-28T02:29:29.169Z
---

## COMPACTION RECOVERY (v21.1 — 3-layer automatic)

**L1 (_context)**: Every MCP response includes task/resume/next. Always present, zero cost.
**L2 (_COMPACTION_RECOVERY)**: 5-call injection on 30s gap OR session_boot-mid-session.
**L3 (Aggressive hijack)**: First call after detection → response REPLACED with full recovery payload.
- If `_COMPACTION_DETECTED: true` → follow `_MANDATORY_RECOVERY`. DO NOT re-audit. DO NOT ask user.
- If unclear: read /mnt/transcripts/ latest file + C:\PRISM\state\RECENT_ACTIONS.json → continue.
- Survival reads ACTION_TRACKER pending items + RECENT_ACTIONS flight recorder.
- User should NEVER need to tell Claude to "check your logs" or "continue".
