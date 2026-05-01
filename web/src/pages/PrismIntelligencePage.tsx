import {
  startTransition,
  type ReactNode,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { SurfaceStatusNotice } from '../components/operating-system/SurfaceStatusNotice';
import { useOperatingSystem } from '../features/operating-system/OperatingSystemProvider';
import type {
  IntelligenceTone,
  PrismChainCard,
  PrismCliSurface,
  PrismIntelligenceMetric,
  PrismIntelligenceWorkspace,
  PrismPromptAnalysis,
  PrismReasoningLayer,
} from '../features/operating-system/contracts';

const DEFAULT_PROMPT =
  'Optimize a titanium roughing pass for a 12 mm carbide endmill and tell me the safest next PRISM surface.';

function toneClasses(tone: IntelligenceTone) {
  if (tone === 'good') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (tone === 'watch') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (tone === 'critical') return 'border-rose-200 bg-rose-50 text-rose-700';
  return 'border-slate-200 bg-slate-50 text-slate-700';
}

function surfaceGroupLabel(group: PrismCliSurface['group']) {
  switch (group) {
    case 'physics':
      return 'Physics';
    case 'automation':
      return 'Automation';
    case 'execution':
      return 'Execution';
    default:
      return 'Reasoning';
  }
}

export function PrismIntelligencePage() {
  const navigate = useNavigate();
  const operatingSystem = useOperatingSystem();
  const [workspace, setWorkspace] = useState<PrismIntelligenceWorkspace | null>(null);
  const [analysis, setAnalysis] = useState<PrismPromptAnalysis | null>(null);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [catalogQuery, setCatalogQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const deferredCatalogQuery = useDeferredValue(catalogQuery);

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await operatingSystem.getPrismIntelligenceWorkspace();
      startTransition(() => {
        setWorkspace(result);
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load PRISM Intelligence');
    } finally {
      setLoading(false);
    }
  }, [operatingSystem]);

  const runAnalysis = useCallback(async (nextPrompt: string) => {
    const normalizedPrompt = nextPrompt.trim();
    if (!normalizedPrompt) {
      setAnalysis(null);
      setAnalysisError('Enter a manufacturing prompt to analyze.');
      return;
    }

    setAnalysisLoading(true);
    setAnalysisError(null);

    try {
      const result = await operatingSystem.analyzePrismPrompt(normalizedPrompt);
      startTransition(() => {
        setAnalysis(result);
      });
    } catch (reason) {
      setAnalysisError(reason instanceof Error ? reason.message : 'Prompt analysis failed');
    } finally {
      setAnalysisLoading(false);
    }
  }, [operatingSystem]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  const filteredCliSurfaces = useMemo(() => {
    if (!workspace) return [];
    const query = deferredCatalogQuery.trim().toLowerCase();
    if (!query) return workspace.cliSurfaces;

    return workspace.cliSurfaces.filter((surface) =>
      [
        surface.command,
        surface.label,
        surface.detail,
        surface.group,
        ...surface.keywords,
      ]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [deferredCatalogQuery, workspace]);

  const filteredModelCards = useMemo(() => {
    if (!workspace) return [];
    const query = deferredCatalogQuery.trim().toLowerCase();
    if (!query) return workspace.modelCards;

    return workspace.modelCards.filter((model) =>
      [model.name, model.domain, model.learningMode, model.reasoningNote]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [deferredCatalogQuery, workspace]);

  if (loading) {
    return (
      <LoadingState
        label="Loading PRISM Intelligence..."
        detail="Hydrating the internal CLI, model registry, automation chains, and agent posture into the shell."
        variant="panel"
      />
    );
  }

  if (error || !workspace) {
    return (
      <ErrorState
        message={error ?? 'Unable to load PRISM Intelligence'}
        onRetry={() => {
          void loadWorkspace();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,#f7fafc_0%,#eef2ff_38%,#ffffff_100%)] p-6 shadow-sm">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
          <div className="space-y-5">
            <div className="space-y-3">
              <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700">
                Internal reasoning fabric
              </span>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900">PRISM Intelligence</h1>
                <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-600">{workspace.summary}</p>
              </div>
            </div>

            <p className="max-w-4xl text-sm leading-7 text-slate-600">{workspace.mission}</p>

            <SurfaceStatusNotice title="Intelligence convergence" surfaces={['intelligence']} />
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Agent posture</div>
            <div className="mt-3 text-xl font-semibold text-slate-900">{workspace.agentSummary.activeAgents}</div>
            <div className="mt-2 text-sm leading-6 text-slate-600">{workspace.agentSummary.detail}</div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <SummaryStat label="Queue" value={workspace.agentSummary.queueDepth} />
              <SummaryStat label="Throughput" value={workspace.agentSummary.throughput} />
              <SummaryStat label="Model access" value={workspace.agentSummary.modelAccess} />
            </div>

            <div className="mt-5 space-y-2">
              {workspace.agentSummary.alerts.map((alert) => (
                <div
                  key={alert}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-600"
                >
                  {alert}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {workspace.metrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
        <div className="space-y-4 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Prompt lab</div>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Reason over a live PRISM prompt</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                This is the APPW restart point: route the request, expose the chain, recommend the shell surface, and explain the why inside the app itself.
              </p>
            </div>
            <button
              onClick={() => {
                void runAnalysis(prompt);
              }}
              className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              {analysisLoading ? 'Analyzing...' : 'Analyze prompt'}
            </button>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700" htmlFor="prism-prompt-lab">
              Manufacturing prompt
            </label>
            <textarea
              id="prism-prompt-lab"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              className="min-h-[160px] w-full rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-800 outline-none transition focus:border-sky-300 focus:bg-white"
              placeholder="Ask PRISM to classify, route, explain, or sequence a real manufacturing request."
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {workspace.promptStarters.map((starter) => (
              <button
                key={starter}
                onClick={() => {
                  setPrompt(starter);
                  void runAnalysis(starter);
                }}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-100"
              >
                {starter}
              </button>
            ))}
          </div>

          {analysisError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {analysisError}
            </div>
          ) : null}

          {analysis ? (
            <div className="space-y-4 rounded-[26px] border border-slate-200 bg-slate-50 p-4">
              <div className="grid gap-4 xl:grid-cols-2">
                <AnalysisCard
                  eyebrow="Intent"
                  title={analysis.aiIntent.intent}
                  detail={`${Math.round(analysis.aiIntent.confidence * 100)}% confidence`}
                >
                  <div className="space-y-3">
                    <p className="text-sm leading-6 text-slate-600">
                      {analysis.reasoningSummary}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(analysis.aiIntent.entities).map(([key, value]) => (
                        <span
                          key={key}
                          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600"
                        >
                          {key}: {String(value)}
                        </span>
                      ))}
                      {Object.keys(analysis.aiIntent.entities).length === 0 ? (
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500">
                          No entities extracted
                        </span>
                      ) : null}
                    </div>
                    {analysis.aiIntent.alternatives.length > 0 ? (
                      <div className="space-y-2">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Alternatives</div>
                        <div className="flex flex-wrap gap-2">
                          {analysis.aiIntent.alternatives.map((alternative) => (
                            <span
                              key={alternative.intent}
                              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600"
                            >
                              {alternative.intent} {Math.round(alternative.confidence * 100)}%
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </AnalysisCard>

                <AnalysisCard
                  eyebrow="Automation chain"
                  title={analysis.automation.chainId}
                  detail={`${analysis.automation.taskClass} · ${analysis.automation.tokenBudget} token budget`}
                >
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {analysis.automation.matchedKeywords.map((keyword) => (
                        <span
                          key={keyword}
                          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                    <div className="space-y-2">
                      {analysis.automation.chainSteps.map((step) => (
                        <div
                          key={step}
                          className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm leading-6 text-slate-600"
                        >
                          {step}
                        </div>
                      ))}
                    </div>
                  </div>
                </AnalysisCard>
              </div>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <AnalysisCard
                  eyebrow="Suggested surface"
                  title={analysis.suggestedSurface.label}
                  detail={analysis.suggestedSurface.actionLabel}
                >
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4 text-sm leading-6 text-sky-900">
                      <div className="font-medium">{analysis.suggestedSurface.cliCommand}</div>
                    </div>
                    <button
                      onClick={() => navigate(analysis.suggestedSurface.route)}
                      className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-white"
                    >
                      Open {analysis.suggestedSurface.label}
                    </button>
                  </div>
                </AnalysisCard>

                <AnalysisCard
                  eyebrow="Next actions"
                  title="Do the reasoning in public"
                  detail="The page stays explicit about why PRISM picked this route."
                >
                  <div className="space-y-2">
                    {analysis.nextActions.map((action) => (
                      <div
                        key={action}
                        className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm leading-6 text-slate-600"
                      >
                        {action}
                      </div>
                    ))}
                  </div>
                </AnalysisCard>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <AnalysisCard
                  eyebrow="Matched models"
                  title={`${analysis.modelMatches.length} model lanes`}
                  detail="The console shows which internal intelligence surfaces best match the request."
                >
                  <div className="space-y-3">
                    {analysis.modelMatches.map((model) => (
                      <div
                        key={model.id}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-medium text-slate-900">{model.name}</div>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                            {model.domain}
                          </span>
                        </div>
                        <div className="mt-2 text-sm leading-6 text-slate-600">{model.why}</div>
                      </div>
                    ))}
                  </div>
                </AnalysisCard>

                <AnalysisCard
                  eyebrow="Agent candidates"
                  title={`${analysis.agentCandidates.length} recommended lanes`}
                  detail="These are the agent roles PRISM would lean on for deeper reasoning or execution."
                >
                  <div className="space-y-3">
                    {analysis.agentCandidates.map((candidate) => (
                      <div
                        key={candidate.id}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-medium text-slate-900">{candidate.name}</div>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                            {candidate.category}
                          </span>
                        </div>
                        <div className="mt-2 text-sm leading-6 text-slate-600">{candidate.reason}</div>
                      </div>
                    ))}
                  </div>
                </AnalysisCard>
              </div>

              {analysis.apprentice ? (
                <AnalysisCard
                  eyebrow="Apprentice explanation"
                  title={analysis.apprentice.parameter}
                  detail={analysis.apprentice.value}
                >
                  <div className="space-y-3">
                    <p className="text-sm leading-7 text-slate-600">{analysis.apprentice.explanation}</p>
                    <div className="space-y-3">
                      {analysis.apprentice.factors.map((factor) => (
                        <div
                          key={factor.factor}
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
                        >
                          <div className="text-sm font-medium text-slate-900">{factor.factor}</div>
                          <div className="mt-1 text-sm text-slate-600">{factor.impact}</div>
                          <div className="mt-2 text-sm leading-6 text-slate-500">{factor.physics}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </AnalysisCard>
              ) : null}
            </div>
          ) : (
            <div className="rounded-[26px] border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm leading-7 text-slate-500">
              Run a prompt analysis to surface the matched intent model, automation chain, suggested app surface, direct CLI command, and apprentice-style explanation in one place.
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Reasoning stack</div>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Visible internal layers</h2>
            <div className="mt-4 space-y-3">
              {workspace.reasoningLayers.map((layer) => (
                <ReasoningLayerCard key={layer.id} layer={layer} />
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Chain posture</div>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Automation control plane</h2>
            <div className="mt-4 space-y-3">
              {workspace.chainCards.map((chain) => (
                <ChainCard key={chain.id} chain={chain} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Catalog search</div>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">CLI and model registry</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Search across the internal CLI catalog and model registry. This keeps the deep tooling discoverable from the shell instead of buried in implementation.
            </p>
          </div>
          <div className="w-full max-w-md">
            <label className="sr-only" htmlFor="intelligence-catalog-query">
              Filter intelligence catalog
            </label>
            <input
              id="intelligence-catalog-query"
              value={catalogQuery}
              onChange={(event) => setCatalogQuery(event.target.value)}
              placeholder="Filter commands, models, or reasoning lanes..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-sky-300 focus:bg-white"
            />
          </div>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div className="space-y-3">
            {filteredCliSurfaces.map((surface) => (
              <div
                key={surface.id}
                className="rounded-[24px] border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                        {surface.command}
                      </span>
                      <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">
                        {surfaceGroupLabel(surface.group)}
                      </span>
                    </div>
                    <div className="text-lg font-semibold text-slate-900">{surface.label}</div>
                    <div className="text-sm leading-6 text-slate-600">{surface.detail}</div>
                  </div>
                  <button
                    onClick={() => navigate(surface.route)}
                    className="rounded-2xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-white"
                  >
                    Open surface
                  </button>
                </div>
                <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                  <code>{surface.example}</code>
                </div>
              </div>
            ))}
            {filteredCliSurfaces.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                No CLI surfaces matched that filter.
              </div>
            ) : null}
          </div>

          <div className="space-y-3">
            {filteredModelCards.map((model) => (
              <div
                key={model.id}
                className="rounded-[24px] border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold text-slate-900">{model.name}</div>
                    <div className="mt-1 text-sm leading-6 text-slate-600">{model.reasoningNote}</div>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${toneClasses(model.status === 'ready' ? 'good' : model.status === 'training' ? 'watch' : 'neutral')}`}>
                    {model.status}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <SummaryStat label="Domain" value={model.domain} />
                  <SummaryStat label="Accuracy" value={model.accuracyLabel} />
                  <SummaryStat label="Samples" value={model.samplesLabel} />
                </div>
                <div className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {model.learningMode}
                </div>
              </div>
            ))}
            {filteredModelCards.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                No models matched that filter.
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="mt-2 text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}

function MetricCard({ metric }: { metric: PrismIntelligenceMetric }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{metric.label}</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900">{metric.value}</div>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${toneClasses(metric.tone)}`}>
          {metric.tone}
        </span>
      </div>
      <div className="mt-3 text-sm leading-6 text-slate-600">{metric.detail}</div>
    </div>
  );
}

function ReasoningLayerCard({ layer }: { layer: PrismReasoningLayer }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold text-slate-900">{layer.label}</div>
          <div className="mt-1 text-sm leading-6 text-slate-600">{layer.detail}</div>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${toneClasses(layer.tone)}`}>
          {layer.status}
        </span>
      </div>
      <div className="mt-4 space-y-2">
        {layer.signals.map((signal) => (
          <div
            key={signal}
            className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm leading-6 text-slate-600"
          >
            {signal}
          </div>
        ))}
      </div>
    </div>
  );
}

function ChainCard({ chain }: { chain: PrismChainCard }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold text-slate-900">{chain.id}</div>
          <div className="mt-1 text-sm leading-6 text-slate-600">{chain.emphasis}</div>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${toneClasses(chain.tier === 'critical' ? 'watch' : 'neutral')}`}>
          {chain.tier}
        </span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <SummaryStat label="Task class" value={chain.taskClass} />
        <SummaryStat label="Budget" value={chain.tokenBudgetLabel} />
        <SummaryStat label="Fail posture" value={chain.failBehavior} />
      </div>
      <div className="mt-3 text-sm leading-6 text-slate-600">{chain.detail}</div>
    </div>
  );
}

function AnalysisCard({
  eyebrow,
  title,
  detail,
  children,
}: {
  eyebrow: string;
  title: string;
  detail: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{eyebrow}</div>
      <div className="mt-2 flex flex-col gap-1">
        <div className="text-lg font-semibold text-slate-900">{title}</div>
        <div className="text-sm leading-6 text-slate-600">{detail}</div>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}
