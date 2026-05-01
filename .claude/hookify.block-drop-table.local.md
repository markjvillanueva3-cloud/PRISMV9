---
name: block-drop-table
enabled: true
event: bash
pattern: ([Dd][Rr][Oo][Pp]\s+([Tt][Aa][Bb][Ll][Ee]|[Dd][Aa][Tt][Aa][Bb][Aa][Ss][Ee]|[Ss][Cc][Hh][Ee][Mm][Aa])|[Tt][Rr][Uu][Nn][Cc][Aa][Tt][Ee]\s+[Tt][Aa][Bb][Ll][Ee]|[Dd][Ee][Ll][Ee][Tt][Ee]\s+[Ff][Rr][Oo][Mm]\s+\w+\s*;?\s*$|db\..*\.drop\(|migrate.*reset|rake\s+db:drop)
action: block
---

**Destructive database operation detected!**

This command will permanently destroy data. There is no undo.

- Verify the correct database/table (dev vs staging vs production) and ensure a recent backup exists
- Consider safer alternatives: rename tables instead of dropping, use WHERE clauses, or use `db:rollback`
