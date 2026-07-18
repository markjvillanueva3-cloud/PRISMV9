---
title: Lathe GSD Protocol — domain session lifecycle (slot:whiskey)
type: architecture
status: active
tags: [lathe, gsd, protocol, session-lifecycle, whiskey, safety, workflow]
created: 2026-05-29
by: claude-57dfea65 (slot:whiskey)
---

# Lathe GSD Protocol — the whiskey domain session lifecycle

The turning-specific Get-Stuff-Done order-of-operations, from orient → emit → ship → close. Source of truth: **`mcp-server/src/engines/lathe/GSD.md`** (the galaxy's 5th brain file, cascade-injects under `engines/lathe/`). This wiki entry is the discoverable pointer + rationale; read GSD.md for the full sequence.

## Why a domain GSD (not just the root GSD)
The root `mcp-server/data/docs/gsd/GSD_QUICK.md` covers fleet-wide session hooks. Lathe needs a domain layer because a turning program is **safety-critical** (a chuck spinning a part at CSS near a human) and the JM Die fleet is **100% Okuma OSP** — the generic flow doesn't encode the lathe pre-emit safety ritual or the Okuma-default. The GSD makes the ritual a checklist so no emit skips a gate.

## The 6 phases (GSD.md detail)
1. **Orient** — `/galaxy-verify-whiskey`, confirm Okuma-default, health-check the stack (map offline fallbacks BEFORE a dispatcher timeout).
2. **Before building** — dedup (~238 engines, `duplicationGuardEngine` THROWS), read `physics/constants.ts` (never inline), pick a unit.
3. **Pre-emit safety sequence** (non-negotiable, ordered) — workholding → part-off → predicate → spindle envelope (`prism_safety:check_spindle_torque`/`check_spindle_power`) → G50 cap → feed-mode → threading multi-pass → parting peck → sub-spindle phase → C-axis polar. Ω≥0.95, S(x)≥0.98.
4. **Validate ladder** — `/lathe-lint` (offline, ms) → quality rubric → MCP `lathe_validate_program` (when up) → Cpk.
5. **Ship** — Okuma master-post → `/ship-lathe`.
6. **Close** — per-file scrutiny → 3-of-3 → `[whiskey]` commit → doc-reflect 4 surfaces → handoff.

## Offline-first reality
MCP (3100) / Ollama / qdrant are frequently down. The GSD's §8 degradation table routes every "want" to an offline fallback — most importantly `/lathe-lint` (deterministic, MCP-independent) as the validate pre-flight. This is why the linter exists: [[lathe-program-lint]].

## Domain failure modes baked in (GSD §7)
The 5+1 mined R12 lessons that the GSD tells you to never repeat: annotation-pass≠machining-improvement, comment-strip-before-scan, empty-source-classification, AB-locator-base-name-priority, B-versions-are-AI, `lathe_spindle_*`-IDs-don't-exist.

## Related
- Source: `mcp-server/src/engines/lathe/GSD.md`
- [[lathe-galaxy]] · [[lathe-safety-gates]] · [[lathe-okuma-dialect]] · [[lathe-program-lint]]
- [[reference_jm_die_is_okuma_heavy_implications_2026_05_27]] · [[feedback_whiskey_g50_css_cap_mandatory]]
