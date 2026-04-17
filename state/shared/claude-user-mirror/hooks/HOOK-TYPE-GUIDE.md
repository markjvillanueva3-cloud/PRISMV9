# Hook Type Selection Guide

Claude Code supports 4 hook types. This guide documents when to use each.

## Hook Types

### command (bash scripts)
- **Use for**: Complex logic, file I/O, external tools, multi-step checks, pattern counting, deduplication
- **Overhead**: ~50-200ms
- **Flexibility**: Highest -- full shell access, can read/write files, call external tools
- **Examples**: pretooluse-unified.sh (tool routing), posttooluse-unified.sh (output compression), auto-approve.sh
- **Limitations**: Must parse JSON stdin manually, output via stdout/stderr JSON

### prompt (LLM-based checks)
- **Use for**: Text/pattern analysis, quality checks, safety gates, natural language understanding
- **Overhead**: ~500ms-2s (uses haiku model)
- **Flexibility**: Medium -- can analyze text content but cannot access files or tools
- **Examples**: Secret detection in file writes, code quality review, commit message quality, destructive command detection
- **Limitations**: No file access, no tool use, limited to analyzing the hook input context
- **Model**: Defaults to haiku for speed; can specify other models

### agent (subagent-based verification)
- **Use for**: Multi-file verification, dependency analysis, cross-reference checks, complex reasoning
- **Overhead**: ~5-30s (spawns a subagent with tool access)
- **Flexibility**: High -- subagent can read files, search code, analyze dependencies
- **Examples**: Physics formula verification across engine files, test impact analysis
- **Limitations**: Slow, consumes tokens, should have higher timeout (15-30s)
- **Timeout**: Recommend 15-30s (vs 3-5s for command hooks)

### http (external system integration)
- **Use for**: Telemetry, notifications, webhooks, external service calls
- **Overhead**: ~100-500ms (network dependent)
- **Flexibility**: Low -- fire-and-forget HTTP POST/GET
- **Examples**: Build status webhooks, Slack notifications, telemetry collection
- **Limitations**: Requires running server, no response processing beyond ok/fail
- **Templates**: See lib/http-hook-templates.json for ready-to-use templates

## Decision Tree

1. Does it need to read/modify files? --> command or agent
2. Is it a text quality/safety check? --> prompt
3. Does it need to notify external systems? --> http
4. Is it simple pattern matching on input? --> command (fastest)
5. Does it need LLM understanding of content? --> prompt
6. Does it need multi-file analysis with tools? --> agent
7. Is it fire-and-forget notification? --> http

## Performance Guidelines

| Type    | Typical Timeout | Token Cost | Best For                    |
|---------|----------------|------------|-----------------------------|
| command | 3-5s           | 0          | Pattern matching, routing   |
| prompt  | 5-10s          | ~100-500   | Quality checks, safety      |
| agent   | 15-30s         | ~1K-5K     | Cross-file verification     |
| http    | 3-10s          | 0          | External notifications      |

## Current Hook Inventory (CCM-MS1)

### PreToolUse (6 hooks)
1. pretooluse-unified.sh -- command -- Tool routing, dedup, safety (all tools)
2. pretooluse-linting.sh -- command -- Content linting (Edit|Write)
3. Secret detection -- prompt -- API key/password detection (Write|Edit)
4. Code quality review -- prompt -- Unused vars, console.log, TODOs (Edit|Write)
5. Commit message quality -- prompt -- Git commit message standards (Bash)
6. Destructive command gate -- prompt -- rm -rf, force push detection (Bash)

### PostToolUse (3 hooks)
1. posttooluse-unified.sh -- command -- Output compression, syntax checks (all tools)
2. Physics verification -- agent -- Formula consistency checking (Edit|Write)
3. Test impact analysis -- agent -- Companion test file suggestions (Edit|Write)

### Other Events (all command type)
- PreCompact, SessionStart, PermissionRequest, ConfigChange, Stop, TaskCompleted
- UserPromptSubmit, PostToolUseFailure, StopFailure, SubagentStart, SubagentStop
- WorktreeCreate, WorktreeRemove, PostCompact, SessionEnd, InstructionsLoaded
