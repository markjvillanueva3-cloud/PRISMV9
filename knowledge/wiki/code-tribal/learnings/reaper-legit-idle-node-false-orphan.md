---
title: A legit idle fleet node.exe looks exactly like an orphan (RSS=0 / sub-5MB)
type: code-tribal
galaxy: fleet-hygiene
slot: golf
created: 2026-06-11
tags: [reaper, orphan, false-positive, node, stale-node-hunter, ancestry]
---

# Tribal: low-RSS is NOT an orphan signal

**Incident (2026-06-11):** `stale-node-hunter findStaleOrphanedNodes` (`01220f8a5f`) reaped **legitimate** idle fleet `node.exe` processes across all slots, causing work loss. Operator hard-disabled the whole reaper fleet (`PRISM_FLEET_REAPER_DISABLE=1` + `PRISM_GOLF_GUARDIAN_DISABLE=1`).

**Why it fired wrongly:** an idle-but-live fleet node (a parked hook host, an MCP server between requests, a waiting worker) presents with **RSS=0 or sub-5MB** — identical to a genuinely-abandoned orphan. Low memory + low CPU is **not** orphan evidence.

**The only safe orphan signal is ancestry** (already golf doctrine, [[feedback_golf_ancestry_orphan_reaping]]): no live `claude.exe` anywhere in the parent chain. A single-level parent check or a memory/age heuristic misclassifies.

**Hardening required before re-enable** (golf co-#1 P0):
1. **cmdline-allowlist** — never reap a node whose command line matches a known fleet pattern (hook host, MCP launcher, mining/embedding driver — see the reaper PROTECT regex + `PRISM_REAPER_PROTECT_EXTRA`).
2. **higher age-floor** — idle ≠ dead; require a longer continuous-candidacy window (confirm-after-N-ticks).
3. **deeper ancestry confirmation** — full walk to a live `claude.exe`, not immediate parent.

**Rule:** reap on **confirmed-orphan ancestry only**. RSS/age are tie-breakers AFTER ancestry says orphan, never the trigger. See [[feedback_reapers_disabled_2026_06_11]] · [[reference_golf_inventory_of_record_2026_06_11]].
