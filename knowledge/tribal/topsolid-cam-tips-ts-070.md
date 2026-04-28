---
id: "ts-070"
title: "Sub-Program Output for Repeated Patterns"
source: "web:topsolid-subprogram"
confidence: 89
category: "cam_strategy"
tags: ["sub-program", "patterns", "program-size", "post-processor"]
_source: "topsolid-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.439Z
---

# Sub-Program Output for Repeated Patterns

TopSolid's post-processor can output repeated toolpath patterns as sub-programs (M98/M99 on Fanuc, L-calls on Heidenhain) to reduce program file size and improve readability. Enable sub-program extraction for: bolt-circle drilling patterns, repeated pocket features, and mirror operations. Set the minimum repetition count to 3 before the post creates a sub-program. This is especially important for controllers with limited program memory.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:topsolid-subprogram
**Operations:** general

## Related
- [[camworks-cam-tips-cw-089|Sub-Program Output — Reduce G-Code File Size for Pattern Operations]]
- [[esprit-cam-tips-esp-076|Sub-Program Output for Repeated Patterns]]
- [[catia-cam-tips-cat-074|Sub-Program Generation for Repeated Geometry Patterns]]
- [[gibbscam-cam-tips-gc-080|Sub-program output reduces file size for repeated operations and patterns]]
- [[worknc-cam-tips-wnc-063|Sub-Program Output Reduces File Size for Patterns]]
