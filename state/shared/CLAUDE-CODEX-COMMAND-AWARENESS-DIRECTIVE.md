# Claude-Codex Command Awareness Directive

**Version:** 1.0.0
**Updated:** 2026-04-15
**Applies to:** ALL Claude sessions, ALL Codex sessions, ALL subagents

## CRITICAL COMMANDS — MUST AUTO-SUGGEST IMMEDIATELY

These commands MUST be suggested when ANY of their triggers are detected in user input:

### Priority 0 — Always Suggest Immediately

| Command | Triggers | Purpose |
|---------|----------|---------|
| `/pdf-learn` | pdf, document, manual, catalog, paper, extract from pdf | AI-powered PDF knowledge extraction |
| `/video-learn` | video, youtube, tutorial, training, watch, machining video | AI-powered video knowledge extraction |
| `/dedup` | duplicate, before creating, check existing, already exists | MANDATORY duplicate check |

### Priority 1 — Suggest for Creation/Machine Tasks

| Command | Triggers | Purpose |
|---------|----------|---------|
| `/forge-triple` | create engine, new engine, build engine, forge, generate | Exhaustive engine+skill+hook creation |
| `/wire-edm-studio` | wire edm, wedm, edm program, wire cut, mitsubishi | Full Wire EDM programming studio |
| `/lathe-studio` | lathe, turning, okuma, turning center, cnc lathe | Full lathe programming studio |

### Priority 2 — Suggest for Business/Optimization

| Command | Triggers | Purpose |
|---------|----------|---------|
| `/quote-to-ship` | quote, estimate, job cost, order, ship | Quote-to-ship pipeline |
| `/auto-speed-feed` | speed, feed, sfm, ipm, rpm, cutting parameters | Speed/feed calculation |
| `/shop-knowledge` | tribal, shop floor, operator, experience, wisdom | Tribal knowledge extraction |

## MANDATORY RULES

1. **PDF/Document Detection**
   - When "pdf", "document", "manual", "catalog", or "paper" appears → SUGGEST `/pdf-learn`
   - Do NOT process PDFs manually — use the AI extraction pipeline

2. **Video Detection**
   - When "video", "youtube", "tutorial", or "training" appears → SUGGEST `/video-learn`
   - Do NOT describe videos manually — use the AI extraction pipeline

3. **Creation Detection**
   - When "create engine", "new engine", "build", or "forge" appears:
     1. FIRST suggest `/dedup` to check for duplicates
     2. THEN suggest `/forge-triple` for exhaustive creation
   - NEVER create engines without checking duplication first

4. **Machine-Specific Detection**
   - When "wire edm" or "wedm" appears → SUGGEST `/wire-edm-studio`
   - When "lathe" or "turning" appears → SUGGEST `/lathe-studio`

## CROSS-SESSION COORDINATION

### Real-Time Awareness
- Read `UNIFIED_COMMAND_BROADCAST.json` for current command mappings
- Check `ACTIVE_WORK_REGISTRY.json` before starting significant work
- Read recent entries from `AGENT_CHAT.jsonl` to see what others are doing

### Work Registration
When starting significant work:
```bash
node H:/prism/.claude/helpers/agent-coordination.mjs post \
  --agent [Claude|Codex] \
  --status working \
  --current "what you're working on" \
  --next "what comes next"
```

### Conflict Prevention
- Check ACTIVE_WORK_REGISTRY.json for in-progress engines
- Check recent AGENT_CHAT.jsonl for recent work
- If conflict detected → coordinate or switch tasks

## COMMAND SUGGESTION FORMAT

When suggesting a command, use this format:

```
🎯 SUGGESTED COMMAND: /command-name — [purpose]
   Trigger detected: "[trigger word/phrase]"
   Usage: /command-name [arguments if any]
```

For multiple suggestions:
```
🎯 SUGGESTED COMMANDS:
  1. /dedup — Check for duplicates (REQUIRED FIRST)
  2. /forge-triple — Create engine+skill+hook
```

## FILES TO READ

Claude sessions: Automatically injected via hooks
Codex sessions: Read on startup:
- `H:/prism/state/shared/UNIFIED_COMMAND_BROADCAST.json`
- `H:/prism/state/shared/CLAUDE-CODEX-COMMAND-AWARENESS-DIRECTIVE.md`
- `H:/prism/.codex/AGENTS.md` (contains command table)

## VERIFICATION

Sessions should verify command awareness by:
1. Detecting trigger words in user input
2. Matching against command table
3. Outputting suggestion BEFORE starting work
4. Logging suggestion to coordination chat if significant

---

**This directive is MANDATORY for all PRISM sessions.**
**Failure to suggest commands when triggers are detected is a violation.**
