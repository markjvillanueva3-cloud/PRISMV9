# Slash Commands Orphan Audit — 2026-04-21

## Census (actual, corrected)
| Scope | Count | Path |
|---|---:|---|
| PRISM project | **133** | `H:\PRISM\.claude\commands\` |
| User global | **321** | `H:\.claude\commands\` (junctioned) |
| **Total distinct paths** | **454** | (earlier "543" was transcription error) |
| **Duplicate NAMES** (in both dirs) | **80** | likely identical — **first action: dedup** |

## Three categories of orphan

### Category A — Duplicate (80 command names in BOTH project + user)
Same `.md` in two dirs = maintenance doubled, drift risk. User dir takes precedence in Claude Code resolution, so project copies are **silently dead**.

**Action:** for each dup: diff; if identical, delete project copy; if divergent, reconcile then delete.

```bash
# enumerate
comm -12 <(ls H:/PRISM/.claude/commands/ | sort) <(ls H:/.claude/commands/ | sort)
# diff all at once
for f in $(comm -12 ...); do diff -q "project/$f" "user/$f"; done
```

### Category B — Stub commands (15 commands ≤ 20 lines)
```
 8  prism-paths.md       14  estimate.md       15  digest.md
14  batch-check.md       14  snapshot.md       15  hook-stats.md
14  defaults.md          14  template.md       15  stop-check.md
15  context-map.md       16  gcode.md          16  token-ledger.md
18  powermill-strategy-guide.md      18  token-budget.md      18  who.md
```
**Action:** inspect each; either flesh out to real content OR remove.

### Category C — Unreferenced (requires full codebase grep — heavy)
Not run in this audit. To do:
```bash
# for each command, grep for its invocation pattern in hooks, scripts, engines:
for cmd in H:/.claude/commands/*.md; do
  name=$(basename "$cmd" .md)
  refs=$(rg "/$name\b" H:/PRISM --count-matches 2>/dev/null | wc -l)
  [ $refs -eq 0 ] && echo "ORPHAN: $name"
done
```
Too expensive to run inline; produces candidate list for manual review.

## Recommended execution order
1. **Dedup Category A** (80 commands) — zero-risk, immediate 18% reduction.
2. **Inspect Category B stubs** — kill or complete each.
3. **Run Category C grep** in a background task; review output in a follow-up session.

Expected final count: **~350 unique meaningful commands** (from 454).
