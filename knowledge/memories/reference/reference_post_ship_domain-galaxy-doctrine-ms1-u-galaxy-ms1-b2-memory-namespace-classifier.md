---
name: reference_post_ship_domain-galaxy-doctrine-ms1-u-galaxy-ms1-b2-memory-namespace-classifier
description: Auto-distilled learnings from shipping DOMAIN-GALAXY-DOCTRINE-MS1/U-GALAXY-MS1-B2-MEMORY-NAMESPACE-CLASSIFIER (commit 0b905a6c5). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.234Z
aliases: reference_post_ship_domain-galaxy-doctrine-ms1-u-galaxy-ms1-b2-memory-namespace-classifier
---


# DOMAIN-GALAXY-DOCTRINE-MS1/U-GALAXY-MS1-B2-MEMORY-NAMESPACE-CLASSIFIER

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [DOMAIN-GALAXY-DOCTRINE-MS1]/U-GALAXY-MS1-B2-MEMORY-NAMESPACE-CLASSIFIER (slot:alpha iter27 yolo — sierra-territory skeleton): HMEMV05 memory-router intercept classifier shim per SCOPE-EXPANSION §Q6 #2. NEW scripts/lib/memory-namespace-classifier.mjs (113L) — pure-function classifyNamespace({key,value,slot,sessionId}) → {namespace,target,confidence,reason}. Routes to 4 canonical namespaces: universal (cross-cutting standing doctrine), galaxy:<name> (domain-specific via 13-galaxy keyword map), slot-soul:<slot> (personality/refuse-list), ephemeral:<sessionId> (TTL-eligible scratch state). Precedence: ephemeral (key prefix) > slot-soul (soul: marker) > universal (feedback_* doctrine markers) > galaxy (keyword 2x-dominance) > fallback universal (closes the default-namespace gap). NEW scripts/lib/memory-namespace-classifier.test.mjs (60L) — 13/13 tests PASS hermetic via node --test. Tests cover: NAMESPACE_KINDS export, 6 ephemeral prefixes, 2 slot-soul patterns, 2 universal-doctrine markers, 4 per-galaxy classifications (mill/lathe/quoting/business), ambiguous-tie fallback, no-match fallback, precedence resolution (ephemeral > galaxy, slot-soul > universal+galaxy). One test caught a wrong-assertion error (mill+lathe+turning has lathe-dominance 2:1 not tie — fixed test to use true-tie mill+lathe input, per R12 fail-loud / Karpathy 'never weaken assertion just to pass'). Sierra integrates into memoryStoreEngine via classifyNamespace + namespace-targeted SQLite table. Cumulative this session: 43 commits + 83 passing tests ~5380L. **22 of 26 MS1 units now complete.**

**Shipped:** 2026-05-26T21:37:29-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[domain-galaxy-doctrine-ms1-u-galaxy-ms1-b2-memory-namespace-classifier]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._