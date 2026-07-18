/**
 * RecommendationList — Actionable items from the optimization analysis.
 */

function iconForRec(text: string): string {
  if (text.startsWith('SAFETY:')) return '\u26A0';
  if (text.startsWith('COOLANT:')) return '\u2744';
  if (text.includes('force') || text.includes('Force')) return '\u2699';
  if (text.includes('cycle time') || text.includes('Cycle time')) return '\u23F1';
  if (text.includes('feed') || text.includes('Feed')) return '\u2192';
  if (text.includes('RPM') || text.includes('spindle')) return '\u21BB';
  if (text.includes('HSM') || text.includes('controller')) return '\u2301';
  if (text.includes('Tool change')) return '\uD83D\uDD27';
  return '\u2139';
}

function severityClass(text: string): string {
  if (text.startsWith('SAFETY:')) return 'border-rose-500/30 bg-rose-500/5';
  if (text.includes('Power usage at') || text.includes('High cutting force')) return 'border-amber-500/30 bg-amber-500/5';
  return 'border-white/8 bg-white/[0.02]';
}

export function RecommendationList({ recommendations }: { recommendations: string[] }) {
  if (recommendations.length === 0) return null;

  return (
    <div className="space-y-2">
      {recommendations.map((rec, i) => (
        <div
          key={i}
          className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${severityClass(rec)}`}
        >
          <span className="mt-0.5 text-lg leading-none">{iconForRec(rec)}</span>
          <span className="text-sm text-slate-300">{rec}</span>
        </div>
      ))}
    </div>
  );
}
