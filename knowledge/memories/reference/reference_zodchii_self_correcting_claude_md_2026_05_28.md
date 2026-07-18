---
name: zodchii-self-correcting-claude-md
description: "zodchii's \"self-correcting Claude Code\" pattern (CLAUDE.md learned-from-mistakes + PostToolUse format/typecheck + Stop quality gate + PreToolUse filters + retry budget + /memory). PRISM coverage map + 3 concrete additions. Source — x.com/zodchiii/status/2059563487676784696 2026-05-27 163K views."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.280Z
aliases: reference_zodchii_self_correcting_claude_md_2026_05_28
---


## Karpathy quote (from the tweet)
> "Anytime Claude does something incorrectly, add it to CLAUDE.md so it knows not to repeat the mistake."
> "After every correction, end with: 'Update your CLAUDE.md so you don't make that mistake again.'"

## PRISM coverage map (per zodchii's 6 steps)

| Step | Pattern | PRISM status | Gap |
|------|---------|--------------|-----|
| 1 | Self-correcting CLAUDE.md with `## Learned from mistakes` | ✅ `## Recent regressions` (Boris back-flow). Pattern already canonical. | None — already exceeds. |
| 2 | PostToolUse: auto-format + typecheck per file | Partial — bug-finding-wiki-gate, comprehensive-build-enforce, but no `Write(*.ts) → npx prettier --write + npx tsc --noEmit` inline matcher | **ADD:** per-file Write hook with `tsc --noEmit \| head -20`. |
| 3 | Stop hook: tests + quality gate | ✅ scrutinize-before-stop + stop_on_failing_tests + 3-of-3 scrutiny gate. Strong. | None. |
| 4 | PreToolUse: filter inputs (log grep, .env block) | ✅ 20+ PreToolUse hooks (CLAUDE.md guard, dup-detect, comprehensive-build-enforce, claude-md-golf-only-guard, etc) | None. |
| 5 | Auto-retry with token budget cap | ✅ /loop + /goal-complete-gate + autonomous-loop with budget envelope | None. |
| 6 | /memory + Dreaming for cross-session learning | ✅ stop-obsidian-memory-feed + auto-memory dir + Stop hook auto-feeds C: → H: | Partial — no "Dreaming" (background consolidation worker), but Stop-hook feed approximates it. |

## Two findings worth acting on

### A. 200-line CLAUDE.md compliance ceiling (zodchii cites Karpathy research)
> "Research shows the sweet spot is ~12 rules under 200 lines. Past that, compliance drops sharply."

PRISM's project-root `H:/PRISM/CLAUDE.md` is ~700+ lines. The pointer-style indexing pattern (`## Recent regressions` line per regression) keeps individual entries terse, but the file itself exceeds the compliance ceiling.

**Mitigation already in place:** CLAUDE.md is split into 4-surface model (soul + galaxy CLAUDE.md + MEMORY.md + wiki) per the just-shipped per-slot galaxy work. Per-slot CLAUDE.md files should aim for ≤200 lines.

**Action:** add a check to the per-slot galaxy verification gate: `wc -l mcp-server/src/engines/<galaxy>/CLAUDE.md` ≤ 200 → PASS, else WARN.

### B. PostToolUse inline format+typecheck
zodchii's canonical config:
```json
{"matcher": "Write(*.ts)", "hooks": [
  {"type": "command", "command": "npx prettier --write $file"},
  {"type": "command", "command": "npx tsc --noEmit 2>&1 | head -20"}
]}
```

PRISM doesn't have an equivalent for the mcp-server TypeScript. The build-check-suggest hook fires advisory ("BUILD CHECK SUGGESTED: 5 source edits…") but doesn't auto-run tsc per file. Would catch type errors at write-time instead of session-end.

**Action:** add `Write(mcp-server/src/**/*.ts)` matcher with auto-tsc-noEmit head-20.

## What PRISM has that zodchii doesn't mention

- **3-of-3 strict scrutiny gate** (Codex + Claude reviewer A + Claude reviewer B) — much stronger than single-prompt Stop hook.
- **Per-file scrutiny gate** (2 parallel reviewers per file in multi-file builds) — prevents compound errors.
- **Slot-worktree isolation** — per-chat worktrees prevent commit absorption / peer file races.
- **Bug-finding wiki gate Stop hook** — every bug class gets a wiki entry per Boris back-flow.

zodchii's setup is a strong baseline. PRISM is at the high end of the spectrum.

Source: x.com/zodchiii/status/2059563487676784696, 2026-05-27, 163K views, 670 bookmarks.

Related:
- [[feedback_always_capture_lessons]]
- [[reference_karpathy_obsidian_4layer_framework_2026_05_28]] — Cyril's framework, complementary
- [[feedback_r5_thru_r12_doctrine]] — R12 fail-loud is PRISM's mistake-learning enforcement
