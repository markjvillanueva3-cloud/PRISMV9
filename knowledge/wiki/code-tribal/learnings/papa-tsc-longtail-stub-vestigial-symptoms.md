---
title: TSC long-tail errors are stub/vestigial/contract SYMPTOMS, not type bugs
slug: papa-tsc-longtail-stub-vestigial-symptoms
type: code-tribal/learning
slot: papa
date: 2026-06-18
tags: [tsc, build-quality, papa, fail-loud, R12, anti-band-aid, eventbus, oauth]
related:
  - build-quality-papa-u-tsc-wedm-setupsheet
  - reference_audit_comment_strip_footgun_2026_06_18
  - "[[feedback_check_units_first]]"
---

# TSC long-tail errors are stub / vestigial / contract SYMPTOMS, not type bugs

**Lesson (papa, BUILD-QUALITY campaign, 2026-06-18).** Past the easy ~90% of a tsc
campaign, a "missing property" / type-mismatch error is usually NOT a type bug you can
green with a rename or cast. It is a **symptom** of one of: a **stubbed-out feature**, a
**vestigial integration** (code written against an API/event that no longer exists), or a
**contract decision** (two components disagree on a shape and someone must choose). Greening
these by band-aid **masks the real problem** — the exact "a green count drop that hides a
deeper problem is a lie" R12 trap.

## How to tell a symptom from a real type bug

For each long-tail error, before touching it:
1. **Read the producer type** (not just the consumer). Most "renames" are contract mismatches.
2. **Check for a publisher / caller / real value behind the missing member.** If the property,
   event, or method has **no producer anywhere**, the consumer is vestigial or the feature is
   a stub — a type fix would compile but the runtime is dead/wrong.
3. **Gate + regression-diff EVERY fix.** A clean fix clears exactly its own error and un-masks
   zero. A symptom-fix often un-masks N>1 (the cascade) or silently dead-ends.

## Worked cases from this session (papa §backlog, baseline tsc 89→87)

| Error | First look | Reality | Verdict |
|---|---|---|---|
| `RoadmapIntelligenceEngine:381` `category:"milestone"` not a `DecisionCategory` | "add to the union" | union feeds **3 exhaustive `Record<DecisionCategory,…>` maps** needing fabricated weights/rubrics (CASCADE trap). `category` is a **label** here (`decide()` reads only `problem.category`). | CLEAN: use an existing member (`"strategy"`). Shipped. |
| `JMDieProgramAnalyzer:435` `max_rpm` on `never` | "property missing" | TS over-narrows `let currentSpindle` to `null` at a self-reassignment in a loop; `max_rpm` **provably exists** on the declared type. | CLEAN: cast to declared shape (runtime-erased, behavior-identical; regression-diff 0 un-masking). Shipped. |
| `authHttp:18-20` OAuth fields missing on `OAuthConfig` | "rename fields" | `authHttp.ts` is a **STUB** (born in `0a3f083f0a` "add MCP barrel stubs"); its test `mcp-auth-http.test.ts` is **RED 2/2** (expects `buildMcpDiscoveryDocument(baseUrl)` + `{authentication:…}` + 7 OAuth routes; stub has none). | DEFER: a security-sensitive OAuth-HTTP **feature build**, not a tsc patch. Band-aid reverted. |
| `ReasoningChainSharing:662` 3-arg `eventBus.subscribe("puoa","chain_completed",h)` | "re-map to 2-arg API" | **VESTIGIAL**: no `EventTypes` member AND **no publisher** for `chain_completed` anywhere. A 2-arg re-map = a **silent-no-fire dead subscription**. | DEFER: feature-vs-remove judgment, not a type fix. |
| `python-api:261` `.search` on `TribalKnowledgeAdvisorEngine` | "add method" | engine offers only `query(ctx)`; route wants free-text `search(str)`. | DEFER: **contract decision** (build text-search vs remap route). |
| `AutomatedResourceHarvesting:482` `callDocumentAction` missing | "add method" | dispatcher exports only `registerDocumentLearningDispatcher`; no call API. | DEFER: **contract decision**. |

Two of six were genuinely clean (producer-type reconciliations) and shipped; the other four are
symptoms requiring an owner / security review / feature decision — deferred with specifics, not
band-aided.

## Rule

When the clean producer-type reconciliations are exhausted, **STOP fabricating green**. Route
the remaining errors to their owner with the *root cause* named (stub / vestigial / contract),
and re-gate next iteration. A 16GB-heap full gate (`NODE_OPTIONS=--max-old-space-size=16384
npx tsc --noEmit --incremental false`) + a regression-diff is the only honest "done" — never a
raw count drop. See `state/shared/specs/TSC-DEFER-ROUTING-2026-06-17.md` for the live routing.
