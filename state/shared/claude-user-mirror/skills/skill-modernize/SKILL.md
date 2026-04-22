---
name: skill-modernize
description: Batch-update skill frontmatter with model/effort/context/allowed-tools based on classification tiers.
model: sonnet
effort: medium
---

# Skill Modernize

Batch-update all PRISM skill SKILL.md files with standardized frontmatter fields based on the classification tier system.

## What It Does

Reads `skill-classification.json` and applies the correct `model`, `effort`, `allowed-tools`, and `fork-context` fields to each skill's SKILL.md frontmatter.

## Steps

1. **Read classification**: Load `~/.claude/skills/skill-classification.json` to get tier assignments for all skills.

2. **Locate skills**: Search both skill directories:
   - `~/.claude/skills/` (user-level, active)
   - `C:/PRISM/.claude/worktrees/sharp-jennings/skills-consolidated/` (worktree, canonical)

3. **For each tier** (haiku_tier, sonnet_tier, opus_tier):
   - Get the tier's `model` and `effort` values
   - For each skill in the tier:
     a. Find its SKILL.md (try `<name>/SKILL.md` and `prism-<name>/SKILL.md`)
     b. Parse existing frontmatter
     c. Add/update `model:` field
     d. Add/update `effort:` field
     e. If skill is in `read_only` list, add `allowed-tools: Read, Grep, Glob`
     f. If skill is in `fork_context` list, add `fork-context: true`
     g. Write back the file preserving body content

4. **Report results**: Print summary of updated/skipped/not-found counts.

## Quick Run

Execute the batch updater script:
```bash
bash ~/.claude/hooks/lib/update-skill-frontmatter.sh
```

Or dry-run first:
```bash
bash ~/.claude/hooks/lib/update-skill-frontmatter.sh --dry-run
```

## Classification Tiers

| Tier | Model | Effort | Count | Purpose |
|------|-------|--------|-------|---------|
| haiku_tier | haiku | low | ~40 | Simple lookups, status, quick calc |
| sonnet_tier | sonnet | medium | ~90 | Analysis, bounded multi-step |
| opus_tier | opus | high | ~65 | Exhaustive analysis, full pipelines |

## Cross-cutting Tags

- **fork_context**: Skills that should run in a forked/subagent context (~19)
- **read_only**: Skills restricted to Read/Grep/Glob only (~36)

## Frontmatter Fields Added

```yaml
---
name: example-skill
description: What it does
model: sonnet          # haiku | sonnet | opus
effort: medium         # low | medium | high
allowed-tools: Read, Grep, Glob  # only for read_only skills
fork-context: true     # only for fork_context skills
---
```
