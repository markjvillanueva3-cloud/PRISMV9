---
name: Post-Processor Validator
description: Validate post-processor output against controller syntax rules
---

## When To Use
- When checking G-code output for syntax errors before sending to machine
- When validating post-processor output matches controller requirements
- When auditing programs for unsafe or unsupported codes
- NOT for comparing programs — use mfg-dnc-compare instead
- NOT for translating between controllers — use mfg-post-translate instead

## How To Use
```
prism_intelligence action=ppg_validate params={
  program: "O1001",
  controller: "Fanuc_0i-MF",
  check_level: "strict"
}
```
```
prism_intelligence action=ppg_syntax params={
  controller: "Haas_NGC",
  codes: ["G43.4", "G68.2", "M19"]
}
```

## What It Returns
- Validation status (pass/warnings/errors)
- Line-by-line error list with severity and description
- Unsupported G/M code flags for the target controller
- Safety warnings (missing retracts, spindle-off, etc.)
- Syntax correction suggestions

## Examples
- Input: `ppg_validate params={program: "O1001", controller: "Fanuc_0i-MF", check_level: "strict"}`
- Output: 2 warnings — line 45 missing decimal point on F value, line 88 G43.4 not supported on 0i-MF (use G43). No errors

- Input: `ppg_syntax params={controller: "Siemens_840D", codes: ["G43", "G91.1", "M98"]}`
- Output: G43 maps to CYCLE800, G91.1 not available (use incremental AROT), M98 maps to CALL subprogram syntax
