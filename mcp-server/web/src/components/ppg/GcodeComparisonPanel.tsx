import { useMemo } from 'react';
import { PanelCard, StatusPill } from '../workspace/WorkspacePrimitives';

// ─── Types ──────────────────────────────────────────────────────────

export interface GcodeComparisonPanelProps {
  traditional: string;
  optimized: string;
  controller: string;
  /** Map of optimized-side line index → confidence (0–1). */
  confidenceMap?: Record<number, number>;
}

// ─── Syntax Highlighting ────────────────────────────────────────────

function classifyToken(token: string): string {
  if (/^\(.*\)$/.test(token)) return 'text-slate-500 italic';
  if (/^;/.test(token)) return 'text-slate-500 italic';
  if (/^[Gg]\d/.test(token)) return 'text-cyan-300';
  if (/^[Mm]\d/.test(token)) return 'text-violet-300';
  if (/^[Ss]\d/.test(token)) return 'text-amber-300';
  if (/^[Ff]\d/.test(token)) return 'text-emerald-300';
  if (/^[Tt]\d/.test(token)) return 'text-rose-300';
  if (/^[XYZABC]-?\d/.test(token)) return 'text-sky-200';
  if (/^[IJKR]-?\d/.test(token)) return 'text-teal-300';
  return 'text-slate-200';
}

function highlightLine(line: string) {
  const tokens = line.match(/\([^)]*\)|;.*$|[^\s]+/g) ?? [line];
  return tokens.map((token, i) => (
    <span key={i} className={classifyToken(token)}>
      {i > 0 ? ' ' : ''}
      {token}
    </span>
  ));
}

// ─── Diff Logic ─────────────────────────────────────────────────────

function computeDiff(
  leftLines: string[],
  rightLines: string[],
): { left: boolean[]; right: boolean[] } {
  const max = Math.max(leftLines.length, rightLines.length);
  const left: boolean[] = [];
  const right: boolean[] = [];
  for (let i = 0; i < max; i++) {
    const l = (leftLines[i] ?? '').trim();
    const r = (rightLines[i] ?? '').trim();
    const differs = l !== r;
    left.push(differs && i < leftLines.length);
    right.push(differs && i < rightLines.length);
  }
  return { left, right };
}

function confidenceBadgeClass(c: number): string {
  if (c >= 0.85) return 'bg-emerald-400/20 text-emerald-200';
  if (c >= 0.6) return 'bg-amber-400/20 text-amber-200';
  return 'bg-rose-400/20 text-rose-200';
}

// ─── Component ──────────────────────────────────────────────────────

export function GcodeComparisonPanel({
  traditional,
  optimized,
  controller,
  confidenceMap = {},
}: GcodeComparisonPanelProps) {
  const tradLines = useMemo(() => traditional.split('\n'), [traditional]);
  const optLines = useMemo(() => optimized.split('\n'), [optimized]);
  const diff = useMemo(() => computeDiff(tradLines, optLines), [tradLines, optLines]);

  const changedCount = useMemo(() => diff.right.filter(Boolean).length, [diff.right]);

  const avgConfidence = useMemo(() => {
    const vals = Object.values(confidenceMap);
    if (vals.length === 0) return 0;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }, [confidenceMap]);

  return (
    <PanelCard
      title="Before / After comparison"
      subtitle={`Traditional vs Kienzle-optimized output for ${controller}. ${changedCount} lines differ.`}
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <StatusPill
          label={`${changedCount} changed`}
          tone={changedCount > 0 ? 'amber' : 'slate'}
        />
        <StatusPill label={`${tradLines.length} → ${optLines.length} lines`} tone="slate" />
        {avgConfidence > 0 && (
          <StatusPill
            label={`${Math.round(avgConfidence * 100)}% avg confidence`}
            tone={avgConfidence >= 0.85 ? 'emerald' : avgConfidence >= 0.6 ? 'amber' : 'rose'}
          />
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Traditional side */}
        <div className="overflow-hidden rounded-[22px] border border-white/10 bg-slate-950/90">
          <div className="border-b border-white/8 bg-white/[0.03] px-4 py-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Traditional (single S/F)
            </span>
          </div>
          <pre className="max-h-[480px] overflow-auto p-4 text-xs leading-6">
            {tradLines.map((line, i) => (
              <div
                key={i}
                className={`flex items-start gap-2${
                  diff.left[i] ? ' -mx-4 bg-rose-400/8 px-4' : ''
                }`}
              >
                <span className="w-8 shrink-0 select-none text-right text-slate-600">
                  {i + 1}
                </span>
                {diff.left[i] && (
                  <span className="shrink-0 select-none text-rose-400">&minus;</span>
                )}
                <span className="flex-1">{highlightLine(line)}</span>
              </div>
            ))}
          </pre>
        </div>

        {/* Optimized side */}
        <div className="overflow-hidden rounded-[22px] border border-cyan-300/14 bg-slate-950/90">
          <div className="border-b border-cyan-300/10 bg-cyan-300/[0.03] px-4 py-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
              Kienzle Optimized (per-block S/F)
            </span>
          </div>
          <pre className="max-h-[480px] overflow-auto p-4 text-xs leading-6">
            {optLines.map((line, i) => {
              const confidence = confidenceMap[i];
              return (
                <div
                  key={i}
                  className={`flex items-start gap-2${
                    diff.right[i] ? ' -mx-4 bg-emerald-400/8 px-4' : ''
                  }`}
                >
                  <span className="w-8 shrink-0 select-none text-right text-slate-600">
                    {i + 1}
                  </span>
                  {diff.right[i] && (
                    <span className="shrink-0 select-none text-emerald-400">+</span>
                  )}
                  <span className="flex-1">{highlightLine(line)}</span>
                  {confidence !== undefined && (
                    <span
                      className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${confidenceBadgeClass(confidence)}`}
                    >
                      {Math.round(confidence * 100)}%
                    </span>
                  )}
                </div>
              );
            })}
          </pre>
        </div>
      </div>
    </PanelCard>
  );
}
