# WEDM Type Definition Implementation Checklist

**Purpose:** Track completion of type definitions required for WEDM-MS0 U-WEDM02 to unblock U-WEDM03 API client.

**Audience:** Frontend TypeScript developer implementing wedmStudio.ts

---

## Phase 1: Backend Preparation (Prerequisites)

These must be done BEFORE starting wedmStudio.ts type creation.

### 1.1 Response Specification Document
- [ ] Create `data/wedm-response-spec.json` (45-50 KB)
  - [ ] Section 1: EDMDrawingInterpretationEngine (3 actions + outputs)
  - [ ] Section 2: EDMFeasibilityEngine (3 actions + outputs)
  - [ ] Section 3: EDMMaterialMachineWireEngine (4 actions + outputs)
  - [ ] Section 4: EDMStartHoleSetupEngine (2 actions + outputs)
  - [ ] Section 5: EDMToolpathStrategyEngine (3 actions + outputs)
  - [ ] Section 6: EDMMultiPassStrategyEngine (2 actions + outputs)
  - [ ] Section 7: EDMCuttingParamFlushEngine (3 actions + outputs)
  - [ ] Section 8: EDMWireSlugCornerTaperEngine (3 actions + outputs)
  - [ ] Section 9: EDMMonitorSurfaceIntegrityEngine (3 actions + outputs)
  - [ ] Section 10: EDMPostProcessGCodeEngine (2 actions + outputs)
  - [ ] Section 11: EDMCostDocumentationEngine (3 actions + outputs)
  - [ ] Section 12: EDMQualityOrchestratorEngine (4 actions + outputs)
  - [ ] Each action spec includes: request schema, response schema, example payloads

### 1.2 Backend Schema Exports
- [ ] Update `src/schemas/wedmPipelineActionSchemas.ts`
  - [ ] Add export statement after primitive definitions (line ~38):
    ```typescript
    export const WEDM_SHARED_PRIMITIVES = {
      featureTypeEnum,
      applicationEnum,
      wireTypeEnum,
      controllerEnum,
      passTypeEnum,
      profileTypeEnum,
      partFeature,
      feasibilityFeature,
      workpieceDims,
      profileGeometry,
      profileDef,
      tankSpec,
      startHole,
    };
    ```
  - [ ] Verify all 6 enums are explicitly exported
  - [ ] Add `.describe()` to each primitive explaining purpose

### 1.3 Engine Response Documentation
- [ ] For each of 12 engines, document return type:
  - [ ] EDMDrawingInterpretationEngine.interpret() returns ___?
  - [ ] EDMDrawingInterpretationEngine.classify() returns ___?
  - [ ] EDMDrawingInterpretationEngine.calculatePasses() returns ___?
  - [ ] EDMFeasibilityEngine.assessFeasibility() returns ___?
  - [ ] EDMFeasibilityEngine.checkConductivity() returns ___?
  - [ ] EDMFeasibilityEngine.estimateTime() returns ___?
  - [ ] EDMMaterialMachineWireEngine.assessMaterial() returns ___?
  - [ ] EDMMaterialMachineWireEngine.selectMachine() returns ___?
  - [ ] EDMMaterialMachineWireEngine.selectWire() returns ___?
  - [ ] EDMMaterialMachineWireEngine.fullSelection() returns ___?
  - [ ] EDMStartHoleSetupEngine.planStartHoles() returns ___?
  - [ ] EDMStartHoleSetupEngine.planSetup() returns ___?
  - [ ] EDMToolpathStrategyEngine.generateToolpath() returns ___?
  - [ ] EDMToolpathStrategyEngine.planTabs() returns ___?
  - [ ] EDMToolpathStrategyEngine.optimizeSequence() returns ___?
  - [ ] EDMMultiPassStrategyEngine.planPasses() returns ___?
  - [ ] EDMMultiPassStrategyEngine.fullMultipass() returns ___?
  - [ ] EDMCuttingParamFlushEngine.optimizeParams() returns ___?
  - [ ] EDMCuttingParamFlushEngine.planFlushing() returns ___?
  - [ ] EDMCuttingParamFlushEngine.predictWireBreak() returns ___?
  - [ ] EDMWireSlugCornerTaperEngine.planWireManagement() returns ___?
  - [ ] EDMWireSlugCornerTaperEngine.calculateCorners() returns ___?
  - [ ] EDMWireSlugCornerTaperEngine.solveTaper() returns ___?
  - [ ] EDMMonitorSurfaceIntegrityEngine.monitorProcess() returns ___?
  - [ ] EDMMonitorSurfaceIntegrityEngine.assessSurfaceIntegrity() returns ___?
  - [ ] EDMMonitorSurfaceIntegrityEngine.checkSpec() returns ___?
  - [ ] EDMPostProcessGCodeEngine.planPostProcess() returns ___?
  - [ ] EDMPostProcessGCodeEngine.generateGcode() returns ___?
  - [ ] EDMCostDocumentationEngine.estimateCost() returns ___?
  - [ ] EDMCostDocumentationEngine.generateSetupSheet() returns ___?
  - [ ] EDMCostDocumentationEngine.fullDocumentation() returns ___?
  - [ ] EDMQualityOrchestratorEngine.verifyQuality() returns ___?
  - [ ] EDMQualityOrchestratorEngine.runPipeline() returns ___?
  - [ ] EDMQualityOrchestratorEngine.recordJob() returns ___?
  - [ ] EDMQualityOrchestratorEngine.getRecommendation() returns ___?

---

## Phase 2: Frontend Type File Creation

File: `web/src/types/wedmStudio.ts`

### 2.1 Shared/Utility Types (15 types)
- [ ] `WedmStep` enum (11 steps: import, review, material_machine, feasibility, toolpath, passes, parameters, wire_management, surface_integrity, post_process, cost_docs, quality)
- [ ] `StepStatus` enum ("pending" | "in_progress" | "completed" | "stale" | "error")
- [ ] `InputMethod` enum ("manual" | "file_upload" | "previous_step" | "template")
- [ ] `PipelineResponse<T>` discriminated union:
  ```typescript
  | { success: true; data: T; confidence?: number; source?: string; timestamp?: string }
  | { success: false; error: string; code?: string; timestamp?: string }
  ```
- [ ] `ProfileContour` interface (points[], isClosed, featureType?)
- [ ] `ArcSegment` interface (startX, startY, centerX, centerY, radius, startAngle, endAngle)
- [ ] `BoundingBox` interface (minX, minY, maxX, maxY)
- [ ] `GeometryPoint` interface (x, y)
- [ ] `PartFeature` interface (mirrors Zod schema)
- [ ] `FeasibilityFeature` interface (mirrors Zod schema)
- [ ] `WorkpieceDims` interface (mirrors Zod schema)
- [ ] `ProfileGeometry` interface (mirrors Zod schema)
- [ ] `ProfileDef` interface (mirrors Zod schema)
- [ ] `TankSpec` interface (mirrors Zod schema)
- [ ] `StartHole` interface (mirrors Zod schema)

### 2.2 Enum Types (6 enums + re-exports)
- [ ] `type FeatureType = "profile" | "hole" | "slot" | "cavity" | "contour" | "pocket"`
- [ ] `type WireType = "brass" | "zinc_coated" | "diffusion_annealed" | "coated_brass" | "molybdenum" | "tungsten" | "steel_core"`
- [ ] `type ControllerType = "fanuc" | "sodick" | "makino" | "mitsubishi" | "agiecharmilles" | "accutex"`
- [ ] `type PassType = "rough" | "semi_finish" | "finish" | "super_finish"`
- [ ] `type ProfileType = "closed_external" | "closed_internal" | "open" | "island"`
- [ ] `type ApplicationType = "aerospace" | "medical" | "automotive" | "tooling" | "general"`
- [ ] Export all 6 with `export type` (not as enums; string unions better for TS inference)

### 2.3 Engine 1: EDMDrawingInterpretationEngine (3 types)
- [ ] `interface WedmInterpretDrawingInput` (from Zod schema)
- [ ] `interface WedmInterpretDrawingResult` (from response-spec.json)
- [ ] `interface WedmClassifyFeaturesInput` (from Zod schema)
- [ ] `interface WedmClassifyFeaturesResult` (from response-spec.json)
- [ ] `interface WedmCalculatePassesInput` (from Zod schema)
- [ ] `interface WedmCalculatePassesResult` (from response-spec.json)

### 2.4 Engine 2: EDMFeasibilityEngine (3 types)
- [ ] `interface WedmAssessFeasibilityInput` (from Zod schema)
- [ ] `interface WedmAssessFeasibilityResult` (from response-spec.json)
- [ ] `interface WedmCheckConductivityInput` (from Zod schema)
- [ ] `interface WedmCheckConductivityResult` (from response-spec.json)
- [ ] `interface WedmEstimateTimeInput` (from Zod schema)
- [ ] `interface WedmEstimateTimeResult` (from response-spec.json)

### 2.5 Engine 3: EDMMaterialMachineWireEngine (4 types)
- [ ] `interface WedmAssessMaterialInput` (from Zod schema)
- [ ] `interface WedmAssessMaterialResult` (from response-spec.json)
- [ ] `interface WedmSelectMachineInput` (from Zod schema)
- [ ] `interface WedmSelectMachineResult` (from response-spec.json)
- [ ] `interface WedmSelectWireInput` (from Zod schema)
- [ ] `interface WedmSelectWireResult` (from response-spec.json)
- [ ] `interface WedmFullSelectionInput` (from Zod schema)
- [ ] `interface WedmFullSelectionResult` (from response-spec.json)

### 2.6 Engine 4: EDMStartHoleSetupEngine (2 types)
- [ ] `interface WedmPlanStartHolesInput` (from Zod schema)
- [ ] `interface WedmPlanStartHolesResult` (from response-spec.json)
- [ ] `interface WedmPlanSetupInput` (from Zod schema)
- [ ] `interface WedmPlanSetupResult` (from response-spec.json)

### 2.7 Engine 5: EDMToolpathStrategyEngine (3 types)
- [ ] `interface WedmGenerateToolpathInput` (from Zod schema)
- [ ] `interface WedmGenerateToolpathResult` (from response-spec.json)
- [ ] `interface WedmPlanTabsInput` (from Zod schema)
- [ ] `interface WedmPlanTabsResult` (from response-spec.json)
- [ ] `interface WedmOptimizeSequenceInput` (from Zod schema)
- [ ] `interface WedmOptimizeSequenceResult` (from response-spec.json)

### 2.8 Engine 6: EDMMultiPassStrategyEngine (2 types)
- [ ] `interface WedmPlanPassesInput` (from Zod schema)
- [ ] `interface WedmPlanPassesResult` (from response-spec.json)
- [ ] `interface WedmFullMultipassInput` (from Zod schema)
- [ ] `interface WedmFullMultipassResult` (from response-spec.json)

### 2.9 Engine 7: EDMCuttingParamFlushEngine (3 types)
- [ ] `interface WedmOptimizeParamsInput` (from Zod schema)
- [ ] `interface WedmOptimizeParamsResult` (from response-spec.json)
- [ ] `interface WedmPlanFlushingInput` (from Zod schema)
- [ ] `interface WedmPlanFlushingResult` (from response-spec.json)
- [ ] `interface WedmPredictWireBreakInput` (from Zod schema)
- [ ] `interface WedmPredictWireBreakResult` (from response-spec.json)

### 2.10 Engine 8: EDMWireSlugCornerTaperEngine (3 types)
- [ ] `interface WedmPlanWireManagementInput` (from Zod schema)
- [ ] `interface WedmPlanWireManagementResult` (from response-spec.json)
- [ ] `interface WedmCalculateCornersInput` (from Zod schema)
- [ ] `interface WedmCalculateCornersResult` (from response-spec.json)
- [ ] `interface WedmSolveTaperInput` (from Zod schema)
- [ ] `interface WedmSolveTaperResult` (from response-spec.json)

### 2.11 Engine 9: EDMMonitorSurfaceIntegrityEngine (3 types)
- [ ] `interface WedmMonitorProcessInput` (from Zod schema)
- [ ] `interface WedmMonitorProcessResult` (from response-spec.json)
- [ ] `interface WedmAssessSurfaceIntegrityInput` (from Zod schema)
- [ ] `interface WedmAssessSurfaceIntegrityResult` (from response-spec.json)
- [ ] `interface WedmCheckSpecInput` (from Zod schema)
- [ ] `interface WedmCheckSpecResult` (from response-spec.json)

### 2.12 Engine 10: EDMPostProcessGCodeEngine (2 types)
- [ ] `interface WedmPlanPostProcessInput` (from Zod schema)
- [ ] `interface WedmPlanPostProcessResult` (from response-spec.json)
- [ ] `interface WedmGenerateGcodeInput` (from Zod schema)
- [ ] `interface WedmGenerateGcodeResult` (from response-spec.json)

### 2.13 Engine 11: EDMCostDocumentationEngine (3 types)
- [ ] `interface WedmEstimateCostInput` (from Zod schema)
- [ ] `interface WedmEstimateCostResult` (from response-spec.json)
- [ ] `interface WedmGenerateSetupSheetInput` (from Zod schema)
- [ ] `interface WedmGenerateSetupSheetResult` (from response-spec.json)
- [ ] `interface WedmFullDocumentationInput` (from Zod schema)
- [ ] `interface WedmFullDocumentationResult` (from response-spec.json)

### 2.14 Engine 12: EDMQualityOrchestratorEngine (4 types)
- [ ] `interface WedmVerifyQualityInput` (from Zod schema)
- [ ] `interface WedmVerifyQualityResult` (from response-spec.json)
- [ ] `interface WedmRunPipelineInput` (from Zod schema)
- [ ] `interface WedmRunPipelineResult` (from response-spec.json)
- [ ] `interface WedmRecordJobInput` (from Zod schema)
- [ ] `interface WedmRecordJobResult` (from response-spec.json)
- [ ] `interface WedmGetRecommendationInput` (from Zod schema)
- [ ] `interface WedmGetRecommendationResult` (from response-spec.json)

### 2.15 Union Types for API Layer
- [ ] `type WedmActionInput` = union of all 35 input interfaces
- [ ] `type WedmActionResult` = union of all 35 result interfaces
- [ ] `type WedmActionName` = union of all 35 action names (string literal)

### 2.16 API Response Types
- [ ] `type ApiResponse<T>` = `PipelineResponse<T>`
- [ ] `type ApiError` interface (matches backend ApiError)

### 2.17 Context Types
- [ ] `interface WedmStepData` (maps WedmStep → input/result pair)
- [ ] `interface WedmPipelineState` (current step, all results so far, errors)

---

## Phase 3: Type Validation

### 3.1 Compilation Checks
- [ ] Run `tsc --noEmit` in `mcp-server` directory
  - [ ] All Zod schema imports resolve
  - [ ] No circular dependencies
  - [ ] All exported types are used or marked intentionally exported
- [ ] Run `tsc --noEmit` in `web` directory
  - [ ] All type imports resolve
  - [ ] No `any` types appear (except explicit comments)
  - [ ] `strict: true` mode passes
  - [ ] No unused type declarations

### 3.2 Interface Completeness
- [ ] For EACH of 35 actions, verify:
  - [ ] Input interface has all fields from Zod schema
  - [ ] Input interface field types match Zod validators
  - [ ] Input interface optional/required matches Zod `.optional()`
  - [ ] Result interface defined and documented
  - [ ] Result interface matches documented response shape
  - [ ] PipelineResponse<Result> type is correct

### 3.3 Enum Coverage
- [ ] All 6 enums imported/re-exported in types file
- [ ] Verify enum values match backend Zod definitions exactly
  - [ ] featureType: 6 values
  - [ ] wireType: 7 values
  - [ ] controller: 6 values
  - [ ] passType: 4 values
  - [ ] profileType: 4 values
  - [ ] application: 5 values

### 3.4 No Any Types
- [ ] Search file for "any" keyword: should be 0 matches (or doc comments only)
- [ ] All parameters typed
- [ ] All return types specified
- [ ] All object fields typed

---

## Phase 4: Integration Testing

### 4.1 Type Inference Tests
- [ ] Create test file: `web/src/types/__tests__/wedmStudio.test.ts`
  - [ ] Test 1: Input type can be created without errors
    ```typescript
    const input: WedmInterpretDrawingInput = { ... }
    ```
  - [ ] Test 2: Result type can be assigned from response
    ```typescript
    const result: WedmInterpretDrawingResult = apiResponse.data
    ```
  - [ ] Test 3: PipelineResponse discriminates correctly
    ```typescript
    if (response.success) { response.data.xxx } else { response.error }
    ```
  - [ ] Test 4: Union types work for API routing
    ```typescript
    function dispatch(action: WedmActionName, input: WedmActionInput)
    ```

### 4.2 Response Shape Validation
- [ ] For each engine, verify result type fields are exhaustive
- [ ] No missing fields vs actual API responses
- [ ] No extra fields in type (use `Partial<T>` if needed)

### 4.3 Enum Type Safety
- [ ] All enum usages type-check properly
- [ ] No string-to-enum coercions needed
- [ ] Discriminated unions (e.g., by featureType) work

---

## Phase 5: Documentation & Export

### 5.1 Export Statements
- [ ] At end of wedmStudio.ts, add:
  ```typescript
  // Input types
  export type {
    WedmInterpretDrawingInput,
    WedmClassifyFeaturesInput,
    // ... all 35 input types
  };

  // Result types
  export type {
    WedmInterpretDrawingResult,
    WedmClassifyFeaturesResult,
    // ... all 35 result types
  };

  // Shared types
  export type {
    WedmStep,
    StepStatus,
    InputMethod,
    ProfileContour,
    ArcSegment,
    BoundingBox,
    // ... all shared types
  };

  // Enums
  export type {
    FeatureType,
    WireType,
    ControllerType,
    PassType,
    ProfileType,
    ApplicationType,
  };
  ```

### 5.2 JSDoc Comments
- [ ] Add JSDoc to each interface explaining:
  - [ ] Purpose (which action/engine)
  - [ ] Example usage
  - [ ] Required fields (if not obvious)
  - [ ] Constraints (e.g., tolerance > 0)
  - [ ] Related types

### 5.3 Type Index
- [ ] Create index comments at top of wedmStudio.ts:
  ```typescript
  /**
   * WEDM Studio Type Definitions
   *
   * ### Actions (35 total)
   * - Engine 1: EDMDrawingInterpretationEngine
   *   - WedmInterpretDrawingInput/Result
   *   - WedmClassifyFeaturesInput/Result
   *   - WedmCalculatePassesInput/Result
   * - Engine 2: EDMFeasibilityEngine
   *   ...
   */
  ```

---

## Phase 6: Exit Gate Verification

BEFORE marking U-WEDM02 complete, verify ALL of:

- [ ] **File exists:** `web/src/types/wedmStudio.ts` (must exist)
- [ ] **Type count:** File contains 70+ type definitions
- [ ] **Compilation:** `tsc --noEmit` passes on both mcp-server and web
- [ ] **Input types:** All 35 input interfaces defined
- [ ] **Output types:** All 35 result interfaces defined
- [ ] **Shared types:** 15+ utility types (WedmStep, ProfileContour, etc.)
- [ ] **Enum alignment:** All 6 enums re-exported or mirrored
- [ ] **No any types:** Zero `any` keyword (except doc comments)
- [ ] **Union types:** WedmActionInput, WedmActionResult work
- [ ] **Discriminator:** PipelineResponse<T> properly discriminates
- [ ] **Import validation:** No circular imports, all imports resolve
- [ ] **Documentation:** JSDoc on all interfaces
- [ ] **Tests:** Type inference tests pass (basic smoke tests)
- [ ] **Response spec:** data/wedm-response-spec.json exists and documents all 35 outputs
- [ ] **Backend exports:** src/schemas/wedmPipelineActionSchemas.ts exports enums/primitives
- [ ] **omega_floor >= 0.85:** Overall code quality gate met
- [ ] **SVI delta: +1%:** System validity improvement measured

---

## Rollback Plan (if needed)

If U-WEDM02 must be aborted:
```bash
rm web/src/types/wedmStudio.ts
git checkout -- mcp-server/src/schemas/wedmPipelineActionSchemas.ts
rm data/wedm-response-spec.json
```

---

## Success Criteria (Final Checklist)

U-WEDM02 is complete when:

1. ✓ File `web/src/types/wedmStudio.ts` exists and compiles
2. ✓ All 35 action input types defined
3. ✓ All 35 action result types defined (from response-spec.json)
4. ✓ PipelineResponse<T> has success/error discrimination
5. ✓ No `any` types in entire file
6. ✓ `tsc --noEmit` passes on both mcp-server and web
7. ✓ All 6 enums properly exported/available
8. ✓ JSDoc comments on all major types
9. ✓ Response spec document exists (data/wedm-response-spec.json)
10. ✓ Backend exports shared primitives

Once this checklist is 100% complete: **WEDM-MS0 U-WEDM02 → DONE**

Then U-WEDM03 (API client) can begin with full type safety.

---

**Completed by:** _______________
**Completion date:** _______________
**Reviewed by:** _______________
**Approval date:** _______________
