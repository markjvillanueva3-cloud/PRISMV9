---
name: DNC QR Code Generator
description: Generate QR code for program identification and machine loading
---

## When To Use
- When creating QR codes for CNC program identification on setup sheets
- When enabling quick program loading via barcode/QR scan at the machine
- When labeling fixtures or parts with program reference codes
- NOT for program transfer — use mfg-dnc-send instead
- NOT for program generation — use mfg-dnc-generate instead

## How To Use
```
prism_intelligence action=dnc_qr params={
  program_id: "O1001",
  machine: "Haas_VF2_01",
  include_metadata: true,
  format: "svg",
  size: 200
}
```

## What It Returns
- QR code image in requested format (SVG, PNG, base64)
- Encoded data content (program ID, machine, revision, date)
- Human-readable label text below code
- Scan URL for program retrieval if network-enabled
- Print-ready dimensions and resolution

## Examples
- Input: `dnc_qr params={program_id: "O1001", machine: "Haas_VF2_01", format: "svg"}`
- Output: SVG QR code encoding "O1001|VF2-01|rev3|2026-02-23", 200x200px, includes human-readable label "O1001 - VF2-01"

- Input: `dnc_qr params={program_id: "O5001", include_metadata: true, format: "png", size: 300}`
- Output: PNG QR code with embedded metadata (part name, material, tools required), 300x300px, print-ready at 150 DPI
