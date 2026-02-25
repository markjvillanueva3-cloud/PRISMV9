---
name: prism-repomix-patterns
description: Exact repomix commands for packing PRISM code for Claude analysis — 5 patterns for monolith analysis, module extraction, anti-regression comparison, token optimization, and remote repos
---
# Repomix Patterns

## When To Use
- Need to feed PRISM codebase to Claude for analysis, extraction, or review
- "How do I pack the code for Claude?" / "Pack just the materials module"
- Before a session that requires codebase context (architecture review, refactoring, extraction)
- When comparing old vs new code versions for regression checking
- NOT for: managing Claude's context window size (use prism-context-loading)
- NOT for: code review checklist procedures (use prism-code-review-checklist)

## How To Use
Five patterns. Pick the one matching your goal.

**PATTERN 1: FULL MONOLITH PACK** (for architecture mapping, dependency analysis)
```bash
cd "C:\..\_BUILD\PRISM_v8_89_002_TRUE_100_PERCENT"
repomix --include "*.html" --compress --style xml -o prism-monolith-context.xml
repomix --token-count-tree  # Check size before uploading
```
Use when: starting extraction work, mapping module boundaries, finding algorithm implementations.
Token estimate: ~70K tokens compressed. Split if over Claude's limit.

**PATTERN 2: MODULE EXTRACTION** (for deep analysis of one subsystem)
```bash
repomix --include "src/materials/**" --remove-comments --style markdown -o prism-materials.md
repomix --include "src/engines/**/*.ts" --compress -o prism-engines.xml
repomix --include "**/safety*.ts,**/validate*.ts" --style xml -o prism-safety.xml
```
Use when: working on a specific feature, debugging one module, writing tests for one area.
Filters: --include for glob patterns, --exclude to skip tests/mocks.

**PATTERN 3: ANTI-REGRESSION COMPARISON** (pack old + new, compare in Claude)
```bash
cd prism-v8.89 && repomix --style json -o old-version.json
cd ../prism-v9.0 && repomix --style json -o new-version.json
# Upload both to Claude: "Compare these. What functionality is missing in new version?"
```
Use when: after major rewrites, before replacing a module, version upgrade validation.
JSON format enables structured comparison of function lists, exports, types.

**PATTERN 4: TOKEN-OPTIMIZED PACK** (when context is tight)
Apply in this order for maximum reduction:
  1. `--compress` → ~70% reduction (removes whitespace, shortens identifiers)
  2. `--remove-comments` → ~20% additional reduction
  3. `--no-line-numbers` → ~10% additional reduction
  4. `--include` specific files → variable, often 80%+ reduction vs full pack
  5. Split by module if still over limit
```bash
repomix --compress --remove-comments --no-line-numbers --include "src/core/**" -o minimal.xml
```

**PATTERN 5: REMOTE REPO** (no local clone needed)
```bash
repomix --remote https://github.com/user/repo -o external-lib.xml
repomix --remote https://github.com/user/repo --remote-branch develop -o dev-branch.xml
```
Use when: evaluating external libraries, comparing upstream changes.

**OUTPUT FORMAT SELECTION:**
  XML (default): best for AI consumption, includes metadata
  Markdown: human-readable, good for documentation sessions
  JSON: structured data, best for automated comparison
  Plain: simple text, smallest output, least metadata

## What It Returns
- A packed file ready to upload to Claude for analysis
- Token count tree showing distribution across directories
- Format suitable for the task (xml for AI, json for comparison, md for reading)

## Examples
- Input: "I need to understand the materials engine before refactoring it"
  Pattern 2 (module extraction):
  `repomix --include "src/materials/**,src/engines/material*.ts" --compress -o materials-context.xml`
  Then: `repomix --token-count-tree` → verify under 50K tokens → upload to Claude

- Input: "Comparing prism-calc v12 with v13 to check for regressions"
  Pattern 3 (anti-regression): pack both versions as JSON, upload both, ask Claude to diff
  Focus prompt: "List all exported functions in both. Which exist in old but not new?"

- Edge case: "Full PRISM monolith is 200K tokens — too large for one session"
  Pattern 2 (module extraction) instead of Pattern 1. Split into 4-5 module packs.
  Materials: ~25K tokens. Machines: ~20K. Tools: ~15K. Engines: ~30K.
  Upload relevant module per session. Cross-reference results across sessions.
SOURCE: Split from prism-codebase-packaging (18.6KB)
RELATED: prism-context-loading
