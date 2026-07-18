---
name: feedback-tango-schema-read-first
description: before believing a META/audit tool's surprising zero, read the schema of the file it parsed
type: feedback
source: prism-memory
synced: 2026-06-18T04:19:52.359Z
aliases: feedback_tango_schema_read_first
---


A META or audit tool that reports a surprising zero/empty result has very often assumed the wrong schema for the file it parsed (v1 fields vs v2 actual). This is tango's #1 recurring regression class (caught 2026-05-17 when `high-roi-skill-rank` read `j.totals.*` against a v2 schema that emits those fields top-level → reported a working route as "dead").

**Why:** discovery/audit tooling consumes JSON state files that evolve schema independently; a stale field-path silently yields a false negative, which then gets published as a "CRITICAL gap" and poisons history.

**How to apply:** when an audit tool says 0/empty/missing for something you expect to exist, FIRST `head`/probe the actual file's schema (look for `schemaVersion`, check whether keys are nested vs top-level) BEFORE reporting the finding. Schema-probe before assume. Related: [[reference-tango-discovery-engine-map-2026-05-29]].
