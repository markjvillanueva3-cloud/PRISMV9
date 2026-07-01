---
title: psk syscall — recommend
slug: recommend
kind: syscall
status: shell-only
date: 2026-05-17
milestone: COMMAND-KERNEL-MS0
unit: U-CK02
author: claude-41db1b82 (slot india)
kernel_handler: syscall_recommend
params_schema: '{ context?: string, top_k?: number }'
composes: [pipeline-telemetry.jsonl, _skill-triggers.jsonl, master-index]
---

# `psk recommend` — Command / Skill Recommendation

Surfaces command + skill recommendations for the current context. The
closed feedback loop ships in U-CK15+; today's shell returns a
shell-only acknowledgement pointing at the future surface.

## Kernel handler

`.claude/kernel/psk.mjs::syscall_recommend(params)` — shell-only at
U-CK02 ship. Returns `{ok:true, shell_only:true, available:false}`.

## Closed feedback loop (U-CK15+ design)

```
record (writes telemetry)
   ↓
adaptive-thresholds (tunes 6 magic numbers from outcomes)
   ↓
recommend (reads tuned weights + master-index + skill-triggers)
   ↓
ranked top-K skill/command suggestions for the current prompt
```

When wired: every UserPromptSubmit can call `recommend` to get the
current best-ranked skill suggestions, ranked by BM25 + outcome-derived
weights (success rate, token economy, time-to-ship).

## Params

| Field | Type | Notes |
|-------|------|-------|
| `context` | string (prompt or unit-id) | Caller's anchor — usually the user prompt. |
| `top_k` | number (default 3) | Number of suggestions to return. |

## Returns (current, shell-only)

```json
{
  "ok": true,
  "syscall": "recommend",
  "shell_only": true,
  "note": "U-CK15+ closes the feedback loop — recommend reads tuned weights from telemetry",
  "result": { "context": "<params.context or null>", "available": false }
}
```

## Future shape (U-CK15+)

```json
{
  "ok": true,
  "syscall": "recommend",
  "result": {
    "context": "<prompt>",
    "top_k": [
      { "skill": "checkin", "score": 0.85, "rationale": "BM25 0.85 + 0.92 success-rate" },
      { "skill": "pick-unit", "score": 0.72, "rationale": "..." }
    ]
  }
}
```

## Related

- [[record]] — sister; record writes telemetry, recommend reads it
- [[_command-schema]] — the schema recommendations rank against
- [[priority-queue]] — adjacent (units to ship vs skills to invoke)

## See also

- `.claude/kernel/psk.mjs` — kernel registration map
- `.claude/hooks/skill-auto-trigger.mjs` — current top-1 surface (BM25 only)
- `knowledge/wiki/architecture/_skill-triggers.jsonl` — keyword ledger
