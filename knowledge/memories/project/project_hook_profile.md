---
name: hook-profile-runtime-gate
description: Runtime gate (PRISM_HOOK_PROFILE env var) that filters which advisory hooks fire. Adopts ECC_HOOK_PROFILE pattern from everything-claude-code (MIT).
type: project
originSessionId: 2a125756-5751-4129-a9cc-b48330e2b9d8
---
# PRISM_HOOK_PROFILE — runtime hook gate

`.claude/helpers/hook-profile.mjs` exports `shouldSkipHook(name)`. Profiles:

| Profile | Behaviour |
|---------|-----------|
| `minimal` | Only hard-blocks + safety-critical hooks fire (allowlist, see below) |
| `standard` (default) | Current production — everything not explicitly disabled |
| `strict` | Everything fires |

**Override env:** `PRISM_DISABLED_HOOKS=hook-a,hook-b` — forces skip regardless of profile.

**MINIMAL_ALLOWLIST (always fires):**
- code-completeness-gate, duplication-hard-block, anti-pattern-detector, test-legitimacy
- ban-facade-patterns, settings-json-addonly-guard, edit-old-string-verify, file-claim-guard
- inventory-check-guard, master-index-search-gate, dedup-auto-invoke
- always-build-guard, enforce-handoff-topic
- **scrutinize-before-stop** (universal review enforcement)

**Currently gated advisory hooks** (will skip under `minimal`):
- discipline-expert-inject, coding-pattern-hint, pretool-context-forecast, mcp-route-suggest, prism-awareness-v2

**Why it exists:** Token economy. The gated 5 hooks emit large additionalContext blocks (especially discipline-expert-inject at 1033 lines with 18 discipline directives). For routine refactors / doc edits where the discipline injection adds no value, set `PRISM_HOOK_PROFILE=minimal` to drop ~600 tokens per UserPromptSubmit.

**Skill:** `/hook-profile-set` — view/change profile or disabled list.

**Tests:** `.claude/helpers/hook-profile.test.mjs` (20 tests including the universal-enforcement guarantee for scrutinize-before-stop).

**Shipped commit:** `e60b7d151` + `acd14b47a` (allowlist hardening).
