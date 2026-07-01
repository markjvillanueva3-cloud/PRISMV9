---
name: reference_post_ship_ai-synergy-audit-ms0-u-aisyn-soul-claude-quality-local
description: Auto-distilled learnings from shipping AI-SYNERGY-AUDIT-MS0/U-AISYN-SOUL-CLAUDE-QUALITY-LOCAL (commit 3c76f9c8a). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.735Z
aliases: reference_post_ship_ai-synergy-audit-ms0-u-aisyn-soul-claude-quality-local
---


# AI-SYNERGY-AUDIT-MS0/U-AISYN-SOUL-CLAUDE-QUALITY-LOCAL

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [AI-SYNERGY-AUDIT-MS0]/U-AISYN-SOUL-CLAUDE-QUALITY-LOCAL (slot:charlie): grade all 34 galaxies' SOUL.md + CLAUDE.md quality on the LOCAL Blackwell GPU via ollama-fanout -- the RIGHT answer to the rate-limit incident. Root cause of the sibling-session kill: my earlier 34-Claude-subagent Workflow burst past Anthropic's org-wide RPM/TPM throttle (shared across ALL sessions) -> 'Server is temporarily limiting requests' -> starved the operator's other session. The org limit is a HARD CEILING; more concurrent Claude agents makes sibling-starvation worse. The fix (which scripts/lib/ollama-fanout.mjs already existed for, and I failed to use): route mechanical judgment-at-scale to the 96GB GPU -- 0 Anthropic rate limit, /usr/bin/bash, reserve Claude for final synthesis. New reusable scripts/audit-galaxy-soul-claude-quality.mjs (enumerate->buildGradePrompt->ollamaFanout->parseGrade->ranked report). RESULT: fleet soulGrade 0.553 / claudeGrade 0.751; 23/34 souls are generic stubs ('lacks domain-specific identity + refuses'), 3 stub CLAUDE.md, 6 incoherent. 11/11 tests incl an R9 bug the test caught (Number(null)===0 collapsed a null grade to a fake 0). Report: state/shared/specs/GALAXY-SOUL-CLAUDE-QUALITY.md.

**Shipped:** 2026-06-10T21:37:24-05:00 by markjvillanueva3-cloud
**Files:** 5 touched

Full distillation: [[ai-synergy-audit-ms0-u-aisyn-soul-claude-quality-local]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._