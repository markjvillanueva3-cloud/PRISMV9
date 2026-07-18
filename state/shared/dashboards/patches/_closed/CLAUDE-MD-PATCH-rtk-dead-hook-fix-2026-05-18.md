# CLAUDE.md patch — rtk dead-hook fix (2026-05-18, slot kilo)

> Peer-locked surface — operator (or next golf integrator) folds this into `H:/prism/CLAUDE.md` once peer-claims clear.

## Target section: `## Recent regressions`

Append the following line:

```markdown
- 2026-05-18 | **Dead `rtk hook claude` settings.json entry — fires on every Bash call, errors, prints ~80 tokens of noise** | rtk 0.34.3 has no `hook` subcommand; on Windows `rtk init -g` falls back to `--claude-md` mode and never installs a settings.json hook. Stale wiring (likely from rtk ≤0.20.x) at `C:/Users/Mark Villanueva/.claude/settings.json` lines 643-647 + auto-mirrored to `H:/.claude/settings.json` was invoking `rtk hook claude` → `Binary 'hook' not found` → `[rtk: program not found]` + the standing "No hook installed" banner. Cumulative drag across a session: ~80 tokens × 100s of Bash calls. | fix: removed both entries (C: edited; c-to-h-mirror auto-replicated to H:); /rtk-setup skill updated with the Windows caveat per [[reference_rtk_hook_dead_windows_fix_2026_05_18]]. PRISM-side advisory hooks (`rtk-prefix-reminder.mjs` + `rtk-auto-suggest.mjs`) preserved — they're the only useful rtk-related wiring on Windows. | observed-by: claude-e8bb7bd7 slot kilo, "make improvements to rtk if possible" /goal. | verify: `ls H:/prism/CLAUDE.html 2>&1` should NOT contain `[rtk] /!\ No hook installed`; `grep -c "rtk hook claude" "C:/Users/Mark Villanueva/.claude/settings.json"` → 0.
```

## Why patch-sibling instead of direct edit

CLAUDE.md held a fresh peer-claim cluster in the last 12h window; conflict-fork rule applies. Patch-sibling pattern per CLAUDE.md §JULIETT-12CHAT-ALLOCATION-MS0 is the codified safe path.
