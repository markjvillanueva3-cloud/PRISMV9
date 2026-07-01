import { Suspense, lazy, startTransition, useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { ViewerToolbar, viewerReducer, DEFAULT_VIEWER_STATE } from '../components/viewer/ViewerToolbar';
import { ErrorState } from '../components/LoadingState';
import { WorkspaceErrorBoundary } from '../components/workspace/WorkspaceErrorBoundary';
import type { SceneGraph } from '../types/viewer';
import type { ViewerSceneCatalog, ViewerSceneResolution } from '../api/viewer';

type ViewerSceneSummary = {
  name: string;
  totalSegments: number;
  feedSegments: number;
  rapidSegments: number;
  totalPoints: number;
};

const DEMO_SCENE_SUMMARY: ViewerSceneSummary = {
  name: 'Demo Pocket Milling',
  totalSegments: 41,
  feedSegments: 39,
  rapidSegments: 2,
  totalPoints: 82,
};

const DEFAULT_SCENE_NOTE =
  'Live viewer scene routes are not available yet, so Kienzle is using the local demo scene as a fallback.';

let viewerCanvasWorkspacePromise: Promise<typeof import('../components/viewer/ViewerCanvasWorkspace')> | null = null;

function preloadViewerCanvasWorkspace() {
  if (!viewerCanvasWorkspacePromise) {
    viewerCanvasWorkspacePromise = import('../components/viewer/ViewerCanvasWorkspace');
  }
  return viewerCanvasWorkspacePromise;
}

let viewerSceneCatalogPromise: Promise<ViewerSceneCatalog> | null = null;

function loadViewerCatalog() {
  if (!viewerSceneCatalogPromise) {
    viewerSceneCatalogPromise = import('../api/viewer').then((module) => module.loadViewerSceneCatalog());
  }
  return viewerSceneCatalogPromise;
}

const viewerScenePromises = new Map<string, Promise<ViewerSceneResolution>>();

function loadViewerScenePackage(sceneId: string | null | undefined) {
  const resolvedId = sceneId && sceneId.trim().length > 0 ? sceneId : 'demo_scene';
  const cached = viewerScenePromises.get(resolvedId);
  if (cached) {
    return cached;
  }

  const nextPromise = import('../api/viewer').then((module) => module.loadViewerScene(resolvedId));
  viewerScenePromises.set(resolvedId, nextPromise);
  return nextPromise;
}

function getSceneSummary(scene: SceneGraph | null): ViewerSceneSummary {
  if (!scene) {
    return DEMO_SCENE_SUMMARY;
  }

  const toolpath = scene.root.children?.find((node) => node.type === 'toolpath')?.toolpath;
  if (!toolpath) {
    return {
      ...DEMO_SCENE_SUMMARY,
      name: scene.name,
    };
  }

  const feedSegments = toolpath.segments.filter((segment) => segment.type === 'feed').length;
  const rapidSegments = toolpath.segments.filter((segment) => segment.type === 'rapid').length;

  return {
    name: scene.name,
    totalSegments: toolpath.segments.length,
    feedSegments,
    rapidSegments,
    totalPoints: toolpath.total_points,
  };
}

const ViewerCanvasWorkspace = lazy(async () => {
  const module = await preloadViewerCanvasWorkspace();
  return { default: module.ViewerCanvasWorkspace };
});

function SummaryTile({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  accent?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-br ${accent ?? 'from-cyan-400/22 via-cyan-300/8 to-transparent'}`} />
      <div className="relative">
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</div>
        <div className="mt-3 text-2xl font-semibold text-slate-50">{value}</div>
        <div className="mt-2 text-sm text-slate-400">{hint}</div>
      </div>
    </div>
  );
}

function ViewerStageFallback() {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className="flex min-h-[520px] items-center justify-center rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,24,0.96)_0%,rgba(5,10,16,0.98)_100%)] text-sm text-slate-300 shadow-[0_30px_90px_rgba(0,0,0,0.28)]">
        Loading 3D workspace...
      </section>
      <section className="space-y-6">
        <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,24,0.96)_0%,rgba(5,10,16,0.96)_100%)] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.28)]">
          <div className="h-5 w-28 rounded bg-white/10" />
          <div className="mt-4 space-y-3">
            <div className="h-4 rounded bg-white/5" />
            <div className="h-4 rounded bg-white/5" />
            <div className="h-4 rounded bg-white/5" />
          </div>
        </div>
      </section>
    </div>
  );
}

function CanvasLaunchStage({
  onLoad,
  onPrime,
  loading,
}: {
  onLoad: () => void;
  onPrime: () => void;
  loading: boolean;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,24,0.96)_0%,rgba(5,10,16,0.98)_100%)] p-8 shadow-[0_30px_90px_rgba(0,0,0,0.28)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(96,165,250,0.12),transparent_32%)]" />
        <div className="relative flex min-h-[520px] flex-col justify-between gap-10">
          <div className="space-y-5">
            <span className="inline-flex rounded-full border border-cyan-300/16 bg-cyan-300/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-100">
              Deferred 3D stage
            </span>
            <div className="space-y-3">
              <h2 className="text-3xl font-semibold tracking-tight text-slate-50 sm:text-[2.5rem]">
                Open the full 3D workspace only when you need it.
              </h2>
              <p className="max-w-2xl text-base leading-7 text-slate-300">
                The viewer opens as a lightweight inspection desk first. Launch the live canvas when you need playback,
                heatmaps, or geometry review so routine navigation stays fast.
              </p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[22px] border border-white/8 bg-white/[0.04] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Launch when</div>
                <div className="mt-3 text-sm leading-6 text-slate-300">
                  You need visual verification, playback proof, or annotated screenshots for operator handoff.
                </div>
              </div>
              <div className="rounded-[22px] border border-white/8 bg-white/[0.04] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Instant desk</div>
                <div className="mt-3 text-sm leading-6 text-slate-300">
                  Scene metadata, toolbar presets, and JSON export remain available before the canvas mounts.
                </div>
              </div>
              <div className="rounded-[22px] border border-white/8 bg-white/[0.04] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Heavy payload</div>
                <div className="mt-3 text-sm leading-6 text-slate-300">
                  Raw Three.js rendering stays deferred until the operator explicitly opens the 3D stage.
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-cyan-300/12 bg-cyan-300/[0.05] p-5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-100">3D activation</div>
              <div className="mt-3 text-sm leading-6 text-slate-300">
                Start the canvas when you’re ready to inspect motion, stock, and tool engagement directly in the viewer.
              </div>
              <button
                type="button"
                onClick={onLoad}
                onMouseEnter={onPrime}
                onFocus={onPrime}
                className="mt-5 inline-flex items-center justify-center rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
              >
                Open 3D workspace
              </button>
              {loading ? <div className="mt-3 text-sm text-cyan-100">Preparing scene package and canvas modules...</div> : null}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,24,0.96)_0%,rgba(5,10,16,0.96)_100%)] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.28)]">
          <div className="mb-4 text-lg font-semibold text-slate-50">Canvas readiness</div>
          <div className="space-y-3 text-sm leading-6 text-slate-300">
            <p>The live 3D stage is currently deferred.</p>
            <p>Toolbar presets and scene export stay active, while screenshot capture unlocks after the canvas loads.</p>
            {loading ? <p className="text-cyan-100">3D assets are being primed so the stage opens faster when requested.</p> : null}
          </div>
        </div>
      </section>
    </div>
  );
}

export function ViewerPage() {
  const [state, dispatch] = useReducer(viewerReducer, DEFAULT_VIEWER_STATE);
  const [canvasLoaded, setCanvasLoaded] = useState(false);
  const [sceneCatalog, setSceneCatalog] = useState<ViewerSceneCatalog | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [selectedSceneId, setSelectedSceneId] = useState('demo_scene');
  const [scene, setScene] = useState<SceneGraph | null>(null);
  const [loadedSceneId, setLoadedSceneId] = useState<string | null>(null);
  const [sceneSource, setSceneSource] = useState<'live' | 'demo'>('demo');
  const [sceneNote, setSceneNote] = useState(DEFAULT_SCENE_NOTE);
  const [sceneLoading, setSceneLoading] = useState(false);
  const [sceneError, setSceneError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const sceneSummary = useMemo(() => getSceneSummary(scene), [scene]);

  useEffect(() => {
    let active = true;

    setCatalogLoading(true);
    void loadViewerCatalog()
      .then((catalog) => {
        if (!active) {
          return;
        }

        setSceneCatalog(catalog);
        setSceneSource(catalog.source);
        setSceneNote(catalog.note);
        setSelectedSceneId((current) =>
          catalog.scenes.some((entry) => entry.id === current) ? current : (catalog.scenes[0]?.id ?? 'demo_scene'),
        );
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setSceneCatalog({
          source: 'demo',
          scenes: [{ id: 'demo_scene', name: DEMO_SCENE_SUMMARY.name, type: 'demo' }],
          note: DEFAULT_SCENE_NOTE,
        });
        setSceneSource('demo');
        setSceneNote(DEFAULT_SCENE_NOTE);
        setSelectedSceneId('demo_scene');
      })
      .finally(() => {
        if (active) {
          setCatalogLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const handleScreenshot = useCallback(() => {
    const canvas = canvasRef.current?.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `prism-viewer-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, []);

  const primeViewerStage = useCallback(() => {
    void preloadViewerCanvasWorkspace();
  }, []);

  const ensureSceneLoaded = useCallback(async () => {
    const targetSceneId = selectedSceneId || 'demo_scene';

    if (scene && loadedSceneId === targetSceneId) {
      return scene;
    }

    setSceneLoading(true);
    setSceneError(null);

    try {
      const resolution = await loadViewerScenePackage(targetSceneId);
      startTransition(() => {
        setScene(resolution.scene);
        setLoadedSceneId(targetSceneId);
        setSceneSource(resolution.source);
        setSceneNote(resolution.note);
      });
      return resolution.scene;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Viewer scene could not be prepared.';
      setSceneError(message);
      return null;
    } finally {
      setSceneLoading(false);
    }
  }, [loadedSceneId, scene, selectedSceneId]);

  useEffect(() => {
    if (!canvasLoaded) {
      return;
    }

    void ensureSceneLoaded();
  }, [canvasLoaded, ensureSceneLoaded]);

  const handleExportJSON = useCallback(async () => {
    const readyScene = scene ?? (await ensureSceneLoaded());
    if (!readyScene) return;

    const blob = new Blob([JSON.stringify(readyScene, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.download = `prism-scene-${Date.now()}.json`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  }, [ensureSceneLoaded, scene]);

  const handleLoadCanvas = useCallback(() => {
    primeViewerStage();
    startTransition(() => {
      setCanvasLoaded(true);
    });
    void ensureSceneLoaded();
  }, [ensureSceneLoaded, primeViewerStage]);

  const handleProgressChange = useCallback(
    (progress: number) => {
      dispatch({ type: 'SET_PROGRESS', progress });
    },
    [dispatch],
  );

  const playbackMode = state.playing ? 'Playback live' : 'Paused';
  const selectedSceneName =
    sceneCatalog?.scenes.find((entry) => entry.id === selectedSceneId)?.name ?? sceneSummary.name;

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
      <section className="overflow-hidden rounded-[32px] border border-cyan-300/12 bg-[linear-gradient(135deg,rgba(8,15,23,0.98)_0%,rgba(5,10,16,0.98)_48%,rgba(10,22,34,0.95)_100%)] p-6 shadow-[0_40px_120px_rgba(0,0,0,0.35)]">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)]">
          <div className="space-y-5">
            <span className="inline-flex rounded-full border border-cyan-300/16 bg-cyan-300/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-100">
              Visualization workspace
            </span>
            <div className="space-y-3">
              <h1 className="text-4xl font-semibold tracking-tight text-slate-50 sm:text-5xl">3D Viewer</h1>
              <p className="max-w-3xl text-base leading-7 text-slate-300">
                Review stock, toolpath, tool assembly, playback, and heatmap overlays from one clean manufacturing viewer surface.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <SummaryTile
                label="Scene"
                value={selectedSceneName}
                hint={
                  sceneSource === 'live'
                    ? 'Current live scene package from the backend viewer source.'
                    : 'Current local demo fallback until a live scene source is available.'
                }
                accent="from-cyan-400/22 via-cyan-300/8 to-transparent"
              />
              <SummaryTile
                label="Playback"
                value={playbackMode}
                hint="Toolbar state for animation and progress playback."
                accent="from-sky-400/22 via-sky-300/8 to-transparent"
              />
              <SummaryTile
                label="Segments"
                value={String(sceneSummary.totalSegments)}
                hint="Total visible toolpath segments in the active scene."
                accent="from-emerald-400/22 via-emerald-300/8 to-transparent"
              />
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Viewer brief</div>
            <div className="mt-4 space-y-4">
              <div>
                <div className="text-xl font-semibold text-slate-50">{selectedSceneName}</div>
                <div className="mt-1 text-sm text-slate-400">
                  Use this page as the machine-room review desk for visualization, playback, and quick exports.
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <span
                  className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                    sceneSource === 'live'
                      ? 'border-emerald-300/18 bg-emerald-300/10 text-emerald-100'
                      : 'border-amber-300/18 bg-amber-300/10 text-amber-100'
                  }`}
                >
                  {sceneSource === 'live' ? 'Live scene source' : 'Demo fallback'}
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                  {catalogLoading ? 'Checking scene sources' : `${sceneCatalog?.scenes.length ?? 0} scene package${sceneCatalog?.scenes.length === 1 ? '' : 's'}`}
                </span>
              </div>
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Scene package
                </span>
                <select
                  value={selectedSceneId}
                  onChange={(event) => setSelectedSceneId(event.target.value)}
                  disabled={catalogLoading}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/32 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {(sceneCatalog?.scenes ?? [{ id: 'demo_scene', name: DEMO_SCENE_SUMMARY.name, type: 'demo' }]).map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="rounded-[22px] border border-cyan-300/12 bg-cyan-300/[0.05] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-100">Best use</div>
                <div className="mt-2 text-sm leading-6 text-slate-300">
                  Operators and programmers should be able to review the scene, isolate the operation context, and export either a screenshot or JSON package without leaving the page.
                </div>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-4 text-sm leading-6 text-slate-300">
                {sceneNote}
              </div>
              <div className="flex flex-wrap gap-3">
                {!canvasLoaded ? (
                  <button
                    type="button"
                    onClick={handleLoadCanvas}
                    onMouseEnter={primeViewerStage}
                    onFocus={primeViewerStage}
                    className="rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
                    title="Open live 3D workspace"
                  >
                    Open 3D workspace
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={handleScreenshot}
                  disabled={!canvasLoaded}
                  className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                    canvasLoaded
                      ? 'bg-cyan-300 text-slate-950 hover:bg-cyan-200'
                      : 'cursor-not-allowed border border-white/10 bg-white/[0.04] text-slate-500'
                  }`}
                  title={canvasLoaded ? 'Export screenshot (PNG)' : 'Load the 3D workspace to enable screenshots'}
                >
                  Screenshot
                </button>
                <button
                  type="button"
                  onClick={handleExportJSON}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-white/18 hover:bg-white/[0.05]"
                  title="Export scene data (JSON)"
                >
                  Export JSON
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {sceneError ? <ErrorState message={sceneError} onRetry={handleLoadCanvas} /> : null}

      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,24,0.96)_0%,rgba(5,10,16,0.96)_100%)] p-4 shadow-[0_30px_90px_rgba(0,0,0,0.28)]">
          <div className="mb-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Controls</div>
            <div className="mt-2 text-lg font-semibold text-slate-50">Viewer toolbar</div>
            <div className="mt-2 text-sm leading-6 text-slate-400">
              Configure the inspection state here, then launch the 3D canvas only when you need the live stage.
            </div>
          </div>
          <ViewerToolbar state={state} dispatch={dispatch} />
        </section>

        {canvasLoaded ? (
          <WorkspaceErrorBoundary
            title="3D canvas"
            detail="The live viewer canvas could not finish loading."
            resetKey={canvasLoaded ? 'canvas-open' : 'canvas-closed'}
          >
            {scene ? (
              <Suspense fallback={<ViewerStageFallback />}>
                <ViewerCanvasWorkspace
                  scene={scene}
                  state={state}
                  playbackMode={playbackMode}
                  canvasRef={canvasRef}
                  onProgressChange={handleProgressChange}
                />
              </Suspense>
            ) : (
              <ViewerStageFallback />
            )}
          </WorkspaceErrorBoundary>
        ) : (
          <CanvasLaunchStage onLoad={handleLoadCanvas} onPrime={primeViewerStage} loading={sceneLoading} />
        )}
      </div>
    </div>
  );
}
