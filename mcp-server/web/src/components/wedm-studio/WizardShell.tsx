/**
 * WizardShell.tsx — Wire EDM Studio Wizard Container
 * WEDM-MS0 U-WEDM09
 *
 * Owns:
 *   - Step indicator (horizontal, aria-current='step')
 *   - 30/70 layout split (form panel / canvas panel)
 *   - Keyboard navigation (Ctrl+Left/Right, Alt+1-6)
 *   - Step-barrier logic (can't skip ahead past incomplete steps)
 *   - Focus management on step transitions
 *
 * WCAG 2.1 AA:
 *   - aria-current='step' on active step
 *   - Screen reader announcements for step changes
 *   - prefers-reduced-motion guard
 *   - 44x44px minimum touch targets
 *   - Alt+1-6 shortcuts with preventDefault
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useWedmNavigation, useWedmData } from "../../contexts/WedmStudioContext";
import { useUndoStack } from "../../hooks/useUndoStack";
import type { WedmStep, StepStatus } from "../../types/wedmStudio";

// ============================================================================
// CONSTANTS
// ============================================================================

const STEPS: { id: WedmStep; label: string; shortLabel: string }[] = [
  { id: "import", label: "Import", shortLabel: "1" },
  { id: "review", label: "Review & Setup", shortLabel: "2" },
  { id: "wcs", label: "WCS & Start Holes", shortLabel: "3" },
  { id: "toolpath", label: "Toolpath", shortLabel: "4" },
  { id: "optimize", label: "Optimize", shortLabel: "5" },
  { id: "program", label: "Program", shortLabel: "6" },
];

const STATUS_COLORS: Record<StepStatus, string> = {
  pending: "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400",
  active: "bg-blue-600 text-white ring-2 ring-blue-300",
  complete: "bg-green-500 text-white",
  stale: "bg-yellow-400 text-yellow-900",
  error: "bg-red-500 text-white",
};

const STATUS_LABELS: Record<StepStatus, string> = {
  pending: "Not started",
  active: "Current step",
  complete: "Complete",
  stale: "Needs update",
  error: "Has errors",
};

// ============================================================================
// PROPS
// ============================================================================

export interface WizardStepProps {
  onComplete: () => void;
  onBack?: () => void;
  isActive: boolean;
  stepIndex: number;
}

interface WizardShellProps {
  /** Step components keyed by WedmStep */
  steps: Partial<Record<WedmStep, ReactNode>>;
  /** Canvas panel content */
  canvas?: ReactNode;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function WizardShell({ steps: stepContent, canvas }: WizardShellProps) {
  const {
    currentStep,
    stepStatus,
    setCurrentStep,
  } = useWedmNavigation();

  const { getJobRecord, steps: stepData, setStepData } = useWedmData();
  const formPanelRef = useRef<HTMLDivElement>(null);
  const liveRegionRef = useRef<HTMLDivElement>(null);
  const [mobilePanel, setMobilePanel] = useState<"form" | "canvas">("form");

  // Per-step undo stack (10 levels) — resets on step navigation
  const undoStack = useUndoStack(stepData, 10);
  const prevStepRef = useRef(currentStep);
  useEffect(() => {
    if (prevStepRef.current !== currentStep) {
      undoStack.reset(stepData);
      prevStepRef.current = currentStep;
    }
  }, [currentStep, stepData, undoStack]);

  // ── Step Navigation ────────────────────────────────────────────────────
  const currentIndex = STEPS.findIndex(s => s.id === currentStep);

  const canNavigateTo = useCallback((step: WedmStep): boolean => {
    const targetIdx = STEPS.findIndex(s => s.id === step);
    if (targetIdx === 0) return true; // always can go to import

    // Can go back to any completed/stale step
    const status = stepStatus[step];
    if (status === "complete" || status === "stale" || status === "error") return true;

    // Can go forward only if all preceding steps are complete
    for (let i = 0; i < targetIdx; i++) {
      const prevStatus = stepStatus[STEPS[i].id];
      if (prevStatus !== "complete" && prevStatus !== "stale") return false;
    }
    return true;
  }, [stepStatus]);

  const navigateTo = useCallback((step: WedmStep) => {
    if (!canNavigateTo(step)) return;
    setCurrentStep(step);
    // Announce to screen readers
    const stepInfo = STEPS.find(s => s.id === step);
    if (liveRegionRef.current && stepInfo) {
      liveRegionRef.current.textContent = `Step ${stepInfo.shortLabel}: ${stepInfo.label}`;
    }
    // Focus management: focus first interactive element in form panel
    requestAnimationFrame(() => {
      const firstInput = formPanelRef.current?.querySelector<HTMLElement>(
        'input, select, textarea, button, a[href], [tabindex]:not([tabindex="-1"])',
      );
      firstInput?.focus();
    });
  }, [canNavigateTo, setCurrentStep]);

  const goNext = useCallback(() => {
    if (currentIndex < STEPS.length - 1) {
      navigateTo(STEPS[currentIndex + 1].id);
    }
  }, [currentIndex, navigateTo]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      navigateTo(STEPS[currentIndex - 1].id);
    }
  }, [currentIndex, navigateTo]);

  // ── Keyboard Navigation ────────────────────────────────────────────────
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey && e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.ctrlKey && e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      } else if (e.ctrlKey && !e.shiftKey && e.key === "z") {
        e.preventDefault();
        if (undoStack.undo()) {
          if (liveRegionRef.current) liveRegionRef.current.textContent = "Undo";
        }
      } else if ((e.ctrlKey && e.key === "y") || (e.ctrlKey && e.shiftKey && e.key === "z")) {
        e.preventDefault();
        if (undoStack.redo()) {
          if (liveRegionRef.current) liveRegionRef.current.textContent = "Redo";
        }
      } else if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        // Trigger immediate save by reading current record (forces autosave flush)
        getJobRecord();
        if (liveRegionRef.current) {
          liveRegionRef.current.textContent = "Session saved";
        }
      } else if (e.key === "Escape") {
        // Close any open tooltips by blurring active element
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      }
      if (e.altKey && e.key >= "1" && e.key <= "6") {
        e.preventDefault();
        const idx = parseInt(e.key) - 1;
        if (idx < STEPS.length) {
          navigateTo(STEPS[idx].id);
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrev, navigateTo, getJobRecord, undoStack]);

  // prefers-reduced-motion: reactive to OS changes
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Screen reader live region */}
      <div ref={liveRegionRef} aria-live="polite" aria-atomic="true" className="sr-only" />

      {/* ── Step Indicator ──────────────────────────────────────────────── */}
      <nav aria-label="Wizard steps" className="flex-shrink-0 px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <ol className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
          {STEPS.map((step, idx) => {
            const status = stepStatus[step.id];
            const isCurrent = step.id === currentStep;
            const accessible = canNavigateTo(step.id);

            return (
              <li key={step.id} className="flex items-center">
                {idx > 0 && (
                  <div className={`w-4 sm:w-8 h-px mx-1 ${
                    stepStatus[STEPS[idx - 1].id] === "complete" ? "bg-green-400" : "bg-slate-200 dark:bg-slate-700"
                  }`} />
                )}
                <button
                  onClick={() => navigateTo(step.id)}
                  disabled={!accessible}
                  aria-current={isCurrent ? "step" : undefined}
                  aria-label={`Step ${idx + 1}: ${step.label} — ${STATUS_LABELS[status]}`}
                  title={`${step.label} (Alt+${idx + 1})`}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors min-h-[44px] min-w-[44px] justify-center ${
                    STATUS_COLORS[status]
                  } ${accessible ? "cursor-pointer hover:opacity-90" : "cursor-not-allowed opacity-40"} ${
                    prefersReducedMotion ? "" : "transition-all duration-200"
                  }`}
                >
                  <span className="w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold bg-white/20">
                    {status === "complete" ? "\u2713" : status === "error" ? "!" : step.shortLabel}
                  </span>
                  <span className="hidden sm:inline">{step.label}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* ── Mobile Panel Toggle (below lg) ──────────────────────────────── */}
      <div className="lg:hidden flex border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <button
          onClick={() => setMobilePanel("form")}
          className={`flex-1 py-2 text-xs font-medium text-center min-h-[44px] ${
            mobilePanel === "form"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-slate-500 hover:text-slate-700"
          }`}
          aria-pressed={mobilePanel === "form"}
        >
          Settings
        </button>
        <button
          onClick={() => setMobilePanel("canvas")}
          className={`flex-1 py-2 text-xs font-medium text-center min-h-[44px] ${
            mobilePanel === "canvas"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-slate-500 hover:text-slate-700"
          }`}
          aria-pressed={mobilePanel === "canvas"}
        >
          Preview
        </button>
      </div>

      {/* ── Main Content: 30/70 Split ──────────────────────────────────── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Form Panel (30% on desktop, full on mobile when selected) */}
        <div
          ref={formPanelRef}
          className={`lg:w-[30%] lg:min-w-[280px] lg:max-w-[400px] overflow-y-auto p-4 border-r border-slate-200 dark:border-slate-700 ${
            mobilePanel !== "form" ? "hidden lg:block" : ""
          }`}
          role="region"
          aria-label={`Step ${currentIndex + 1}: ${STEPS[currentIndex]?.label ?? ""}`}
        >
          {stepContent[currentStep] ?? (
            <div className="flex items-center justify-center h-full text-sm text-slate-400">
              Step not yet implemented
            </div>
          )}
        </div>

        {/* Canvas Panel (70% on desktop, full on mobile when selected) */}
        <div
          className={`flex-1 overflow-hidden bg-slate-50 dark:bg-slate-900 ${
            mobilePanel !== "canvas" ? "hidden lg:block" : ""
          }`}
          role="region"
          aria-label={`Wire EDM profile view — ${STEPS[currentIndex]?.label ?? ""} step — use mouse wheel to zoom, drag to pan`}
        >
          {canvas ?? (
            <div className="flex items-center justify-center h-full text-sm text-slate-400">
              Upload a file to see the profile preview
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
