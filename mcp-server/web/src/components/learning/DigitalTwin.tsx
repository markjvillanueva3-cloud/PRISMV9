/**
 * L8-P1-MS2 P0-U10: Digital Twin Panel
 * Live status gauges: spindle RPM, feed, position XYZ. Alerts and history.
 */
import { useEffect, useRef } from 'react';
import { useTwin } from '../../hooks/useLearning';
import { LoadingState } from '../LoadingState';
import { ErrorState } from '../ErrorState';
import type { TwinAlert } from '../../types/learning';

const ALERT_STYLES: Record<TwinAlert['level'], { bg: string; text: string; border: string }> = {
  critical: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  warning: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  info: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
};

const STATUS_COLORS: Record<string, string> = {
  idle: 'bg-gray-400',
  running: 'bg-emerald-500',
  alarm: 'bg-red-500',
  maintenance: 'bg-amber-500',
};

export function DigitalTwin() {
  const { twin, loading, error, fetchTwin } = useTwin();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchTwin({ action: 'status' });
    // Poll every 5 seconds for live data
    intervalRef.current = setInterval(() => {
      fetchTwin({ action: 'status' });
    }, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchTwin]);

  if (loading && !twin) return <LoadingState label="Connecting to digital twin..." />;
  if (error) return <ErrorState message={error} onRetry={() => fetchTwin({ action: 'status' })} />;
  if (!twin) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Digital Twin</h1>
          <p className="text-sm text-gray-500 mt-1">{twin.machine_name}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${STATUS_COLORS[twin.status] ?? 'bg-gray-400'}`} />
          <span className="text-sm font-medium text-gray-700 capitalize">{twin.status}</span>
          {twin.current_program && (
            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full ml-2">
              {twin.current_program}
            </span>
          )}
        </div>
      </div>

      {/* Primary Gauges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GaugeCard label="Spindle RPM" value={twin.spindle_rpm} max={15000} unit="RPM"
          color={twin.spindle_rpm > 12000 ? 'bg-red-500' : 'bg-prism-500'} />
        <GaugeCard label="Feed Rate" value={twin.feed_rate_mmmin} max={5000} unit="mm/min"
          color="bg-emerald-500" />
        <GaugeCard label="Temperature" value={twin.temperature_c} max={100} unit="\u00b0C"
          color={twin.temperature_c > 80 ? 'bg-red-500' : twin.temperature_c > 60 ? 'bg-amber-500' : 'bg-blue-500'} />
        <GaugeCard label="Vibration" value={twin.vibration_mms} max={10} unit="mm/s"
          color={twin.vibration_mms > 7 ? 'bg-red-500' : twin.vibration_mms > 4 ? 'bg-amber-500' : 'bg-emerald-500'} />
      </div>

      {/* Position & Tool Wear */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Position (mm)</h2>
          <div className="grid grid-cols-3 gap-4">
            {(['x', 'y', 'z'] as const).map(axis => (
              <div key={axis} className="text-center">
                <div className="text-xs text-gray-500 uppercase">{axis}</div>
                <div className="text-lg font-mono font-bold text-gray-900">
                  {twin.position[axis].toFixed(3)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">Tool Wear</h2>
            <span className="text-sm font-medium text-gray-900">{twin.tool_wear_pct.toFixed(1)}%</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                twin.tool_wear_pct > 80 ? 'bg-red-500' : twin.tool_wear_pct > 50 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${twin.tool_wear_pct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>New</span>
            <span>Replace</span>
          </div>
          <div className="mt-3 text-sm text-gray-500">
            Uptime: <span className="font-medium text-gray-700">{twin.uptime_hours.toFixed(1)}h</span>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {twin.alerts.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Alerts ({twin.alerts.length})</h2>
          <div className="space-y-2">
            {twin.alerts.map((alert, i) => {
              const style = ALERT_STYLES[alert.level];
              return (
                <div key={i} className={`${style.bg} ${style.border} border rounded-lg p-3 flex items-start justify-between`}>
                  <div>
                    <span className={`text-sm font-medium ${style.text}`}>{alert.message}</span>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {alert.parameter}: {alert.value} (threshold: {alert.threshold})
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap ml-4">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function GaugeCard({ label, value, max, unit, color }: {
  label: string; value: number; max: number; unit: string; color: string;
}) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="text-xs text-gray-500 mb-2">{label}</div>
      <div className="text-xl font-bold text-gray-900">
        {value.toLocaleString()} <span className="text-xs font-normal text-gray-500">{unit}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-2">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
