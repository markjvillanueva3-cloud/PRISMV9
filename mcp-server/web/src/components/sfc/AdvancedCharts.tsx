import { useState, useMemo, useCallback, useRef } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, BarChart, Bar, Cell,
} from "recharts";
import { Card } from "../ui";
import type { SfcCalculateResult } from "../../types/sfc";
import type { SfcParams } from "./ParameterPanel";
import type { MachineEntry } from "../../data/machines";

interface Props {
  result: SfcCalculateResult | null;
  params: SfcParams;
  machine: MachineEntry | null;
}

type Tab = "toolLife" | "power" | "surfaceFinish";

const TABS: { id: Tab; label: string }[] = [
  { id: "toolLife", label: "Tool Life" },
  { id: "power", label: "Power" },
  { id: "surfaceFinish", label: "Surface Finish" },
];

/** Taylor tool life constants by material group */
const TAYLOR: Record<string, { n: number; C: number }> = {
  P: { n: 0.25, C: 300 },   // Carbon/alloy steel + carbide
  M: { n: 0.22, C: 200 },   // Stainless steel + carbide
  K: { n: 0.28, C: 250 },   // Cast iron + carbide
  N: { n: 0.35, C: 500 },   // Non-ferrous + carbide
  S: { n: 0.18, C: 120 },   // Superalloys + carbide
  H: { n: 0.15, C: 100 },   // Hardened steel + CBN
};

function generateToolLifeData(cuttingSpeed: number, materialGroup: string) {
  const { n, C } = TAYLOR[materialGroup] ?? TAYLOR.P;
  const points: { speed: number; life: number }[] = [];
  if (cuttingSpeed <= 0) return points;
  const minV = Math.max(20, cuttingSpeed * 0.3);
  const maxV = cuttingSpeed * 2.5;
  const step = (maxV - minV) / 40;
  if (step <= 0) return points;
  for (let v = minV; v <= maxV; v += step) {
    if (v <= 0) continue;
    const life = Math.pow(C / v, 1 / n);
    if (Number.isFinite(life) && life > 0 && life < 10000) {
      points.push({ speed: Math.round(v), life: Math.round(life * 10) / 10 });
    }
  }
  return points;
}

function generateSurfaceFinishData(currentFeed: number, toolDiameter: number) {
  const points: { feed: number; ra: number }[] = [];
  if (toolDiameter <= 0) return points;
  const noseRadius = Math.max(toolDiameter / 2, 0.01);
  const minF = 0.02;
  const maxF = Math.max(currentFeed * 2.5, 0.5);
  const step = (maxF - minF) / 40;
  if (step <= 0) return points;
  for (let f = minF; f <= maxF; f += step) {
    // Theoretical Ra = f^2 / (32 * r) in mm → convert to µm
    const ra = (f * f) / (32 * noseRadius) * 1000;
    if (Number.isFinite(ra)) {
      points.push({ feed: Math.round(f * 1000) / 1000, ra: Math.round(ra * 100) / 100 });
    }
  }
  return points;
}

export default function AdvancedCharts({ result, params, machine }: Props) {
  const [tab, setTab] = useState<Tab>("toolLife");
  const chartRef = useRef<HTMLDivElement>(null);

  const handleExportPng = useCallback(() => {
    if (!chartRef.current) return;
    const svg = chartRef.current.querySelector("svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    img.onerror = () => { img.onload = null; img.onerror = null; };
    img.onload = () => {
      try {
        canvas.width = img.width * 2;
        canvas.height = img.height * 2;
        ctx.scale(2, 2);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        const a = document.createElement("a");
        a.download = `prism-${tab}-chart.png`;
        a.href = canvas.toDataURL("image/png");
        a.click();
      } finally {
        img.onload = null;
        img.onerror = null;
      }
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  }, [tab]);

  if (!result) {
    return (
      <Card title="Charts">
        <p className="py-6 text-center text-sm text-slate-400">
          Run a calculation to see charts
        </p>
      </Card>
    );
  }

  return (
    <Card title="Charts">
      {/* Tab buttons */}
      <div className="flex gap-1 mb-4" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            aria-controls={`chart-panel-${t.id}`}
            onClick={() => setTab(t.id)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === t.id
                ? "bg-primary-600 text-white"
                : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
        <button
          type="button"
          onClick={handleExportPng}
          className="ml-auto text-xs text-primary-600 hover:underline"
          title="Export chart as PNG"
          aria-label="Export current chart as PNG"
        >
          Export PNG
        </button>
      </div>

      <div ref={chartRef} role="tabpanel" id={`chart-panel-${tab}`}>
        {tab === "toolLife" && (
          <ToolLifeChart
            cuttingSpeed={result.cutting_speed}
            materialGroup={typeof result.meta?.material_group === "string" ? result.meta.material_group : "P"}
          />
        )}
        {tab === "power" && (
          <PowerChart
            requiredPower={Number(result.meta?.power_kw) || 0}
            machinePower={machine?.spindlePowerKw ?? 0}
          />
        )}
        {tab === "surfaceFinish" && (
          <SurfaceFinishChart
            currentFeed={result.feed_per_tooth}
            toolDiameter={params.tool_diameter}
          />
        )}
      </div>
    </Card>
  );
}

function ToolLifeChart({ cuttingSpeed, materialGroup }: { cuttingSpeed: number; materialGroup: string }) {
  const data = useMemo(() => generateToolLifeData(cuttingSpeed, materialGroup), [cuttingSpeed, materialGroup]);
  const currentLife = useMemo(() => {
    if (cuttingSpeed <= 0) return 0;
    const { n, C } = TAYLOR[materialGroup] ?? TAYLOR.P;
    const life = Math.pow(C / cuttingSpeed, 1 / n);
    return Number.isFinite(life) ? Math.round(life * 10) / 10 : 0;
  }, [cuttingSpeed, materialGroup]);

  return (
    <div>
      <p className="mb-2 text-xs text-slate-500">
        Taylor Tool Life Curve &mdash; T = (C/V)<sup>1/n</sup> &mdash;
        Current: <strong>{cuttingSpeed.toFixed(0)} m/min</strong> &rarr; <strong>{currentLife} min</strong>
      </p>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 20, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="speed"
            label={{ value: "Cutting Speed (m/min)", position: "insideBottom", offset: -10, fontSize: 11 }}
            tick={{ fontSize: 10 }}
          />
          <YAxis
            label={{ value: "Tool Life (min)", angle: -90, position: "insideLeft", fontSize: 11 }}
            tick={{ fontSize: 10 }}
          />
          <Tooltip
            formatter={(val: unknown) => [`${val ?? 0} min`, "Tool Life"]}
            labelFormatter={(label) => `${label} m/min`}
          />
          <Line type="monotone" dataKey="life" stroke="#2563eb" strokeWidth={2} dot={false} />
          <ReferenceLine
            x={Math.round(cuttingSpeed)}
            stroke="#ef4444"
            strokeDasharray="4 4"
            label={{ value: "Current", position: "top", fontSize: 10, fill: "#ef4444" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function PowerChart({ requiredPower, machinePower }: { requiredPower: number; machinePower: number }) {
  const data = [
    { name: "Required", value: requiredPower, fill: requiredPower > machinePower ? "#ef4444" : "#2563eb" },
    { name: "Available", value: machinePower, fill: "#22c55e" },
  ];

  if (requiredPower <= 0 && machinePower <= 0) {
    return (
      <p className="py-8 text-center text-xs text-slate-400">
        No power data available. Select a machine and run a calculation.
      </p>
    );
  }

  const margin = machinePower > 0 && requiredPower > 0
    ? ((machinePower - requiredPower) / machinePower * 100).toFixed(1)
    : null;

  return (
    <div>
      <p className="mb-2 text-xs text-slate-500">
        Power Envelope &mdash; Required vs Available
        {margin !== null && (
          <span className={Number(margin) >= 0 ? " text-green-600" : " text-red-500"}>
            {" "}({Number(margin) >= 0 ? "+" : ""}{margin}% margin)
          </span>
        )}
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 5, right: 20, bottom: 20, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis
            label={{ value: "Power (kW)", angle: -90, position: "insideLeft", fontSize: 11 }}
            tick={{ fontSize: 10 }}
          />
          <Tooltip formatter={(val: unknown) => [`${Number(val ?? 0).toFixed(1)} kW`, "Power"]} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function SurfaceFinishChart({ currentFeed, toolDiameter }: { currentFeed: number; toolDiameter: number }) {
  const data = useMemo(() => generateSurfaceFinishData(currentFeed, toolDiameter), [currentFeed, toolDiameter]);
  const noseRadius = Math.max(toolDiameter / 2, 0.01);
  const currentRa = toolDiameter > 0
    ? (currentFeed * currentFeed) / (32 * noseRadius) * 1000
    : 0;

  return (
    <div>
      <p className="mb-2 text-xs text-slate-500">
        Surface Finish vs Feed &mdash; Ra = f&sup2; / (32r) &mdash;
        Current: <strong>{currentFeed.toFixed(3)} mm/tooth</strong> &rarr; <strong>{currentRa.toFixed(2)} &mu;m Ra</strong>
      </p>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 20, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="feed"
            label={{ value: "Feed per Tooth (mm)", position: "insideBottom", offset: -10, fontSize: 11 }}
            tick={{ fontSize: 10 }}
          />
          <YAxis
            label={{ value: "Ra (\u00b5m)", angle: -90, position: "insideLeft", fontSize: 11 }}
            tick={{ fontSize: 10 }}
          />
          <Tooltip
            formatter={(val: unknown) => [`${val ?? 0} \u00b5m`, "Ra"]}
            labelFormatter={(label) => `${label} mm/tooth`}
          />
          <Line type="monotone" dataKey="ra" stroke="#f59e0b" strokeWidth={2} dot={false} />
          <ReferenceLine
            x={Math.round(currentFeed * 1000) / 1000}
            stroke="#ef4444"
            strokeDasharray="4 4"
            label={{ value: "Current", position: "top", fontSize: 10, fill: "#ef4444" }}
          />
          {/* Target line at 1.6 µm Ra (common finish target) */}
          <ReferenceLine
            y={1.6}
            stroke="#22c55e"
            strokeDasharray="6 3"
            label={{ value: "Target 1.6\u00b5m", position: "right", fontSize: 10, fill: "#22c55e" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
