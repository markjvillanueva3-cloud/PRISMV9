# Hookify Rule Audit
## SYS-MS3-U03

## Summary

| Metric | Count |
|--------|-------|
| Total rules | 225 |
| Enabled | 222 |
| Disabled | 3 |

## Existing Workflow Rules (Verified)

| Rule | Status | Purpose |
|------|--------|---------|
| autofire-pick-task | Enabled | Suggests /pick-task on "start working", "next task" |
| autofire-audit-task | Enabled | Suggests /audit-task on "audit milestone", "verify unit" |
| autofire-milestone | Enabled | Roadmap milestone context |
| autofire-rgs | Enabled | Roadmap execution support |
| master-index-drift | Enabled | Warns on new source files |

## Disabled Rules

| Rule | Reason |
|------|--------|
| warn-nosql-injection | Security warning, may be too noisy |
| warn-prototype-pollution | Security warning, may be too noisy |
| warn-xxe-injection | Security warning, may be too noisy |

## Recommendations

1. **Keep all 222 enabled rules** — No obvious staleness detected
2. **Security rules** — Consider re-enabling for production code
3. **Consider grouping** — 225 rules could be organized into subdirectories by category

## New Rules Created This Session

None needed — pick-task and audit-task autofire rules already exist and function correctly.

## Rule Categories (Estimated)

- Autofire (suggestions): ~100
- Warnings: ~50
- File event handlers: ~30
- Context injections: ~45
