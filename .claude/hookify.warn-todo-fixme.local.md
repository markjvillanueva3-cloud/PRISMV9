---
name: warn-todo-fixme
enabled: true
event: file
conditions:
  - field: file_path
    operator: regex_match
    pattern: ^(?!.*\.(local\.md|jsonl)$)(?!.*(MEMORY|hooks/|debugging-patterns|CLAUDE\.md))
  - field: new_text
    operator: regex_match
    pattern: (TODO|FIXME|HACK|XXX|TEMP|TEMPORARY)\s*[:(\s]
action: warn
---

**TODO/FIXME marker detected in code**

Markers like TODO, FIXME, HACK, and XXX indicate incomplete or temporary code.

- Resolve it now if possible, otherwise create a tracked issue so it does not get forgotten
- Add context: `TODO(owner): description -- see #issue-number`
