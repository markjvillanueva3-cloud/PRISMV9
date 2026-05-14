import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useUnifiedOrchestrator } from '../../hooks/useUnifiedOrchestrator';
import {
  ActionButton,
  PanelCard,
  StatusPill,
} from '../workspace/WorkspacePrimitives';

export interface CalculatorBackendAiReviewProps {
  solveStateReady: boolean;
  machineModeLabel: string;
  solveSourceLabel: string;
  resultHeading: string;
  resultSummary: string;
  resultGuidance: string;
  resultConfidencePct: number;
  resultSignals: string[];
  solveWarnings: string[];
  selectedMachineTitle: string;
  selectedMachineConnection?: string | null;
  selectedMaterial?: string | null;
  selectedTool?: string | null;
  selectedToolpath?: string | null;
  selectedProgramming?: string | null;
  workflowPacketId?: string | null;
  workflowFocusId?: string | null;
  releaseSupported: boolean;
  toolpathSupported: boolean;
  releaseNote?: string | null;
  toolpathNote?: string | null;
  preflightNotes: string[];
  machineLimitingFactors: string[];
  toolLimitingFactors: string[];
  inventoryCoveragePct?: number | null;
  backendResultLabel: string;
  backendResultDetail?: string | null;
}

function pushUnique(values: string[], candidate: string | null | undefined) {
  const trimmed = candidate?.trim();
  if (!trimmed || values.includes(trimmed)) {
    return;
  }
  values.push(trimmed);
}

function summarizeContext(value: unknown, depth = 0): string {
  if (value == null || depth > 2) {
    return String(value);
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    const preview = value
      .slice(0, 3)
      .map((entry) => summarizeContext(entry, depth + 1))
      .join(',');
    return `arr(${value.length})[${preview}]`;
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return Object.keys(record)
      .sort()
      .slice(0, 10)
      .map((key) => `${key}:${summarizeContext(record[key], depth + 1)}`)
      .join('|');
  }

  return typeof value;
}

function toneForSolveSource(label: string) {
  if (/quick/i.test(label)) return 'amber' as const;
  if (/machine-aware|full/i.test(label)) return 'emerald' as const;
  if (/no solve/i.test(label)) return 'slate' as const;
  return 'sky' as const;
}

function toneForRelease(readiness: boolean) {
  return readiness ? ('emerald' as const) : ('amber' as const);
}

export function CalculatorBackendAiReview(props: CalculatorBackendAiReviewProps) {
  const orchestrator = useUnifiedOrchestrator();
  const [planning, setPlanning] = useState(false);
  const [planningError, setPlanningError] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const lastReviewKeyRef = useRef<string | null>(null);
  const orchestratorRef = useRef(orchestrator);
  const resultSignalsSignature = props.resultSignals.join('|');
  const solveWarningsSignature = props.solveWarnings.join('|');
  const preflightNotesSignature = props.preflightNotes.join('|');
  const machineLimitingFactorsSignature = props.machineLimitingFactors.join('|');
  const toolLimitingFactorsSignature = props.toolLimitingFactors.join('|');

  useEffect(() => {
    orchestratorRef.current = orchestrator;
  }, [orchestrator]);

  const reviewContext = useMemo(
    () => ({
      desk: 'calculator_backend_review',
      appw_stage: 'APPW-MS1 calculator backend-ai convergence',
      solve_state_ready: props.solveStateReady,
      machine_mode_label: props.machineModeLabel,
      solve_source_label: props.solveSourceLabel,
      result_heading: props.resultHeading,
      result_summary: props.resultSummary,
      result_guidance: props.resultGuidance,
      result_confidence_pct: props.resultConfidencePct,
      result_signals: props.resultSignals,
      solve_warnings: props.solveWarnings,
      selected_machine_title: props.selectedMachineTitle,
      selected_machine_connection: props.selectedMachineConnection,
      selected_material: props.selectedMaterial,
      selected_tool: props.selectedTool,
      selected_toolpath: props.selectedToolpath,
      selected_programming: props.selectedProgramming,
      workflow_packet_id: props.workflowPacketId,
      workflow_focus_id: props.workflowFocusId,
      release_supported: props.releaseSupported,
      toolpath_supported: props.toolpathSupported,
      release_note: props.releaseNote,
      toolpath_note: props.toolpathNote,
      preflight_notes: props.preflightNotes,
      machine_limiting_factors: props.machineLimitingFactors,
      tool_limiting_factors: props.toolLimitingFactors,
      inventory_coverage_pct: props.inventoryCoveragePct ?? null,
      backend_result_label: props.backendResultLabel,
      backend_result_detail: props.backendResultDetail,
    }),
    [
      props.backendResultDetail,
      props.backendResultLabel,
      props.inventoryCoveragePct,
      props.machineModeLabel,
      props.releaseNote,
      props.releaseSupported,
      props.resultConfidencePct,
      props.resultGuidance,
      props.resultHeading,
      props.resultSummary,
      props.selectedMachineConnection,
      props.selectedMachineTitle,
      props.selectedMaterial,
      props.selectedProgramming,
      props.selectedTool,
      props.selectedToolpath,
      props.solveSourceLabel,
      props.solveStateReady,
      props.toolpathNote,
      props.toolpathSupported,
      props.workflowFocusId,
      props.workflowPacketId,
      machineLimitingFactorsSignature,
      preflightNotesSignature,
      resultSignalsSignature,
      solveWarningsSignature,
      toolLimitingFactorsSignature,
    ],
  );

  const reviewIntent = useMemo(() => {
    return `Review the current calculator backend build for release readiness. Use the live solve source, backend preflight, machine legality, tooling posture, workflow continuity, and result confidence to decide whether this setup should be released, refined, or handed to another PRISM desk next.`;
  }, []);

  const reviewKey = useMemo(
    () =>
      [
        props.solveStateReady ? 'ready' : 'staged',
        props.machineModeLabel,
        props.solveSourceLabel,
        props.resultHeading,
        props.resultSummary,
        props.resultConfidencePct,
        props.selectedMachineTitle,
        props.selectedMaterial ?? '',
        props.selectedTool ?? '',
        props.selectedToolpath ?? '',
        props.selectedProgramming ?? '',
        props.workflowPacketId ?? '',
        summarizeContext(reviewContext),
      ].join('|'),
    [
      props.machineModeLabel,
      props.resultConfidencePct,
      props.resultHeading,
      props.resultSummary,
      props.selectedMachineTitle,
      props.selectedMaterial,
      props.selectedProgramming,
      props.selectedTool,
      props.selectedToolpath,
      props.solveSourceLabel,
      props.solveStateReady,
      props.workflowPacketId,
      reviewContext,
    ],
  );

  const recommendationHighlights = useMemo(() => {
    const bucket: string[] = [];
    (orchestrator.data?.recommendations ?? []).forEach((recommendation) => pushUnique(bucket, recommendation));

    const finalResult = orchestrator.data?.final_result;
    if (typeof finalResult === 'string') {
      pushUnique(bucket, finalResult);
    } else if (finalResult && typeof finalResult === 'object') {
      const record = finalResult as Record<string, unknown>;
      pushUnique(bucket, typeof record.summary === 'string' ? record.summary : null);
      pushUnique(bucket, typeof record.recommendation === 'string' ? record.recommendation : null);
      pushUnique(bucket, typeof record.reason === 'string' ? record.reason : null);
    }

    return bucket.slice(0, 4);
  }, [orchestrator.data?.final_result, orchestrator.data?.recommendations]);

  const domainHighlights = useMemo(() => {
    const bucket: string[] = [];
    (orchestrator.routing?.domains ?? []).forEach((domain) => pushUnique(bucket, domain));
    (orchestrator.classification?.domains ?? []).forEach((domain) => pushUnique(bucket, domain));
    (orchestrator.data?.domain_results ?? []).forEach((domainResult) => pushUnique(bucket, domainResult.domain));
    return bucket.slice(0, 5);
  }, [orchestrator.classification?.domains, orchestrator.data?.domain_results, orchestrator.routing?.domains]);

  const reviewAvailable = props.solveStateReady && !/no solve/i.test(props.solveSourceLabel);

  const runReview = useCallback(
    async (force = false) => {
      if (!reviewAvailable) {
        return;
      }
      if (!force && lastReviewKeyRef.current === reviewKey) {
        return;
      }

      lastReviewKeyRef.current = reviewKey;
      setReviewError(null);

      const input = {
        intent: reviewIntent,
        context: reviewContext,
        constraints: {
          allow_escalation: true,
          required_tier: 'full_chain' as const,
          required_domains: ['operations', 'manufacturing', 'commerce'],
        },
      };

      try {
        const activeOrchestrator = orchestratorRef.current;
        await Promise.all([
          activeOrchestrator.classify(reviewIntent, reviewContext),
          activeOrchestrator.route(input),
        ]);
        await activeOrchestrator.execute(input);
      } catch (issue) {
        setReviewError(issue instanceof Error ? issue.message : 'Backend AI review failed');
      }
    },
    [reviewAvailable, reviewContext, reviewIntent, reviewKey],
  );

  useEffect(() => {
    if (!reviewAvailable) {
      if (lastReviewKeyRef.current !== null || reviewError !== null || planningError !== null) {
        lastReviewKeyRef.current = null;
        orchestratorRef.current.reset();
        setReviewError(null);
        setPlanningError(null);
      }
      return;
    }

    if (lastReviewKeyRef.current === reviewKey) {
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      if (!cancelled) {
        await runReview();
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [planningError, reviewAvailable, reviewError, reviewKey, runReview]);

  const handlePreviewRoute = useCallback(async () => {
    if (!reviewAvailable) {
      return;
    }

    setPlanning(true);
    setPlanningError(null);
    try {
      const activeOrchestrator = orchestratorRef.current;
      await Promise.all([
        activeOrchestrator.classify(reviewIntent, reviewContext),
        activeOrchestrator.route({
          intent: reviewIntent,
          context: reviewContext,
          constraints: {
            allow_escalation: true,
            required_tier: 'full_chain',
            required_domains: ['operations', 'manufacturing', 'commerce'],
          },
        }),
      ]);
    } catch (issue) {
      setPlanningError(issue instanceof Error ? issue.message : 'Route preview failed');
    } finally {
      setPlanning(false);
    }
  }, [reviewAvailable, reviewContext, reviewIntent]);

  return (
    <div data-testid="calculator-backend-ai-review">
      <PanelCard
        title="Backend AI review"
        subtitle="Unified PRISM AI reviews the live calculator backend build, not just the browser state."
      >
        <div className="space-y-4">
          <div className="rounded-[22px] border border-cyan-300/16 bg-cyan-300/[0.08] px-4 py-4 text-sm leading-6 text-cyan-50/90">
            {reviewAvailable
              ? `The backend solve is live. PRISM can now reason over release risk, downstream routing, and machine-tooling continuity for ${props.selectedMachineTitle}.`
              : 'Run a live backend solve to unlock the PRISM backend release review for this calculator setup.'}
          </div>

          <div className="flex flex-wrap gap-2">
            <StatusPill label={props.machineModeLabel} tone="slate" />
            <StatusPill label={props.solveSourceLabel} tone={toneForSolveSource(props.solveSourceLabel)} />
            <StatusPill
              label={props.releaseSupported && props.toolpathSupported ? 'Release continuity ready' : 'Release continuity constrained'}
              tone={toneForRelease(props.releaseSupported && props.toolpathSupported)}
            />
            {props.inventoryCoveragePct != null ? (
              <StatusPill label={`${props.inventoryCoveragePct.toFixed(1)}% crib coverage`} tone="sky" />
            ) : null}
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(260px,0.85fr)]">
            <div className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Live backend build</div>
              <div className="mt-3 text-lg font-semibold text-slate-50">{props.backendResultLabel}</div>
              <div className="mt-2 text-sm leading-6 text-slate-300">
                {props.backendResultDetail ?? props.resultSummary}
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/8 bg-slate-950/60 px-3 py-3">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Machine</div>
                  <div className="mt-2 text-sm font-semibold text-slate-100">{props.selectedMachineTitle}</div>
                  <div className="mt-1 text-xs text-slate-400">{props.selectedMachineConnection ?? 'Machine connection pending'}</div>
                </div>
                <div className="rounded-2xl border border-white/8 bg-slate-950/60 px-3 py-3">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Release gate</div>
                  <div className="mt-2 text-sm font-semibold text-slate-100">{props.resultHeading}</div>
                  <div className="mt-1 text-xs text-slate-400">{props.resultConfidencePct}% confidence</div>
                </div>
              </div>
            </div>

            <div className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Backend preflight and workflow</div>
              <div className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                <div>{props.preflightNotes.length ? `${props.preflightNotes.length} backend preflight note(s) are active.` : 'No backend preflight exceptions are active.'}</div>
                <div>{props.releaseNote ?? 'Release route note unavailable.'}</div>
                <div>{props.toolpathNote ?? 'Toolpath route note unavailable.'}</div>
                <div>
                  Packet {props.workflowPacketId ?? 'pending'} / Focus {props.workflowFocusId ?? 'pending'}
                </div>
              </div>
            </div>
          </div>

          {orchestrator.classification || orchestrator.routing ? (
            <div className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Backend AI route</div>
                  <div className="mt-2 text-sm text-slate-300">
                    {orchestrator.classification?.category ?? 'classification pending'}
                    {orchestrator.classification?.subcategory ? ` / ${orchestrator.classification.subcategory}` : ''}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {orchestrator.routing?.tier ? <StatusPill label={`Tier ${orchestrator.routing.tier}`} tone="sky" /> : null}
                  {orchestrator.classification?.confidence != null ? (
                    <StatusPill label={`${Math.round(orchestrator.classification.confidence * 100)}% intent confidence`} tone="violet" />
                  ) : null}
                </div>
              </div>
              {domainHighlights.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {domainHighlights.map((domain) => (
                    <StatusPill key={domain} label={domain} tone="slate" />
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {recommendationHighlights.length > 0 ? (
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Backend AI recommendations</div>
              <div className="mt-3 grid gap-2">
                {recommendationHighlights.map((recommendation) => (
                  <div
                    key={recommendation}
                    className="rounded-2xl border border-emerald-300/14 bg-emerald-300/[0.06] px-4 py-3 text-sm leading-6 text-emerald-50/90"
                  >
                    {recommendation}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {reviewError || planningError || orchestrator.error ? (
            <div className="rounded-2xl border border-rose-400/25 bg-rose-400/[0.08] px-4 py-3 text-sm leading-6 text-rose-100">
              {reviewError ?? planningError ?? orchestrator.error}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <ActionButton onClick={() => void handlePreviewRoute()} disabled={!reviewAvailable || planning || orchestrator.loading} tone="amber">
              {planning ? 'Previewing...' : 'Preview backend route'}
            </ActionButton>
            <ActionButton onClick={() => void runReview(true)} disabled={!reviewAvailable || orchestrator.loading} tone="emerald">
              {orchestrator.loading ? 'Reviewing...' : 'Refresh backend AI review'}
            </ActionButton>
          </div>
        </div>
      </PanelCard>
    </div>
  );
}

export default CalculatorBackendAiReview;
