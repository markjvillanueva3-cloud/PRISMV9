---
name: reference_vault_ambiguous_links_deliberate_residual_2026_06_19
description: "The 10 residual \"ambiguous broken links\" vault-health reports are a DELIBERATE, tested residual (link-doctor's never-guess-which-category-is-canonical policy) — NOT a defect, NOT safely auto-fixable. Don't re-investigate or flip the invariant."
type: reference
slot: alpha
galaxy: token-optimization
source: prism-memory
synced: 2026-06-27T20:30:47.250Z
aliases: reference_vault_ambiguous_links_deliberate_residual_2026_06_19
---


`scripts/vault-health.mjs` reports `ambiguous broken links: 10 (captured)` every run as an **`info`** item (severity info, NOT warn) — sourced from `state/shared/vault-ambiguous-links-report.json` (regen: `node scripts/vault-link-doctor.mjs --ambiguous`). This is a **deliberate residual, not a backlog item.**

**Why they survive auto-heal (verified 2026-06-19, slot:alpha):** `classifyBrokenTarget` (`scripts/vault-link-doctor.mjs:188-216`) deranks three non-canonical buckets — mirror/stub (`galaxies/`,`triplet-stubs/`,`_legacy-root/`), test-docs (`tests/`), and same-dir separator-variants (kebab collapse) — then **refuses to auto-pick any cross-dir/cross-section rivalry**. That refusal is a deliberate, tested conservative policy: `scripts/vault-link-doctor.test.mjs:158` (`"never guess which category is canonical"`) + `:177-184` (`"category-dir dups have no kebab tell -> stay ambiguous, never auto-picked"`). Author: sierra (vault-ops domain owner).

**The 10 break down as (all require "guess which category/section is canonical" → correctly left ambiguous):**
- **4× engine category-vs-`other/`** — `psn_synergy_inspector_engine` (intelligence vs other), `code-system-index-engine` ×3 (calc vs other). The `engines/other/` bucket is the auto-gen catch-all; the categorized sibling is *probably* canonical, BUT healing it reverses the tested `:177` invariant.
- **1× cross-section** — `duplication_guard_discipline` (`wiki/architecture/` vs `wiki/code-tribal/`), from a `node_tribal_*` source.
- **3× folder-targets** — `[[tribal/]]`, `[[sessions/]]` (dir links, 3 genuinely-different candidate notes each).
- **2× monolith-phase** — `prism_bridge`, `prism_ml` (same basename across `complete-extraction/`/`integration/`/`mega/` phases).

**Action for future chats:** do NOT treat the `ambiguous: 10` line as a fix-me. An `engines/other/`-deprioritization derank *could* heal the 4 engine cases (low risk — both candidates are the same engine's doc), but it **contradicts sierra's tested "never guess which category is canonical" policy** and is a cross-domain (sierra-owned) decision — surface to sierra, never unilaterally flip. See [[feedback_conflict_fork_rule]] · the don't-soften-gates discipline. vault-ops is well-hardened; this residual is working-as-intended.
