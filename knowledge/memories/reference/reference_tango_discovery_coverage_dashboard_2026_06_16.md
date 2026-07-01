---
name: reference_tango_discovery_coverage_dashboard_2026_06_16
description: tango built scripts/discovery-coverage-dashboard.mjs (8/8) -- one command composing the 3 coverage layers (engine/dispatcher/algorithm) into a unified snapshot with the actionable-orphan rollup. Capstone of the coverage-tool family. slot tango 2026-06-16.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.218Z
aliases: reference_tango_discovery_coverage_dashboard_2026_06_16
---


**TANGO DISCOVERY-COVERAGE-DASHBOARD (slot tango, 2026-06-16, commit `c38788ede8` + wiki `6f02a1ef90`)** — the capstone over the session's 3 standing coverage tools. Built in push-through mode (operator: "we have self compaction just always push through" -- R6: context growth is NOT a stop signal).

**TOOL:** `scripts/discovery-coverage-dashboard.mjs` + `.test.mjs`. ONE command for PRISM's full "built-but-unwired" picture, composing the exported pure cores of the layer tools (NO new coverage logic -- pure composition):
- **dispatcher -> index.ts**: `dispatcherCoverage()` -> 101/106 registered (95%), 5 dormant by class.
- **algorithm -> consumer**: `algorithmCoverage()` -> 108/121 wired (89%), 6 orphaned + 7 wire-exempt.
- **engine -> consumer**: reads the newest `state/shared/UNWIRED-ENGINE-AUDIT-*.json` sidecar (audit-unwired-engines walks 3800+ files, too heavy to re-run inline) -> 3781/3803 wired, 22 unwired.

Emits the genuinely-**ACTIONABLE rollup** (dispatcher register-`candidate`s + algorithm `orphaned` + engine unwired count) SEPARATE from exempt/skipped/safety/cross-lane -- so an owner sees the do-now set, not the full dormant pile. CLI `--json`. 8/8 node:test: injected-dep hermetic units (`findLatestEngineAudit` newest-by-mtime, `readEngineCoverage` sidecar parse, `buildDashboard` composition + engine-unavailable path) + real-tree integration smoke.

**BUG caught on first run (R12 verify-on-disk):** engine layer printed `-22/0 wired` -- `readEngineCoverage` read `counts.total` but the audit JSON key is `counts.totalCanonicalEngines` (3803). Fixed. Also noted the audit re-ran 21->22 unwired between iters (dashboard reads LIVE, so it self-corrects).

**WIKI (doc-reflection):** `knowledge/wiki/architecture/discovery-coverage-tools.md` (`6f02a1ef90`) indexes the whole family + distinguishes each layer from the `/dispatcher-coverage` SKILL (engine fan-out heatmap) and `hub-blast-radius-rank` (importance, not coverage). The session's coverage tools now have a discoverable home.

**Coverage-tool family complete (this session):** engine-wiring (audit-unwired-engines), dispatcher-registration (`ee2368d77b`), algorithm (`2e86620392`), hub-blast-radius (`10e6adc27f`), + this dashboard capstone + wiki. Sister: [[reference_tango_dispatcher_registration_coverage_2026_06_15]], [[reference_tango_algorithm_coverage_diff_2026_06_15]], [[reference_tango_unwired_engine_audit_2026_06_16]].
