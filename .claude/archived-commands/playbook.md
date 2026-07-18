# Playbook — Machining Best Practice Advisor

Query the Machining Playbook for sequencing advice, anti-patterns, setup strategy, and material-specific tips from senior machinist experience.

## Args: $ARGUMENTS
- Empty: show playbook stats (rule counts by category and severity)
- `sequence <features>`: get recommended operation order (comma-separated: hole,pocket,thread,face)
- `setup <features>`: get setup strategy and workholding advice
- `antipatterns [material]`: list anti-patterns (optionally filtered by ISO material group)
- `lookup <category>`: browse all rules in a category
- `material <iso_group>`: get material-specific machining tips (P/M/K/N/S/H)
- `add`: interactive rule addition from experience or video learning
- `search <keyword>`: search rules by keyword in title/rule/reasoning

## Categories
sequencing, setup_strategy, tool_selection, toolpath_strategy, anti_pattern, material_tip, thin_wall, hole_making, finishing, roughing, 5axis, workholding, thermal, chip_control, tool_life, datum, deburring, safety

## Execution

### If empty args — Stats
Call `prism_shop_practice` with action `playbook_lookup` for each major category and summarize:
```
MACHINING PLAYBOOK — STATS
===========================
Total Rules: [N]

By Category:
  sequencing:       [N] rules
  anti_pattern:     [N] rules
  material_tip:     [N] rules
  setup_strategy:   [N] rules
  ...

By Severity:
  critical:     [N]
  important:    [N]
  recommended:  [N]
  tip:          [N]
```

### If `sequence <features>`
Parse comma-separated features. Call `playbook_sequence` with the feature list.
Output:
```
RECOMMENDED SEQUENCE
====================
1. face
2. datum
3. drill
4. rough_pocket
...

APPLIED RULES: SEQ-001, SEQ-003, SEQ-005...
WARNINGS: [any anti-pattern violations]
```

### If `setup <features>`
Call `playbook_setup`. Output workholding suggestions, datum strategy, recommended setups.

### If `antipatterns [material]`
Call `playbook_antipatterns` with optional material_iso. List all matching anti-patterns with severity, rule, and reasoning.

### If `lookup <category>`
Call `playbook_lookup` with category. Display all rules in that category with full details.

### If `material <iso>`
Call `playbook_advise` with material_iso and categories=["material_tip"]. Show all material-specific wisdom.

### If `search <keyword>`
Call `playbook_advise` with no filters, then grep results by keyword. Display matches.

### If `add`
Prompt for: id, category, severity, title, rule, reasoning, conditions, exceptions, source.
Call `playbook_add_rule` to persist.
