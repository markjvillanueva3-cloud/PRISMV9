/**
 * L9-P2-MS1 P0-U07: ViewerPage — Full 3D Viewer Integration
 *
 * Wires all viewer components:
 *   Viewer3D canvas + ToolpathLayer + StockMesh + ToolAssembly
 *   + HeatmapOverlay + ViewerToolbar + side panel
 *   + Screenshot export + JSON download
 */
import { useReducer, useMemo, useCallback, useRef } from 'react';
import { Viewer3D } from '../components/viewer/Viewer3D';
import { AnimatedToolpath } from '../components/viewer/ToolpathLayer';
import { StockMesh } from '../components/viewer/StockMesh';
import { ToolAssembly } from '../components/viewer/ToolAssembly';
import { HeatmapOverlay, ColorScaleLegend, getHeatmapConfig } from '../components/viewer/HeatmapOverlay';
import {
  ViewerToolbar,
  viewerReducer,
  DEFAULT_VIEWER_STATE,
} from '../components/viewer/ViewerToolbar';
import { buildDemoScene } from '../api/viewer';
import type { SceneGraph } from '../types/viewer';

export function ViewerPage() {
  const [state, dispatch] = useReducer(viewerReducer, DEFAULT_VIEWER_STATE);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Load demo scene
  const scene: SceneGraph = useMemo(() => buildDemoScene(), []);

  // Extract scene components
  const stockNode = useMemo(
    () => scene.root.children?.find((n) => n.type === 'mesh'),
    [scene]
  );
  const toolpathNode = useMemo(
    () => scene.root.children?.find((n) => n.type === 'toolpath'),
    [scene]
  );
  const toolpath = toolpathNode?.toolpath;
  const heatmapConfig = useMemo(
    () => getHeatmapConfig(state.heatmapType),
    [state.heatmapType]
  );

  // Screenshot export
  const handleScreenshot = useCallback(() => {
    const canvas = canvasRef.current?.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `prism-viewer-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, []);

  // JSON export
  const handleExportJSON = useCallback(() => {
    const blob = new Blob(
      [JSON.stringify(scene, null, 2)],
      { type: 'application/json' }
    );
    const link = document.createElement('a');
    link.download = `prism-scene-${Date.now()}.json`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  }, [scene]);

  // Playback progress callback
  const handleProgressChange = useCallback(
    (progress: number) => {
      dispatch({ type: 'SET_PROGRESS', progress });
    },
    []
  );

  // Stats for side panel
  const stats = useMemo(() => {
    if (!toolpath) return null;
    const feedSegs = toolpath.segments.filter(
      (s) => s.type === 'feed'
    );
    const rapidSegs = toolpath.segments.filter(
      (s) => s.type === 'rapid'
    );
    return {
      totalSegments: toolpath.segments.length,
      feedSegments: feedSegs.length,
      rapidSegments: rapidSegs.length,
      totalPoints: toolpath.total_points,
    };
  }, [toolpath]);

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">3D Viewer</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {scene.name} — {stats?.totalSegments ?? 0} segments
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleScreenshot}
            className="px-3 py-1.5 text-xs font-medium rounded
                       bg-gray-100 text-gray-700 hover:bg-gray-200"
            title="Export screenshot (PNG)"
          >
            Screenshot
          </button>
          <button
            onClick={handleExportJSON}
            className="px-3 py-1.5 text-xs font-medium rounded
                       bg-gray-100 text-gray-700 hover:bg-gray-200"
            title="Export scene data (JSON)"
          >
            Export JSON
          </button>
        </div>
      </div>

      {/* Main content: toolbar + canvas + side panel */}
      <div className="flex flex-1 gap-3 min-h-0">
        {/* Left: Toolbar */}
        <ViewerToolbar state={state} dispatch={dispatch} />

        {/* Center: 3D Canvas */}
        <div
          ref={canvasRef}
          className="flex-1 rounded-lg overflow-hidden border border-gray-200 relative"
        >
          <Viewer3D
            viewPreset={state.viewPreset}
            showGrid
            showAxes
            showGizmo
          >
            {/* Stock mesh */}
            {state.showStock && stockNode?.mesh && (
              <StockMesh
                mesh={stockNode.mesh}
                renderMode={state.renderMode}
                opacity={0.3}
              />
            )}

            {/* Toolpath */}
            {state.showToolpath && toolpath && (
              <AnimatedToolpath
                toolpath={toolpath}
                colorMode={state.colorMode}
                playing={state.playing}
                speed={state.playbackSpeed}
                onProgressChange={handleProgressChange}
                playbackProgress={state.playbackProgress}
              />
            )}

            {/* Tool assembly */}
            {state.showTool && (
              <ToolAssembly
                toolDiameter={12}
                toolLength={40}
                holderDiameter={40}
                holderLength={60}
                toolpath={toolpath}
                playbackProgress={
                  state.playing ? state.playbackProgress : undefined
                }
              />
            )}

            {/* Heatmap overlay */}
            {state.showHeatmap && toolpath && (
              <HeatmapOverlay
                toolpath={toolpath}
                heatmapType={state.heatmapType}
              />
            )}
          </Viewer3D>

          {/* Heatmap legend overlay */}
          {state.showHeatmap && (
            <div className="absolute bottom-4 right-4">
              <ColorScaleLegend config={heatmapConfig} />
            </div>
          )}
        </div>

        {/* Right: Side Panel */}
        <div className="w-48 bg-gray-50 rounded-lg p-3 text-xs
                        overflow-y-auto border border-gray-200">
          <h3 className="font-semibold text-gray-700 mb-2">
            Scene Info
          </h3>

          <div className="space-y-2">
            <InfoRow label="Scene" value={scene.name} />
            <InfoRow
              label="Segments"
              value={String(stats?.totalSegments ?? 0)}
            />
            <InfoRow
              label="Feed moves"
              value={String(stats?.feedSegments ?? 0)}
            />
            <InfoRow
              label="Rapid moves"
              value={String(stats?.rapidSegments ?? 0)}
            />
            <InfoRow
              label="Points"
              value={String(stats?.totalPoints ?? 0)}
            />
          </div>

          <hr className="my-3 border-gray-200" />

          <h3 className="font-semibold text-gray-700 mb-2">
            Operations
          </h3>
          <div className="space-y-1">
            <OperationItem
              name="Pocket Roughing"
              tool="T01 - 12mm End Mill"
              active
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-Components ───────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-800 font-medium">{value}</span>
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
      className={`p-1.5 rounded text-[11px] ${
        active
          ? 'bg-blue-50 border border-blue-200'
          : 'bg-white border border-gray-200'
      }`}
    >
      <div className="font-medium text-gray-800">{name}</div>
      <div className="text-gray-500">{tool}</div>
    </div>
  );
}
