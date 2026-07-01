---
name: block-force-push
enabled: true
event: bash
pattern: git\s+push\s+.*(-f|--force)(\s|$)
action: block
---

**Force push detected -- this rewrites remote history!**

Force pushing can destroy other people's work and is often irreversible.

- Use `git push --force-with-lease` instead (only overwrites if no one else pushed)
- Confirm the branch is not `main`/`master`/`develop` and no one else is working on it
