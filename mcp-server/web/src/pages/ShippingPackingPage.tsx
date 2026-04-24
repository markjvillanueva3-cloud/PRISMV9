import { useEffect, useMemo, useState } from 'react';
import {
  ActionButton,
  PanelCard,
  StatusPill,
  SummaryTile,
  WorkspaceHero,
} from '../components/workspace/WorkspacePrimitives';

interface ShipmentRow {
  id: string;
  job_id: string;
  customer: string;
  part_count: number;
  status: 'queued' | 'packing' | 'ready' | 'shipped';
  destination: string;
  planned_ship_date: string;
}

const EMPTY_ROWS: ShipmentRow[] = [];

function statusTone(status: ShipmentRow['status']): 'emerald' | 'amber' | 'slate' | 'sky' {
  if (status === 'shipped') return 'emerald';
  if (status === 'ready') return 'sky';
  if (status === 'packing') return 'amber';
  return 'slate';
}

export default function ShippingPackingPage() {
  const [rows, setRows] = useState<ShipmentRow[]>(EMPTY_ROWS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/v1/erp/shipping/queue');
        if (!res.ok) throw new Error(res.statusText || 'Request failed');
        const payload = (await res.json()) as { rows?: ShipmentRow[] };
        if (!cancelled) setRows(payload.rows ?? []);
      } catch (issue) {
        if (!cancelled) setError(issue instanceof Error ? issue.message : 'Shipping queue unavailable');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const summary = useMemo(() => {
    const queued = rows.filter((r) => r.status === 'queued').length;
    const packing = rows.filter((r) => r.status === 'packing').length;
    const ready = rows.filter((r) => r.status === 'ready').length;
    const shipped = rows.filter((r) => r.status === 'shipped').length;
    return { queued, packing, ready, shipped };
  }, [rows]);

  return (
    <div className="flex flex-col gap-4 p-4">
      <WorkspaceHero
        eyebrow="ERP · Shipping"
        title="Shipping & Packing"
        description="Outbound shipment queue — status, destinations, and planned ship dates for all open jobs."
        metrics={
          <>
            <SummaryTile label="Queued" value={summary.queued.toString()} hint="awaiting packing" />
            <SummaryTile label="Packing" value={summary.packing.toString()} hint="in process" />
            <SummaryTile label="Ready" value={summary.ready.toString()} hint="ready to ship" />
            <SummaryTile label="Shipped" value={summary.shipped.toString()} hint="closed today" />
          </>
        }
      />

      <PanelCard title="Shipment queue" subtitle={loading ? 'Loading…' : error ?? `${rows.length} shipment${rows.length === 1 ? '' : 's'}`}>
        {error ? (
          <div className="text-red-400 text-sm">{error}</div>
        ) : rows.length === 0 && !loading ? (
          <div className="text-slate-400 text-sm">No open shipments.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-slate-400 text-xs uppercase">
                <tr>
                  <th className="py-2 pr-4">Shipment</th>
                  <th className="py-2 pr-4">Job</th>
                  <th className="py-2 pr-4">Customer</th>
                  <th className="py-2 pr-4">Parts</th>
                  <th className="py-2 pr-4">Destination</th>
                  <th className="py-2 pr-4">Ship date</th>
                  <th className="py-2 pr-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-800">
                    <td className="py-2 pr-4 font-mono text-xs">{row.id}</td>
                    <td className="py-2 pr-4 font-mono text-xs">{row.job_id}</td>
                    <td className="py-2 pr-4">{row.customer}</td>
                    <td className="py-2 pr-4">{row.part_count}</td>
                    <td className="py-2 pr-4">{row.destination}</td>
                    <td className="py-2 pr-4">{row.planned_ship_date}</td>
                    <td className="py-2 pr-4">
                      <StatusPill label={row.status} tone={statusTone(row.status)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-3 flex gap-2">
          <ActionButton onClick={() => void fetch('/api/v1/erp/shipping/refresh', { method: 'POST' })}>
            Refresh queue
          </ActionButton>
        </div>
      </PanelCard>
    </div>
  );
}
