/**
 * BarChart — Simple horizontal bar chart.
 * Ported from mcp-server/web — replaced prism-500 with primary-500.
 */

interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  max?: number;
}

export function BarChart({ data, max: maxProp }: BarChartProps) {
  const max = maxProp ?? Math.max(...data.map(d => d.value), 1);

  return (
    <div className="space-y-2">
      {data.map((d, i) => {
        const pct = (d.value / max) * 100;
        return (
          <div key={i}>
            <div className="flex items-center justify-between text-sm mb-0.5">
              <span className="text-gray-700">{d.label}</span>
              <span className="text-gray-500 font-medium">{d.value}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${d.color ?? 'bg-primary-500'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
