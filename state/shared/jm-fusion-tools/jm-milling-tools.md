# JM Milling Tools — Fusion 360 Library

Generated: 2026-05-24T06:51:39.609Z
Source: `scripts/extract-jm-milling-tools-fusion.mjs`

## Summary

- Brand catalogs scanned: **30**
- Total tools scanned: **41137**
- Milling tools extracted: **15994**

## By brand

| Brand | Milling tool count |
|---|---:|
| ISCAR | 5449 |
| OSG | 3598 |
| unknown | 3376 |
| YG-1 | 2517 |
| Sandvik | 1286 |
| Accupro | 1224 |
| Seco | 1224 |
| Guhring | 688 |
| Emuge | 8 |

## How to import into Fusion 360

1. Open Fusion 360 → Manage tab → Tool Library
2. Local → Right-click → Import → select `jm-milling-tools.tools`
3. Tools appear under the imported library — drag into Cloud or a Project library as needed.

## Provenance

Source catalogs: all `mcp-server/src/data/*-tools-extracted.json` + `*-tools.json` filtered to milling types (endmill / ballmill / facemill / chamfermill / bullnose / slotmill / threadmill / formmill / tapered). Excludes drilling / tapping / boring / reaming / countersinking.
