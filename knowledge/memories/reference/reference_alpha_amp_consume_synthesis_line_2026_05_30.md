---
name: reference_alpha_amp_consume_synthesis_line_2026_05_30
description: AMP-CONSUME — slot-context-bundle surfaces each slot's own patterns/<galaxy>_synthesis.md; built+verified-live, deferred to a peer zebra→zulu claim via patch-sibling
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.465Z
aliases: reference_alpha_amp_consume_synthesis_line_2026_05_30
---


The **consumer arm** of the Obsidian-brain compounding stack (after RECALL = A3/A6 and
COMPOUNDING = B1/L2/AMP2): make each slot deterministically SEE its own distilled domain
synthesis every prompt, not just when recall ranks it top-K.

**What:** `.claude/hooks/slot-context-bundle-inject.mjs` (UserPromptSubmit T2) already
auto-surfaces a slot's galaxy `CLAUDE.md`/`MEMORY.md`/`PATHS.md`/`TOOLBELT.md`/buildout-brief.
AMP-CONSUME adds ONE existence-gated line surfacing
`knowledge/memories/patterns/<galaxy>_synthesis.md` (the B1-compounded synthesis). Inserted
inside the `if (galaxy)` block, right after the buildout-brief catch; mirrors the existing
`fs.statSync(...).size > 200` artifact checks. Path-pointer ONLY — the A6 recall path already
surfaces the synthesis CONTENT on domain-relevant prompts, so no per-prompt content
duplication across 13 slots (efficiency-watchdog call).

**Verified live (before back-out):** `printf '{"session_id":"da9aacf5..."}' | node <hook>` →
exit 0, valid JSON, fail-soft (empty stderr), all existing lines preserved, new line emitted
for alpha (galaxy=token-optimization): `- domain synthesis: \`knowledge/memories/patterns/
token-optimization_synthesis.md\` -- ...`. `node --check` clean. +936 bytes additive. All 34
galaxies have a synthesis file → fires for every slot in `SLOT_GALAXY_MAP`.

**Why it shipped as a patch-sibling, not a commit:** the hook was **peer-CLAIMED**
(`[05:18:06] DESKTOP--67860: claiming .../slot-context-bundle-inject.mjs`) and mid a ~90-file
**atomic `zebra→zulu` migration** (`scripts/migrate-zebra-to-zulu.mjs`; `hermes-zebra`→
`hermes-zulu`, `zebra-context-bundle.mjs`→`zulu-context-bundle.mjs` already done, 7 uncommitted
`ZEBRA-OMNISCIENT`→`ZULU-OMNISCIENT` line-edits in this very file). Per the multi-chat law,
alpha **backed its edit fully out** (revert verified: −936 B, AMP-CONSUME count 0, peer's 7
zebra→zulu edits intact) and preserved the change at
`state/shared/dashboards/patches/SLOT-CONTEXT-BUNDLE-SYNTHESIS-LINE-PATCH-2026-05-30.md` for
golf to apply post-migration (the anchor has no zebra/zulu token → applies cleanly after).

**Lessons:** (1) The cross-worktree-write-block on `.claude/hooks/*.mjs` is load-bearing — it
surfaced an active peer migration I'd otherwise have entangled. Verify topology before
assuming (the stale handoff said branch `cad-fusion-live-ms0`; git said worktree on
`slot/alpha`). (2) "Auto-build if safe" (per [[feedback_net_benefit_auto_build]]) must gate on
multi-chat safety, not just code safety. (3) Roadmap: this is the consumer of B1/L2/AMP2; the
6-amplifier fleet-compounding roadmap (#3 fleet-distributed synthesis = the literal
20-chats-parallel lever) still stands.
