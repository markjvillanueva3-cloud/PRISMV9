---
name: reference_post_ship_build-quality-papa-u-tsc-infra-batch5w13
description: Auto-distilled learnings from shipping BUILD-QUALITY-PAPA/U-TSC-INFRA-BATCH5W13 (commit 821dabd8b). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.787Z
aliases: reference_post_ship_build-quality-papa-u-tsc-infra-batch5w13
---


# BUILD-QUALITY-PAPA/U-TSC-INFRA-BATCH5W13

[MAIN-FORCE] [BUILD-QUALITY-PAPA]/U-TSC-INFRA-BATCH5W13 (slot:papa): clean tsc 184->183 -- ReasoningChain captureKnowledge->capture (call object exactly matches Omit<KnowledgeTip,id|created_at|usage_count>) + coordinated result-shape fix: capture() returns KnowledgeTip|null not {tip}, so null-guard (return extracted:false on duplicate/rejected -- behavior-CORRECT, was crashing on null.tip) + result.tip.id->result.id across all 4 sites. EventHandler subscribe-arity (now line 662) DEFERRED (needs eventBus publish-side event key).

**Shipped:** 2026-06-17T12:28:27-05:00 by markjvillanueva3-cloud
**Files:** 2 touched

Full distillation: [[build-quality-papa-u-tsc-infra-batch5w13]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._