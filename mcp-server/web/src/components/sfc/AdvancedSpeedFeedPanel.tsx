/**
 * AdvancedSpeedFeedPanel -- exposes the full 9-axis SpeedFeedOrchestrator
 * (8 resolvers + Monte Carlo UQ) on the standalone SFC page, reusing the page's
 * already-selected material / operation / tool / params (no duplicate inputs).
 * Renders core metrics PLUS the release posture + confidence + limiting factors
 * (oscar soul: never publish a speed/feed without its uncertainty + advisory).
 * Result mapping reuses the proven normalize/classify contract (calculatorSpeedFeedContract).
 * Mounted behind a `sfc.nine_axis` FeatureGate by SfcCalculatorPage.
 */
import { useCallback, useEffect, useMemo } from 'react';
import { Button } from '../ui';
import { useSpeedFeedOrchestrate } from '../../hooks/useSpeedFeed';
import {
  normalizeCalculatorSpeedFeedResult,
  classifyCalculatorResultSafetyPosture,
  type CalculatorResultSafetyAssessment,
} from '../../utils/calculatorSpeedFeedContract';
import { toAdvancedSpeedFeedParams } from './advancedSpeedFeedParams';
import type { MaterialEntry } from '../../data/materials';
import type { OperationType } from '../../data/operations';
import type { CuttingToolEntry } from '../../data/tools';
import type { SfcParams } from './ParameterPanel';

export interface AdvancedSpeedFeedPanelProps {
  material: MaterialEntry | null;
  operation: OperationType | null;
  tool: CuttingToolEntry | null;
  params: SfcParams;
}

const TONE: Record<CalculatorResultSafetyAssessment['tone'], string> = {
  slate: 'border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-300',
  emerald: 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  amber: 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  rose: 'border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
};

function Metric({
  label,
  value,
  unit,
  decimals = 1,
}: {
  label: string;
  value?: number;
  unit: string;
  decimals?: number;
}) {
  const display =
    typeof value === 'number' && Number.isFinite(value)
      ? value > 0 && value < 0.01
        ? value.toExponential(2)
        : value.toFixed(decimals)
      : '--';
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 text-center dark:border-slate-700 dark:bg-slate-800">
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      <div className="font-mono text-lg font-bold text-slate-900 dark:text-slate-100">{display}</div>
      <div className="text-xs text-slate-400">{unit}</div>
    </div>
  );
}

export default function AdvancedSpeedFeedPanel({
  material,
  operation,
  tool,
  params,
}: AdvancedSpeedFeedPanelProps) {
  const orchestrate = useSpeedFeedOrchestrate();
  const ready = Boolean(material && operation);

  const run = useCallback(() => {
    if (!material || !operation) return;
    void orchestrate.execute(toAdvancedSpeedFeedParams(material, operation, params, tool));
  }, [material, operation, tool, params, orchestrate]);

  // Clear a completed solve when the inputs change, so the operator never reads
  // a prior result + release posture against new selections (scrutiny P2).
  // `orchestrate.reset` is stable (useCallback []), so this fires only on input
  // change -- not on the data/loading updates the solve itself produces.
  const reset = orchestrate.reset;
  useEffect(() => {
    reset();
  }, [material, operation, tool, params, reset]);

  const normalized = useMemo(
    () => (orchestrate.data ? normalizeCalculatorSpeedFeedResult(orchestrate.data) : null),
    [orchestrate.data],
  );
  const posture = useMemo(
    () =>
      classifyCalculatorResultSafetyPosture(normalized, {
        solveSource: 'orchestrate',
        livePhysics: Boolean(normalized),
      }),
    [normalized],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            9-Axis Orchestrated Solve
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Full SpeedFeedOrchestrator pipeline -- 8 resolvers, Kienzle/Taylor + Monte Carlo
            uncertainty. Uses your selected material, operation and tool.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={run}
          disabled={!ready || orchestrate.loading}
          className="h-11 shrink-0 md:h-auto"
        >
          {orchestrate.loading ? 'Solving...' : 'Run 9-Axis Solve'}
        </Button>
      </div>

      {!ready && (
        <p className="text-xs text-slate-400">
          Select a material and operation to run the orchestrated solve.
        </p>
      )}

      {orchestrate.error && (
        <div
          role="alert"
          className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-2 text-sm text-rose-700 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
        >
          {orchestrate.error}
        </div>
      )}

      {normalized && (
        <>
          {/* Release posture -- the uncertainty + advisory that must accompany any published speed/feed. */}
          <div className={`rounded-xl border px-4 py-3 ${TONE[posture.tone]}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold">{posture.label}</span>
              <span className="font-mono text-xs">
                Confidence {posture.confidencePct}%
                {posture.releaseBlocked ? ' -- verify before release' : ''}
              </span>
            </div>
            <p className="mt-1 text-xs">{posture.summary}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric label="RPM" value={normalized.rpm} unit="rev/min" decimals={0} />
            <Metric label="Vc" value={normalized.cuttingSpeed} unit="m/min" />
            <Metric label="Feed" value={normalized.feedRate} unit="mm/min" decimals={0} />
            <Metric label="fz" value={normalized.feedPerTooth} unit="mm/tooth" decimals={3} />
            <Metric label="MRR" value={normalized.mrr} unit="cm3/min" decimals={2} />
            <Metric label="Power" value={normalized.powerKw} unit="kW" decimals={2} />
            <Metric label="Tool Life" value={normalized.toolLife} unit="min" decimals={0} />
            <Metric label="Ra" value={normalized.ra} unit="um" decimals={2} />
          </div>

          {normalized.limitingFactors.length > 0 && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              <span className="font-semibold">Limiting factors: </span>
              {normalized.limitingFactors.join(' / ')}
            </div>
          )}
          {normalized.warnings.length > 0 && (
            <ul className="list-disc space-y-0.5 pl-5 text-xs text-slate-500 dark:text-slate-400">
              {normalized.warnings.slice(0, 5).map((w, i) => (
                <li key={`${i}-${w.slice(0, 12)}`}>{w}</li>
              ))}
            </ul>
          )}
          {normalized.engines.length > 0 && (
            <p className="text-[10px] text-slate-400">
              Engines: {normalized.engines.slice(0, 4).join(', ')}
            </p>
          )}
        </>
      )}
    </div>
  );
}
