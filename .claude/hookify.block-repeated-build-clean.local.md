---
name: block-repeated-build-clean
enabled: true
event: bash
action: block
tool_matcher: Bash
---
TOKEN SAVE: This build/test ran clean recently. No source files changed. Skip re-run (~1500 tokens saved).
