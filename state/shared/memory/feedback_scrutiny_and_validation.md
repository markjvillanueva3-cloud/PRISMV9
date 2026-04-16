---
name: Multi-role scrutiny and real-world validation
description: Every review point needs 3-10 agent team scrutiny. Tests must compare against manufacturer data. Fix ALL findings.
type: feedback
---

Three related feedback items the user has reinforced multiple times:

## 1. Multi-Role Scrutiny at Every Review Point
Launch 3-10 specialist agents (domain-adaptive) via /prism-review after completing units. Agent pools: PHYSICS (machinist, physicist, numerics), CAM (CNC programmer, post dev), BUSINESS (shop mgr, accountant), QUALITY (QE, metrologist), INFRA (API architect, test eng).

## 2. Real-World Validation
Tests must compare computed values against manufacturer published data (Sandvik, Kennametal, Seco, etc.). A test that only checks "output is a number" is worthless. Every physics engine test should verify accuracy against known-good values.

## 3. Fix ALL Findings (CRITICAL + HIGH + MEDIUM)
During 3-loop scrutiny, fix every finding regardless of severity. Do NOT:
- Cap at ~3 fixes and move on
- Label issues "pre-existing" to justify skipping them
- Dismiss MEDIUM findings as unimportant
If a fix is genuinely out of scope, explain WHY — don't just wave it away.

**Why:** User noticed a pattern where only ~3 CRITICALs get fixed while HIGH/MEDIUM issues accumulate. "Pre-existing" became an excuse to skip real bugs. Manufacturing software has no room for accumulated debt.

**How to apply:** Run scrutiny, fix everything, run regression tests, verify clean. Only then move to next unit.
