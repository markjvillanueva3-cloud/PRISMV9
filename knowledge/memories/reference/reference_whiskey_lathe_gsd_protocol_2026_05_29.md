---
name: reference-whiskey-lathe-gsd-protocol-2026-05-29
description: slot:whiskey lathe-domain GSD session-lifecycle protocol (mcp-server/src/engines/lathe/GSD.md, galaxy 5th brain file) — orient→emit→ship→close, offline-first, the pre-emit safety ritual.
type: reference
slot: whiskey
source: prism-memory
synced: 2026-06-27T20:30:47.259Z
aliases: reference_whiskey_lathe_gsd_protocol_2026_05_29
---


slot:whiskey generated a lathe-domain **GSD (Get-Stuff-Done) session-lifecycle protocol** — the galaxy's 5th brain file `mcp-server/src/engines/lathe/GSD.md` (cascade-injects under `engines/lathe/`) — per the /goal "generate ... gsd protocols (specifically for your domain)". Complements the fleet-wide root `data/docs/gsd/GSD_QUICK.md` with the turning-specific layer.

**6 phases:** orient (`/galaxy-verify-whiskey` + Okuma-default + stack-health→offline-fallbacks) → before-build (dedup ~238 engines, read `constants.ts`) → **pre-emit safety sequence** (workholding → part-off → predicate → spindle-envelope `prism_safety:check_spindle_*` → G50 cap → feed-mode → threading multi-pass → parting peck → sub-spindle phase → C-axis polar; Ω≥0.95 S(x)≥0.98) → validate ladder (`/lathe-lint` offline → quality rubric → MCP `lathe_validate_program` → Cpk) → ship (Okuma master-post → `/ship-lathe`) → close (per-file scrutiny → 3-of-3 → `[whiskey]` commit → doc-reflect 4 surfaces → handoff).

**Offline-first doctrine (the key insight):** MCP 3100 / Ollama / qdrant are frequently down → GSD §8 routes every "want" to an offline fallback; `/lathe-lint` is the MCP-independent validate pre-flight. This is WHY the linter exists ([[reference_whiskey_lathe_lint_tooling_2026_05_29]]).

**Domain failure modes baked into §7** (never repeat): annotation-pass≠machining-improvement · comment-strip-before-scan · empty-source-classification · AB-locator-base-name-priority · B-versions-are-AI · `lathe_spindle_*`-IDs-don't-exist.

Companion surfaces: galaxy CLAUDE.md §8 "Domain rules (the lathe way)" + wiki [[lathe-gsd-protocol]]. Related: [[reference_jm_die_is_okuma_heavy_implications_2026_05_27]] · [[feedback_whiskey_g50_css_cap_mandatory]].
