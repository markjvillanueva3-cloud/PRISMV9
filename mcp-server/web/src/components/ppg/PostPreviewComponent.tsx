import { useCallback, useMemo, useState } from 'react';
import { PanelCard, StatusPill } from '../workspace/WorkspacePrimitives';

// ─── Types ──────────────────────────────────────────────────────────

export interface PhysicsAnnotation {
  force_N?: number;
  confidence?: number;
  predicted_Ra_um?: number;
  power_kW?: number;
  note?: string;
}

export interface PostPreviewComponentProps {
  gcode: string;
  controller: string;
  /** Map of line index → physics annotation shown on hover. */
  annotations?: Record<number, PhysicsAnnotation>;
  onDownload?: () => void;
  onCopy?: () => void;
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

function formatAnnotation(a: PhysicsAnnotation): string {
  const parts: string[] = [];
  if (a.force_N !== undefined) parts.push(`Force: ${a.force_N.toFixed(1)} N`);
  if (a.power_kW !== undefined) parts.push(`Power: ${a.power_kW.toFixed(2)} kW`);
  if (a.predicted_Ra_um !== undefined) parts.push(`Ra: ${a.predicted_Ra_um.toFixed(2)} \u00b5m`);
  if (a.confidence !== undefined) parts.push(`Conf: ${Math.round(a.confidence * 100)}%`);
  if (a.note) parts.push(a.note);
  return parts.join(' \u00b7 ');
}

// ─── Component ──────────────────────────────────────────────────────

export function PostPreviewComponent({
  gcode,
  controller,
  annotations = {},
  onDownload,
  onCopy,
}: PostPreviewComponentProps) {
  const [showPhysics, setShowPhysics] = useState(true);
  const [hoveredLine, setHoveredLine] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const lines = useMemo(() => gcode.split('\n'), [gcode]);
  const annotatedCount = useMemo(() => Object.keys(annotations).length, [annotations]);

  const handleCopy = useCallback(() => {
    // When the parent supplies onCopy (e.g. a safety-fenced copy handler that stamps
    // a PREVIEW-ONLY header on an unvalidated program), DELEGATE the clipboard write to
    // it -- copying the raw `gcode` here too would leak an un-stamped program. Fall back
    // to a raw copy only in standalone usage where no handler is wired.
    if (onCopy) {
      onCopy();
    } else {
      void navigator.clipboard.writeText(gcode);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [gcode, onCopy]);

  return (
    <PanelCard
      title="G-code preview"
      subtitle={`${lines.length} lines for ${controller}${annotatedCount > 0 ? ` \u00b7 ${annotatedCount} physics annotations` : ''}`}
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-cyan-300/20 hover:bg-cyan-300/[0.08]"
        >
          {copied ? 'Copied!' : 'Copy to clipboard'}
        </button>
        {onDownload && (
          <button
            type="button"
            onClick={onDownload}
            className="inline-flex items-center rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.08] px-3 py-1.5 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-300/[0.14]"
          >
            Download
          </button>
        )}
        {annotatedCount > 0 && (
          <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={showPhysics}
              onChange={(e) => setShowPhysics(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-500 bg-slate-800 text-cyan-400 focus:ring-cyan-400/40"
            />
            Show physics
          </label>
        )}
        <div className="ml-auto flex gap-2">
          <StatusPill label={`${lines.length} lines`} tone="slate" />
          {annotatedCount > 0 && (
            <StatusPill label={`${annotatedCount} annotated`} tone="cyan" />
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-[22px] border border-white/10 bg-slate-950/90">
        <pre className="max-h-[560px] overflow-auto p-4 text-xs leading-6">
          {lines.map((line, i) => {
            const annotation = annotations[i];
            const hasAnnotation = annotation && showPhysics;
            const isHovered = hoveredLine === i;

            return (
              <div
                key={i}
                className={`group relative flex items-start gap-2 transition-colors${
                  hasAnnotation ? ' hover:bg-cyan-400/6' : ''
                }${isHovered && hasAnnotation ? ' bg-cyan-400/6' : ''}`}
                onMouseEnter={() => hasAnnotation && setHoveredLine(i)}
                onMouseLeave={() => setHoveredLine(null)}
              >
                <span className="w-8 shrink-0 select-none text-right text-slate-600">
                  {i + 1}
                </span>
                {hasAnnotation && (
                  <span className="shrink-0 select-none text-cyan-500">\u25CF</span>
                )}
                <span className="flex-1">{highlightLine(line)}</span>
                {hasAnnotation && annotation.confidence !== undefined && (
                  <span
                    className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                      annotation.confidence >= 0.85
                        ? 'bg-emerald-400/20 text-emerald-200'
                        : annotation.confidence >= 0.6
                          ? 'bg-amber-400/20 text-amber-200'
                          : 'bg-rose-400/20 text-rose-200'
                    }`}
                  >
                    {Math.round(annotation.confidence * 100)}%
                  </span>
                )}

                {/* Hover tooltip */}
                {isHovered && hasAnnotation && (
                  <div className="absolute left-12 top-full z-10 mt-1 rounded-xl border border-cyan-300/20 bg-slate-900 px-3 py-2 text-xs text-slate-200 shadow-lg">
                    {formatAnnotation(annotation)}
                  </div>
                )}
              </div>
            );
          })}
        </pre>
      </div>
    </PanelCard>
  );
}
