---
name: DNC Program Generator
description: Generate DNC program files for CNC machine transfer
---

## When To Use
- When generating a DNC-ready program file from process parameters
- When preparing CNC programs for machine transfer
- When packaging G-code with program headers and metadata
- NOT for post-processor translation — use mfg-post-translate instead
- NOT for sending programs to machines — use mfg-dnc-send instead

## How To Use
```
prism_intelligence action=dnc_generate params={
  program_id: "O1001",
  controller: "Fanuc_0i-MF",
  operations: ["face", "pocket_rough", "pocket_finish", "drill"],
  material: "6061-T6",
  include_header: true,
  include_comments: true
}
```

## What It Returns
- Complete DNC program file content
- Program header with job info, date, revision
- Operation blocks with inline comments
- Tool change sequences with safety moves
- Program statistics (line count, estimated run time)

## Examples
- Input: `dnc_generate params={program_id: "O2001", controller: "Fanuc_0i", operations: ["face","profile","drill_4x"]}`
- Output: 186-line program, 3 tool changes, G43/G49 height comp, safe Z retracts, estimated 22 min run time

- Input: `dnc_generate params={program_id: "O3001", controller: "Siemens_840D", operations: ["turn_od","groove","thread"]}`
- Output: 124-line Siemens format program with CYCLE95 roughing, CYCLE93 grooving, CYCLE97 threading
