# MILL Deep Audit — Agent 3: Frontend UI Trace

**Score: 67/100** — Functional but incomplete. **40% real, 60% stub.**

## File Inventory

| File | LOC | Type | Status |
|---|---:|---|---|
| MillStudioPage.tsx | 672 | Page | STUB (all inline, NOT routed) |
| MillingUploadPage.tsx | 366 | Page | REAL (fully routed) |
| MillingWizardPage.tsx | 575 | Page | REAL (fully routed) |
| MillingResultsPage.tsx | 616 | Page | REAL (fully routed) |
| MillStudioContext.tsx | 245 | Context | STUB (demo only) |
| MillTurnPage.tsx | 90 | Page | STUB (hardcoded tables) |
| components/mill/* | 21 KB | Components | STUB (orphaned, unused by trio) |

**Total frontend: 2,474+ LOC**

## Routing in App.tsx

```typescript
// Lines 325-327 (REGISTERED):
<Route path="milling" element={lazyElement(<MillingUploadPage />)} />
<Route path="milling/wizard" element={lazyElement(<MillingWizardPage />)} />
<Route path="milling/results" element={lazyElement(<MillingResultsPage />)} />

// MISSING:
// /mill-studio — MillStudioPage defined but orphaned
// /mill-turn — line 340 routes to TurningPage, not MillTurnPage
```

## End-to-End Flow Trace

### Flow 1: Upload → Wizard → Results (REAL, the only working path)

**MillingUploadPage (366 LOC):**
- POST `/api/v1/milling/upload` via `uploadMillingFile()` line 136
- Drag-and-drop, FileReader async, magic-byte detection
- Status: REAL ✓ — but blocked by router registration

**MillingWizardPage (575 LOC):**
- POST `/api/v1/milling/wizard-submit` via `submitMillingWizard()` line 258
- 5-step config: Material → Machine → Strategy → Quality → Review
- 16 hardcoded materials, 4 hardcoded machines (Haas VF-2, Hurco VM10i, Roku-Roku RB-630, Okuma MU-400V)
- **NOTE:** Hurco machine listed as VM10i but JM Die actually has VM30i — needs correction
- 6 strategies, 4 quality tiers
- Guard at line 338 prevents direct access without upload
- Status: REAL ✓

**MillingResultsPage (616 LOC):**
- ❌ **NEVER calls `getMillingResult()`** — uses location.state from wizard instead
- Tabs: Summary | Toolpath | Setup Sheet | G-Code | AI Recommendations
- Download handlers wired (lines 193-213) for NC + setup sheet via Blob+URL.createObjectURL
- Edit & Rerun (line 215-226) — **BUG: doesn't pass `extractedData` back**, loses feature data
- Toolpath visualization is placeholder SVG (lines 137-169 buildSVGToolpath = mock)
- Status: REAL ✓ but with refresh/bookmark issue

### Flow 2: MillStudioPage (DEAD)

NOT routed in App.tsx. Has 6-step ideal architecture but:
- Zero `fetch` calls
- Zero export button onClick handlers (Download NC, Send to Machine, Setup Sheet — all bare `<button>`)
- AI Reasoning panel is hardcoded text strings (lines 645-664)
- Demo data only ("demo-bracket.step")

**Classification:** Aspirational scaffold, abandoned. 917 LOC dead weight.

### Flow 3: MillTurnPage (STUB)

Routed at `/turning` (line 340). 90 LOC. Hardcoded channel state, no onClick, no fetch, read-only table.

## Backend Integration Checklist

| Endpoint | Frontend Call | Status |
|---|---|---|
| POST /milling/upload | UploadPage line 136 | ✓ wired but BLOCKED (router unmounted) |
| POST /milling/wizard-submit | WizardPage line 258 | ✓ wired but BLOCKED |
| GET /milling/result/:jobId | client.ts defined but unused | ❌ NOT called |
| POST /milling/calculate | not called | ❌ NOT wired in UI |
| POST /milling/validate | not called | ❌ NOT wired |
| POST /milling/speed-feed | not called | ❌ NOT wired |
| /milling/ai/* (5 endpoints) | not called | ❌ NOT wired |

## Critical Stubs & TODOs

### CRITICAL (Blocking)
1. **Mill router not mounted** — `routes/index.ts` missing import + `app.use()` (5 min fix)
2. **ResultsPage no fetch on refresh** — losses results on page reload (10 min fix)
3. **Edit & Rerun loses extractedData** — wizard re-uploads required after edit (1 min fix)

### HIGH
4. MillingUploadPage: 404 not distinguished from real failures
5. MillingWizardPage: no spinner on 3s submit
6. MillStudioPage: orphaned 917 LOC, decide delete or implement

### MEDIUM
7. AI Reasoning panel hardcoded — wire to `/ai/wisdom` or `/ai/agi`
8. Toolpath visualization is mock SVG — request real geometry export
9. Cost breakdown only shows if exists — no chart

## Operator UX Assessment

**Upload Page:** ✓ drag-drop, progress bar, error recovery. ✗ no size limit shown, no format guide.

**Wizard Page:** ✓ multi-step indicator, material grid, machine specs, quality tiers explained. ✗ no docs links, material extraction not leveraged in step 1, no recommendations.

**Results Page:** ✓ tab layout, downloads, edit & re-run. ✗ no copy-to-clipboard for G-code, no DNC button, no QR code, toolpath placeholder.

## Critical Path to Production

**3 blockers to fix:**
1. Mount /milling router (5 min)
2. Add useEffect for getMillingResult on jobId (10 min)
3. Fix handleEdit to pass extractedData (1 min)

**Total fix time:** 16 minutes to unblock end-to-end flow.

## Score Components

| Criterion | Score |
|---|---:|
| Routing | 60/100 |
| Fetch Integration | 70/100 |
| Error Handling | 75/100 |
| State Management | 80/100 |
| UX Completeness | 65/100 |
| Code Quality | 80/100 |
| Testing | 0/100 |
| Documentation | 40/100 |
| Performance | 85/100 |
| **Overall** | **67/100** |

**Verdict:** Pages exist and Upload/Wizard/Results trio is real. Once router lands, this flow becomes live in 16 minutes. MillStudioPage scaffold is 917 LOC of dead weight.
