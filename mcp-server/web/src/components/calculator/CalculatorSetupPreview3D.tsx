import { useMemo } from 'react';
import { Viewer3D } from '../viewer/Viewer3D';
import type { CalculatorSetupPreviewModel, SetupPreviewSeverity, SetupPreviewZone } from '../../utils/calculatorSetupPreview';

function toneClasses(severity: SetupPreviewSeverity) {
  switch (severity) {
    case 'fail':
      return {
        frame: 'border-rose-500/30 bg-[linear-gradient(180deg,rgba(69,10,10,0.86)_0%,rgba(22,7,10,0.98)_100%)] shadow-[0_0_34px_rgba(244,63,94,0.12)]',
        badge: 'border-rose-400/35 bg-rose-400/12 text-rose-100',
        accent: 'text-rose-200',
      };
    case 'watch':
      return {
        frame: 'border-amber-400/24 bg-[linear-gradient(180deg,rgba(51,28,8,0.88)_0%,rgba(18,11,7,0.98)_100%)] shadow-[0_0_30px_rgba(245,158,11,0.10)]',
        badge: 'border-amber-300/35 bg-amber-300/10 text-amber-100',
        accent: 'text-amber-100',
      };
    case 'ready':
    default:
      return {
        frame: 'border-cyan-400/18 bg-[linear-gradient(180deg,rgba(7,28,44,0.92)_0%,rgba(7,16,28,0.99)_100%)] shadow-[0_0_30px_rgba(34,211,238,0.10)]',
        badge: 'border-cyan-300/30 bg-cyan-300/10 text-cyan-100',
        accent: 'text-slate-100',
      };
  }
}

function zoneMaterial(zoneSeverity: SetupPreviewSeverity, baseColor: string) {
  if (zoneSeverity === 'fail') {
    return {
      color: '#f43f5e',
      emissive: '#7f1d1d',
      metalness: 0.42,
      roughness: 0.28,
    };
  }
  if (zoneSeverity === 'watch') {
    return {
      color: '#f59e0b',
      emissive: '#78350f',
      metalness: 0.4,
      roughness: 0.32,
    };
  }
  return {
    color: baseColor,
    emissive: '#020617',
    metalness: 0.52,
    roughness: 0.34,
  };
}

function DetailChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="mt-2 text-sm font-semibold text-slate-100">{value}</div>
    </div>
  );
}

function RiskCard({ title, detail, tone }: { title: string; detail: string; tone: SetupPreviewSeverity }) {
  const classes = toneClasses(tone);
  return (
    <div className={`rounded-2xl border px-4 py-4 ${classes.frame}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-slate-50">{title}</div>
        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${classes.badge}`}>
          {tone === 'fail' ? 'Likely fail' : tone === 'watch' ? 'Watch' : 'Ready'}
        </span>
      </div>
      <div className="mt-2 text-sm leading-6 text-slate-300">{detail}</div>
    </div>
  );
}

function MillScene({ preview }: { preview: CalculatorSetupPreviewModel }) {
  const dims = preview.dimensions;
  const spindleTone = zoneMaterial(preview.zoneSeverity.spindle, '#8da2b8');
  const holderTone = zoneMaterial(preview.zoneSeverity.holder, '#42536a');
  const toolTone = zoneMaterial(preview.zoneSeverity.tool, '#d2dae5');
  const cutTone = zoneMaterial(preview.zoneSeverity.cut, '#14b8a6');

  const housingY = 82;
  const gaugeY = 12;
  const holderBodyY = -44;
  const toolCenterY = -118;
  const cutCenterY = toolCenterY - dims.toolStickoutMm / 2 + dims.fluteLengthMm / 2;
  const stockY = -dims.toolStickoutMm - dims.workpieceDepthMm / 2 - 18;
  const engagementY = stockY + dims.workpieceDepthMm / 2 - dims.engagementDocMm / 2;

  return (
    <group rotation={[0.35, 0.58, 0]} position={[0, -20, 0]}>
      <mesh position={[0, housingY, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[dims.spindleHousingDiameterMm / 2, dims.spindleHousingDiameterMm / 2, dims.spindleHousingLengthMm, 48]} />
        <meshStandardMaterial {...spindleTone} />
      </mesh>
      <mesh position={[0, gaugeY, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[dims.spindleGaugeDiameterMm / 2, dims.holderGaugeDiameterMm / 2, dims.spindleGaugeLengthMm, 48]} />
        <meshStandardMaterial {...spindleTone} />
      </mesh>
      <mesh position={[0, holderBodyY, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[dims.holderBodyDiameterMm / 2, dims.holderGaugeDiameterMm / 2, dims.holderBodyLengthMm, 40]} />
        <meshStandardMaterial {...holderTone} />
      </mesh>
      <mesh position={[0, toolCenterY, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[dims.toolShankDiameterMm / 2, dims.toolShankDiameterMm / 2, dims.toolStickoutMm, 32]} />
        <meshStandardMaterial {...holderTone} />
      </mesh>
      <mesh position={[0, cutCenterY, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[dims.toolCutDiameterMm / 2, dims.toolCutDiameterMm / 2, dims.fluteLengthMm, 32]} />
        <meshStandardMaterial {...toolTone} />
      </mesh>
      <mesh position={[0, stockY, 0]} receiveShadow>
        <boxGeometry args={[dims.workpieceWidthMm, dims.workpieceDepthMm, dims.workpieceWidthMm * 0.72]} />
        <meshStandardMaterial color="#334155" metalness={0.18} roughness={0.74} />
      </mesh>
      <mesh position={[0, engagementY, dims.workpieceWidthMm * 0.14]} receiveShadow>
        <boxGeometry args={[Math.max(dims.engagementWocMm, dims.toolCutDiameterMm * 0.15), dims.engagementDocMm, dims.toolCutDiameterMm * 0.9]} />
        <meshStandardMaterial {...cutTone} transparent opacity={0.82} />
      </mesh>
      <mesh position={[0, stockY + dims.workpieceDepthMm / 2 + 2, 0]} receiveShadow>
        <boxGeometry args={[dims.workpieceWidthMm * 1.06, 4, dims.workpieceWidthMm * 0.78]} />
        <meshStandardMaterial color="#0f172a" metalness={0.1} roughness={0.88} />
      </mesh>
    </group>
  );
}

function LatheScene({ preview }: { preview: CalculatorSetupPreviewModel }) {
  const dims = preview.dimensions;
  const spindleTone = zoneMaterial(preview.zoneSeverity.spindle, '#8196a8');
  const holderTone = zoneMaterial(preview.zoneSeverity.holder, '#4b5563');
  const toolTone = zoneMaterial(preview.zoneSeverity.tool, '#d6dde7');
  const cutTone = zoneMaterial(preview.zoneSeverity.cut, '#fb7185');

  const chuckX = 104;
  const holderX = -108;
  const toolX = -24;
  const stockRadius = Math.max(dims.workpieceWidthMm * 0.18, dims.toolCutDiameterMm * 1.2);

  return (
    <group rotation={[0.16, -0.36, 0]} position={[0, -30, 0]}>
      <mesh position={[chuckX + 48, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
        <cylinderGeometry args={[dims.spindleHousingDiameterMm / 2, dims.spindleHousingDiameterMm / 2, dims.spindleHousingLengthMm * 0.9, 48]} />
        <meshStandardMaterial {...spindleTone} />
      </mesh>
      <mesh position={[chuckX, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
        <cylinderGeometry args={[dims.spindleGaugeDiameterMm / 2, dims.spindleGaugeDiameterMm / 2, dims.spindleGaugeLengthMm * 1.1, 40]} />
        <meshStandardMaterial {...spindleTone} />
      </mesh>
      <mesh position={[32, 0, 0]} rotation={[0, 0, Math.PI / 2]} receiveShadow>
        <cylinderGeometry args={[stockRadius, stockRadius, dims.workpieceWidthMm, 48]} />
        <meshStandardMaterial color="#334155" metalness={0.14} roughness={0.72} />
      </mesh>
      <mesh position={[holderX, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[dims.holderBodyLengthMm, dims.holderBodyDiameterMm * 0.84, dims.holderBodyDiameterMm]} />
        <meshStandardMaterial {...holderTone} />
      </mesh>
      <mesh position={[toolX, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
        <cylinderGeometry args={[dims.toolShankDiameterMm / 2, dims.toolShankDiameterMm / 2, dims.toolStickoutMm, 24]} />
        <meshStandardMaterial {...holderTone} />
      </mesh>
      <mesh position={[toolX + dims.toolStickoutMm / 2 - dims.fluteLengthMm / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
        <cylinderGeometry args={[dims.toolCutDiameterMm / 2, dims.toolCutDiameterMm / 2, dims.fluteLengthMm, 24]} />
        <meshStandardMaterial {...toolTone} />
      </mesh>
      <mesh position={[stockRadius * 0.18, stockRadius * 0.66, 0]} receiveShadow>
        <boxGeometry args={[Math.max(dims.engagementDocMm, 1.2), Math.max(dims.engagementWocMm, 1.2), dims.toolCutDiameterMm * 0.72]} />
        <meshStandardMaterial {...cutTone} transparent opacity={0.82} />
      </mesh>
    </group>
  );
}

function GenericScene({ preview }: { preview: CalculatorSetupPreviewModel }) {
  const dims = preview.dimensions;
  const spindleTone = zoneMaterial(preview.zoneSeverity.spindle, '#8da2b8');
  const toolTone = zoneMaterial(preview.zoneSeverity.tool, '#d2dae5');
  const cutTone = zoneMaterial(preview.zoneSeverity.cut, '#38bdf8');

  return (
    <group rotation={[0.28, 0.55, 0]} position={[0, -18, 0]}>
      <mesh position={[0, 64, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[dims.spindleHousingDiameterMm / 2.3, dims.spindleHousingDiameterMm / 2, dims.spindleHousingLengthMm, 40]} />
        <meshStandardMaterial {...spindleTone} />
      </mesh>
      <mesh position={[0, -28, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[dims.toolCutDiameterMm * 0.52, dims.toolCutDiameterMm * 0.58, dims.toolStickoutMm * 0.9, 28]} />
        <meshStandardMaterial {...toolTone} />
      </mesh>
      <mesh position={[0, -dims.toolStickoutMm * 0.65 - dims.workpieceDepthMm / 2, 0]} receiveShadow>
        <boxGeometry args={[dims.workpieceWidthMm, dims.workpieceDepthMm, dims.workpieceWidthMm * 0.64]} />
        <meshStandardMaterial color="#334155" metalness={0.12} roughness={0.72} />
      </mesh>
      <mesh position={[0, -dims.toolStickoutMm * 0.65, dims.workpieceWidthMm * 0.12]} receiveShadow>
        <boxGeometry args={[Math.max(dims.engagementWocMm, 3), Math.max(dims.engagementDocMm, 2), dims.toolCutDiameterMm * 0.85]} />
        <meshStandardMaterial {...cutTone} transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

function SetupScene({ preview }: { preview: CalculatorSetupPreviewModel }) {
  switch (preview.dimensions.machineMode) {
    case 'lathe':
      return <LatheScene preview={preview} />;
    case 'mill':
      return <MillScene preview={preview} />;
    default:
      return <GenericScene preview={preview} />;
  }
}

function ZoneLegend({
  zone,
  label,
  severity,
}: {
  zone: SetupPreviewZone;
  label: string;
  severity: SetupPreviewSeverity;
}) {
  const color =
    severity === 'fail' ? 'bg-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.4)]'
    : severity === 'watch' ? 'bg-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.35)]'
    : 'bg-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.25)]';

  return (
    <div className="flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-[11px] font-semibold text-slate-300">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} aria-hidden="true" />
      <span>{label}</span>
      <span className="text-slate-500">· {zone}</span>
    </div>
  );
}

function FallbackStage({ preview }: { preview: CalculatorSetupPreviewModel }) {
  return (
    <div
      data-testid="calculator-setup-preview-fallback"
      className="flex min-h-[300px] items-center justify-center rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(7,17,30,0.96)_0%,rgba(5,11,19,0.98)_100%)] px-5 py-6 text-center"
    >
      <div className="max-w-xl space-y-3">
        <div className="text-sm font-semibold text-slate-100">3D preview is ready when WebGL is available.</div>
        <div className="text-sm leading-6 text-slate-400">
          Kienzle is still calculating the same setup posture here. In the live browser, this card renders the spindle housing,
          holder, tool, and cut zone with red highlights for likely failures.
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <DetailChip label="Machine" value={preview.machineSummary} />
          <DetailChip label="Holder" value={preview.holderSummary} />
          <DetailChip label="Tool" value={preview.toolSummary} />
        </div>
      </div>
    </div>
  );
}

export function CalculatorSetupPreview3D({ preview }: { preview: CalculatorSetupPreviewModel }) {
  const stageTone = toneClasses(preview.severity);
  const topRisks = preview.risks.slice(0, 4);
  const webglAvailable = typeof window !== 'undefined' && typeof window.WebGLRenderingContext !== 'undefined';
  const badges = useMemo(
    () => [
      { zone: 'spindle' as const, label: 'Spindle / housing', severity: preview.zoneSeverity.spindle },
      { zone: 'holder' as const, label: 'Holder / taper', severity: preview.zoneSeverity.holder },
      { zone: 'tool' as const, label: 'Tool body', severity: preview.zoneSeverity.tool },
      { zone: 'cut' as const, label: 'Cut zone', severity: preview.zoneSeverity.cut },
    ],
    [preview.zoneSeverity.cut, preview.zoneSeverity.holder, preview.zoneSeverity.spindle, preview.zoneSeverity.tool],
  );

  return (
    <div className="space-y-4">
      <div className={`rounded-[26px] border px-4 py-4 ${stageTone.frame}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${stageTone.badge}`}>
                {preview.statusLabel}
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-300">
                {preview.interfaceFamily}
              </span>
            </div>
            <div className="mt-3 text-lg font-semibold text-slate-50">Spindle, holder, and tooling stack preview</div>
            <div className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">{preview.summary}</div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <DetailChip label="Reach ratio" value={`${preview.metrics.reachRatio.toFixed(1)} × D`} />
            <DetailChip label="DOC / D" value={`${preview.metrics.docToDiameterRatio.toFixed(2)} × D`} />
            <DetailChip label="WOC / D" value={`${preview.metrics.wocToDiameterRatio.toFixed(2)} × D`} />
            <DetailChip
              label={preview.metrics.liveRpmPercent != null ? 'RPM ceiling' : 'Setup posture'}
              value={
                preview.metrics.liveRpmPercent != null
                  ? `${preview.metrics.liveRpmPercent.toFixed(0)}% of tool limit`
                  : preview.isComplete
                    ? 'Fully modeled'
                    : 'Waiting on selections'
              }
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {badges.map((badge) => (
            <ZoneLegend key={badge.zone} zone={badge.zone} label={badge.label} severity={badge.severity} />
          ))}
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_360px]">
          {webglAvailable && preview.isComplete ? (
            <div className="min-h-[320px] overflow-hidden rounded-[22px] border border-white/10 bg-[#07111c]">
              <Viewer3D
                viewPreset={preview.dimensions.orientation === 'horizontal' ? 'right' : 'iso'}
                backgroundColor="#07111c"
                showGrid={false}
                showAxes={false}
                showGizmo={false}
                className="h-[320px] w-full"
              >
                <SetupScene preview={preview} />
              </Viewer3D>
            </div>
          ) : (
            <FallbackStage preview={preview} />
          )}

          <div className="space-y-3">
            <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Setup stack</div>
              <div className="mt-3 space-y-3">
                <DetailChip label="Machine package" value={preview.machineSummary} />
                <DetailChip label="Holder package" value={preview.holderSummary} />
                <DetailChip label="Active tool" value={preview.toolSummary} />
              </div>
            </div>

            <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">What the colors mean</div>
              <div className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                <p><span className="font-semibold text-cyan-100">Cyan / steel</span> means the setup looks aligned.</p>
                <p><span className="font-semibold text-amber-100">Amber</span> means a rigidity or process watchpoint needs review.</p>
                <p><span className="font-semibold text-rose-100">Red</span> means Kienzle thinks that part of the setup is likely to fail or is mismatched.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {topRisks.length ? (
        <div className="grid gap-3 xl:grid-cols-2">
          {topRisks.map((risk) => (
            <RiskCard key={risk.id} title={risk.title} detail={risk.detail} tone={risk.severity} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.08] px-4 py-3 text-sm text-emerald-100">
          The current stack does not have obvious mismatch or failure markers. Keep watching live load, finish, and chip behavior as the cut changes.
        </div>
      )}
    </div>
  );
}
