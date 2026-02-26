---
name: DNC Transfer Verifier
description: Verify DNC program transfer integrity with checksum validation
---

## When To Use
- When verifying a program was transferred correctly to a CNC machine
- When validating program integrity after network transfer
- When performing pre-run verification checks on loaded programs
- NOT for comparing program versions — use mfg-dnc-compare instead
- NOT for syntax validation — use mfg-post-validate instead

## How To Use
```
prism_intelligence action=dnc_verify params={
  program_id: "O1001",
  source: "server",
  destination: "Haas_VF2_01",
  method: "checksum",
  verify_line_count: true
}
```

## What It Returns
- Verification status (pass/fail)
- Checksum comparison (source vs destination)
- Line count verification result
- Character encoding check
- Byte-level integrity report with mismatch locations if failed

## Examples
- Input: `dnc_verify params={program_id: "O1001", source: "server", destination: "Haas_VF2_01"}`
- Output: PASS — CRC32 match (0xA3F2B1C4), 186/186 lines, 4218/4218 bytes, UTF-8 encoding confirmed

- Input: `dnc_verify params={program_id: "O3001", source: "cam_output", destination: "DMG_DMU50_03"}`
- Output: FAIL — line count mismatch (124 source, 122 destination), 2 lines truncated at position 118-119, likely serial buffer overflow
