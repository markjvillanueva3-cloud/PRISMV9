---
name: master-index-drift
enabled: true
event: file
action: warn
conditions:
  - field: file_path
    operator: regex_match
    pattern: mcp-server/src/(engines|tools/dispatchers|services|schemas|algorithms|registries)/[A-Z]
---

**New PRISM source file detected in a tracked directory.**

You just created or modified a file in `engines/`, `dispatchers/`, `services/`, `schemas/`, `algorithms/`, or `registries/`.

Checklist before proceeding:
1. **MASTER_INDEX.md** -- Is this new component listed in `mcp-server/data/docs/MASTER_INDEX.md`?
2. **Dispatcher wiring** -- Is this engine/service exposed via a dispatcher action?
3. **Roadmap tracking** -- If this was part of a milestone, is the milestone envelope updated?
4. **Summary counts** -- Do the section 15 counts still match reality?

Run `prism_orchestrate action:roadmap_discover` to check current roadmap state.
