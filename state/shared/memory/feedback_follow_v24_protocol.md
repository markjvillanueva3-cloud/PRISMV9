---
name: Follow V24 roadmap session protocol exactly — never skip steps
description: When working on v24 roadmap sessions, follow the SESSION block instructions literally — read session block, create tasks, 4-LOOP per unit, /prism-review, EXIT GATE. Do not treat as advisory.
type: feedback
---

Follow the V24 ROADMAP EXECUTION PROTOCOL in CLAUDE.md literally. Never skip the 4-LOOP (BUILD → SCRUTINIZE → GAP FILL) or EXIT GATE steps.

**Why:** On 2026-03-25, I was asked to resume v24 roadmap work at session 0-D-7b. Despite having memories about multi-role scrutiny and fixing all findings, I skipped reading the session block, didn't create tasks from the WORK section, and was about to start coding without the 4-LOOP or /prism-review. The user caught this and correctly identified that advisory guidance (memories, CLAUDE.md bullet points) is not enough — I rationalize past soft instructions. This pattern had likely been happening in earlier 0-D sessions too.

**How to apply:**
1. When the user says "work on session X" or you pick up from HANDOFF.md, your FIRST action is to READ the session block from v24 roadmap — not start coding
2. CREATE TASKS from the WORK section before writing any code
3. After building each unit, run /prism-review BEFORE moving to the next unit
4. The review-gate.sh hook will mechanically block you after 3 engine edits without review — this is intentional, not a bug to work around
5. Check the EXIT GATE checklist before running /compact
6. "It's a simple change" is never a reason to skip scrutiny — simple changes are where bugs hide
