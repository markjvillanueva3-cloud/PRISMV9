---
title: Discovery META-tool schema-read-blindness — read the schema before believing a zero
category: lessons
date: 2026-05-29
last_verified: 2026-05-29
author: claude-2c3adfc7
slot: tango
confidence: 0.9
tags: [discovery, meta-tool, schema, false-negative, audit, R12]
boost_keywords: [schema read blindness, meta tool, false zero, schemaVersion, audit false negative, schema drift]
links:
  - "[[architecture/duplication-guard-discipline]]"
  - "[[feedback-tango-schema-read-first]]"
---

# Discovery META-tool schema-read-blindness

The #1 recurring regression class for discovery/audit tooling: a META tool reports a surprising **zero / empty / missing** because it assumed the wrong schema for the file it parsed (v1 field-paths vs the v2 actual the producer now emits).

## The canonical incident (2026-05-17)

`high-roi-skill-rank.mjs` read `j.totals.{offloaded,keptOnClaude}` against an `ollama-offload-stats.json` schema (v2) that emits those fields **top-level**. Result: it reported `offloaded=0, ratio=n/a` against a *working* route (real: `offloaded=65, ratio=8.0%`). The "dead-route CRITICAL" finding was published — and 4 poisoned history entries propagated — before a peer reviewer caught it in the SAME session.

Recurred one day after juliett hit the identical class ("3 META-tool calculation bugs … assumed a schema without reading the file first"). Schema-read-first must be a **reflex, not a discipline**.

## The rule

When an audit/META tool says 0 / empty / missing for something you expect to exist:

1. STOP. Do not publish the finding.
2. `head` / probe the **actual** file: look for `schemaVersion`; check whether keys are nested (`j.totals.x`) vs top-level (`j.x`).
3. Make the reader schema-probe (`"totals" in j ? v1path : v2path`) and report which schema it matched.
4. Only then trust the number.

## Why it's load-bearing

Discovery output feeds roadmaps, ROI claims, and close-out decisions. A false negative here doesn't just waste a cycle — it poisons downstream history and triggers phantom "gap" work. The `/forge-audit-v2` peer-reviewer pattern is what catches it; keep that pattern hard. Sister rule: [[feedback-tango-schema-read-first]].
