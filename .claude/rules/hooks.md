---
paths:
  - "**/.claude/hooks/**"
  - "**/scripts/hooks/**"
---

# Hook Script Conventions

- Source common.sh at top: source "$(dirname "$0")/lib/common.sh"
- Use parse_hook_input to extract fields from JSON stdin
- Exit codes: 0=success, 2=blocking error, other=non-blocking
- Use deny() for PreToolUse blocks, hint() for suggestions, warn() for warnings
- Keep scripts 30-100 lines max
- Always handle Windows path translation (/c/ prefix)
- Log to ~/.prism/telemetry/ not stdout
- JSON output must be valid — test with jq
