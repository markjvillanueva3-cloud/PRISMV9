---
name: warn-dispatcher-stub-result
enabled: true
event: file
action: warn
conditions:
  - field: content
    operator: contains
    value: "?? {"
  - field: file_path
    operator: regex_match
    pattern: mcp-server/src/tools/dispatchers/.*Dispatcher\.ts$
---

**[warn-dispatcher-stub-result]**
**Dispatcher contains `?? {` fallback pattern — possible stub result.**

The pattern `engine.method?.(params) ?? { ... }` silently returns fake data when the engine method doesn't exist. This is dangerous because:

1. **Users get plausible-looking but fake results** without any error
2. **Safety-critical actions** (collision detection, force calculation) may return "all clear" without checking
3. **Tests pass** because the stub result matches the expected structure

**Fix**: Call engine methods directly without optional chaining fallbacks. If the method might not exist, throw an explicit error rather than returning stub data.
