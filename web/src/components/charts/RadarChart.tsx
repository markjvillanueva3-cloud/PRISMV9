/**
 * L8-P1-MS2 P0-U12: Shared Chart Components — RadarChart
 * SVG radar chart for skill domain visualization.
 */

interface RadarChartProps {
  data: { label: string; value: number; max?: number }[];
  size?: number;
  color?: string;
}

export function RadarChart({ data, size = 200, color = '#6366f1' }: RadarChartProps) {
  if (data.length < 3) return null;

  const cx = size / 2;
  const cy = size / 2;
  const radius = (size / 2) - 30;
  const n = data.length;
  const angleStep = (2 * Math.PI) / n;

  function getPoint(index: number, r: number): [number, number] {
    const angle = angleStep * index - Math.PI / 2;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  }

  // Grid rings
  const rings = [0.25, 0.5, 0.75, 1.0];

  // Data polygon
  const points = data.map((d, i) => {
    const pct = d.value / (d.max ?? 100);
    return getPoint(i, radius * Math.min(pct, 1));
  });
  const polygonPath = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ') + 'Z';

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Skill radar chart">
      {/* Grid */}
      {rings.map(r => (
        <polygon
          key={r}
          points={data.map((_, i) => getPoint(i, radius * r).join(',')).join(' ')}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={1}
        />
      ))}

      {/* Axis lines */}
      {data.map((_, i) => {
        const [x, y] = getPoint(i, radius);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#e5e7eb" strokeWidth={1} />;
      })}

      {/* Data polygon */}
      <path d={polygonPath} fill={color} fillOpacity={0.15} stroke={color} strokeWidth={2} />

      {/* Data points */}
      {points.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={3} fill={color} />
      ))}

      {/* Labels */}
      {data.map((d, i) => {
        const [x, y] = getPoint(i, radius + 18);
        return (
          <text
            key={i}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="central"
            className="text-xs fill-gray-600"
            fontSize={11}
          >
            {d.label}
          </text>
        );
      })}
    </svg>
  );
}
