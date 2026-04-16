import type { RefObject } from 'react';
import { useMemo } from 'react';
import { Viewer3D } from './Viewer3D';
import { AnimatedToolpath } from './ToolpathLayer';
import { StockMesh } from './StockMesh';
import { ToolAssembly } from './ToolAssembly';
import { ColorScaleLegend, HeatmapOverlay, getHeatmapConfig } from './HeatmapOverlay';
import type { ViewerState } from './ViewerToolbar';
import type { SceneGraph } from '../../types/viewer';

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/6 py-2 last:border-b-0">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="text-sm font-medium text-slate-100">{value}</span>
    </div>
  );
}

function OperationItem({
  name,
  tool,
  active,
}: {
  name: string;
  tool: string;
  active?: boolean;
}) {
  return (
    <div
      className={`rounded-[18px] border px-3 py-3 ${
        active
          ? 'border-cyan-300/18 bg-cyan-300/[0.06]'
          : 'border-white/8 bg-white/[0.03]'
      }`}
    >
      <div className="text-sm font-semibold text-slate-100">{name}</div>
      <div className="mt-1 text-xs text-slate-400">{tool}</div>
    </div>
  );
}

export function ViewerCanvasWorkspace({
  scene,
  state,
  playbackMode,
  canvasRef,
  onProgressChange,
}: {
  scene: SceneGraph;
  state: ViewerState;
  playbackMode: string;
  canvasRef: RefObject<HTMLDivElement | null>;
  onProgressChange: (progress: number) => void;
}) {
  const stockNode = useMemo(() => scene.root.children?.find((node) => node.type === 'mesh'), [scene]);
  const toolpathNode = useMemo(() => scene.root.children?.find((node) => node.type === 'toolpath'), [scene]);
  const toolpath = toolpathNode?.toolpath;
  const heatmapConfig = useMemo(() => getHeatmapConfig(state.heatmapType), [state.heatmapType]);

  const stats = useMemo(() => {
    if (!toolpath) return null;
    const feedSegments = toolpath.segments.filter((segment) => segment.type === 'feed');
    const rapidSegments = toolpath.segments.filter((segment) => segment.type === 'rapid');
    return {
      totalSegments: toolpath.segments.length,
      feedSegments: feedSegments.length,
      rapidSegments: rapidSegments.length,
      totalPoints: toolpath.total_points,
    };
  }, [toolpath]);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,24,0.96)_0%,rgba(5,10,16,0.98)_100%)] shadow-[0_30px_90px_rgba(0,0,0,0.28)]">
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Canvas</div>
            <div className="mt-1 text-lg font-semibold text-slate-50">
              {scene.name} — {stats?.totalSegments ?? 0} segments
            </div>
          </div>
          <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
            {state.showHeatmap ? 'Heatmap on' : 'Standard view'}
          </div>
        </div>

        <div ref={canvasRef} className="relative h-[min(72vh,780px)] min-h-[520px]">
          <Viewer3D viewPreset={state.viewPreset} showGrid showAxes showGizmo>
            {state.showStock && stockNode?.mesh ? (
              <StockMesh mesh={stockNode.mesh} renderMode={state.renderMode} opacity={0.3} />
            ) : null}

            {state.showToolpath && toolpath ? (
              <AnimatedToolpath
                toolpath={toolpath}
                colorMode={state.colorMode}
                playing={state.playing}
                speed={state.playbackSpeed}
                onProgressChange={onProgressChange}
                playbackProgress={state.playbackProgress}
              />
            ) : null}

            {state.showTool ? (
              <ToolAssembly
                toolDiameter={12}
                toolLength={40}
                holderDiameter={40}
                holderLength={60}
                toolpath={toolpath}
                playbackProgress={state.playing ? state.playbackProgress : undefined}
              />
            ) : null}

            {state.showHeatmap && toolpath ? (
              <HeatmapOverlay toolpath={toolpath} heatmapType={state.heatmapType} />
            ) : null}
          </Viewer3D>

          <div className="pointer-events-none absolute left-4 top-4 rounded-full border border-white/10 bg-black/35 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200">
            {playbackMode}
          </div>

          {state.showHeatmap ? (
            <div className="absolute bottom-4 right-4">
              <ColorScaleLegend config={heatmapConfig} />
            </div>
          ) : null}
        </div>
      </section>

      <section className="space-y-6">
        <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,24,0.96)_0%,rgba(5,10,16,0.96)_100%)] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.28)]">
          <div className="mb-4 text-lg font-semibold text-slate-50">Scene Info</div>
          <div className="space-y-1">
            <InfoRow label="Scene" value={scene.name} />
            <InfoRow label="Segments" value={String(stats?.totalSegments ?? 0)} />
            <InfoRow label="Feed moves" value={String(stats?.feedSegments ?? 0)} />
            <InfoRow label="Rapid moves" value={String(stats?.rapidSegments ?? 0)} />
            <InfoRow label="Points" value={String(stats?.totalPoints ?? 0)} />
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,24,0.96)_0%,rgba(5,10,16,0.96)_100%)] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.28)]">
          <div className="mb-4 text-lg font-semibold text-slate-50">Operations</div>
          <div className="space-y-3">
            <OperationItem name="Pocket Roughing" tool="T01 - 12mm End Mill" active />
          </div>
        </div>
      </section>
    </div>
  );
}
