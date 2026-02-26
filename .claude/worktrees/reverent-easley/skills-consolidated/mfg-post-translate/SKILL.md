---
name: Post-Processor Translator
description: Translate G-code between controller formats (Fanuc, Siemens, Haas, etc.)
---

## When To Use
- When converting a program from one controller format to another
- When moving jobs between machines with different controllers
- When generating controller-specific programs from generic toolpaths
- NOT for syntax validation — use mfg-post-validate instead
- NOT for program comparison — use mfg-post-compare instead

## How To Use
```
prism_intelligence action=ppg_translate params={
  program: "O1001",
  source_controller: "Fanuc_0i-MF",
  target_controller: "Siemens_840D",
  preserve_comments: true
}
```
```
prism_intelligence action=ppg_generate params={
  operations: ["face", "pocket", "drill"],
  controller: "Haas_NGC",
  options: { canned_cycles: true, sub_programs: true }
}
```

## What It Returns
- Translated program in target controller format
- Translation notes for non-direct mappings
- Unsupported feature warnings requiring manual review
- Code mapping table (source G/M codes to target equivalents)
- Confidence rating per translated block

## Examples
- Input: `ppg_translate params={program: "O1001", source_controller: "Fanuc_0i", target_controller: "Siemens_840D"}`
- Output: Translated to Siemens format — G43 to D=, M98 to CALL, G83 to CYCLE83. 3 lines need manual review (custom macros)
- Input: `ppg_generate params={operations: ["adaptive_rough","finish"], controller: "Mazak_SmoothG"}`
- Output: Mazak Conversational + EIA hybrid program, MAZATROL headers, G10.9 smoothing enabled, 96 lines
