/**
 * ToolBreakdownTable — Per-tool S/F changes, force data, optimization reasons.
 */

export interface ToolReportRow {
  tool_number: number;
  tool_type: string;
  diameter_mm: number;
  blocks_optimized: number;
  original_rpm_range: [number, number];
  optimized_rpm_range: [number, number];
  original_feed_range: [number, number];
  optimized_feed_range: [number, number];
  max_force_N: number;
  max_power_kW: number;
  optimization_reasons: string[];
}

function fmtRange(r: [number, number]): string {
  if (r[0] === 0 && r[1] === 0) return '—';
  if (r[0] === r[1]) return String(Math.round(r[0]));
  return `${Math.round(r[0])}–${Math.round(r[1])}`;
}

export function ToolBreakdownTable({ tools }: { tools: ToolReportRow[] }) {
  if (tools.length === 0) {
    return (
      <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6 text-center text-slate-400">
        No per-tool data available — program may not have cutting moves.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/8 bg-white/[0.03]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/8 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            <th className="px-4 py-3">Tool</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Dia</th>
            <th className="px-4 py-3">Blocks</th>
            <th className="px-4 py-3">RPM (orig)</th>
            <th className="px-4 py-3">RPM (opt)</th>
            <th className="px-4 py-3">Feed (orig)</th>
            <th className="px-4 py-3">Feed (opt)</th>
            <th className="px-4 py-3">Fc max</th>
            <th className="px-4 py-3">P max</th>
          </tr>
        </thead>
        <tbody>
          {tools.map((t) => (
            <tr
              key={t.tool_number}
              className="border-b border-white/5 text-slate-300 hover:bg-white/[0.03]"
            >
              <td className="px-4 py-2.5 font-medium text-cyan-300">T{t.tool_number}</td>
              <td className="px-4 py-2.5">{t.tool_type}</td>
              <td className="px-4 py-2.5">{t.diameter_mm}mm</td>
              <td className="px-4 py-2.5">{t.blocks_optimized}</td>
              <td className="px-4 py-2.5 text-slate-500">{fmtRange(t.original_rpm_range)}</td>
              <td className="px-4 py-2.5 text-emerald-400">{fmtRange(t.optimized_rpm_range)}</td>
              <td className="px-4 py-2.5 text-slate-500">{fmtRange(t.original_feed_range)}</td>
              <td className="px-4 py-2.5 text-emerald-400">{fmtRange(t.optimized_feed_range)}</td>
              <td className="px-4 py-2.5">
                {t.max_force_N > 0 ? `${t.max_force_N.toFixed(0)} N` : '—'}
              </td>
              <td className="px-4 py-2.5">
                {t.max_power_kW > 0 ? `${t.max_power_kW.toFixed(1)} kW` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
