---
name: block-delete-main-branch
enabled: true
event: bash
pattern: git\s+branch\s+-(d|D)\s+(main|master|develop|production|staging|release)(\s|$)
action: block
---

**Deleting a protected branch!**

You are about to delete a critical branch (`main`, `master`, `develop`, `production`, `staging`, or `release`).

- This is almost certainly a mistake -- these branches are shared, protected, and used for deployments
- If you meant to delete a feature branch, double-check the branch name
