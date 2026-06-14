---
name: reference_post_ship_domain-galaxy-doctrine-ms1-u-galaxy-ms1-a2
description: Auto-distilled learnings from shipping DOMAIN-GALAXY-DOCTRINE-MS1/U-GALAXY-MS1-A2 (commit aa4b5292f). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.229Z
aliases: reference_post_ship_domain-galaxy-doctrine-ms1-u-galaxy-ms1-a2
---


# DOMAIN-GALAXY-DOCTRINE-MS1/U-GALAXY-MS1-A2

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [DOMAIN-GALAXY-DOCTRINE-MS1]/U-GALAXY-MS1-A2+B4-IMPL (slot:alpha iter25 final-push): 2 implementation ships per MS1 envelope. (A2) NEW .claude/hooks/pre-create-marketplace-dup-check.mjs (113L T2) — PreToolUse:Write hook fires only on new-asset creation paths (.claude/{commands,hooks,skills,agents}/ + mcp-server/src/engines/<NewEngine>.ts), derives proposed-name, fuzzy-matches against 25-plugin marketplace inventory cache (exact + substring), emits install-instead-of-build advisory per SCOPE-EXPANSION §Q5 policy. Fail-soft. Wiring deferred to settings.json. (B4) NEW scripts/fix-broken-wikilinks.mjs (89L) — broken-wikilink classifier+fixer per SCOPE-EXPANSION §Q6 #4. NEVER auto-deletes/creates. RAN LIVE: 51849 .md files scanned, 90820 names indexed, 3344 dangling [[refs]] found, classified into 3 buckets — 67 aliasable (safe snake↔kebab fixes), 1279 create-stub (N≥2 refs = real gaps), 1998 delete-orphan (N=1 = likely typos). Output: state/shared/broken-wikilink-routing.json for operator bucket-by-bucket approval. Cumulative this session: 33 commits + 1 live settings.json + 10089+51849 live-classifier outputs + 70 passing tests ~4380L. **14 of 26 MS1 units now complete (E2 + F1 + F2 + F3 + G2 + G3 + G4 + I1 + baseline + C1 + T1 + T2 + A2 + B4).**

**Shipped:** 2026-05-26T21:16:54-05:00 by markjvillanueva3-cloud
**Files:** 4 touched

Full distillation: [[domain-galaxy-doctrine-ms1-u-galaxy-ms1-a2]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._