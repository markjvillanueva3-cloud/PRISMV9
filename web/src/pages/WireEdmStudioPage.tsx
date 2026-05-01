/**
 * WireEdmStudioPage.tsx — Wire EDM Studio Main Page
 * WEDM-MS0 U-WEDM09 / U-WEDM12
 *
 * Thin page wrapper: renders WedmStudioProvider → WizardShell
 * with step components and ProfileCanvas.
 * Canvas overlays update per-step (WCS crosshair, start holes,
 * toolpath arrows, tab markers).
 *
 * Route: /wire-edm (separate from /edm calculator page)
 */

import { useCallback, useMemo } from "react";
import { WedmStudioProvider, useWedmNavigation, useWedmData } from "../contexts/WedmStudioContext";
import ErrorBoundary from "../components/ErrorBoundary";
import WizardShell from "../components/wedm-studio/WizardShell";
import ProfileCanvas from "../components/wedm-studio/ProfileCanvas";
import StepImport from "../components/wedm-studio/StepImport";
import StepReview from "../components/wedm-studio/StepReview";
import StepWcs from "../components/wedm-studio/StepWcs";
import StepToolpath from "../components/wedm-studio/StepToolpath";
import StepOptimize from "../components/wedm-studio/StepOptimize";
import StepProgram from "../components/wedm-studio/StepProgram";

// ============================================================================
// INNER COMPONENT (needs context)
// ============================================================================

function WireEdmStudioInner() {
  const { currentStep, setCurrentStep } = useWedmNavigation();
  const { steps } = useWedmData();
  const importResult = steps.import;
  const wcsResult = steps.wcs;
  const toolpathResult = steps.toolpath;
  const optimizeResult = steps.optimize;

  // Step navigation callbacks — stable refs
  const advanceToReview = useCallback(() => setCurrentStep("review"), [setCurrentStep]);
  const advanceToWcs = useCallback(() => setCurrentStep("wcs"), [setCurrentStep]);
  const advanceToToolpath = useCallback(() => setCurrentStep("toolpath"), [setCurrentStep]);
  const advanceToOptimize = useCallback(() => setCurrentStep("optimize"), [setCurrentStep]);
  const advanceToProgram = useCallback(() => setCurrentStep("program"), [setCurrentStep]);
  const backToImport = useCallback(() => setCurrentStep("import"), [setCurrentStep]);
  const backToReview = useCallback(() => setCurrentStep("review"), [setCurrentStep]);
  const backToWcs = useCallback(() => setCurrentStep("wcs"), [setCurrentStep]);
  const backToToolpath = useCallback(() => setCurrentStep("toolpath"), [setCurrentStep]);
  const backToOptimize = useCallback(() => setCurrentStep("optimize"), [setCurrentStep]);

  // Step content — WizardShell only renders the active step's content
  // Each step wrapped in ErrorBoundary for isolated error recovery
  const stepContent = useMemo(() => ({
    import: (
      <ErrorBoundary key="eb-import">
        <StepImport onComplete={advanceToReview} isActive />
      </ErrorBoundary>
    ),
    review: (
      <ErrorBoundary key="eb-review">
        <StepReview onComplete={advanceToWcs} onBack={backToImport} isActive />
      </ErrorBoundary>
    ),
    wcs: (
      <ErrorBoundary key="eb-wcs">
        <StepWcs onComplete={advanceToToolpath} onBack={backToReview} isActive />
      </ErrorBoundary>
    ),
    toolpath: (
      <ErrorBoundary key="eb-toolpath">
        <StepToolpath onComplete={advanceToOptimize} onBack={backToWcs} isActive />
      </ErrorBoundary>
    ),
    optimize: (
      <ErrorBoundary key="eb-optimize">
        <StepOptimize onComplete={advanceToProgram} onBack={backToToolpath} isActive />
      </ErrorBoundary>
    ),
    program: (
      <ErrorBoundary key="eb-program">
        <StepProgram onComplete={() => {/* wizard complete */}} onBack={backToOptimize} isActive />
      </ErrorBoundary>
    ),
  }), [advanceToReview, advanceToWcs, advanceToToolpath, advanceToOptimize, advanceToProgram,
    backToImport, backToReview, backToWcs, backToToolpath, backToOptimize]);

  // Canvas — contours + step-specific overlays
  const canvasElement = useMemo(() => {
    if (!importResult?.contours?.length) return undefined;
    return (
      <ProfileCanvas
        contours={importResult.contours}
        issues={importResult.issues}
        wcsOrigin={wcsResult?.origin}
        startHoles={wcsResult?.start_holes}
        toolpathProfiles={toolpathResult?.profiles}
        tabs={toolpathResult?.tabs}
        passes={optimizeResult?.multipass?.passes}
      />
    );
  }, [importResult, wcsResult, toolpathResult, optimizeResult]);

  return (
    <WizardShell
      steps={stepContent}
      canvas={canvasElement}
    />
  );
}

// ============================================================================
// PAGE (provides context)
// ============================================================================

export default function WireEdmStudioPage() {
  return (
    <WedmStudioProvider>
      <div className="h-[calc(100vh-64px)]">
        <WireEdmStudioInner />
      </div>
    </WedmStudioProvider>
  );
}
