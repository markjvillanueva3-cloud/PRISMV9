---
id: "wnc-063"
title: "Sub-Program Output Reduces File Size for Patterns"
source: "web:worknc-subprogram"
confidence: 89
category: "cam_strategy"
tags: ["sub-program", "patterns", "file-size", "memory"]
_source: "worknc-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.670Z
---

# Sub-Program Output Reduces File Size for Patterns

WorkNC's post can output repeated patterns as sub-programs (M98/M99 Fanuc, L-call Heidenhain) to reduce NC file size. Enable sub-program extraction for bolt-circle patterns, repeated pockets, and mirror operations. Set minimum repetition count to 3 before creating a sub-program. This is important for controllers with limited program memory and for programs with large pattern counts.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:worknc-subprogram
**Operations:** general

## Related
- [[camworks-cam-tips-cw-089|Sub-Program Output — Reduce G-Code File Size for Pattern Operations]]
- [[esprit-cam-tips-esp-076|Sub-Program Output for Repeated Patterns]]
- [[gibbscam-cam-tips-gc-080|Sub-program output reduces file size for repeated operations and patterns]]
- [[solidcam-cam-tips-sc-086|GPP Sub-Program Generation — Reduce G-Code File Size for Repeated Features]]
- [[topsolid-cam-tips-ts-070|Sub-Program Output for Repeated Patterns]]
