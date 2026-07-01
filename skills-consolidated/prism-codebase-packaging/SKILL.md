---
name: prism-codebase-packaging
description: Pack entire codebases into AI-friendly single files for analysis using Repomix. Use when analyzing legacy code, planning extraction, performing code review, generating documentation, or preparing context for Claude sessions. Essential for PRISM monolith navigation.
---

# PRISM Codebase Packaging Skill
## Pack Repositories for AI Analysis with Repomix

### Overview

When working with large codebases like the PRISM v8.89 monolith (986,621 lines, 831 modules), Claude needs complete context to make intelligent decisions. **Repomix** packs entire repositories into single, AI-friendly files that can be uploaded to Claude for comprehensive analysis.

**Core Principle:** Complete context beats partial context. Give Claude the full picture, not fragments.

---

## What is Repomix?

Repomix is a CLI tool that:
- Packs entire repositories into single files (XML, Markdown, JSON, or plain text)
- Counts tokens for LLM context limits
- Respects .gitignore and supports custom ignore patterns
- Includes security scanning for secrets
- Supports code compression (~70% token reduction)

**Website:** https://repomix.com
**GitHub:** https://github.com/yamadashy/repomix

---

## Installation

```bash
# npm (recommended)
npm install -g repomix

# yarn
yarn global add repomix

# bun
bun add -g repomix

# Homebrew (macOS/Linux)
brew install repomix

# Or run directly without installing
npx repomix
```

---

## Basic Usage

### Pack Current Directory

```bash
# Basic - creates repomix-output.xml
repomix

# Specify output format
repomix --style markdown    # Human-readable
repomix --style xml         # Best for AI (default)
repomix --style json        # Structured data
repomix --style plain       # Simple text

# Custom output path
repomix -o my-codebase.xml
```

### Pack Remote Repository

```bash
# Pack GitHub repo directly (no clone needed)
repomix --remote https://github.com/user/repo

# Pack specific branch
repomix --remote https://github.com/user/repo --remote-branch develop
```

---

## PRISM-Specific Usage Patterns

### Pattern 1: Pack PRISM Monolith for Extraction Analysis

```bash
# Navigate to monolith directory
cd "C:\..\_BUILD\PRISM_v8_89_002_TRUE_100_PERCENT"

# Pack with compression for token efficiency
repomix \
  --include "*.html" \
  --compress \
  --style xml \
  -o prism-monolith-context.xml

# Check token count
repomix --token-count-tree
```

**Use case:** Upload to Claude.ai to:
- Map module dependencies
- Identify extraction candidates
- Find database definitions
- Locate algorithm implementations

### Pattern 2: Pack Specific Module for Deep Analysis

```bash
# Pack only materials-related code
repomix \
  --include "**/material*.js,**/material*.html,**/cutting*.js" \
  --remove-comments \
  --style markdown \
  -o prism-materials-module.md
```

**Use case:** Deep dive into specific functionality without full codebase noise.

### Pattern 3: Pack for Anti-Regression Comparison

```bash
# Pack old version
cd prism-v8.89
repomix --style json -o old-version.json

# Pack new version
cd ../prism-v9.0
repomix --style json -o new-version.json

# Compare in Claude
# Upload both and ask: "Compare these codebases. What functionality might be missing in the new version?"
```

### Pattern 4: Pack Extracted Modules for Review

```bash
# Pack newly extracted module
cd "C:\PRISM REBUILD\EXTRACTED\materials-database"
repomix \
  --include "**/*.ts,**/*.json,**/*.md" \
  --style markdown \
  -o materials-db-review.md

# Upload to Claude for code review
```

### Pattern 5: Generate Documentation Context

```bash
# Pack with markdown for documentation generation
repomix \
  --include "**/*.ts,**/*.md,**/README*" \
  --remove-comments \
  --style markdown \
  -o codebase-for-docs.md

# Prompt Claude: "Generate comprehensive API documentation for this codebase"
```

---

## Advanced Options

### Filtering Files

```bash
# Include only specific patterns
repomix --include "src/**/*.ts,*.md"

# Exclude patterns (in addition to .gitignore)
repomix -i "tests/**,*.test.js,node_modules/**,dist/**"

# Disable .gitignore rules
repomix --no-gitignore

# Disable default ignore patterns
repomix --no-default-patterns
```

### Token Optimization

```bash
# Enable compression (~70% token reduction)
repomix --compress

# Remove comments (smaller output)
repomix --remove-comments

# Disable line numbers (smaller output)
repomix --no-line-numbers

# View token distribution
repomix --token-count-tree

# Only show files with 1000+ tokens
repomix --token-count-tree 1000
```

### Output Control

```bash
# Copy to clipboard (for pasting into Claude)
repomix --copy

# Verbose output (debugging)
repomix --verbose

# Security scanning (enabled by default)
repomix --no-security-check  # Disable if needed
```

### Configuration File

Create `repomix.config.json` for persistent settings:

```json
{
  "output": {
    "filePath": "prism-context.xml",
    "style": "xml",
    "removeComments": true,
    "showLineNumbers": true
  },
  "include": [
    "**/*.ts",
    "**/*.js",
    "**/*.html",
    "**/*.json",
    "**/*.md"
  ],
  "ignore": {
    "customPatterns": [
      "node_modules/**",
      "dist/**",
      "*.test.*",
      "*.spec.*",
      "coverage/**"
    ]
  },
  "security": {
    "enableSecurityCheck": true
  }
}
```

Initialize config:
```bash
repomix --init  # Creates repomix.config.json
```

---

## Output Format Recommendations

| Format | Best For | Token Efficiency |
|--------|----------|------------------|
| **XML** | AI analysis (Claude, ChatGPT) | Good |
| **Markdown** | Human review, documentation | Medium |
| **JSON** | Programmatic processing | Good |
| **Plain** | Simple text analysis | Best |

### XML Format (Default - Recommended for AI)

```xml
<file path="src/materials/database.ts">
<content>
// Material database implementation
export class MaterialDatabase {
  // ...
}
</content>
</file>
```

### Markdown Format (Human-Readable)

```markdown
## File: src/materials/database.ts

```typescript
// Material database implementation
export class MaterialDatabase {
  // ...
}
```
```

---

## Token Management for Claude

Claude has context limits. Use these strategies:

### Check Token Count Before Upload

```bash
# View token distribution tree
repomix --token-count-tree

# Output example:
# 🔢 Token Count Tree:
# └── src/ (70,925 tokens)
#     ├── materials/ (25,000 tokens)
#     ├── machines/ (20,000 tokens)
#     └── tools/ (15,000 tokens)
```

### Token Reduction Strategies

1. **Use compression** (`--compress`): ~70% reduction
2. **Remove comments** (`--remove-comments`): ~20% reduction
3. **Disable line numbers** (`--no-line-numbers`): ~10% reduction
4. **Filter to relevant files** (`--include`): Variable

### Split Large Codebases

If codebase exceeds context limits, split by module:

```bash
# Pack materials module
repomix --include "src/materials/**" -o prism-materials.xml

# Pack machines module
repomix --include "src/machines/**" -o prism-machines.xml

# Pack tools module
repomix --include "src/tools/**" -o prism-tools.xml
```

Upload relevant portions per session.

---

## Integration with PRISM Workflow

### Session Start: Context Loading

```
┌─────────────────────────────────────────────────────────────────┐
│                    SESSION START WORKFLOW                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Check task scope                                            │
│         │                                                       │
│         ▼                                                       │
│  2. Need codebase context?                                      │
│         │                                                       │
│    yes  │         no                                            │
│         ▼         └──▶ Proceed with existing knowledge         │
│  3. Run Repomix with appropriate filters                       │
│         │                                                       │
│         ▼                                                       │
│  4. Check token count                                           │
│         │                                                       │
│         ▼                                                       │
│  5. Under limit?                                                │
│         │                                                       │
│    yes  │         no                                            │
│         ▼         └──▶ Apply compression/filtering             │
│  6. Upload to Claude.ai                                        │
│         │                                                       │
│         ▼                                                       │
│  7. Begin analysis/extraction                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Extraction Planning

```bash
# Step 1: Pack full monolith (compressed)
repomix --compress --style xml -o monolith-compressed.xml

# Step 2: Upload to Claude and prompt:
"Analyze this codebase and identify:
1. All material database definitions
2. All consumers of material data
3. Dependencies between modules
4. Suggested extraction order"

# Step 3: Pack specific module for deep analysis
repomix --include "**/material*" -o materials-deep.xml

# Step 4: Extract with full context
```

### Anti-Regression Workflow

```bash
# Before changes
repomix --style json -o before-changes.json

# Make changes...

# After changes
repomix --style json -o after-changes.json

# Compare in Claude:
"Compare these two codebase snapshots. 
Identify any functionality that was present in 'before' but missing in 'after'.
Focus on: database fields, API endpoints, calculation functions."
```

---

## Using with Ignore Files

### .repomixignore

Create `.repomixignore` for project-specific exclusions:

```gitignore
# Build outputs
dist/
build/
*.min.js

# Test files
__tests__/
*.test.ts
*.spec.ts

# Generated files
*.generated.ts
coverage/

# Large data files
*.csv
*.xlsx
data/

# Dependencies
node_modules/
vendor/
```

**Tip:** `.repomixignore` is more reliable than CLI flags for complex patterns.

---

## PRISM Monolith Quick Reference

```bash
# Full monolith analysis (compressed)
repomix \
  --include "PRISM_v8*.html" \
  --compress \
  --style xml \
  -o monolith-full.xml

# Materials extraction context
repomix \
  --include "**/material*,**/cutting*,**/kienzle*,**/johnson*" \
  --style markdown \
  -o materials-context.md

# Machine database context
repomix \
  --include "**/machine*,**/controller*,**/spindle*" \
  --style markdown \
  -o machines-context.md

# Algorithm extraction context
repomix \
  --include "**/algorithm*,**/optimize*,**/calculate*" \
  --compress \
  --style xml \
  -o algorithms-context.xml

# Token analysis
repomix --token-count-tree 5000
```

---

## Prompt Templates for Claude

### Codebase Overview

```
I've uploaded a packed codebase using Repomix. Please analyze it and provide:

1. **Architecture Overview**: Main modules and their responsibilities
2. **Data Flow**: How data moves between components
3. **Key Algorithms**: Important calculation/processing logic
4. **Dependencies**: Internal and external dependencies
5. **Potential Issues**: Code smells, technical debt, or concerns
```

### Extraction Planning

```
This is the PRISM v8.89 monolith. I need to extract the materials database module.

Please identify:
1. All material-related code (classes, functions, data structures)
2. All consumers of material data
3. Dependencies that would need to be extracted together
4. Suggested extraction order to minimize breaking changes
5. Test coverage requirements for safe extraction
```

### Documentation Generation

```
Generate comprehensive documentation for this codebase including:

1. Module overview and purpose
2. Public API reference
3. Configuration options
4. Usage examples
5. Architecture decision records
```

### Code Review

```
Perform a thorough code review of this codebase. Evaluate:

1. **Code Quality**: Naming, structure, patterns
2. **Error Handling**: Coverage and approach
3. **Testing**: Coverage and quality
4. **Security**: Potential vulnerabilities
5. **Performance**: Bottlenecks and optimization opportunities
6. **PRISM Standards**: Compliance with 10 Commandments
```

---

## Best Practices

### DO:
- ✅ Use `.repomixignore` for complex exclusion patterns
- ✅ Enable security checks for third-party code
- ✅ Choose XML format for AI, Markdown for humans
- ✅ Monitor token counts to stay within limits
- ✅ Remove comments when focusing on logic
- ✅ Version output files (regenerate as needed)
- ✅ Test include/exclude patterns before full pack

### DON'T:
- ❌ Include node_modules or vendor directories
- ❌ Pack binary files or large data files
- ❌ Disable security scanning for unknown code
- ❌ Use single format for all purposes
- ❌ Forget to check token limits before upload

---

## Complementary Tools

| Tool | Purpose |
|------|---------|
| **Context7** | Up-to-date library documentation |
| **Git** | Repository history analysis |
| **Secretlint** | Security scanning |
| **tiktoken** | Precise token counting |

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────┐
│               REPOMIX QUICK REFERENCE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  BASIC:                                                        │
│  repomix                        # Pack current directory       │
│  repomix --style markdown       # Human-readable output        │
│  repomix -o output.xml          # Custom output path           │
│  repomix --remote <url>         # Pack GitHub repo             │
│                                                                 │
│  FILTERING:                                                    │
│  --include "**/*.ts,*.md"       # Include patterns             │
│  -i "tests/**,*.test.js"        # Exclude patterns             │
│                                                                 │
│  OPTIMIZATION:                                                 │
│  --compress                     # ~70% token reduction         │
│  --remove-comments              # Remove code comments         │
│  --no-line-numbers              # Skip line numbers            │
│  --token-count-tree             # View token distribution      │
│                                                                 │
│  PRISM PATTERNS:                                               │
│  # Full monolith                                               │
│  repomix --include "*.html" --compress -o monolith.xml        │
│                                                                 │
│  # Specific module                                             │
│  repomix --include "**/material*" -o materials.md             │
│                                                                 │
│  # Before/after comparison                                     │
│  repomix --style json -o snapshot.json                        │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  TOKEN LIMITS:                                                 │
│  Claude Opus: ~200K tokens                                     │
│  Claude Sonnet: ~200K tokens                                   │
│  Use --compress + --include filtering for large codebases     │
└─────────────────────────────────────────────────────────────────┘
```

---

## References

- Repomix Documentation: https://repomix.com/guide/
- Repomix GitHub: https://github.com/yamadashy/repomix
- PRISM Monolith Navigator (prism-monolith-navigator)
- PRISM Monolith Extractor (prism-monolith-extractor)
- PRISM Anti-Regression (prism-anti-regression)
