---
name: block-git-reset-hard
enabled: true
event: bash
pattern: git\s+(reset\s+--hard|checkout\s+\.\s*$|checkout\s+--\s+\.|clean\s+-f)
action: block
---

**Destructive git operation detected -- uncommitted work will be permanently lost!**

These commands discard changes that cannot be recovered if never committed.

- Use `git stash` first as insurance, or `git clean -n` for a dry run
- Prefer discarding specific files rather than everything
