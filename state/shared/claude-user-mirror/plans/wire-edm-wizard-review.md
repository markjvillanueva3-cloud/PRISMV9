# WIRE EDM STUDIO WIZARD — SENIOR ARCHITECTURE REVIEW

**Date:** 2026-03-31  
**Reviewer Role:** Senior Frontend Architect  
**Review Scope:** Plan to add 6-step wizard replacing Wire EDM tab in EdmPage.tsx

---

## EXECUTIVE SUMMARY

**Rating: 42/100** — Plan has strategic value but contains critical architectural flaws that will cause:
- Massive bundle bloat (16 files, many could merge)
- Over-engineered state management (useReducer + cascading invalidation)
- Unreliable Three.js geometry for complex DXF profiles
- Poor mobile experience (2-column layout non-negotiable)
- Dangerous state persistence (localStorage without versioning)
- Performance cliff from lazy loading 6 components + editor + 3D viewer

**Key Problems:** 7 CRITICAL, 5 HIGH, 8 MEDIUM findings identified below.

---

## DETAILED FINDINGS

### CRITICAL FINDINGS

#### C1: Component Count Explosion — 16 Files Unmaintainable
**Severity:** CRITICAL | **Effort to Fix:** 2-3 days | **Impact:** Maintainability, bundle size

The plan creates:
- `WireEdmWizardContext.tsx` + `useWireEdmWizard.ts` (2 files)
- `WireEdmWizardPage.tsx` (wrapper, 1 file)
- 6 step components (`StepImport`, `StepReview`, `StepWCS`, etc., 6 files)
- 3 Three.js components (`ProfileMesh`, `WCSGizmo`, `StartHoleMarkers`, 3 files)
- 2 utility modules (types, constants, 2 files)
- `ReducerActions.ts`, `WizardState.ts` (2 files)

**Total: 16 files for a single wizard feature.** This violates the principle of cohesion. The current codebase shows successful consolidation:
- `PpgContext.tsx` combines context + provider + hook (1 file)
- `MaterialWizard.tsx` is self-contained (1 file, ~150 LOC)
- Viewer components (`Viewer3D.tsx`, `ViewerToolbar.tsx`, `ToolpathLayer.tsx`) are focused and reusable

**Root cause:** Plan separates concerns too finely (context, reducer, actions, state shape, step components). This creates:
- Onboarding friction (16 files to understand)
- Circular dependency risk
- Unnecessary import chains
- Cognitive load to trace a single step's data flow

**Recommended Fix:**
1. Merge context + hook + actions into single `WireEdmWizardContext.tsx` (~300 LOC max)
2. Consolidate 6 step components into 2-3 files using conditional rendering:
   - `StepImport.tsx` (single file, all import logic)
   - `StepReviewAndWCS.tsx` (combined, since WCS depends on Review data)
   - `StepToolpathOptimize.tsx` (combined, toolpath + optimize form)
3. Keep Three.js components separate BUT reduce to 2 files:
   - `ProfileMesh3D.tsx` (single component, use React Three Fiber hooks internally)
   - `WireEdmGizmos.tsx` (all gizmo logic)
4. Merge types + constants into `wireEdmTypes.ts` (1 file)

**New structure: 6 files instead of 16** (60% reduction)

---

#### C2: useReducer + Cascading Invalidation Over-Engineered
**Severity:** CRITICAL | **Effort to Fix:** 3-4 days | **Impact:** Debugging, state bugs, performance

The plan uses a reducer with cascading invalidation:
```typescript
// Pseudo-code from plan
case 'SET_PROFILE':
  return {
    ...state,
    profile: payload,
    wcs: null,           // invalidate
    toolpath: null,      // invalidate
    program: null,       // invalidate (cascade continues)
  };
```

**Problems:**
1. **Cascading invalidation is brittle.** If a step is modified mid-workflow, the cascade can erase correct downstream data. Example:
   - User completes steps 1-5
   - Realizes step 2 (Review) had wrong stock dimensions
   - Fixes step 2 → triggers cascade → erases steps 3-5 data (WCS, toolpath, program gone)
   - User must re-enter steps 3-5 manually

2. **useReducer is overkill for this domain.** The current codebase uses `useState` successfully:
   - `EdmPage.tsx`: 3x `useState` for wire/sinker/laser params, no reducer needed
   - `MaterialWizard.tsx`: `useState` for form + async call, simple and readable
   - `LearningContext.tsx`: Simple setters, no reducer
   
   A reducer shines when: (a) many actions interdepend, (b) undo/redo required, (c) complex time-travel debugging needed. **None apply here.**

3. **Selective invalidation is the correct pattern:**
   ```typescript
   const handleProfileChange = (profile) => {
     setState(s => ({
       ...s,
       profile,
       // Only invalidate if profile geometry actually changed
       wcs: hasProfileGeometryChanged(profile, s.profile) ? null : s.wcs,
       // WCS depends on profile — if profile unchanged, keep WCS
     }));
   };
   ```

4. **Performance cost:** Reducer + cascading invalidation triggers re-renders down the entire tree. Lazy-loaded step components will remount unnecessarily.

**Recommended Fix:**
- **Replace useReducer with 5-6 independent useState calls:**
  ```typescript
  const [profile, setProfile] = useState<DxfProfile | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const [wcs, setWcs] = useState<WCSConfig | null>(null);
  const [toolpath, setToolpath] = useState<ToolpathData | null>(null);
  const [program, setProgram] = useState<string | null>(null);
  ```
- Add **selective invalidation helpers:**
  ```typescript
  const setProfileSmart = (p: DxfProfile) => {
    if (!profileGeometryEquals(p, profile)) {
      setProfile(p);
      setWcs(null); // only invalidate if geometry changed
    } else {
      setProfile(p);
    }
  };
  ```
- This keeps the context simpler, re-renders lighter, and allows partial rollback without full cascade.

---

#### C3: ProfileMesh Using THREE.ExtrudeGeometry — Fails on Self-Intersecting DXF Profiles
**Severity:** CRITICAL | **Effort to Fix:** 5-7 days | **Impact:** Data integrity, user trust, crash risk

The plan proposes:
> ProfileMesh generates a 3D mesh from 2D DXF contours using THREE.ExtrudeGeometry

**Why this fails:**

1. **DXF profiles from wire EDM are often self-intersecting or non-convex:**
   - A typical wire EDM part: aerospace bracket with internal pockets, thin walls
   - DXF output: 2D contour with holes, islands, outer edge
   - Wire path is often a single contour (outer edge), but the **visual representation** (stock to remove) needs to show pockets
   - `THREE.ExtrudeGeometry` cannot handle self-intersecting contours — it will either:
     - Silently create invalid mesh (inverted normals, visible cracks)
     - Throw error at runtime
     - Produce unexpected extrusion direction

2. **Example failure scenario:**
   ```
   DXF contour: "L-shaped pocket in square stock"
   Profile: [outer square, inner L-cut]
   ExtrudeGeometry input: both contours
   Result: Extrudes both as separate shapes, creates non-manifold mesh
   User sees: Mangled 3D preview, no indication of problem
   ```

3. **Wire EDM context makes this worse:**
   - Wire EDM cuts a **single profile**, not multi-stage tool paths
   - The "profile" is the **cross-section** user wants to cut
   - Showing a full 3D stock extrusion is misleading (not what EDM does)
   - User needs: **2D profile preview** (what wire will cut) + optional **stock dimensions** for context

**Recommended Fix:**
1. **Replace ExtrudeGeometry with 2D profile rendering:**
   - Use `BufferGeometry` to render the DXF contour as 2D polylines (stay in canvas plane)
   - Add optional axis lines showing Z extent (if taper specified)
   - Much simpler, faster, and correct

2. **If 3D stock visualization is required:**
   - Input: DXF profile (2D) + stock dimensions (W, H, D) from StepReview
   - Use **simple box geometry** (THREE.BoxGeometry), then render profile as overlay on top face
   - Don't extrude the profile — let it sit on stock for visual reference
   - This is more honest about wire EDM (vertical cut through stock)

3. **Validation step:**
   - In `StepReview`, validate contour is simple polygon before sending to 3D viewer
   - Use a library like `earcut` (already available in many React Three Fiber projects) to triangulate
   - If contour is invalid, show error: "Profile contour self-intersects. Please clean DXF."

---

#### C4: localStorage Autosave Without Version/Migration Path
**Severity:** CRITICAL | **Effort to Fix:** 2-3 days | **Impact:** Data loss, user frustration

The plan includes:
> State persists to localStorage, auto-saving every 30s (following PpgContext pattern)

But `PpgContext` pattern is **only suitable for editor content** (raw strings). For structured wizard state, it's dangerous:

**Problems:**
1. **No versioning:** If the wizard schema changes (e.g., step 3 field renamed), old localStorage data becomes invalid. Next time user opens wizard, it silently fails or crashes.
2. **No rollback path:** If user saves a broken state (e.g., invalid profile), they can't undo without manually clearing storage.
3. **localStorage limits:** ~5-10 MB per domain. Storing a large DXF profile (could be 1+ MB) + all 6 steps of data = likely to hit quota, causing silent save failures.
4. **Not standard for wizards:** Most production wizards use either:
   - **URL params** (step-specific data in query string, shareable)
   - **Server session** (data persists server-side, survives browser close)
   - **IndexedDB** (for large data, with versioning & migration)
5. **PpgContext doesn't actually use structured persistence well:**
   - Looking at PpgContext code: it only persists `editorContent` (string) + controller ID
   - It doesn't persist complex state like geometry, parameters, or computed results
   - The wizard plan tries to extend this pattern to 6-step state, which is a mismatch

**Recommended Fix:**
1. **Use URL params for wizard navigation (no persistence needed):**
   ```typescript
   // Instead of localStorage, use URL: /edm-wizard?step=3&profile=<encoded>
   const step = searchParams.get('step') || '1';
   const encodedProfile = searchParams.get('profile');
   ```
   - Pros: User can bookmark/share progress link, state survives page reload, clear audit trail
   - Cons: URL length limits (~2000 chars), need to encode data

2. **For large data (DXF profiles), use server-side session:**
   - POST profile upload to `/api/v1/wire-edm/session/{sessionId}/profile`
   - Server returns `sessionId`, client stores in URL
   - Next steps reference same session ID
   - Server cleans up old sessions (e.g., after 24 hours)

3. **If localStorage is required:**
   - Add version number: `{ version: 1, schema: {...}, data: {...} }`
   - Implement migration: `if (stored.version < 2) { stored = migrateV1ToV2(stored); }`
   - Add expiration: `{ ...stored, expiresAt: Date.now() + 7*24*60*60*1000 }`

---

#### C5: 2-Column Layout Breaks on Mobile (Non-Negotiable Constraint Not Addressed)
**Severity:** CRITICAL | **Effort to Fix:** 2-3 days | **Impact:** Accessibility, user experience

The plan says:
> 2-column layout: left sidebar with form steps, right side with Viewer3D + GcodeEditor

This is mentioned but **not addressed for mobile.** Current codebase shows responsive awareness:
- `EdmPage.tsx`: `grid grid-cols-1 lg:grid-cols-3` (mobile-first)
- `App.tsx`: All routes wrapped in `Suspense` with loader
- No mobile-specific UI hiding

**Mobile reality check:**
- iPhone 12: 390px width
- iPad: 768px width
- 2-column layout at 390px = impossible (form + 3D viewer side-by-side = unreadable)
- Stacking columns requires heavy rework: hide viewer on mobile, show tabs, or use drawer

**Current state of plan:** Zero mention of mobile breakpoints, responsive grid changes, or alternative layouts.

**Recommended Fix:**
1. **Define responsive breakpoints explicitly:**
   ```typescript
   const layout = {
     mobile: 'single column, stacked form + viewer',
     tablet: 'form left (1/3), viewer right (2/3) [drawer for editor]',
     desktop: 'form left (1/3), viewer center (1/3), editor right (1/3)',
   };
   ```

2. **Use Tailwind consistently:**
   ```tsx
   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
     <div className="col-span-1">Form Steps</div>
     <div className="col-span-1 lg:col-span-2">Viewer3D + Editor</div>
   </div>
   ```

3. **Hide editor on mobile, use expandable sections:**
   ```tsx
   <div className="space-y-4">
     {/* Form takes full width on mobile */}
     <div className="hidden lg:block">
       {/* GcodeEditor shown only on desktop */}
     </div>
     <button onClick={() => setEditorOpen(!editorOpen)} className="lg:hidden">
       Show G-code Preview
     </button>
     {editorOpen && <GcodeEditor />}
   </div>
   ```

---

### HIGH FINDINGS

#### H1: Bundle Impact of 6 Lazy-Loaded Step Components + Three.js + Monaco
**Severity:** HIGH | **Effort to Fix:** 2-3 days | **Impact:** Initial page load time

Current bundle strategy:
- `App.tsx` already lazy-loads pages with `React.lazy()`
- Each lazy route gets its own chunk (good)
- But within `WireEdmWizardPage`, if all 6 steps are lazy, this creates 6 additional chunks

**Problem:**
- Each chunk = separate fetch request
- User enters wizard (step 1), page fetches chunk 1
- User clicks "Next" → fetch chunk 2 (slow network waits)
- Monaco editor (~2.5 MB) is **not lazy** — loads immediately even if user never reaches final step
- Three.js + @react-three/fiber + orbit controls (~1.2 MB) loaded upfront

**Current codebase pattern:**
- `PpgPage` includes `GcodeEditor` inline (not lazy) ✓ correct, since editor is primary UI
- Viewer components bundled with PpgPage ✓ correct

**Recommended Fix:**
1. **Load all 6 steps in a single chunk:**
   - Don't lazy-load individual steps
   - Use conditional rendering: `{step === 1 && <StepImport />}`
   - Keeps bundle predictable, single fetch

2. **Lazy-load 3D viewer for step 3+ (when actually used):**
   ```typescript
   const Viewer3D = lazy(() => import('./components/viewer/Viewer3D'));
   const StepWCS = () => (
     <Suspense fallback={<Spinner />}>
       <Viewer3D ... />
     </Suspense>
   );
   ```

3. **Monaco editor:** Keep loaded (it's optional in final step), but defer import:
   ```typescript
   const GcodeEditor = lazy(() => import('./components/ppg/GcodeEditor'));
   // In step 6:
   <Suspense fallback={...}>
     <GcodeEditor />
   </Suspense>
   ```

---

#### H2: Error Recovery Path Poorly Specified
**Severity:** HIGH | **Effort to Fix:** 3-4 days | **Impact:** User trust, support cost

The plan doesn't specify: "If step 3 (WCS) fails, can user retry without losing steps 1-2?"

**Likely scenario with current plan:**
1. User completes step 1 (Import) ✓
2. User completes step 2 (Review) ✓
3. User hits "Calculate WCS" in step 3 → API error (server timeout, invalid geometry, etc.)
4. Reducer cascades invalidation → WCS = null, and potentially toolpath/program too
5. User sees error but no retry button, must manually go back, re-select profile, re-review
6. User abandons feature

**Better approach:**
1. Each step is independent; errors don't cascade
2. Step 3 shows: `Error: WCS calculation failed. [Retry] [Edit Profile] [Skip]`
3. User can click Retry without losing steps 1-2
4. Or go back to step 2, edit, return to step 3

**Recommended Fix:**
1. **Add error state per step:**
   ```typescript
   const [wcsError, setWcsError] = useState<string | null>(null);
   ```

2. **Retry logic:**
   ```typescript
   const handleCalculateWCS = async () => {
     try {
       setWcsError(null);
       const result = await calculateWCS(profile, reviewed);
       setWcs(result);
     } catch (err) {
       setWcsError(err.message);
       // Dont clear wcs — user can retry
     }
   };
   ```

3. **UI pattern:**
   ```tsx
   {wcsError && (
     <div className="bg-red-50 p-3 rounded text-red-700 text-sm mb-4">
       {wcsError}
       <button onClick={handleCalculateWCS} className="ml-2 underline">Retry</button>
     </div>
   )}
   ```

---

#### H3: No Explicit DXF Parsing Validation Before 3D Rendering
**Severity:** HIGH | **Effort to Fix:** 2-3 days | **Impact:** Data integrity, UX

Step 1 (Import) accepts DXF file but plan doesn't specify validation:
- What if DXF is corrupt?
- What if DXF has 1000+ entities (creates huge mesh)?
- What if DXF uses units (mm vs inches) that don't match project?

**Current approach (implied):**
- Accept file → pass to Viewer3D as ProfileMesh
- If ProfileMesh fails → 3D viewer shows blank or error

**Better approach:**
1. **Validate before rendering:**
   ```typescript
   const handleFileUpload = async (file: File) => {
     const profile = await parseDxf(file);
     
     // Validation checks
     if (profile.entities.length > 500) {
       setError("DXF is too complex (500+ entities). Simplify in CAD.");
       return;
     }
     
     if (profile.units && project.units && profile.units !== project.units) {
       setWarning(`DXF in ${profile.units}, project in ${project.units}. Auto-converting...`);
     }
     
     // Only now show preview
     setProfile(profile);
   };
   ```

2. **Use a DXF library with error handling:**
   - `dxf-parser` (NPM, handles errors gracefully)
   - Validate contour is simple polygon (no self-intersections)

---

#### H4: No Undo/Redo, But Complex Multi-Step Workflow Demands It
**Severity:** HIGH | **Effort to Fix:** 5-7 days | **Impact:** UX, user confidence

Users will want to:
- Step 5 (optimize) → realize settings wrong → go back to step 2 (review) → edit thickness → come back to step 5 → find optimization lost

Current plan doesn't address undo/redo. The useReducer hint suggests author considered this but didn't specify.

**Recommended approach:**
1. **Don't implement full undo/redo initially.** It's complex (requires storing action history, replaying, handling merge conflicts).

2. **Instead, use "breadcrumb save points":**
   - Each step stores an auto-snapshot when completed
   - If user edits step 2, show: "You edited step 2. [Undo] [Keep]"
   - Undo reverts step 2 to previous snapshot (faster than full redo)

3. **Via URL params (if URL-based persistence used):**
   ```typescript
   const savepoint = {
     step: 2,
     profile,
     reviewed,
     hash: md5({profile, reviewed}) // detect changes
   };
   ```

---

#### H5: Cascading Async Calls (Import → Review → WCS → Toolpath) Can Deadlock
**Severity:** HIGH | **Effort to Fix:** 3-4 days | **Impact:** Performance, race conditions

If wizard auto-advances steps and each step has async call:
1. User clicks Import → awaits parse
2. Auto-advance → step 2 shows Review
3. Review has async call (validate dimensions) → awaits
4. Auto-advance → step 3 WCS → awaits
5. Meanwhile user clicks back to step 2 → cancels request 2
6. Step 3 still waiting for data from step 2 (deadlock)

Plan doesn't specify: abort strategy, request cancellation, or dependency injection.

**Recommended Fix:**
1. **Each step is independent; no auto-advance:**
   ```typescript
   // User must click "Next" explicitly
   <button onClick={() => setStep(3)}>Calculate WCS & Next</button>
   ```

2. **Use AbortController per-step:**
   ```typescript
   const wcsAbort = useRef<AbortController | null>(null);
   
   const handleWCSStart = async () => {
     wcsAbort.current?.abort();
     const abort = new AbortController();
     wcsAbort.current = abort;
     try {
       const wcs = await apiCall({signal: abort.signal});
       if (!abort.signal.aborted) setWcs(wcs);
     } catch (e) {
       if (e.name !== 'AbortError') setError(e.message);
     }
   };
   
   // On step change, abort
   useEffect(() => {
     return () => wcsAbort.current?.abort();
   }, [step]);
   ```

3. **Data dependency:** Require previous step completed:
   ```typescript
   const isStep3Enabled = profile !== null && reviewed;
   <button disabled={!isStep3Enabled} onClick={() => startWCS()}>
     {isStep3Enabled ? 'Calculate WCS' : 'Complete steps 1-2 first'}
   </button>
   ```

---

### MEDIUM FINDINGS

#### M1: ProfileMesh Re-renders Every Parent State Change
**Severity:** MEDIUM | **Effort to Fix:** 1-2 days | **Impact:** Performance

If ProfileMesh is rendered within a Three.js canvas, it will re-render on **any** parent state change (step change, form edit, etc.).

Three.js meshes are expensive to rebuild. Solution: memoize.

**Fix:**
```typescript
const ProfileMesh = memo(function ProfileMesh({ profile }: Props) {
  // Generate mesh only when profile changes
  ...
}, (prev, next) => {
  // Memoize if profile deeply equal
  return JSON.stringify(prev.profile) === JSON.stringify(next.profile);
});

export default ProfileMesh;
```

---

#### M2: No Loading States for Slow 3D Rendering
**Severity:** MEDIUM | **Effort to Fix:** 1 day | **Impact:** UX

When user uploads a large DXF (2000+ entities), ProfileMesh may take 500ms-2s to build geometry. No loading indicator.

**Fix:**
```typescript
const [meshLoading, setMeshLoading] = useState(false);

useEffect(() => {
  setMeshLoading(true);
  requestIdleCallback(() => {
    buildMesh();
    setMeshLoading(false);
  });
}, [profile]);

return meshLoading ? <Spinner /> : <mesh ... />;
```

---

#### M3: Step Navigation (Previous/Next) Buttons Not Specified
**Severity:** MEDIUM | **Effort to Fix:** 1 day | **Impact:** UX

Plan shows 6 steps but doesn't specify nav buttons. Can user go backward? Skip steps?

**Implied but unspecified scenarios:**
- User completes step 5, realizes error in step 2, clicks "Back" → does it lose step 5 data?
- User wants to skip step 4 (optimize) → allowed?

**Recommended:**
1. **All steps traversable in both directions:**
   ```tsx
   <div className="flex gap-2">
     <button onClick={() => setStep(step - 1)} disabled={step === 1}>Previous</button>
     <div className="flex-1 text-center text-sm text-slate-500">Step {step} of 6</div>
     <button onClick={() => setStep(step + 1)} disabled={step === 6}>Next</button>
   </div>
   ```

2. **Going back doesn't lose future step data (keep in state):**
   ```typescript
   // Step 5 data preserved when navigating to step 2 and back
   const [all6Steps, setAll6Steps] = useState({
     step1: null, step2: null, ..., step6: null
   });
   ```

---

#### M4: No Progress Indicator or Completion Estimate
**Severity:** MEDIUM | **Effort to Fix:** 1 day | **Impact:** UX

User sees "Step 3 of 6" but doesn't know how long total wizard takes.

**Fix:**
```tsx
<div className="mb-4">
  <div className="flex justify-between text-xs text-slate-500 mb-1">
    <span>Progress</span>
    <span>Est. 5 mins</span>
  </div>
  <progress value={step} max={6} className="w-full" />
</div>
```

---

#### M5: Shared State Between Viewer3D and Form (WCS Gizmo Sync)
**Severity:** MEDIUM | **Effort to Fix:** 2 days | **Impact:** Complexity

If user drags WCSGizmo in 3D viewer, the form fields (X offset, Y offset, etc.) must update in real-time.

This requires shared ref or callback:
```typescript
const [wcs, setWcs] = useState({x: 0, y: 0, z: 0});

// In form: onChange setWcs({x: newVal, ...})
// In gizmo: on drag, setWcs({x: e.position.x, ...})

// Both must stay in sync — easy to miss updates
```

**Fix:**
1. Use a ref to sync both:
   ```typescript
   const wcsRef = useRef(wcs);
   wcsRef.current = wcs;
   // Both form and gizmo read/write wcsRef
   ```

2. Or use separate callbacks:
   ```typescript
   <WCSGizmo
     position={wcs}
     onChange={(newWcs) => setWcs(newWcs)}
   />
   <WCSForm
     wcs={wcs}
     onChange={(newWcs) => setWcs(newWcs)}
   />
   ```

---

#### M6: No Validation on Intermediate Steps
**Severity:** MEDIUM | **Effort to Fix:** 2 days | **Impact:** Data integrity

User advances from step 1 (profile) to step 2 (review) without validation:
- Profile empty? Step 2 allows it → crashes in step 3
- Thickness = 0? Step 2 allows it → invalid toolpath in step 5

**Fix:**
1. **Before advancing, validate:**
   ```typescript
   const handleNext = () => {
     if (step === 1 && !profile) {
       setError('Profile required');
       return;
     }
     if (step === 2 && thickness <= 0) {
       setError('Thickness must be > 0');
       return;
     }
     setStep(step + 1);
   };
   ```

2. **Visual indicator:**
   ```tsx
   <button
     onClick={handleNext}
     disabled={!isStepValid(step)}
     title={validationError}
   >
     Next
   </button>
   ```

---

#### M7: No Test Coverage Plan for Wizard
**Severity:** MEDIUM | **Effort to Fix:** 3-4 days | **Impact:** Regression risk

16 files, 6 steps, 3 async operations per step = massive surface area for bugs.

Current codebase has `vitest` + `playwright` but plan doesn't mention wizard tests.

**Minimum coverage:**
1. **Unit tests (vitest):**
   - Each step component renders without crash
   - Validation logic works
   - State transitions valid

2. **E2E tests (playwright):**
   - Upload DXF → Review → WCS → Toolpath → Optimize → Program
   - Cancel midway
   - Edit step 2, verify step 5 still works (or properly invalidates)
   - Download G-code

---

#### M8: Three.js Materials/Rendering Not Specified
**Severity:** MEDIUM | **Effort to Fix:** 2-3 days | **Impact:** Visual quality

Plan mentions `ProfileMesh`, `WCSGizmo`, `StartHoleMarkers` but doesn't specify:
- What color is profile?
- What color are WCS axes?
- What happens when user selects WCS gizmo (highlight)?
- Transparency? Wireframe?

**Fix:**
1. **Define visual constants:**
   ```typescript
   const MATERIALS = {
     profile: new THREE.MeshStandardMaterial({ color: 0x4a7c59 }),
     wcsAxes: { x: 0xff0000, y: 0x00ff00, z: 0x0000ff },
     startHole: new THREE.MeshPhongMaterial({ color: 0xffaa00 }),
   };
   ```

2. **Test on low-end devices** (laptop from 2015, iPad 6th gen) to ensure 3D doesn't stutter

---

## SUMMARY TABLE

| ID | Finding | Severity | Effort | Impact | Status |
|----|---------|----------|--------|--------|--------|
| C1 | 16 files → merge to 6 | CRITICAL | 2-3d | Maintainability | Blocking |
| C2 | useReducer over-engineered | CRITICAL | 3-4d | Debugging, state bugs | Blocking |
| C3 | ExtrudeGeometry fails on DXF | CRITICAL | 5-7d | Data loss, crash | Blocking |
| C4 | localStorage no versioning | CRITICAL | 2-3d | Data loss | Blocking |
| C5 | Mobile layout not addressed | CRITICAL | 2-3d | Accessibility | Blocking |
| H1 | Bundle impact of 6 chunks | HIGH | 2-3d | Page load | Blocking |
| H2 | Error recovery path unclear | HIGH | 3-4d | User trust | Blocking |
| H3 | No DXF validation | HIGH | 2-3d | Data integrity | Blocking |
| H4 | No undo/redo | HIGH | 5-7d | UX | Non-blocking |
| H5 | Cascading async deadlock | HIGH | 3-4d | Race conditions | Blocking |
| M1 | ProfileMesh re-render | MEDIUM | 1-2d | Performance | Non-blocking |
| M2 | No mesh loading state | MEDIUM | 1d | UX | Non-blocking |
| M3 | Nav buttons unspecified | MEDIUM | 1d | UX | Non-blocking |
| M4 | No progress indicator | MEDIUM | 1d | UX | Non-blocking |
| M5 | Gizmo/form sync | MEDIUM | 2d | Complexity | Non-blocking |
| M6 | No intermediate validation | MEDIUM | 2d | Data integrity | Blocking |
| M7 | No test plan | MEDIUM | 3-4d | Regression | Blocking |
| M8 | Rendering not specified | MEDIUM | 2-3d | Visual quality | Non-blocking |

**Blocking Issues: 10**
**Non-Blocking: 8**
**Total Effort to Fix All: 45-60 days**

---

## RECOMMENDED APPROACH

Instead of implementing the plan as-is, **pivot to a smaller, iterative release:**

### Phase 1: MVP (2 weeks)
1. Merge 16 files → 6-file structure (C1)
2. Replace useReducer with useState (C2)
3. Use 2D profile rendering instead of ExtrudeGeometry (C3)
4. Use URL params instead of localStorage (C4)
5. Mobile-first responsive grid (C5)
6. Add DXF validation (H3)
7. Add error retry pattern (H2)

**Deliverable:** Steps 1-3 (Import → Review → WCS) working, profiles rendered, no 3D geometry complexity.

### Phase 2: Optimization (1 week)
1. Add step 4 (Toolpath) with Monaco editor
2. Add bundle optimization (H1)
3. Add validation & progress UI (M3, M4, M6)

### Phase 3: Polish (1 week)
1. Add step 5-6 (Optimize, Program)
2. Add Gizmo sync (M5)
3. Add tests (M7)
4. Design visual constants (M8)

This reduces initial scope from 16 files + all 6 steps to 6 files + 3 steps, proving pattern before scaling.

---

## FINAL RATING: 42/100

**Why 42?**
- **Strategic value (+30):** Wizard pattern is good, solves real user problem
- **Architecture debt (-30):** 16 files, over-engineered state, broken 3D approach, no mobile plan
- **Execution risk (-20):** 10 blocking issues, 45-60 days effort, high regression surface
- **Recovery path (+12):** Issues are fixable with clear direction, can pivot to MVP

**Recommendation:** Do not implement as specified. Use Phase 1 MVP above, fix critical issues first, then expand.
