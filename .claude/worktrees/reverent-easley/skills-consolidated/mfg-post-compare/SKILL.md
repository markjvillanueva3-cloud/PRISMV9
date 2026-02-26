---
name: Post-Processor Output Comparator
description: Compare post-processor outputs across controllers
---

## When To Use
- When comparing the same toolpath posted to different controllers
- When validating post-processor consistency across machines
- When batch-checking multiple post outputs for a job
- NOT for comparing program versions — use mfg-dnc-compare instead
- NOT for translating between controllers — use mfg-post-translate instead

## How To Use
```
prism_intelligence action=ppg_compare params={
  programs: ["O1001_fanuc", "O1001_siemens", "O1001_haas"],
  compare_mode: "functional"
}
```
```
prism_intelligence action=ppg_batch params={
  toolpath: "pocket_rough_01",
  controllers: ["Fanuc_0i", "Siemens_840D", "Haas_NGC", "Okuma_OSP"]
}
```
```
prism_intelligence action=ppg_controllers params={}
```

## What It Returns
- Side-by-side comparison of key program elements
- Functional equivalence assessment across controllers
- Parameter differences (speeds, feeds, cycles used)
- Line count and complexity comparison
- Controller-specific feature utilization report

## Examples
- Input: `ppg_compare params={programs: ["O1001_fanuc","O1001_haas"], compare_mode: "functional"}`
- Output: Functionally equivalent — same toolpath, Haas uses G187 P1 smoothing (no Fanuc equiv), feed rates identical, Haas 8 lines shorter
- Input: `ppg_batch params={toolpath: "contour_finish", controllers: ["Fanuc_0i","Siemens_840D","Mazak_SmoothG"]}`
- Output: 3 programs generated — Fanuc 112 lines, Siemens 98 lines (CYCLE/CONTOUR), Mazak 104 lines. All functionally equivalent
