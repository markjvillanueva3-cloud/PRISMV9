---
name: block-dangerous-rm
enabled: true
event: bash
pattern: rm\s+-rf\s+(/|~|\$HOME|C:\\|\.\./)
action: block
---

**Destructive rm -rf targeting critical path detected!**

This command targets a root, home, or parent directory which could cause catastrophic data loss.

- Double-check the exact path and use `ls` first to verify contents
- Consider using `trash` or moving to a temp directory instead
