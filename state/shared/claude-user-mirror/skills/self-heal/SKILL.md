---
name: self-heal
description: "Run PRISM self-healing diagnostics - detect schema drift, registry desync, invalid hooks, stale memory, flaky tests. Auto-repair where possible."
model: sonnet
effort: medium
argument-hint: "[full|schema|registry|hooks|memory|flaky]"
---

# Self-Heal Skill

Run `self_healing.py` with the specified check (default: `full`).

## Usage

```
/self-heal           # Full health check (all 5 subsystems)
/self-heal schema    # Schema drift only (z.enum vs case)
/self-heal registry  # Engine registry drift only
/self-heal hooks     # Hook syntax validation only
/self-heal memory    # MEMORY.md staleness check only
/self-heal flaky     # Flaky test detection only
```

## Instructions

1. Run the self-healing engine:
   ```bash
   python3 "C:/Users/Admin.DIGITALSTORM-PC/.claude/hooks/lib/self_healing.py" <arg>
   ```

2. Parse the JSON output and display results in a readable table format.

3. For auto-fixable issues, offer to repair:
   - **Schema drift**: Auto-add missing z.enum entries to dispatcher files
   - **Registry drift**: Auto-export missing engines from index.ts
   - **Memory staleness**: Auto-archive stale entries from MEMORY.md
   - **Hook syntax errors**: Display the error for manual fix (cannot auto-repair)

4. Report the overall health score (0-100) and total issue count.

5. If health score < 80, recommend running `/self-heal` again after fixes are applied.
