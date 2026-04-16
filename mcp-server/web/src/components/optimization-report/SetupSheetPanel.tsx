/**
 * SetupSheetPanel — Shows extracted setup sheet from the optimized program.
 */

interface SetupSheetTool {
  number: number;
  offset_h: number;
  offset_d: number;
  description_guess: string;
  rpm_values: number[];
  feed_values: number[];
  coolant: string;
  z_depths: number[];
}

interface WorkOffset {
  code: string;
  use_count: number;
}

interface SetupSheet {
  tools: SetupSheetTool[];
  work_offsets: WorkOffset[];
  coolant_required: boolean;
  cycle_time_est_s: number;
  safety_notes: string[];
}

export function SetupSheetPanel({ setupSheet }: { setupSheet: SetupSheet | null }) {
  if (!setupSheet) return null;

  return (
    <div className="space-y-4 rounded-2xl border border-white/8 bg-white/[0.03] p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
        Setup Sheet
      </h3>

      {setupSheet.tools.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">H</th>
                <th className="px-3 py-2">Description</th>
                <th className="px-3 py-2">RPM</th>
                <th className="px-3 py-2">Feed</th>
                <th className="px-3 py-2">Coolant</th>
                <th className="px-3 py-2">Min Z</th>
              </tr>
            </thead>
            <tbody>
              {setupSheet.tools.map((t) => (
                <tr
                  key={t.number}
                  className="border-b border-white/5 text-slate-300"
                >
                  <td className="px-3 py-2 font-medium text-cyan-300">T{t.number}</td>
                  <td className="px-3 py-2">H{t.offset_h}</td>
                  <td className="px-3 py-2">{t.description_guess}</td>
                  <td className="px-3 py-2">{t.rpm_values[0] ?? '—'}</td>
                  <td className="px-3 py-2">{t.feed_values[0] ?? '—'}</td>
                  <td className="px-3 py-2">{t.coolant}</td>
                  <td className="px-3 py-2">
                    {t.z_depths.length > 0 ? Math.min(...t.z_depths).toFixed(1) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap gap-4 text-sm text-slate-400">
        <span>
          Offsets: {setupSheet.work_offsets.map((o) => o.code).join(', ') || 'G54'}
        </span>
        <span>Coolant: {setupSheet.coolant_required ? 'Required' : 'Not required'}</span>
        <span>
          Est. cycle:{' '}
          {setupSheet.cycle_time_est_s > 0
            ? `${(setupSheet.cycle_time_est_s / 60).toFixed(1)} min`
            : 'N/A'}
        </span>
      </div>

      {setupSheet.safety_notes.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-amber-400">
            Safety Notes
          </div>
          {setupSheet.safety_notes.map((note, i) => (
            <div key={i} className="text-sm text-amber-300/80">
              {note}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
