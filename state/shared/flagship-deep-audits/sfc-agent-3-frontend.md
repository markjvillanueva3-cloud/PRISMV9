# SFC Deep Audit — Agent 3: Frontend

## Routes (Table: Page, Route, Status, Backend)

| Page | Route | Status | Backend API | Access |
|------|-------|--------|-------------|--------|
| SfcCalculatorPage | `/speed-feed-calc` | Complete | POST `/api/v1/sfc/calculate` | shop_floor (default) |
| SpeedFeedPage | `/speed-feed` | Complete | POST `/api/v1/speed-feed/orchestrate` | shop_floor (default) |
| CalculatorPage | `/calculator` | Partial (9 panels, not SFC-specific) | Multiple `/api/v1/*` | shop_floor (default) |

## Standalone vs Embedded

- **Standalone**: SfcCalculatorPage (full-page calculator with comparison/history tabs)
- **Standalone**: SpeedFeedPage (full orchestrator with optimization modes)
- **Embedded**: SpeedFeedPanel.tsx (reusable component for CalculatorPage)
- **Embedded**: 12 SFC sub-components (SmartMaterialSelector, SmartToolSelector, SmartMachineSelector, ParameterPanel, ResultsDisplay, CompatibilityValidator, ComparisonView, CalculationHistory, AdvancedCharts, PresetManager, OperationSelector, MaterialSelector)

## Subscription Gating UI (Paywall, Tier Display, Credit Counter)

**NO PAYWALL DETECTED.** SFC pages have:
- ✓ ProtectedRoute auth (role-based: shop_floor/lead/hr_manager/admin)
- ✓ Backend auth middleware (assumed)
- ✗ **Zero subscription tier gating** (no paywall modal, no credit counter, no feature-level gates)
- ✗ **No freemium UX** (no "upgrade to unlock" banners)
- ✗ **No credit/usage tracking UI** (no credit display, no calculation limits shown)

**Implication:** SFC is a free feature gated only by role/auth, not monetized frontend-side. Any subscription enforcement is backend-only or absent.

## Key Components & UX Strengths

1. **SmartMaterialSelector**: 6,346+ materials, local (28) + async backend search, favorites/recents, operation-driven recommendations, ISO group filtering, machinability hints
2. **SmartToolSelector**: Tool picker with operation/material context filtering
3. **SmartMachineSelector**: Machine picker validates RPM/power/axis requirements against calculation results
4. **ParameterPanel**: Tool diameter, flute count, depth, width, coolant, tool material selectors
5. **ResultsDisplay**: Spindle RPM, feed rate, cutting speed, feed-per-tooth with imperial/metric toggle
6. **CompatibilityValidator**: Warns on tool/material/machine mismatches with suggestions
7. **AdvancedCharts**: Charts tab for visualization (implementation deferred in read)
8. **ComparisonView**: Side-by-side comparison of up to 4 calculation snapshots
9. **CalculationHistory**: Full history with reload/add-to-comparison actions
10. **PresetManager**: Save/load presets per material/operation

## Backend API Endpoints (SFC)

- `POST /api/v1/sfc/calculate` → core speed/feed result
- `POST /api/v1/sfc/cycle-time` → cycle time analysis
- `POST /api/v1/sfc/engagement` → tool engagement angle
- `POST /api/v1/sfc/deflection` → tool deflection check
- `POST /api/v1/sfc/power-torque` → power/torque check
- `POST /api/v1/sfc/surface-finish` → surface finish prediction
- `POST /api/v1/sfc/tool-life` → tool life prediction

## Backend API Endpoints (Speed-Feed Orchestrator)

- `POST /api/v1/speed-feed/orchestrate` → full pipeline
- `POST /api/v1/speed-feed/quick` → no stochastic (faster)
- `POST /api/v1/speed-feed/stochastic` → full uncertainty quantification
- `POST /api/v1/speed-feed/resolve/machine` → machine capability only
- `POST /api/v1/speed-feed/resolve/tool` → tool capability only
- `POST /api/v1/speed-feed/resolve/material` → material properties
- `POST /api/v1/speed-feed/compare` → multi-scenario comparison
- `POST /api/v1/speed-feed/optimize` → MOPSO multi-objective optimization
- `POST /api/v1/speed-feed/tool-roi` → tool ROI analysis

## Gaps & Recommendations

1. **No Paywall/Monetization Layer**: SFC pages lack subscription enforcement. Consider:
   - Calculation throttling (free tier: 5/day, premium: unlimited)
   - Feature gating (free: basic calc, premium: optimization/ROI/stochastic)
   - Credit UI (display remaining calcs, upsell when depleted)

2. **Material Search**: 6,346+ items in backend not cached frontend-side. Consider:
   - Client-side SQLite (IndexedDB) for offline access
   - Faster local-first search before backend fallback

3. **No Audit Trail**: Calculations not logged per user. Consider:
   - Save results to backend (history persistence across sessions)
   - Track which jobs used which calc parameters

4. **Limited Safety Messaging**: CompatibilityValidator warns but doesn't block. Consider:
   - Hard-block dangerous combos (e.g., excessive stickout)
   - Show safety factors from backend

5. **No CAM Bridge UI**: SpeedFeedPage accepts `cam_system` but no picker. Consider:
   - Dropdown for 18 supported CAM systems in both pages

## Score: 72/100

**Strengths**: Robust component architecture, smart material/tool/machine pickers, multi-mode orchestrator (quick/stochastic/optimize), comparison/history tabs, imperial/metric toggle.

**Weaknesses**: No paywall UI, no audit trail, limited safety guardrails, material search not persistent, missing CAM system selector.

**Verdict**: Frontend is production-ready for internal use. Must add subscription gating + audit trail before customer-facing SaaS launch.
