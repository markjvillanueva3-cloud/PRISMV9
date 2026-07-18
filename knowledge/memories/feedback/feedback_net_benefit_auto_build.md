---
name: feedback_net_benefit_auto_build
description: "net-benefit discovery → quick safety assessment → auto-build if it doesn't break anything (don't ask first); \"doesn't break\" includes multi-chat discipline, not just code"
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.435Z
aliases: feedback_net_benefit_auto_build
---


Standing directive (operator, 2026-05-30, slot:alpha): *"if you discover or have
suggestions that is always a net benefit, do a quick assessment to ensure it doesn't
break anything, if it doesn't, automatically build it."*

**Why:** the operator wants the fleet to compound improvements autonomously. Surfacing a
net-benefit idea and then *waiting to ask* wastes a round-trip and stalls compounding. When
a change is clearly additive/safe, the value is in shipping it, not in confirming permission.

**How to apply:**
1. **Discover/suggest** a net-benefit improvement (a cheap win you noticed while doing the
   primary task — e.g. "the slot-context-bundle surfaces galaxy CLAUDE.md but not the
   galaxy's `patterns/<g>_synthesis.md`").
2. **Quick safety assessment** — is it purely additive? does it preserve the file's existing
   contract (e.g. a fail-soft hook must stay no-throw)? are all referenced symbols in scope?
   verify on real data (run it).
3. **"Doesn't break anything" is BROADER than code-safety** — it INCLUDES multi-chat
   discipline. Before committing, check: is the target **peer-claimed** (chat-bus
   `claiming <file>`)? part of a peer's **in-flight atomic migration**? a **cross-worktree
   locked surface** (`.claude/hooks/*.mjs`, settings.json, top-level `state/shared/*.md`,
   CLAUDE.md, MEMORY.md)? If YES → the *code* may be safe but the *commit path* is not.
4. **Branch on the landing path:**
   - clear + writable + unclaimed → **build + commit it** (no need to ask).
   - safe code but locked/claimed surface → **build + verify it, then route through a
     patch-sibling** (`state/shared/dashboards/patches/<NAME>-PATCH-<date>.md`) for golf/the
     claim-owner to apply; back your edit fully out of the claimed file (zero footprint).
5. **Always still** run per-file scrutiny + 4-surface doc-reflection on what you ship.

**Worked example (2026-05-30):** AMP-CONSUME synthesis-line for `slot-context-bundle-inject.mjs`
— code verified-live + purely additive, BUT a peer held an explicit chat-bus claim on the file
mid `zebra→zulu` atomic migration. The directive's own guard ("ensure it doesn't break
anything") correctly diverted from commit → patch-sibling. See
[[reference_alpha_amp_consume_synthesis_line_2026_05_30]].

Sister rules: [[feedback_all_slots_free_access]] (any slot MAY wire hooks — the constraint is
peer-claim respect, not territory) · [[feedback_parallel_scrutiny_per_file]] · the multi-chat
law "never commit peer-claimed files".
