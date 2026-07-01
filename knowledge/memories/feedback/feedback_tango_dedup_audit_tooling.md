---
name: feedback-tango-dedup-audit-tooling
description: before writing a new audit/discovery script, check the existing audit-*.mjs family — dedup the tooling
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.446Z
aliases: feedback_tango_dedup_audit_tooling
---


The discovery domain is itself prone to duplication: N audit scripts each measuring the same metric slightly differently is a real drift class ("multi-audit-tool drift"). Tango must hold itself to the same dedup discipline it enforces on others.

**Why:** two coverage scanners that disagree on the same number make every downstream surface untrustworthy (the BUILD_STATE-vs-viz-headline split was exactly this). More audit tools ≠ more truth.

**How to apply:** before writing any new `audit-*.mjs` / discovery script, `Glob scripts/audit-*.mjs` and run `node scripts/dev-tool-conflict-detector.mjs` to see if an existing tool covers the case or already writes the target file. Extend the existing one; only fork with a stated reason. Same `duplicationGuardEngine.mustCheckBeforeCreating()` rule applies to scripts, not just engines.
