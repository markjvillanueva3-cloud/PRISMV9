---
name: DNC Program Sender
description: Send or transfer DNC program to CNC machine
---

## When To Use
- When transferring a generated program to a CNC machine
- When managing DNC communication with the shop floor
- When queuing programs for machine loading
- NOT for program generation — use mfg-dnc-generate instead
- NOT for verifying transfer integrity — use mfg-dnc-verify instead

## How To Use
```
prism_intelligence action=dnc_send params={
  program_id: "O1001",
  machine: "Haas_VF2_01",
  protocol: "ethernet",
  verify: true,
  backup_existing: true
}
```

## What It Returns
- Transfer status (success/failure/queued)
- Transfer protocol used and connection details
- Checksum verification result if enabled
- Backup status of previous program on machine
- Transfer timestamp and file size confirmation

## Examples
- Input: `dnc_send params={program_id: "O1001", machine: "Haas_VF2_01", protocol: "ethernet"}`
- Output: Transfer successful via Ethernet/TCP, 186 lines, 4.2 KB, checksum verified, previous O1001 backed up

- Input: `dnc_send params={program_id: "O3001", machine: "DMG_DMU50_03", protocol: "cifs_share"}`
- Output: Program queued to CIFS share \\DMU50-03\programs\, available for machine load, 124 lines confirmed
