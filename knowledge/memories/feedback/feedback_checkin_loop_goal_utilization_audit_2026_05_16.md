---
name: feedback-checkin-loop-goal-utilization-audit-2026-05-16
description: "Audit of /checkin + /loop + /goal against the 14 PRISM dev-tool surfaces. Found that 9 of 14 surfaces are NAMED but never INVOKED in /checkin (system-viz, Obsidian semantic pull, Ollama routing, RTK, neural network, AI systems, learning systems, tribal knowledge, prism_safety). /loop has 2 hooks but no per-iter start. /goal has 4 hooks but pre-flight doesn't call verify-unit-ready. Top-7 improvement ladder. 3 shipped this turn; 4 queued."
metadata:
  type: feedback
  scope: project
  surface: skills + hook wiring
  audit_date: 2026-05-16
  audited_by: claude-a61bbf34 (slot echo)
  related_skills:
    - checkin
    - checkin-alpha..lima (12 slot-locked variants)
    - loop (built-in Claude Code)
    - goal (built-in Claude Code)
  related_hooks:
    - loop-iteration-inject.mjs
    - loop-detector.mjs
    - goal-complete-gate.mjs
    - goal-prereq-inject.mjs
    - goal-stack-init.mjs
    - goal-stack-inject.mjs
  related_units:
    - SYSTEM-VIZ-BRAIN-MS0/U-P3-VERIFY-UNIT-READY (composes into /goal pre-flight per improvement #5)
    - SYSTEM-VIZ-BRAIN-MS0/U-P5-CHECKIN-FLEET-CONTEXT (the iter-3 ship being audited)
---

# Audit: /checkin + /loop + /goal — dev-tool utilization to highest capability

Operator directive 2026-05-16: "do an audit on whether or not we utilize all development tools to their highest capability in the checkin slash command. find improvements on it along with the cli loop and cli goal slash commands."

## Surfaces audited

System-viz · Obsidian vault · Ollama · RTK · hook pipelines · memory · CLAUDE.md · PRISM awareness · neural network · AI systems · learning systems · tribal knowledge · wiki injection · prism_safety/Ω.

## Headline finding

**9 of 14 surfaces in `/checkin` are NAMED in the skill body but never INVOKED** — they show up in Step 10's tool table as if they're being used, but no actual MCP dispatcher call or helper script is wired. The skill became surface-list documentation rather than tool-execution choreography. This is the most expensive class of doc-rot: the doc *claims* coverage that the runtime doesn't deliver.

## /checkin per-tool gap matrix

| Surface | Today | Gap class |
|---|---|---|
| system-viz | refresh ping only (6e) | NAMED-not-INVOKED for graph queries on bound topic |
| Obsidian semantic | mtime top-3 (6d) | NAMED-not-INVOKED for semantic pull |
| Ollama routing | health probe (6g) | NAMED-not-INVOKED for proactive offload |
| RTK | mentioned in Step 11 | UNENFORCED in bash blocks (60-90% token savings missed every run) |
| hook pipelines | implicit | FULL coverage ✓ |
| memory | handoff write (Step 3) | NOT enriched with CHECKIN_LOG section |
| CLAUDE.md | staleness check (6f) | Missing regressions surfacing |
| awareness | Step 8 verify | FULL coverage ✓ |
| neural network | Step 10 mention | NAMED-not-INVOKED |
| AI systems (cot_reason) | Step 10 mention | NAMED-not-INVOKED for plan generation |
| learning systems | Step 11 mention | NAMED-not-INVOKED for prior-priors |
| tribal knowledge | Step 10 mention | NAMED-not-INVOKED |
| wiki injection | UserPromptSubmit auto | FULL coverage ✓ |
| prism_safety / Ω | not mentioned | MISSING ENTIRELY |

## /loop gap matrix

Existing hooks: `loop-iteration-inject.mjs` (UserPromptSubmit, surfaces fleet loops + Karpathy R10), `loop-detector.mjs`.

| Gap | Improvement |
|---|---|
| No per-iter START hook | New `loop-iter-start.mjs` PreToolUse (token budget + heartbeat refresh + Ollama pre-warm) |
| Token budget = injected reminder | Hard-block at 880k tokens via existing precompact-auto-trigger |
| Cross-fleet collision | Extend inject to detect milestone-collision with peer loops |
| Per-iter scrutiny | Single-reviewer mini-gate when iter > 1 |
| Iter-level distillation | Knob `PRISM_LOOP_PER_ITER_DISTILL=1` |
| AI plan generation | Call `prism_ai:cot_reason` once at /loop start with /goal directive |
| Success-prob estimate | Read learning-routing.json for prior priors |

## /goal gap matrix

Existing hooks: `goal-complete-gate.mjs` (Stop hard-gate), `goal-prereq-inject.mjs` (UserPromptSubmit pre-flight), `goal-stack-init.mjs`, `goal-stack-inject.mjs`.

| Gap | Improvement |
|---|---|
| Pre-flight unit verification | Wire `verify-unit-ready.mjs` (just shipped in U-P3) into goal-prereq-inject |
| Fleet-wide goal coordination | goal-stack should detect cross-fleet collision via chat-slots |
| Auto-evidence generation | At /goal-complete attempt, auto-generate ship-report appended to envelope rationale |
| Cost/time telemetry | Record baseline at /goal start, delta at complete, write to learning-routing.json |
| Success-prob estimate | Same priors as /loop |
| Auto-/close-out-audit invocation | Goal-prereq-inject AUTO-FIRES the audit if stale, instead of warning |
| Multi-goal stack | Audit goal-stack-* hooks' actual usage (may be dormant) |

## Top-7 improvement ladder (HIGH-ROI first)

| # | Improvement | LOC | Impact |
|---|---|---|---|
| 1 | RTK auto-prefix in /checkin bash blocks | ~5 | 60-90% bash output savings per /checkin run |
| 2 | /checkin Step 6i tribal_search proactive call | ~20 | Surface experiential warnings before dev pipeline starts |
| 3 | /checkin Step 6f regressions surfacing | ~15 | Operator sees known-broken paths before starting |
| 4 | `loop-iter-start.mjs` PreToolUse hook | ~80 | Per-iter token budget + heartbeat + Ollama pre-warm |
| 5 | /goal pre-flight calls verify-unit-ready | ~30 | Composes my U-P3 helper; blocks bad /goal claims |
| 6 | /checkin §6 fires prism_ai:cot_reason on non-trivial args | ~20 | Actually uses the AI surface |
| 7 | /goal auto-evidence ship-report generator | ~100 | Auto-closeout; biggest blast-radius |

## Shipped this turn (2026-05-16, slot echo, claude-a61bbf34)

- ✅ #1 RTK auto-prefix in /checkin bash blocks (Step 6 git commands)
- ✅ #2 New Step 6i tribal knowledge pull (invokes `prism_knowledge:tribal_search` with fallback chain)
- ✅ #3 Step 6f extended with top-3 regressions surfacing from CLAUDE.md
- ✅ §Report new lines: `regressions:`, `tribal hits:`
- ✅ This audit memo

## Queued for next session

- ⏳ #4 `loop-iter-start.mjs` PreToolUse hook (multi-file build → per-file scrutiny gate required)
- ⏳ #5 Wire `verify-unit-ready.mjs` into goal-prereq-inject (single-file edit, no gate)
- ⏳ #6 prism_ai:cot_reason invocation in /checkin (single-edit)
- ⏳ #7 /goal auto-evidence ship-report (largest scope; multi-file)

## Apply protocol

Before claiming a tool surface is "wired" in any PRISM skill, ask the audit question: *if I removed the surface's binary from disk, would the skill still appear to work?* If yes → the surface is documented but not invoked. Fix it or remove the mention.

## Related

- [[reference_post_ship_system-viz-brain-ms0-u-p5-checkin-fleet-context]] — the just-shipped 6h fleet activity step that this audit extends
- [[reference_u_p3_verify_unit_ready]] (auto-distilled from commit bb97427af) — the helper that improvement #5 composes
- [[feedback_settings_wiring_drift_2026_05_16]] — sister regression class (NAMED-not-WIRED) in settings.json
- [[feedback_reflect_all_changes_post_update]] — the doc-reflection rule this memo honors
