# APPW Page Sweep Report

Generated: 2026-04-14T01:41:02.401Z
Status: `PASS`
Suites: routes, access, purchase, responsive, machine, customer, employee

## Summary
- Passed: 54
- Failed: 0
- Skipped/Not Run: 0

## Requested Suites
- `routes`
- `access`
- `purchase`
- `responsive`
- `machine`
- `customer`
- `employee`

## Spec Files
- `tests/page-sweep/appRouteSweep.spec.ts`
- `tests/page-sweep/roleAccessMatrix.spec.ts`
- `tests/page-sweep/purchaseIntelligence.spec.ts`
- `tests/page-sweep/responsiveSurface.spec.ts`
- `tests/page-sweep/machineCadSurface.spec.ts`
- `tests/page-sweep/machineWorkspace.spec.ts`
- `tests/page-sweep/customerDocument.spec.ts`
- `tests/page-sweep/employeeContinuity.spec.ts`

## Command
```powershell
H:\PRISM\mcp-server\web\node_modules\.bin\playwright.cmd test tests/page-sweep/appRouteSweep.spec.ts tests/page-sweep/roleAccessMatrix.spec.ts tests/page-sweep/purchaseIntelligence.spec.ts tests/page-sweep/responsiveSurface.spec.ts tests/page-sweep/machineCadSurface.spec.ts tests/page-sweep/machineWorkspace.spec.ts tests/page-sweep/customerDocument.spec.ts tests/page-sweep/employeeContinuity.spec.ts --project=chromium
```

## Output Tail
```text
Running 54 tests using 1 worker

  ok  1 [chromium] › tests\page-sweep\appRouteSweep.spec.ts:9:5 › APPW page-sweep route smoke › dashboard loads its canonical surface (3.3s)
  ok  2 [chromium] › tests\page-sweep\appRouteSweep.spec.ts:9:5 › APPW page-sweep route smoke › calculator loads its canonical surface (2.4s)
  ok  3 [chromium] › tests\page-sweep\appRouteSweep.spec.ts:9:5 › APPW page-sweep route smoke › print-to-cnc loads its canonical surface (1.7s)
  ok  4 [chromium] › tests\page-sweep\appRouteSweep.spec.ts:9:5 › APPW page-sweep route smoke › messages loads its canonical surface (1.6s)
  ok  5 [chromium] › tests\page-sweep\appRouteSweep.spec.ts:9:5 › APPW page-sweep route smoke › jobs loads its canonical surface (1.7s)
  ok  6 [chromium] › tests\page-sweep\appRouteSweep.spec.ts:9:5 › APPW page-sweep route smoke › ppg loads its canonical surface (1.7s)
  ok  7 [chromium] › tests\page-sweep\appRouteSweep.spec.ts:9:5 › APPW page-sweep route smoke › scheduling loads its canonical surface (1.7s)
  ok  8 [chromium] › tests\page-sweep\appRouteSweep.spec.ts:9:5 › APPW page-sweep route smoke › machine-rates loads its canonical surface (1.7s)
  ok  9 [chromium] › tests\page-sweep\appRouteSweep.spec.ts:9:5 › APPW page-sweep route smoke › purchasing loads its canonical surface (1.4s)
  ok 10 [chromium] › tests\page-sweep\appRouteSweep.spec.ts:9:5 › APPW page-sweep route smoke › alarms loads its canonical surface (1.4s)
  ok 11 [chromium] › tests\page-sweep\appRouteSweep.spec.ts:9:5 › APPW page-sweep route smoke › lathe-upload loads its canonical surface (1.5s)
  ok 12 [chromium] › tests\page-sweep\appRouteSweep.spec.ts:9:5 › APPW page-sweep route smoke › wire-edm-upload loads its canonical surface (1.7s)
  ok 13 [chromium] › tests\page-sweep\customerDocument.spec.ts:73:5 › APPW customer and document continuity sweep › customers-crm-continuity keeps downstream follow-up cues visible (1.4s)
  ok 14 [chromium] › tests\page-sweep\customerDocument.spec.ts:73:5 › APPW customer and document continuity sweep › customer-portal-continuity keeps downstream follow-up cues visible (1.4s)
  ok 15 [chromium] › tests\page-sweep\customerDocument.spec.ts:73:5 › APPW customer and document continuity sweep › document-inbox-intake keeps downstream follow-up cues visible (1.4s)
  ok 16 [chromium] › tests\page-sweep\customerDocument.spec.ts:73:5 › APPW customer and document continuity sweep › document-learning-continuity keeps downstream follow-up cues visible (1.7s)
  ok 17 [chromium] › tests\page-sweep\employeeContinuity.spec.ts:65:5 › APPW employee continuity sweep › machinist-home-shell preserves handoff and task continuity (1.8s)
  ok 18 [chromium] › tests\page-sweep\employeeContinuity.spec.ts:65:5 › APPW employee continuity sweep › machinist-messages-handoff preserves handoff and task continuity (2.1s)
  ok 19 [chromium] › tests\page-sweep\employeeContinuity.spec.ts:65:5 › APPW employee continuity sweep › machinist-shop-clock preserves handoff and task continuity (2.1s)
  ok 20 [chromium] › tests\page-sweep\machineCadSurface.spec.ts:9:5 › APPW machine CAD surface sweep › calculator-cad-donor keeps CAD intake and machine review cues visible (2.4s)
  ok 21 [chromium] › tests\page-sweep\machineCadSurface.spec.ts:9:5 › APPW machine CAD surface sweep › program-release-cad-intake keeps CAD intake and machine review cues visible (1.7s)
  ok 22 [chromium] › tests\page-sweep\machineCadSurface.spec.ts:9:5 › APPW machine CAD surface sweep › lathe-upload-cad-intake keeps CAD intake and machine review cues visible (1.4s)
  ok 23 [chromium] › tests\page-sweep\machineCadSurface.spec.ts:9:5 › APPW machine CAD surface sweep › wire-edm-upload-cad-intake keeps CAD intake and machine review cues visible (1.7s)
  ok 24 [chromium] › tests\page-sweep\machineCadSurface.spec.ts:9:5 › APPW machine CAD surface sweep › viewer-scene-review keeps CAD intake and machine review cues visible (1.4s)
  ok 25 [chromium] › tests\page-sweep\machineWorkspace.spec.ts:125:3 › APPW machine workspace continuity sweep › lathe results preserve routed authority across downstream machine utilities (15.9s)
  ok 26 [chromium] › tests\page-sweep\machineWorkspace.spec.ts:191:3 › APPW machine workspace continuity sweep › wire EDM results preserve routed authority and fail-closed downstream posture (15.8s)
  ok 27 [chromium] › tests\page-sweep\purchaseIntelligence.spec.ts:9:5 › APPW purchase-intelligence surfaces › program-release-purchase-lane exposes its staged buying signals (1.8s)
  ok 28 [chromium] › tests\page-sweep\purchaseIntelligence.spec.ts:9:5 › APPW purchase-intelligence surfaces › alarm-parts-sourcing exposes its staged buying signals (1.4s)
  ok 29 [chromium] › tests\page-sweep\purchaseIntelligence.spec.ts:9:5 › APPW purchase-intelligence surfaces › quote-builder-sourcing-handoff exposes its staged buying signals (1.7s)
  ok 30 [chromium] › tests\page-sweep\purchaseIntelligence.spec.ts:9:5 › APPW purchase-intelligence surfaces › purchasing-recommendation-brief exposes its staged buying signals (1.4s)
  ok 31 [chromium] › tests\page-sweep\responsiveSurface.spec.ts:16:9 › APPW responsive surface sweep › desktop › dashboard stays legible at desktop (1.8s)
  ok 32 [chromium] › tests\page-sweep\responsiveSurface.spec.ts:16:9 › APPW responsive surface sweep › desktop › calculator stays legible at desktop (2.6s)
  ok 33 [chromium] › tests\page-sweep\responsiveSurface.spec.ts:16:9 › APPW responsive surface sweep › desktop › print-to-cnc stays legible at desktop (1.7s)
  ok 34 [chromium] › tests\page-sweep\responsiveSurface.spec.ts:16:9 › APPW responsive surface sweep › desktop › messages stays legible at desktop (1.7s)
  ok 35 [chromium] › tests\page-sweep\responsiveSurface.spec.ts:16:9 › APPW responsive surface sweep › desktop › jobs stays legible at desktop (1.7s)
  ok 36 [chromium] › tests\page-sweep\responsiveSurface.spec.ts:16:9 › APPW responsive surface sweep › desktop › ppg stays legible at desktop (1.7s)
  ok 37 [chromium] › tests\page-sweep\responsiveSurface.spec.ts:16:9 › APPW responsive surface sweep › desktop › scheduling stays legible at desktop (1.8s)
  ok 38 [chromium] › tests\page-sweep\responsiveSurface.spec.ts:16:9 › APPW responsive surface sweep › desktop › machine-rates stays legible at desktop (1.7s)
  ok 39 [chromium] › tests\page-sweep\responsiveSurface.spec.ts:16:9 › APPW responsive surface sweep › tablet-768 › dashboard stays legible at tablet-768 (1.7s)
  ok 40 [chromium] › tests\page-sweep\responsiveSurface.spec.ts:16:9 › APPW responsive surface sweep › tablet-768 › calculator stays legible at tablet-768 (2.6s)
  ok 41 [chromium] › tests\page-sweep\responsiveSurface.spec.ts:16:9 › APPW responsive surface sweep › tablet-768 › print-to-cnc stays legible at tablet-768 (1.7s)
  ok 42 [chromium] › tests\page-sweep\responsiveSurface.spec.ts:16:9 › APPW responsive surface sweep › tablet-768 › messages stays legible at tablet-768 (1.7s)
  ok 43 [chromium] › tests\page-sweep\responsiveSurface.spec.ts:16:9 › APPW responsive surface sweep › tablet-768 › jobs stays legible at tablet-768 (1.7s)
  ok 44 [chromium] › tests\page-sweep\responsiveSurface.spec.ts:16:9 › APPW responsive surface sweep › tablet-768 › ppg stays legible at tablet-768 (1.7s)
  ok 45 [chromium] › tests\page-sweep\responsiveSurface.spec.ts:16:9 › APPW responsive surface sweep › tablet-768 › scheduling stays legible at tablet-768 (1.8s)
  ok 46 [chromium] › tests\page-sweep\responsiveSurface.spec.ts:16:9 › APPW responsive surface sweep › tablet-768 › machine-rates stays legible at tablet-768 (1.7s)
  ok 47 [chromium] › tests\page-sweep\roleAccessMatrix.spec.ts:65:5 › APPW role access matrix › shop-floor-can-open-calculator (2.4s)
  ok 48 [chromium] › tests\page-sweep\roleAccessMatrix.spec.ts:65:5 › APPW role access matrix › shop-floor-blocked-from-machine-rates (1.4s)
  ok 49 [chromium] › tests\page-sweep\roleAccessMatrix.spec.ts:65:5 › APPW role access matrix › lead-can-open-machine-rates (1.7s)
  ok 50 [chromium] › tests\page-sweep\roleAccessMatrix.spec.ts:65:5 › APPW role access matrix › lead-blocked-from-employees (1.4s)
  ok 51 [chromium] › tests\page-sweep\roleAccessMatrix.spec.ts:65:5 › APPW role access matrix › hr-can-open-employees (1.7s)
  ok 52 [chromium] › tests\page-sweep\roleAccessMatrix.spec.ts:65:5 › APPW role access matrix › hr-blocked-from-financial-analysis (1.4s)
  ok 53 [chromium] › tests\page-sweep\roleAccessMatrix.spec.ts:65:5 › APPW role access matrix › admin-can-open-financial-analysis (1.4s)
  ok 54 [chromium] › tests\page-sweep\roleAccessMatrix.spec.ts:78:3 › APPW role access matrix › unauthenticated users are redirected to login for protected routes (1.3s)

  54 passed (2.1m)
```
