---
name: Fix all scrutiny findings, not just CRITICALs
description: During 3-loop scrutiny, fix ALL findings (CRITICAL + HIGH + MEDIUM) — do not dismiss any as "pre-existing" and move on
type: feedback
---

Fix every physics/wiring/test finding during scrutiny, regardless of severity. Do not cap at 3 fixes.

**Why:** User noticed a pattern where I consistently fix exactly ~3 CRITICAL issues, label remaining HIGH/MEDIUM findings as "pre-existing," and move to the next unit. This creates a backlog of real bugs that never gets addressed. "Pre-existing" is not an excuse to skip a fix — the engine is being wired NOW, so NOW is the time to fix it.

**How to apply:** When scrutiny agents return findings:
1. Fix ALL CRITICAL, HIGH, and MEDIUM findings — not just the top 3
2. Do not label issues "pre-existing" to justify skipping them
3. If a fix is genuinely out of scope (e.g., requires a new engine or architectural change), explain WHY it can't be done in this session, don't just wave it away
4. Run regression tests after each batch of fixes
