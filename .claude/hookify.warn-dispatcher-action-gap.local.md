---
name: warn-dispatcher-action-gap
enabled: true
event: file
action: warn
conditions:
  - field: file_path
    operator: regex_match
    pattern: mcp-server/src/tools/dispatchers/[a-z]+Dispatcher\.ts$
---

**[warn-dispatcher-action-gap]**
**Dispatcher file modified - verify action registration is complete.**

When modifying a dispatcher, ensure all case statements are registered:

1. **ACTIONS array** - Is the new action in the `z.enum(ACTIONS)` array? Missing actions will be rejected by Zod validation at runtime.
2. **Slim result case** - Does the `slimResult()` function have a case for the new action?
3. **Main switch case** - Does the main execution switch have a `case` for the new action?
4. **MASTER_INDEX.md** - Is the action count updated in `data/docs/MASTER_INDEX.md`?

Common mistake: Adding a `case` statement but forgetting to add the action string to the ACTIONS array.
