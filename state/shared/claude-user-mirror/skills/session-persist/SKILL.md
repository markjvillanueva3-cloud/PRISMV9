---
name: session-persist
description: Save and restore PRISM session context (active machine, material, tool, operation) across Cowork sessions.
model: haiku
effort: low
---

# Session Persistence for Cowork

Save and restore PRISM working context across Cowork sessions using `~/.prism/session-context.json`.

## Context Schema

The session context file at `~/.prism/session-context.json` stores:

```json
{
  "version": 1,
  "updated_at": "2026-03-20T12:00:00Z",
  "active_machine": {
    "manufacturer": "DMG MORI",
    "model": "DMU 50",
    "controller": "Siemens 840D",
    "max_rpm": 20000,
    "axes": 5
  },
  "active_material": {
    "name": "Ti-6Al-4V",
    "iso_group": "S",
    "hardness_hrc": 36,
    "condition": "annealed"
  },
  "active_tool": {
    "type": "end_mill",
    "diameter_mm": 10,
    "flute_count": 4,
    "material": "carbide",
    "coating": "AlTiN",
    "manufacturer": "Sandvik",
    "catalog_id": "2P342-1000-PA 1730"
  },
  "active_operation": {
    "type": "adaptive_roughing",
    "cam_system": "Fusion 360",
    "ae_mm": 1.0,
    "ap_mm": 10.0
  },
  "last_results": {
    "speed_feed": {
      "vc_m_min": 180,
      "fz_mm": 0.12,
      "rpm": 5730,
      "vf_mm_min": 2750,
      "timestamp": "2026-03-20T11:55:00Z"
    },
    "quote": {
      "cycle_time_min": 45.2,
      "cost_per_part": 12.80,
      "timestamp": "2026-03-20T11:50:00Z"
    },
    "simulation": {
      "blocks": 847,
      "cycle_time_min": 12.3,
      "max_force_kn": 2.34,
      "violations": 0,
      "timestamp": "2026-03-20T11:45:00Z"
    }
  }
}
```

## Save Behavior

Save session context when:
- User explicitly sets a machine, material, tool, or operation
- A speed/feed calculation completes successfully
- A quote or simulation finishes
- User says "save session" or "remember this"

Save procedure:
1. Read existing `~/.prism/session-context.json` (create if missing)
2. Merge new values into existing context (do not overwrite unrelated fields)
3. Update `updated_at` timestamp
4. Write atomically (write to .tmp, rename)

## Restore Behavior

Restore session context when:
- A new Cowork session starts
- User says "load session" or "where was I"
- A command needs machine/material/tool but none specified

Restore procedure:
1. Read `~/.prism/session-context.json`
2. Check `updated_at` — warn if older than 24 hours
3. Display summary: machine, material, tool, operation in one line
4. Use restored values as defaults for subsequent commands

## Summary Format (for Dispatch)

When reporting restored context:
```
OK: Session restored (2h ago) — DMU 50 / Ti-6Al-4V / 10mm EM / adaptive roughing
Last S/F: 180 m/min, 0.12 mm/t | Quote: $12.80/part | Sim: 12.3 min, clean
```

## Clear Behavior

User says "clear session" or "fresh start":
1. Back up current file to `~/.prism/session-context.backup.json`
2. Delete `~/.prism/session-context.json`
3. Confirm: `OK: Session cleared (backup saved)`
