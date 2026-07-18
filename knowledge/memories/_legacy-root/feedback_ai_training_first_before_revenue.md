---
name: feedback-ai-training-first-before-revenue
description: "Before any prism-revenue work begins, prioritize AI system training across ALL machining domains so the build draws on maximum knowledge from day one, instead of constantly updating after release."
metadata:  
source: prism-memory
synced: 2026-05-18T01:02:07.790Z
aliases: feedback_ai_training_first_before_revenue
---


When the fleet starts on the **prism-revenue** roadmap, **AI system training comes first** — across every machining domain (mill, lathe, wire, cad, cam) before revenue-facing features get built on top.

**Why:** the user wants the PRISM app to ship at its fullest potential right away rather than be a slow-drip of post-release feature updates. Training the per-domain AI engines (the SF-AI L1–L3 ladder, MillingAIUltraIntelligence, LatheMetaLearning, WEDMNeuralTraining, the FiveAxis AI suite, the tribal-knowledge corpus, the JM-DIE 76K print↔program training set) on the full available corpus before revenue build gives the revenue-facing components (SFC, Master Post, CAD-CAM AI) a complete knowledge base to query from launch.

**How to apply:**
- When the `/checkin-<slot> /loop` for an alpha/bravo/charlie/delta/echo/foxtrot chat picks up *revenue-themed* units, the slot should **first** rank its domain's AI-training units (LEARNING_LOOP stage in [[domain-pipeline-ms0]], the `*MetaLearning` / `*DeepLearning` / `*UltraIntelligence` engines from the FEATURE-GAP-AUDIT-MS0 unwired-engine backlog) and ship those AHEAD of the user-facing revenue features that depend on them.
- The JM-DIE archive (174K files: 76K blueprint↔program pairs in `_PART LIBRARY/`, 16.5K Okuma `.min` lathe programs, 4K WEDM Mastercam projects, the macro-program corpus) is the canonical pre-revenue training set — get the ingestion pipelines wired before revenue work.
- Resources/ MIT-OCW courses + the v8.89 monolith's MIT kernels (`PRISM_NUMERICAL_METHODS_MIT`, `PRISM_NURBS_MIT`, `PRISM_ODE_SOLVERS_MIT`, `PRISM_CONTROL_SYSTEMS_MIT`, `PRISM_DFM_MIT`) are training inputs — re-modularize and feed before revenue depends on them.
- For each domain, the priority within revenue prep is: (1) corpus ingestion engine, (2) `*MetaLearning` / `*DeepLearning` engine wired, (3) tribal-knowledge corpus loaded, (4) AI-strategy-selection engine producing real outputs, THEN revenue-facing UI on top.
- This is a **sequencing rule**, not a freeze on revenue work — but operators allocating units within a revenue session should weight AI-training units as P0, revenue UI as P1.

**Where this lives in the system:**
- The [[domain-pipeline-ms0]] config's LEARNING_LOOP stage per domain lists the relevant AI-training engines + their status (most are `partial` — built but unwired).
- FEATURE-GAP-AUDIT-MS0's `U-WIRE-BACKLOG-{mill,lathe,wire,academy,...}` units cover the unwired AI engines.
- Related: [[reference_feature_gap_audit_2026_05_17]], [[reference_juliett_12chat_allocation_2026_05_17]].


## Related
[[skills/checkin-|/checkin-]] • [[skills/loop|/loop]] • [[skills/bravo|/bravo]] • [[skills/charlie|/charlie]] • [[skills/delta|/delta]] • [[skills/echo|/echo]] • [[skills/foxtrot|/foxtrot]]