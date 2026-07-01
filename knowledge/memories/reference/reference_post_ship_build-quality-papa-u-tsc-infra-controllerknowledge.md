---
name: reference_post_ship_build-quality-papa-u-tsc-infra-controllerknowledge
description: Auto-distilled learnings from shipping BUILD-QUALITY-PAPA/U-TSC-INFRA-CONTROLLERKNOWLEDGE (commit 2acbe334c). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.787Z
aliases: reference_post_ship_build-quality-papa-u-tsc-infra-controllerknowledge
---


# BUILD-QUALITY-PAPA/U-TSC-INFRA-CONTROLLERKNOWLEDGE

[MAIN-FORCE] [BUILD-QUALITY-PAPA]/U-TSC-INFRA-CONTROLLERKNOWLEDGE (slot:papa): clean tsc 183->179 (4 cleared) -- resolve the entangled GCodeDialect cascade (deferred twice as careful). Scoped property extraction to gCodeDialect:{} blocks ONLY (excludes sibling-metadata contaminants gCode/notes/letter that broke the prior bulk attempt), verified all 85 undeclared dialect props are string-valued G/M codes, declared them optional on GCodeDialect (workOffsetG56-G59, planes, C-axis, polar, smoothing, lathe threading, coolant, units, rotation, scaling, tcpMode, etc.) + added precise modeSpecificBehavior?: Record<string,{description?/zValues?/tappingCycle?/backBoring?/peckTapping?/advantages?:string[]}> to ControllerProfile (Hurco BNC/ISNC). All ADDITIVE optional fields -- no value fabricated, no type weakened. ControllerKnowledge 0 errors; zero regressions elsewhere.

**Shipped:** 2026-06-17T14:04:42-05:00 by markjvillanueva3-cloud
**Files:** 2 touched

Full distillation: [[build-quality-papa-u-tsc-infra-controllerknowledge]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._