---
name: warn-gcode-no-safe-start
enabled: true
event: file
action: warn
conditions:
  - field: file_path
    operator: regex_match
    pattern: (PostProcessor|GCodeTemplate|LathePostProcessor)Engine\.ts$
---

**[warn-gcode-no-safe-start]**
**G-code generation engine modified - verify safe start block compliance.**

All G-code generation must include controller-specific safe start blocks. Before proceeding:

1. **Verify** every controller dialect emits a safe start block: `G90 G80 G40 G49 G17 G94` (Fanuc/Haas/Mazak), `G90 G40 G17 G94` (Siemens), `G90 G40 G17` (Heidenhain)
2. **Check** that G94 (feed per minute) is explicitly set - omitting it defaults to G95 on some controllers, causing crashes
3. **Verify** M05 (spindle stop) and M09 (coolant off) are in the program footer
4. **Ensure** tool length compensation (G43/G49) is properly managed around tool changes
5. **Run** the post-processor tests: `npx vitest run src/__tests__/post-processor-engines.test.ts`
