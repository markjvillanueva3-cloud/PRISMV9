import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useUnifiedOrchestrator } from '../../hooks/useUnifiedOrchestrator';
import {
  getSessionHealth,
  recallSessionMemory,
  type SessionHealthSnapshot,
  type SessionMemoryRecall,
} from '../../api/sessionIntelligence';
import {
  ActionButton,
  PanelCard,
  StatusPill,
} from '../workspace/WorkspacePrimitives';

export type WorkspaceCopilotSuggestion = {
  id: string;
  label: string;
  query: string;
};

export interface WorkspaceAICopilotProps {
  workspaceLabel: string;
  summary: string;
  context: Record<string, unknown>;
  suggestions: WorkspaceCopilotSuggestion[];
}

function labelize(value: string) {
  return value
    .split(/[_-]/)
    .filter(Boolean)
    .map((token) => token[0].toUpperCase() + token.slice(1))
    .join(' ');
}

function pushUnique(values: string[], candidate: string) {
  const trimmed = candidate.trim();
  if (!trimmed || values.includes(trimmed)) return;
  values.push(trimmed);
}

function formatConfidence(value: number | undefined | null) {
  if (value == null || Number.isNaN(value)) {
    return null;
  }
  const normalized = value <= 1 ? value * 100 : value;
  return `${normalized.toFixed(0)}% confidence`;
}

function formatTokenEstimate(value: number | undefined | null) {
  if (value == null || Number.isNaN(value)) {
    return null;
  }

  return `${value.toLocaleString()} est. tokens`;
}

function healthTone(status: string | undefined): 'slate' | 'emerald' | 'amber' | 'rose' {
  const normalized = status?.toUpperCase();
  if (normalized === 'GREEN') return 'emerald';
  if (normalized === 'YELLOW') return 'amber';
  if (normalized === 'RED') return 'rose';
  return 'slate';
}

function summarizeContext(value: unknown, depth = 0): string {
  if (value == null || depth > 2) {
    return String(value);
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    const preview = value.slice(0, 2).map((entry) => summarizeContext(entry, depth + 1)).join(',');
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

function collectHighlights(value: unknown, bucket: string[], depth = 0) {
  if (bucket.length >= 4 || depth > 2 || value == null) {
    return;
  }

  if (typeof value === 'string') {
    pushUnique(bucket, value);
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectHighlights(item, bucket, depth + 1);
      if (bucket.length >= 4) break;
    }
    return;
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of ['summary', 'message', 'recommendation', 'reason', 'detail', 'action']) {
      collectHighlights(record[key], bucket, depth + 1);
      if (bucket.length >= 4) return;
    }

    for (const nested of Object.values(record)) {
      collectHighlights(nested, bucket, depth + 1);
      if (bucket.length >= 4) return;
    }
  }
}

function buildPersistentMemoryQuery(
  workspaceLabel: string,
  summary: string,
  context: Record<string, unknown>,
  suggestions: WorkspaceCopilotSuggestion[],
) {
  const suggestionLead = suggestions[0]?.query ? ` First desk question: ${suggestions[0].query}` : '';
  return `What mission-critical Kienzle context, product intent, roadmap posture, safety constraints, and architectural guidance should the ${workspaceLabel} desk preserve? Desk summary: ${summary}. Desk context snapshot: ${summarizeContext(context)}.${suggestionLead}`;
}

function collectMemoryHighlights(memoryRecall: SessionMemoryRecall | null) {
  const bucket: string[] = [];
  const categories = memoryRecall?.categories ?? Object.keys(memoryRecall?.memory ?? {});
  const memory = memoryRecall?.memory ?? {};

  for (const category of categories) {
    const entries = memory[category];
    if (!entries) continue;

    for (const [entryKey, entry] of Object.entries(entries)) {
      if (!entry?.value) continue;
      pushUnique(bucket, `${labelize(category)} / ${labelize(entryKey)}: ${entry.value}`);
      if (bucket.length >= 4) {
        return bucket;
      }
    }
  }

  return bucket;
}

export function WorkspaceAICopilot({
  workspaceLabel,
  summary,
  context,
  suggestions,
}: WorkspaceAICopilotProps) {
  const orchestrator = useUnifiedOrchestrator();
  const [query, setQuery] = useState('');
  const [queryDirty, setQueryDirty] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [planningError, setPlanningError] = useState<string | null>(null);
  const [autonomousMode, setAutonomousMode] = useState(true);
  const [autoBriefLoading, setAutoBriefLoading] = useState(false);
  const [autoBriefError, setAutoBriefError] = useState<string | null>(null);
  const [memoryRecall, setMemoryRecall] = useState<SessionMemoryRecall | null>(null);
  const [memoryLoading, setMemoryLoading] = useState(false);
  const [memoryError, setMemoryError] = useState<string | null>(null);
  const [sessionHealth, setSessionHealth] = useState<SessionHealthSnapshot | null>(null);
  const lastAutoBriefKeyRef = useRef<string | null>(null);

  const persistentMemoryQuery = useMemo(
    () => buildPersistentMemoryQuery(workspaceLabel, summary, context, suggestions),
    [context, suggestions, summary, workspaceLabel],
  );

  const persistentMemoryKey = useMemo(
    () => `${workspaceLabel}|${summary}|${suggestions[0]?.query ?? ''}|${summarizeContext(context)}`,
    [context, suggestions, summary, workspaceLabel],
  );

  const memoryHighlights = useMemo(() => collectMemoryHighlights(memoryRecall), [memoryRecall]);

  const copilotContext = useMemo(
    () => ({
      ...context,
      prism_workspace_summary: summary,
      prism_persistent_memory: memoryHighlights,
      prism_memory_categories: memoryRecall?.categories ?? [],
      prism_session_health: sessionHealth
        ? {
            health_status: sessionHealth.health_status ?? null,
            advisory: sessionHealth.advisory ?? null,
            call_count: sessionHealth.call_count ?? null,
            estimated_tokens: sessionHealth.estimated_tokens ?? null,
            compaction_count: sessionHealth.compaction_count ?? null,
          }
        : null,
    }),
    [context, memoryHighlights, memoryRecall?.categories, sessionHealth, summary],
  );

  useEffect(() => {
    if (!queryDirty && suggestions[0]?.query) {
      setQuery(suggestions[0].query);
    }
  }, [queryDirty, suggestions]);

  useEffect(() => {
    let cancelled = false;

    async function loadPersistentContext() {
      setMemoryLoading(true);
      setMemoryError(null);

      const [memoryResult, healthResult] = await Promise.allSettled([
        recallSessionMemory({ query: persistentMemoryQuery, limit: 5 }),
        getSessionHealth(),
      ]);

      if (cancelled) {
        return;
      }

      startTransition(() => {
        if (memoryResult.status === 'fulfilled') {
          setMemoryRecall(memoryResult.value);
        } else {
          setMemoryError(memoryResult.reason instanceof Error ? memoryResult.reason.message : 'Kienzle memory recall unavailable');
        }

        if (healthResult.status === 'fulfilled') {
          setSessionHealth(healthResult.value);
        }

        setMemoryLoading(false);
      });
    }

    void loadPersistentContext();

    return () => {
      cancelled = true;
    };
  }, [persistentMemoryKey, persistentMemoryQuery]);

  const autoBriefIntent = useMemo(() => {
    const suggestionLead = suggestions[0]?.query
      ? ` Use this live desk context to answer: ${suggestions[0].query}`
      : '';
    return `Autonomously brief the ${workspaceLabel} desk. Summarize current posture from the live page context, identify the top risks or blockers, explain likely routing complexity, and recommend the next two or three actions. Use recalled Kienzle mission, safety, roadmap, and architecture context when it materially changes the recommendation.${suggestionLead}`;
  }, [suggestions, workspaceLabel]);

  const autoBriefKey = useMemo(
    () => `${workspaceLabel}|${autoBriefIntent}|${summarizeContext(copilotContext)}`,
    [autoBriefIntent, copilotContext, workspaceLabel],
  );

  const resultHighlights = useMemo(() => {
    const bucket: string[] = [];
    collectHighlights(orchestrator.data?.final_result, bucket);
    return bucket;
  }, [orchestrator.data]);

  const recommendationHighlights = useMemo(() => {
    const recommendations = orchestrator.data?.recommendations ?? [];
    const bucket: string[] = [];
    recommendations.forEach((recommendation) => pushUnique(bucket, recommendation));
    if (bucket.length === 0) {
      resultHighlights.forEach((highlight) => pushUnique(bucket, highlight));
    }
    return bucket.slice(0, 4);
  }, [orchestrator.data?.recommendations, resultHighlights]);

  const domainHighlights = useMemo(() => {
    const bucket: string[] = [];
    (orchestrator.routing?.domains ?? []).forEach((domain) => pushUnique(bucket, domain));
    (orchestrator.classification?.domains ?? []).forEach((domain) => pushUnique(bucket, domain));
    (orchestrator.data?.domain_results ?? []).forEach((domainResult) => pushUnique(bucket, domainResult.domain));
    return bucket.slice(0, 5);
  }, [orchestrator.classification?.domains, orchestrator.data?.domain_results, orchestrator.routing?.domains]);

  const runAutonomousBrief = useCallback(async (force = false) => {
    if (!force && !autonomousMode) {
      return;
    }
    if (!force && lastAutoBriefKeyRef.current === autoBriefKey) {
      return;
    }

    const intent = autoBriefIntent.trim();
    if (!intent) return;

    lastAutoBriefKeyRef.current = autoBriefKey;
    setAutoBriefLoading(true);
    setAutoBriefError(null);

    if (!queryDirty) {
      setQuery(intent);
    }

    try {
      const input = {
        intent,
        context: copilotContext,
        constraints: { allow_escalation: true },
      };
      await Promise.all([
        orchestrator.classify(intent, copilotContext),
        orchestrator.route(input),
      ]);
      await orchestrator.execute(input);
    } catch (issue) {
      setAutoBriefError(issue instanceof Error ? issue.message : 'Autonomous Kienzle AI briefing failed');
    } finally {
      setAutoBriefLoading(false);
    }
  }, [autoBriefIntent, autoBriefKey, autonomousMode, copilotContext, orchestrator, queryDirty]);

  useEffect(() => {
    if (!autonomousMode) {
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      if (cancelled) return;
      await runAutonomousBrief();
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [autonomousMode, runAutonomousBrief]);

  async function handlePreviewRoute() {
    const intent = query.trim();
    if (!intent) return;

    setPlanning(true);
    setPlanningError(null);
    try {
      await Promise.all([
        orchestrator.classify(intent, copilotContext),
        orchestrator.route({ intent, context: copilotContext, constraints: { allow_escalation: true } }),
      ]);
    } catch (issue) {
      setPlanningError(issue instanceof Error ? issue.message : 'Kienzle AI preview failed');
    } finally {
      setPlanning(false);
    }
  }

  async function handleExecute() {
    const intent = query.trim();
    if (!intent) return;

    await orchestrator.execute({
      intent,
      context: copilotContext,
      constraints: { allow_escalation: true },
    });
  }

  return (
    <PanelCard
      title="Kienzle AI copilot"
      subtitle={`${workspaceLabel} is AI-native: route preview, tier-aware execution, and actionable guidance are built directly into this desk.`}
    >
      <div className="space-y-4">
        <div className="rounded-[22px] border border-cyan-300/16 bg-cyan-300/[0.08] px-4 py-4 text-sm leading-6 text-cyan-50/90">
          {summary}
        </div>

        <div className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-slate-300">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill label={autonomousMode ? 'Autonomous desk brief on' : 'Manual AI mode'} tone={autonomousMode ? 'emerald' : 'slate'} />
            {autoBriefLoading ? <StatusPill label="Reasoning now" tone="amber" /> : null}
            {memoryLoading ? <StatusPill label="Syncing Kienzle memory" tone="amber" /> : null}
            {orchestrator.routing?.complexity ? <StatusPill label={`Complexity ${orchestrator.routing.complexity}`} tone="violet" /> : null}
            {sessionHealth?.health_status ? <StatusPill label={`Session ${sessionHealth.health_status}`} tone={healthTone(sessionHealth.health_status)} /> : null}
            {formatConfidence(orchestrator.classification?.confidence) ? (
              <StatusPill label={formatConfidence(orchestrator.classification?.confidence) ?? 'Confidence unavailable'} tone="sky" />
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap gap-3">
            <ActionButton onClick={() => setAutonomousMode((value) => !value)} tone={autonomousMode ? 'amber' : 'emerald'}>
              {autonomousMode ? 'Pause auto-brief' : 'Resume auto-brief'}
            </ActionButton>
            <ActionButton onClick={() => void runAutonomousBrief(true)} disabled={autoBriefLoading || orchestrator.loading} tone="cyan">
              {autoBriefLoading ? 'Refreshing brief...' : 'Refresh AI brief'}
            </ActionButton>
          </div>

          {orchestrator.classification ? (
            <div className="mt-4 rounded-2xl border border-white/8 bg-slate-950/60 px-3 py-3">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Autonomous classification</div>
              <div className="mt-2 text-sm text-slate-200">
                {(orchestrator.classification.category ?? 'Uncategorized')}
                {orchestrator.classification.subcategory ? ` / ${orchestrator.classification.subcategory}` : ''}
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

          {memoryHighlights.length > 0 || sessionHealth ? (
            <div className="mt-4 rounded-2xl border border-white/8 bg-slate-950/60 px-3 py-3">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Persistent Kienzle memory</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(memoryRecall?.categories ?? []).slice(0, 5).map((category) => (
                  <StatusPill key={category} label={labelize(category)} tone="slate" />
                ))}
                {formatTokenEstimate(sessionHealth?.estimated_tokens) ? (
                  <StatusPill label={formatTokenEstimate(sessionHealth?.estimated_tokens) ?? 'Token estimate unavailable'} tone="slate" />
                ) : null}
              </div>
              {memoryHighlights.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {memoryHighlights.map((highlight) => (
                    <div key={highlight} className="rounded-2xl border border-white/8 bg-black/20 px-3 py-3 text-sm text-slate-200">
                      {highlight}
                    </div>
                  ))}
                </div>
              ) : null}
              {sessionHealth?.advisory ? (
                <div className="mt-3 rounded-2xl border border-white/8 bg-black/20 px-3 py-3 text-sm text-slate-300">
                  {sessionHealth.advisory}
                </div>
              ) : null}
            </div>
          ) : null}

          {recommendationHighlights.length > 0 ? (
            <div className="mt-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Recommended next actions</div>
              <div className="mt-3 space-y-2">
                {recommendationHighlights.map((recommendation) => (
                  <button
                    key={recommendation}
                    type="button"
                    onClick={() => {
                      setQueryDirty(true);
                      setQuery(recommendation);
                    }}
                    className="w-full rounded-2xl border border-white/8 bg-slate-950/60 px-3 py-3 text-left text-sm text-slate-200 transition hover:border-cyan-300/20 hover:bg-cyan-300/[0.08]"
                  >
                    {recommendation}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {autoBriefError ? (
            <div className="mt-4 rounded-[20px] border border-rose-300/18 bg-rose-300/[0.08] px-4 py-3 text-sm text-rose-100">
              {autoBriefError}
            </div>
          ) : null}
          {memoryError ? (
            <div className="mt-4 rounded-[20px] border border-amber-300/18 bg-amber-300/[0.08] px-4 py-3 text-sm text-amber-50">
              {memoryError}
            </div>
          ) : null}
        </div>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Ask Kienzle AI
          </span>
          <textarea
            aria-label={`Ask Kienzle AI about ${workspaceLabel}`}
            value={query}
            onChange={(event) => {
              setQueryDirty(true);
              setQuery(event.target.value);
            }}
            className="min-h-[132px] w-full rounded-[22px] border border-white/10 bg-slate-950/80 px-4 py-3 text-sm leading-6 text-slate-100 outline-none transition focus:border-cyan-300/32"
            placeholder={`Ask for the next move, route posture, risk summary, or escalation guidance inside ${workspaceLabel}.`}
          />
        </label>

        <div className="grid gap-2">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              type="button"
              onClick={() => {
                setQueryDirty(true);
                setQuery(suggestion.query);
              }}
              className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-3 text-left text-sm text-slate-200 transition hover:border-cyan-300/20 hover:bg-cyan-300/[0.08]"
            >
              {suggestion.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <ActionButton onClick={() => void handlePreviewRoute()} disabled={planning || orchestrator.loading || !query.trim()} tone="amber">
            {planning ? 'Previewing...' : 'Preview route'}
          </ActionButton>
          <ActionButton onClick={() => void handleExecute()} disabled={orchestrator.loading || !query.trim()} tone="emerald">
            {orchestrator.loading ? 'Running...' : 'Ask Kienzle AI'}
          </ActionButton>
          {orchestrator.tier ? <StatusPill label={`Tier ${orchestrator.tier}`} tone="sky" /> : null}
          {orchestrator.data?.authority_resolution?.winning_source ? (
            <StatusPill label={`Source ${orchestrator.data.authority_resolution.winning_source}`} tone="violet" />
          ) : null}
        </div>

        {planningError ? (
          <div className="rounded-[20px] border border-rose-300/18 bg-rose-300/[0.08] px-4 py-3 text-sm text-rose-100">
            {planningError}
          </div>
        ) : null}

        {orchestrator.routing ? (
          <div className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-slate-300">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Route preview</div>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusPill label={`Tier ${orchestrator.routing.tier}`} tone="sky" />
              <StatusPill label={orchestrator.routing.reason ?? 'Route available'} tone="slate" />
            </div>
          </div>
        ) : null}

        {orchestrator.data ? (
          <div className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-slate-300">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Execution result</div>
            {resultHighlights.length > 0 ? (
              <div className="mt-3 space-y-2">
                {resultHighlights.map((highlight) => (
                  <div key={highlight} className="rounded-2xl border border-white/8 bg-slate-950/60 px-3 py-3">
                    {highlight}
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-3 rounded-2xl border border-white/8 bg-slate-950/60 px-3 py-3">
                Kienzle AI returned a result for this desk, but no short summary fields were exposed in the current payload.
              </div>
            )}
          </div>
        ) : null}

        {orchestrator.error ? (
          <div className="rounded-[20px] border border-rose-300/18 bg-rose-300/[0.08] px-4 py-3 text-sm text-rose-100">
            {orchestrator.error}
          </div>
        ) : null}
      </div>
    </PanelCard>
  );
}

export default WorkspaceAICopilot;
