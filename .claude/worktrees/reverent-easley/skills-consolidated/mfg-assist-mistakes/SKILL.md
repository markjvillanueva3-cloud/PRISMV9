---
name: mfg-assist-mistakes
description: Get common mistakes and warnings for a manufacturing operation
---

# Common Mistakes and Pitfall Prevention

## When To Use
- Setting up a new job and want to avoid known pitfalls for this operation/material combo
- Training operators on what to watch for during a specific process
- Troubleshooting a recurring quality or tool life problem
- Building a pre-flight checklist before running a critical part

## How To Use
```
prism_intelligence action=assist_mistakes params={
  operation: "deep_pocket_milling",
  material: "316L",
  context: { depth_ratio: 4.5, tool_type: "endmill" }
}
```

**Parameters:**
- `operation` (required): The machining operation type
- `material` (required): Workpiece material grade or family
- `context` (optional): Additional details like depth ratio, tool type, machine, tolerances

## What It Returns
- `mistakes`: Ranked array of common mistakes, each containing:
  - `name`: Short mistake identifier
  - `severity`: "critical" | "high" | "medium" | "low"
  - `description`: What goes wrong and why
  - `prevention`: Steps to avoid this mistake
  - `detection`: How to recognize the problem early
  - `recovery`: What to do if it already happened
- `checklist`: Condensed pre-operation checklist derived from the mistakes

## Examples
- **Deep Pocket 316L**: → 1. Work hardening from rubbing (critical) — maintain minimum chip load, never dwell; 2. Chip re-cutting (high) — through-tool coolant or air blast, helical ramp entry; 3. Tool pullout (medium) — verify Weldon flat or shrink fit, check stickout
- **Drilling Titanium**: `operation: "drilling", material: "Ti-6Al-4V"` → 1. Chip packing and fire risk (critical); 2. Work hardening on peck retract (high); 3. Drill walking on entry (medium)
- **Thread Milling Aluminum**: `operation: "thread_milling", material: "6061-T6"` → 1. Wrong compensation direction G41/G42 (critical); 2. BUE causing oversized threads (high); 3. Entry witness mark (low)
