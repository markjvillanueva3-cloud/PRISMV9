import { useCallback, useState } from 'react';
import {
  ActionButton,
  Field,
  Input,
  PanelCard,
} from './workspace/WorkspacePrimitives';

// ── Types ───────────────────────────────────────────────────────────────────

export type Confidence = 'high' | 'medium' | 'low';

export interface ExtractedDimension {
  id: string;
  label: string;
  value: number;
  unit: 'mm' | 'in';
  dimensionType: 'diameter' | 'length' | 'depth' | 'radius' | 'angle' | 'thread';
  confidence: Confidence;
  question?: string;
}

export interface AmbiguityResolverProps {
  dimensions: ExtractedDimension[];
  onResolved: (resolved: ResolvedDimension[]) => void;
  onBack?: () => void;
}

export interface ResolvedDimension {
  id: string;
  originalValue: number;
  confirmedValue: number;
  confirmed: boolean;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function confidenceColor(c: Confidence): string {
  switch (c) {
    case 'high': return 'bg-emerald-500';
    case 'medium': return 'bg-amber-500';
    case 'low': return 'bg-red-500';
  }
}

function confidenceLabel(c: Confidence): string {
  switch (c) {
    case 'high': return 'Confident';
    case 'medium': return 'Check this';
    case 'low': return 'Needs confirmation';
  }
}

function confidenceBorder(c: Confidence): string {
  switch (c) {
    case 'high': return 'border-emerald-500/30';
    case 'medium': return 'border-amber-500/30';
    case 'low': return 'border-red-500/30';
  }
}

function defaultQuestion(dim: ExtractedDimension): string {
  if (dim.question) return dim.question;
  switch (dim.dimensionType) {
    case 'diameter':
      return `We found ${dim.value}${dim.unit} here. Is this a diameter?`;
    case 'length':
      return `We measured ${dim.value}${dim.unit} for this length. Is this correct?`;
    case 'depth':
      return `This looks like a depth of ${dim.value}${dim.unit}. Can you confirm?`;
    case 'radius':
      return `Is ${dim.value}${dim.unit} a radius or a diameter?`;
    case 'thread':
      return `We detected a thread callout here. Is ${dim.value}${dim.unit} the pitch?`;
    case 'angle':
      return `Is this angle ${dim.value} degrees?`;
    default:
      return `Please confirm this dimension: ${dim.value}${dim.unit}`;
  }
}

// ── Component ───────────────────────────────────────────────────────────────

export function AmbiguityResolver({ dimensions, onResolved, onBack }: AmbiguityResolverProps) {
  const [edits, setEdits] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const dim of dimensions) {
      initial[dim.id] = String(dim.value);
    }
    return initial;
  });
  const [confirmed, setConfirmed] = useState<Set<string>>(
    () => new Set(dimensions.filter(d => d.confidence === 'high').map(d => d.id)),
  );

  const toggleConfirm = useCallback((id: string) => {
    setConfirmed(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const updateValue = useCallback((id: string, val: string) => {
    setEdits(prev => ({ ...prev, [id]: val }));
    // Auto-confirm when user edits a value
    setConfirmed(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const allConfirmed = dimensions.every(d => confirmed.has(d.id));

  const handleSubmit = useCallback(() => {
    const resolved: ResolvedDimension[] = dimensions.map(dim => ({
      id: dim.id,
      originalValue: dim.value,
      confirmedValue: parseFloat(edits[dim.id]) || dim.value,
      confirmed: confirmed.has(dim.id),
    }));
    onResolved(resolved);
  }, [dimensions, edits, confirmed, onResolved]);

  const highCount = dimensions.filter(d => d.confidence === 'high').length;
  const mediumCount = dimensions.filter(d => d.confidence === 'medium').length;
  const lowCount = dimensions.filter(d => d.confidence === 'low').length;

  // Sort: low confidence first (needs attention), then medium, then high
  const sorted = [...dimensions].sort((a, b) => {
    const order: Record<Confidence, number> = { low: 0, medium: 1, high: 2 };
    return order[a.confidence] - order[b.confidence];
  });

  return (
    <div className="mx-auto flex w-full max-w-[800px] flex-col gap-6">
      <PanelCard title="Review Extracted Dimensions">
        <p className="mb-4 text-sm text-zinc-400">
          We extracted {dimensions.length} dimension{dimensions.length === 1 ? '' : 's'} from your drawing.
          Please confirm the values are correct, especially the ones marked in yellow or red.
        </p>

        {/* Confidence summary */}
        <div className="mb-4 flex gap-4 text-xs">
          {highCount > 0 && (
            <span className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-full ${confidenceColor('high')}`} />
              <span className="text-zinc-400">{highCount} confident</span>
            </span>
          )}
          {mediumCount > 0 && (
            <span className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-full ${confidenceColor('medium')}`} />
              <span className="text-zinc-400">{mediumCount} to check</span>
            </span>
          )}
          {lowCount > 0 && (
            <span className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-full ${confidenceColor('low')}`} />
              <span className="text-zinc-400">{lowCount} need confirmation</span>
            </span>
          )}
        </div>

        {/* Dimension cards */}
        <div className="flex flex-col gap-3">
          {sorted.map(dim => (
            <div
              key={dim.id}
              className={`rounded-lg border p-4 transition-colors ${confidenceBorder(dim.confidence)} ${
                confirmed.has(dim.id) ? 'bg-zinc-800/20' : 'bg-zinc-800/50'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${confidenceColor(dim.confidence)}`} />
                    <span className="text-sm font-medium text-zinc-200">{dim.label}</span>
                    <span className="text-xs text-zinc-500">({dim.dimensionType})</span>
                  </div>
                  {dim.confidence !== 'high' && (
                    <p className="mt-1 ml-4 text-sm text-zinc-400">
                      {defaultQuestion(dim)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    className="w-24 text-right"
                    type="number"
                    step="any"
                    value={edits[dim.id] ?? ''}
                    onChange={e => updateValue(dim.id, e.target.value)}
                  />
                  <span className="text-xs text-zinc-500">{dim.unit}</span>
                  <button
                    type="button"
                    className={`flex h-7 w-7 items-center justify-center rounded-md border text-xs transition-colors ${
                      confirmed.has(dim.id)
                        ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-300'
                        : 'border-zinc-600 bg-zinc-800 text-zinc-500 hover:border-zinc-400'
                    }`}
                    onClick={() => toggleConfirm(dim.id)}
                    title={confirmed.has(dim.id) ? 'Confirmed' : 'Click to confirm'}
                  >
                    {confirmed.has(dim.id) ? '\u2713' : '?'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center gap-3">
          {onBack && <ActionButton onClick={onBack}>Back</ActionButton>}
          <ActionButton
            onClick={() => {
              setConfirmed(new Set(dimensions.map(d => d.id)));
            }}
          >
            Confirm All
          </ActionButton>
          <ActionButton onClick={handleSubmit} disabled={!allConfirmed}>
            {allConfirmed ? 'Continue' : `Confirm ${dimensions.length - confirmed.size} remaining`}
          </ActionButton>
        </div>
      </PanelCard>
    </div>
  );
}
