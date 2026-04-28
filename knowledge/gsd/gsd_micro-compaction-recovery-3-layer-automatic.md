---
source: gsd_micro
section: Compaction Recovery (3-layer automatic)
slug: compaction-recovery-3-layer-automatic
indexed_at: 2026-04-28T02:39:36.897Z
---

## Compaction Recovery (3-layer automatic)

```
L1 (_context):                Every MCP response includes
                              { task, resume, next }. Always present.
L2 (_COMPACTION_RECOVERY):    Injected on 30s gap or
                              session_boot-mid-session.
L3 (Aggressive hijack):       First call after detection → response
                              REPLACED with full recovery payload.

If _COMPACTION_DETECTED: true:
  Follow _MANDATORY_RECOVERY exactly. Do NOT re-audit.
  Read /mnt/transcripts/ latest + state/RECENT_ACTIONS.json.
  Survival reads ACTION_TRACKER pending + RECENT_ACTIONS recorder.

User should NEVER need to say "check your logs" or "continue".
```
