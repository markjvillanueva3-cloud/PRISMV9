---
name: reference_u_knowledge_link_audit_consumer_2026_05_21
description: "U-KNOWLEDGE-LINK-AUDIT-CONSUMER (echo /goal synergy iter 5) — SessionStart consumer for iter-4's weekly broken-link producer; threshold-gated drift digest; producer/consumer pair complete; clean commit attribution recovered"
aliases: reference_u_knowledge_link_audit_consumer_2026_05_21
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.001Z
---


**Iter 5 of the /goal synergize loop in echo slot (2026-05-21, session 88b0032d).** Closes the dormant Reviewer-B P1-1 from iter 4 ([[reference_u_knowledge_link_audit_wire_2026_05_20]]) — the iter-4 producer ran weekly but its 4136/97673 (4.2%) broken-link signal had no chat-visible surface. Shipped `H:/prism/.claude/hooks/knowledge-link-audit-inject.mjs` (159 LOC) + `.test.mjs` (210 LOC, 27/27 PASS incl real-data E2E against the live 680KB producer JSON) as commit `f4f6ca4bc7` (banner correctly credits slot:echo — recovery from the iter-4 misattribution class).

**Architecture (mirror of `substrate-health-inject` idiom):** T2 SessionStart hook with pure-core exports (`loadAudit`/`brokenRatio`/`pickTopBroken`/`formatDigest`) for hermetic testing via `isInvokedDirectly()` import-vs-script guard. Producer (iter-4 `auditKnowledgeLinks` Stop hook piggyback, content in `9416042d56`) runs weekly via `.knowledge-link-audit.lock` mtime throttle and writes `state/shared/.knowledge-link-audit.json`. Consumer reads it, gates on (a) threshold (default 0.02 = 2% ratio), (b) staleness (default 720h = 30d), (c) hostile-payload size (16MB cap, zero-size reject), then renders a 4-line digest with the top-3 broken samples.

**Wiring:** inserted between `awareness-snapshot-inject` and the typo-broken `substrate-health-inject` entry in `C:\Users\wompu\.claude\settings.json` SessionStart chain (auto-mirrored C:→H: by the `c-to-h-mirror` hook). The substrate-health typo (`"H:.claude\binportable-node"` — backslash-eaten slashes) is a pre-existing P1 latent bug NOT in this iter's lane; logged for a future targeted fix.

**Knobs:** `PRISM_KNOWLEDGE_LINK_AUDIT_INJECT=0` (disable), `PRISM_KNOWLEDGE_LINK_AUDIT_THRESHOLD=N` (ratio gate, accepts 0), `PRISM_KNOWLEDGE_LINK_AUDIT_TOPK=N` (default 3, accepts 0), `PRISM_KNOWLEDGE_LINK_AUDIT_STALE_HRS=N` (default 720, accepts 0).

## Per-file 2-of-2 scrutiny (post `U-REDUCE-AGENT-REVIEW`)

Both reviewers independently flagged the **same** P1-1 — the strong cross-validation signal the 2-of-2 doctrine is designed to surface:

> `Number(process.env.PRISM_KNOWLEDGE_LINK_AUDIT_THRESHOLD) || DEFAULT_THRESHOLD` silently overrides the legitimate value `0`. An operator setting `THRESHOLD=0` (intent: surface every broken link, e.g., during a wiki-rename cleanup pass) gets `0.02` instead. Same footgun on `TOPK=0` (intent: header-only, no sample bullets) and `STALE_HRS=0` (intent: always-stale silent, opt-out without unsetting `INJECT`).

**Fix:** replaced the three `|| DEFAULT` lines with `Number.isFinite()` guards, mirroring the pattern already used inside `formatDigest` at L102-105. Three anti-regression tests added (24→27 total) pin the env=0 contract so a future refactor can't silently regress it. The same pattern exists in `substrate-health-inject.mjs:L189` (TTL=0) but is benign there — TTL=0 has no operational meaning.

**P2/P3 — defer-OK:**
- `isInvokedDirectly()` is duplicated 1:1 from [[reference_substrate_health_inject_2026_05_19|substrate-health-inject]]. Promote to `scripts/lib/is-invoked-directly.mjs` when a third hook needs it (Karpathy rule: 2 occurrences = pattern, 3 = abstract). NOT now.
- `Number.toLocaleString()` without explicit locale (Windows en-US vs CI locale `C` may differ on thousands-separator). Cosmetic.
- No `schemaVersion` validation on producer JSON. Producer at 1.0.0 today; the shape-check + per-field `Number()`/`String()` coercion makes a future bump resilient. Add version-aware gate if 2.0.0 ships.
- `from`/`link` field length not capped — sibling hooks don't cap either; on-convention.

## What this completes

**6 of 8** /goal surfaces now actively flowing data via the Stop-hook substrate:
1. **handoff-prune** (cron, iter 0 — ECHO-UNDONE H6, commit `7fcbe2f720`)
2. **zulu-awareness producer** (iter 1, commit `4e7d2be81b`)
3. **capability-map consumer** (iter 2, commit `896c63847f`)
4. **knowledge-link-audit producer** (iter 4, content in `9416042d56` — misattributed)
5. **knowledge-link-audit CONSUMER** (iter 5, commit `f4f6ca4bc7` — clean attribution)

Producer/consumer pair #2 complete (after zulu-awareness producer/consumer in iters 1/2). Pattern: every iter-N producer should sprout an iter-(N+1) consumer in the next iteration, otherwise the producer is half-built data flow.

Remaining surfaces (iters 6-20): NN/GNN feedback consumer (avoid lane `claude-dbba2d72`), prism-ai ↔ obsidian-brain cross-feed, wiki ⇄ tribal cross-reference completeness, system-viz roost for the integrity ledger. Continue avoiding ZULU-HERMES-GAPS orchestrator sweep lane.

## Apply-in-future

- **Producer/consumer pair doctrine**: every new producer (Stop-hook piggyback writing JSON to `state/shared/`) needs an immediate consumer (SessionStart/UserPromptSubmit injector or systemMessage emit). A producer with no consumer is just `tee /dev/null` with extra steps — silent drift accumulates.
- **Single-line `-m` + explicit pathspec** is reproducibly clean attribution. The iter-4 misattribution (heredoc with `\n` in `-m` body got line-parsed as a pathspec → "did not match any file(s)" → peer absorbed) is recoverable in audit but never in the commit banner. Use single-line for the title, push detail to the per-iter memo.
- **Cross-reviewer same-finding = strong signal**, not weak. The 2-of-2 doctrine is designed to surface defects exactly one reviewer's heuristic misses. When BOTH catch the same P1, the fix is unambiguous (no merge-debate); when only ONE catches it, you have to weigh whether the other missed it or it's a false positive.
