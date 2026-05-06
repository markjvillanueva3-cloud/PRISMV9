# Skill Sync with MCP — Verify Each Skill Has a Dispatcher Action

Walk every `.claude/commands/*.md` skill file and verify the MCP action it claims to wire to actually exists in the dispatcher source. Reports orphaned skills (skill points at action that doesn't exist) and orphan actions (action exists with no skill exposing it). The closing pass either fixes the references or stages a rename plan.

## Args: $ARGUMENTS
- (none) — full audit
- `--skill=<name>`: audit a single skill file
- `--write`: produce SKILL-MCP-SYNC.md report at repo root
- `--fix-rename`: when a skill references a renamed action, suggest the new name (read-only)

## Trigger policy
```yaml
policy:
  tier: 2
  triggers:
    - keyword:"skill sync"
    - keyword:"skill mcp audit"
    - keyword:"orphaned skill"
    - on:PostToolUse(skill-modernize)
```

## What it checks per skill
1. Every skill body block matching `MCP Action: prism_<dispatcher>:<action>` — the `<action>` must appear in `mcp-server/src/tools/dispatchers/<dispatcher>.ts` ACTIONS const + z.enum + case body
2. The action's z.enum entry must match the spelling in the skill exactly
3. The skill's `policy.triggers` (if present) must reference real keywords/tool events
4. Frontmatter `policy.tier` must be 1, 2, or 3

## Output buckets
| Bucket | Meaning | Action |
|--------|---------|--------|
| `synced` | skill action found in dispatcher source | nothing |
| `orphan-skill` | skill points at action that doesn't exist | rename or delete the skill |
| `orphan-action` | action exists, no skill exposes it | write a skill or document why |
| `mistyped` | skill uses old name; renamed action exists | apply the rename |
| `bad-policy` | policy frontmatter malformed | fix tier/triggers |

## MCP action
- Read: `prism_session:dispatcher_map_compact` returns `{dispatcher: [actions...]}` map
- Write: not yet — this skill currently emits a markdown report; future `prism_dev:skill_sync` writes back

## Output (markdown report)
```
# SKILL-MCP-SYNC — 2026-05-06

## Synced (220)
- /lathe-studio → prism_turning:lathe_orchestrate_facade ✓
...

## Orphan skills (3)
- /old-skill-name → prism_dev:nonexistent_action — DELETE or RENAME
...

## Orphan actions (12)
- prism_calc:rapid_force_estimate (no skill) — consider creating /rapid-force
```

## Related
- `/dedup` — runs before creating any new asset; complementary to this audit
- `/skill-modernize` — adds policy frontmatter to legacy skills
