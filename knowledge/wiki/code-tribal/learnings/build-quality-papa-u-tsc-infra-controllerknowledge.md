# BUILD-QUALITY-PAPA/U-TSC-INFRA-CONTROLLERKNOWLEDGE — [MAIN-FORCE] [BUILD-QUALITY-PAPA]/U-TSC-INFRA-CONTROLLERKNOWLEDGE (slot:papa): clean tsc 183->179 (4 cleared) -- resolve the entangled GCodeDialect cascade (deferred twice as careful). Scoped property extraction to gCodeDialect:{} blocks ONLY (excludes sibling-metadata contaminants gCode/notes/letter that broke the prior bulk attempt), verified all 85 undeclared dialect props are string-valued G/M codes, declared them optional on GCodeDialect (workOffsetG56-G59, planes, C-axis, polar, smoothing, lathe threading, coolant, units, rotation, scaling, tcpMode, etc.) + added precise modeSpecificBehavior?: Record<string,{description?/zValues?/tappingCycle?/backBoring?/peckTapping?/advantages?:string[]}> to ControllerProfile (Hurco BNC/ISNC). All ADDITIVE optional fields -- no value fabricated, no type weakened. ControllerKnowledge 0 errors; zero regressions elsewhere.

**Commit:** `2acbe334cc68` · **By:** markjvillanueva3-cloud · **At:** 2026-06-17T14:04:42-05:00
**Tags:** build-quality-papa, u-tsc-infra-controllerknowledge, auto-distilled

## Subject
[MAIN-FORCE] [BUILD-QUALITY-PAPA]/U-TSC-INFRA-CONTROLLERKNOWLEDGE (slot:papa): clean tsc 183->179 (4 cleared) -- resolve the entangled GCodeDialect cascade (deferred twice as careful). Scoped property extraction to gCodeDialect:{} blocks ONLY (excludes sibling-metadata contaminants gCode/notes/letter that broke the prior bulk attempt), verified all 85 undeclared dialect props are string-valued G/M codes, declared them optional on GCodeDialect (workOffsetG56-G59, planes, C-axis, polar, smoothing, lathe threading, coolant, units, rotation, scaling, tcpMode, etc.) + added precise modeSpecificBehavior?: Record<string,{description?/zValues?/tappingCycle?/backBoring?/peckTapping?/advantages?:string[]}> to ControllerProfile (Hurco BNC/ISNC). All ADDITIVE optional fields -- no value fabricated, no type weakened. ControllerKnowledge 0 errors; zero regressions elsewhere.

## Body
```
[MAIN-FORCE] [BUILD-QUALITY-PAPA]/U-TSC-INFRA-CONTROLLERKNOWLEDGE (slot:papa): clean tsc 183->179 (4 cleared) -- resolve the entangled GCodeDialect cascade (deferred twice as careful). Scoped property extraction to gCodeDialect:{} blocks ONLY (excludes sibling-metadata contaminants gCode/notes/letter that broke the prior bulk attempt), verified all 85 undeclared dialect props are string-valued G/M codes, declared them optional on GCodeDialect (workOffsetG56-G59, planes, C-axis, polar, smoothing, lathe threading, coolant, units, rotation, scaling, tcpMode, etc.) + added precise modeSpecificBehavior?: Record<string,{description?/zValues?/tappingCycle?/backBoring?/peckTapping?/advantages?:string[]}> to ControllerProfile (Hurco BNC/ISNC). All ADDITIVE optional fields -- no value fabricated, no type weakened. ControllerKnowledge 0 errors; zero regressions elsewhere.
```

## Files touched (2)
- mcp-server/src/engines/ControllerKnowledgeEngine.ts | 114 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 1 file changed, 114 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 2acbe334cc68`
- Milestone envelope: `mcp-server/data/milestones/BUILD-QUALITY-PAPA.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._