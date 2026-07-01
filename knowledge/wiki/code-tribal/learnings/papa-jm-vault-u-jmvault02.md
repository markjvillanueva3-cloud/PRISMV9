# PAPA-JM-VAULT/U-JMVAULT02 — [MAIN] [PAPA-JM-VAULT]/U-JMVAULT02 (slot:papa): JM shop-profile -> frontend machine ordering + deeper distillation + skill audit

**Commit:** `6a384c490203` · **By:** markjvillanueva3-cloud · **At:** 2026-06-12T12:28:23-05:00
**Tags:** papa-jm-vault, u-jmvault02, auto-distilled

## Subject
[MAIN] [PAPA-JM-VAULT]/U-JMVAULT02 (slot:papa): JM shop-profile -> frontend machine ordering + deeper distillation + skill audit

## Body
```
[MAIN] [PAPA-JM-VAULT]/U-JMVAULT02 (slot:papa): JM shop-profile -> frontend machine ordering + deeper distillation + skill audit

(b) DEEPER DISTILLATION -- jm-shop-knowledge-to-vault.mjs: + customer x machine cross-tab
(OMG->lathe 3945, JM Die Company->okuma 1193, ITW->lathe 997) + buildShopProfile() emits the
machine-readable signal state/shared/jm-shop-profile.json (ranked machines w/ pct, kinds,
machineKind, customerMachine) + published to mcp-server/web/public/ for the frontend. 5/5 tests.

(a) FRONTEND ADAPTATION -- the vault's shop-learning now visibly drives the UI:
  - mcp-server/web/src/data/shopUsageOrder.ts: pure, fail-soft helper mapping each MachineEntry
    to a usage weight from the profile (Okuma lathe = lathe+okuma volume = busiest). 7/7 tests.
  - SmartMachineSelector.tsx: fetches /jm-shop-profile.json once, orders the machine list by real
    shop usage (lathe/Okuma first) instead of fixed order. Fail-soft to fixed order on fetch fail.
    0 tsc errors in changed files.

(c) SKILL KEEP/DISABLE AUDIT -- state/shared/specs/SKILL-KEEP-DISABLE-AUDIT-2026-06-12.md: cluster
verdict (~99% KEEP: generated slot-wrappers + domain studios + dev tooling); the only DISABLE is
the 9-file version sprawl (forge2-6, rgs2-5) -> ARCHIVED to .claude/commands/_archive/ (local;
.claude/commands is gitignored). 4-way dedup resolved (project canonical; C:=H: mirror; slot copies
redundant). forge7 + rgs6 kept.
```

## Files touched (9)
- knowledge/memories/reference/reference_jm_shop_function_profile.md |  17 ++++
- mcp-server/web/public/jm-shop-profile.json                         | 345 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/web/src/__tests__/shopUsageOrder.test.ts                |  81 +++++++++++++++
- mcp-server/web/src/components/sfc/SmartMachineSelector.tsx         |  14 ++-
- mcp-server/web/src/data/shopUsageOrder.ts                          |  77 ++++++++++++++
- scripts/jm-shop-knowledge-to-vault.mjs                             |  60 ++++++++++-
- state/shared/jm-shop-profile.json                                  | 345 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- state/shared/specs/SKILL-KEEP-DISABLE-AUDIT-2026-06-12.md          |  40 ++++++++
- 8 files changed, 973 insertions(+), 6 deletions(-)

## Lessons surfaced in commit body
- tillation + skill audit
- TILLATION -- jm-shop-knowledge-to-vault.mjs: + customer x machine cross-tab

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 6a384c490203`
- Milestone envelope: `mcp-server/data/milestones/PAPA-JM-VAULT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._