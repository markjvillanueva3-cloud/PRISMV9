/**
 * BIZ-MS4 U-BIZ30: Commission & Bonus Tracker
 * Tiered commission rules, per-salesperson report, period breakdown.
 */
import { useEffect, useState } from 'react';
import { commissionReport } from '../api/client';
import { PanelCard, SummaryTile, WorkspaceHero } from '../components/workspace/WorkspacePrimitives';

interface CommissionEntry {
  salesperson: string;
  revenue: number;
  margin_pct: number;
  commission_rate_pct: number;
  commission_amount: number;
  deals_closed: number;
}

function money(v: number): string { return `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`; }

export default function CommissionTrackerPage() {
  const [entries, setEntries] = useState<CommissionEntry[]>([]);

  useEffect(() => {
    commissionReport().then((r) => setEntries(((r as any).data ?? (r as any).result ?? []) as CommissionEntry[])).catch(() => {});
  }, []);

  const totalCommission = entries.reduce((s, e) => s + e.commission_amount, 0);
  const totalRevenue = entries.reduce((s, e) => s + e.revenue, 0);

  return (
    <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6">
      <WorkspaceHero eyebrow="Sales compensation" title="Commission Tracker" description="Track commissions and bonuses by salesperson with tiered rate rules."
        metrics={<>
          <SummaryTile label="Total Commission" value={money(totalCommission)} accent="from-emerald-400/22 via-emerald-300/10 to-transparent" />
          <SummaryTile label="Revenue Closed" value={money(totalRevenue)} />
          <SummaryTile label="Salespeople" value={String(entries.length)} accent="from-violet-400/22 via-violet-300/10 to-transparent" />
        </>}
      />
      <PanelCard title="Commission Report" subtitle="Per-salesperson commission breakdown.">
        {entries.length > 0 ? (
          <div className="overflow-x-auto rounded-[20px] border border-white/8">
            <table className="w-full text-left text-sm">
              <thead><tr className="border-b border-white/8 bg-white/[0.02]">
                <th className="px-4 py-3 text-xs uppercase text-slate-500">Salesperson</th>
                <th className="px-4 py-3 text-right text-xs uppercase text-slate-500">Revenue</th>
                <th className="px-4 py-3 text-right text-xs uppercase text-slate-500">Margin</th>
                <th className="px-4 py-3 text-right text-xs uppercase text-slate-500">Rate</th>
                <th className="px-4 py-3 text-right text-xs uppercase text-slate-500">Commission</th>
                <th className="px-4 py-3 text-right text-xs uppercase text-slate-500">Deals</th>
              </tr></thead>
              <tbody>{entries.map((e) => (
                <tr key={e.salesperson} className="border-b border-white/[0.04]">
                  <td className="px-4 py-2.5 text-slate-100">{e.salesperson}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-slate-300">{money(e.revenue)}</td>
                  <td className="px-4 py-2.5 text-right text-slate-400">{e.margin_pct.toFixed(1)}%</td>
                  <td className="px-4 py-2.5 text-right text-slate-400">{e.commission_rate_pct.toFixed(1)}%</td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold text-emerald-300">{money(e.commission_amount)}</td>
                  <td className="px-4 py-2.5 text-right text-slate-400">{e.deals_closed}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <div className="text-sm text-slate-400">No commission data available.</div>}
      </PanelCard>
    </div>
  );
}
