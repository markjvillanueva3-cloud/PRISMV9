# Frontend Merge Plan: PRISM/web → mcp-server/web

**Created**: 2026-04-12
**Status**: In Progress

## Discovery

Two frontend codebases exist that need to be merged:

| Location | Pages | Focus |
|----------|-------|-------|
| `H:/PRISM/web` | 108 | WIRE-MS0 target pages (MachineLive, Diagnosis, EDM, etc.) |
| `H:/PRISM/mcp-server/web` | 102 | Business pages (LatheWizard, ShopFloorTV, etc.) |

## Pages to Copy from PRISM/web → mcp-server/web

### WIRE-MS0 Target Pages (HIGH PRIORITY)
These pages fulfill WIRE-MS0 unit requirements directly:

| Page | WIRE-MS0 Unit | Description |
|------|---------------|-------------|
| MachineLivePage.tsx | P0-U02 | Machine monitoring dashboard |
| DiagnosisPage.tsx | P0-U03 | Diagnosis & troubleshooting |
| CncOpsPage.tsx | P1-U01 | CNC operations |
| KnowledgeExtPage.tsx | P1-U02 | Knowledge extension |
| VibrationPage.tsx | P1-U03 | Vibration & modal analysis |
| ThermalPage.tsx | P1-U04 | Thermal & fluid calculations |
| EdmPage.tsx | P2-U01 | EDM operations |
| TurningPage.tsx | P2-U02 | Turning operations |
| GrindingPage.tsx | P2-U03 | Grinding operations |
| FormingPage.tsx | P2-U04 | Forming & casting |
| WeldingPage.tsx | P2-U05 | Welding & joining |
| SettingsPage.tsx | P3-U01 | Settings with backend sync |

### Additional Pages
| Page | Description |
|------|-------------|
| AdminPage.tsx | Admin dashboard |
| CamStrategyPage.tsx | CAM strategy selector |
| CompliancePage.tsx | Compliance tracking |
| CostEstimatorPage.tsx | Cost estimation |
| DataManagementPage.tsx | Data management |
| ErpDashboard.tsx | ERP dashboard |
| LandingPage.tsx | Landing page |
| PostProcessorStorePage.tsx | PP marketplace |
| PpgPage.tsx | PPG interface |
| QualityPage.tsx | Quality management |
| SafetyDashboardPage.tsx | Safety dashboard |
| SfcCalculatorPage.tsx | SFC calculator |
| ShopDashboardPage.tsx | Shop dashboard |
| SpeedFeedPage.tsx | Speed/feed calculator |
| TelemetryPage.tsx | Telemetry |
| WireEdmStudioPage.tsx | Wire EDM studio |

## Components/Types/Hooks to Check

Need to verify dependencies exist before copying pages:
- Check `components/` for shared components
- Check `types/` for type definitions
- Check `hooks/` for custom hooks
- Check `api/` for API clients

## Merge Order

1. **Phase 1**: Copy WIRE-MS0 target pages (12 pages)
2. **Phase 2**: Copy supporting components/types/hooks
3. **Phase 3**: Update App.tsx with new routes
4. **Phase 4**: Copy additional pages (16 pages)
5. **Phase 5**: Resolve conflicts and test

## Files Already Fixed

- [x] EmployeeEditModal.tsx - copied from PRISM/web (was corrupted)

## Git Corruption Note

Several files in mcp-server/web were corrupted in the git repo (blobs contain wrong content from initial commit). The PRISM/web directory has the correct source for these files.
