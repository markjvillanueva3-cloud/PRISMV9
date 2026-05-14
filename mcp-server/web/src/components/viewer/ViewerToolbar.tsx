/**
 * L9-P2-MS1 P0-U06: ViewerToolbar — Viewer Controls
 *
 * Controls for the 3D viewer:
 *   - Layer toggles: toolpath, stock, tool, heatmap
 *   - Color mode dropdown
 *   - Render mode dropdown
 *   - Playback controls: play/pause, speed, timeline scrub
 *   - Heatmap type selector
 */
import type {
  ColorMode,
  RenderMode,
  HeatmapType,
  ViewPreset,
} from '../../types/viewer';
import { VIEW_PRESETS } from '../../types/viewer';

// ── Types ────────────────────────────────────────────────────────────

export interface ViewerState {
  showToolpath: boolean;
  showStock: boolean;
  showTool: boolean;
  showHeatmap: boolean;
  colorMode: ColorMode;
  renderMode: RenderMode;
  heatmapType: HeatmapType;
  viewPreset: ViewPreset;
  playing: boolean;
  playbackSpeed: number;
  playbackProgress: number;
}

export const DEFAULT_VIEWER_STATE: ViewerState = {
  showToolpath: true,
  showStock: true,
  showTool: true,
  showHeatmap: false,
  colorMode: 'by_type',
  renderMode: 'transparent',
  heatmapType: 'thermal',
  viewPreset: 'iso',
  playing: false,
  playbackSpeed: 1,
  playbackProgress: 0,
};

type ViewerAction =
  | { type: 'TOGGLE_LAYER'; layer: keyof Pick<
      ViewerState,
      'showToolpath' | 'showStock' | 'showTool' | 'showHeatmap'
    > }
  | { type: 'SET_COLOR_MODE'; mode: ColorMode }
  | { type: 'SET_RENDER_MODE'; mode: RenderMode }
  | { type: 'SET_HEATMAP_TYPE'; heatmapType: HeatmapType }
  | { type: 'SET_VIEW_PRESET'; preset: ViewPreset }
  | { type: 'TOGGLE_PLAY' }
  | { type: 'SET_SPEED'; speed: number }
  | { type: 'SET_PROGRESS'; progress: number };

export function viewerReducer(
  state: ViewerState,
  action: ViewerAction
): ViewerState {
  switch (action.type) {
    case 'TOGGLE_LAYER':
      return { ...state, [action.layer]: !state[action.layer] };
    case 'SET_COLOR_MODE':
      return { ...state, colorMode: action.mode };
    case 'SET_RENDER_MODE':
      return { ...state, renderMode: action.mode };
    case 'SET_HEATMAP_TYPE':
      return { ...state, heatmapType: action.heatmapType, showHeatmap: true };
    case 'SET_VIEW_PRESET':
      return { ...state, viewPreset: action.preset };
    case 'TOGGLE_PLAY':
      return { ...state, playing: !state.playing };
    case 'SET_SPEED':
      return { ...state, playbackSpeed: action.speed };
    case 'SET_PROGRESS':
      return { ...state, playbackProgress: action.progress };
  }
}

// ── Color Mode Options ───────────────────────────────────────────────

const COLOR_MODES: Array<{ value: ColorMode; label: string }> = [
  { value: 'by_type', label: 'By Type' },
  { value: 'by_feed', label: 'By Feed Rate' },
  { value: 'by_speed', label: 'By Spindle Speed' },
  { value: 'by_tool', label: 'By Tool' },
  { value: 'by_mrr', label: 'By MRR' },
  { value: 'by_operation', label: 'By Operation' },
  { value: 'uniform', label: 'Uniform' },
];

const RENDER_MODES: Array<{ value: RenderMode; label: string }> = [
  { value: 'solid', label: 'Solid' },
  { value: 'wireframe', label: 'Wireframe' },
  { value: 'transparent', label: 'Transparent' },
  { value: 'xray', label: 'X-Ray' },
];

const HEATMAP_TYPES: Array<{ value: HeatmapType; label: string }> = [
  { value: 'thermal', label: 'Thermal' },
  { value: 'force', label: 'Force' },
  { value: 'wear', label: 'Wear' },
  { value: 'stress', label: 'Stress' },
  { value: 'deflection', label: 'Deflection' },
];

const SPEED_OPTIONS = [0.1, 0.25, 0.5, 1, 2, 5, 10];

// ── Component ────────────────────────────────────────────────────────

export interface ViewerToolbarProps {
  state: ViewerState;
  dispatch: React.Dispatch<ViewerAction>;
}

export function ViewerToolbar({ state, dispatch }: ViewerToolbarProps) {
  return (
    <div className="flex flex-col gap-3 p-3 bg-gray-900/95 rounded-lg text-white text-xs w-52">
      {/* Layer Toggles */}
      <Section title="Layers">
        <Toggle
          label="Toolpath"
          checked={state.showToolpath}
          onChange={() =>
            dispatch({ type: 'TOGGLE_LAYER', layer: 'showToolpath' })
          }
        />
        <Toggle
          label="Stock"
          checked={state.showStock}
          onChange={() =>
            dispatch({ type: 'TOGGLE_LAYER', layer: 'showStock' })
          }
        />
        <Toggle
          label="Tool"
          checked={state.showTool}
          onChange={() =>
            dispatch({ type: 'TOGGLE_LAYER', layer: 'showTool' })
          }
        />
        <Toggle
          label="Heatmap"
          checked={state.showHeatmap}
          onChange={() =>
            dispatch({ type: 'TOGGLE_LAYER', layer: 'showHeatmap' })
          }
        />
      </Section>

      {/* Color Mode */}
      <Section title="Color Mode">
        <select
          value={state.colorMode}
          onChange={(e) =>
            dispatch({
              type: 'SET_COLOR_MODE',
              mode: e.target.value as ColorMode,
            })
          }
          className="w-full bg-gray-800 border border-gray-700
                     rounded px-2 py-1 text-xs"
        >
          {COLOR_MODES.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Section>

      {/* Render Mode */}
      <Section title="Stock Render">
        <select
          value={state.renderMode}
          onChange={(e) =>
            dispatch({
              type: 'SET_RENDER_MODE',
              mode: e.target.value as RenderMode,
            })
          }
          className="w-full bg-gray-800 border border-gray-700
                     rounded px-2 py-1 text-xs"
        >
          {RENDER_MODES.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Section>

      {/* Heatmap Type */}
      {state.showHeatmap && (
        <Section title="Heatmap">
          <select
            value={state.heatmapType}
            onChange={(e) =>
              dispatch({
                type: 'SET_HEATMAP_TYPE',
                heatmapType: e.target.value as HeatmapType,
              })
            }
            className="w-full bg-gray-800 border border-gray-700
                       rounded px-2 py-1 text-xs"
          >
            {HEATMAP_TYPES.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Section>
      )}

      {/* View Presets */}
      <Section title="View">
        <div className="grid grid-cols-4 gap-1">
          {VIEW_PRESETS.map(({ preset, label }) => (
            <button
              key={preset}
              onClick={() =>
                dispatch({ type: 'SET_VIEW_PRESET', preset })
              }
              className={`px-1 py-0.5 rounded text-[10px]
                ${state.viewPreset === preset
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
            >
              {label}
            </button>
          ))}
        </div>
      </Section>

      {/* Playback Controls */}
      <Section title="Playback">
        <div className="flex items-center gap-2">
          <button
            onClick={() => dispatch({ type: 'TOGGLE_PLAY' })}
            className="px-2 py-1 rounded bg-gray-800
                       hover:bg-gray-700 text-sm"
          >
            {state.playing ? '\u23F8' : '\u25B6'}
          </button>

          <select
            value={state.playbackSpeed}
            onChange={(e) =>
              dispatch({
                type: 'SET_SPEED',
                speed: Number(e.target.value),
              })
            }
            className="bg-gray-800 border border-gray-700
                       rounded px-1 py-0.5 text-[10px] w-16"
          >
            {SPEED_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}x
              </option>
            ))}
          </select>
        </div>

        {/* Timeline scrubber */}
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(state.playbackProgress * 100)}
          onChange={(e) =>
            dispatch({
              type: 'SET_PROGRESS',
              progress: Number(e.target.value) / 100,
            })
          }
          className="w-full h-1 mt-1"
        />
        <div className="text-[10px] text-gray-500 text-right">
          {Math.round(state.playbackProgress * 100)}%
        </div>
      </Section>
    </div>
  );
}

// ── Sub-Components ───────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[10px] font-semibold text-gray-400 uppercase
                      tracking-wider mb-1">
        {title}
      </div>
      {children}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer py-0.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="rounded border-gray-600 bg-gray-800
                   text-blue-500 w-3.5 h-3.5"
      />
      <span className="text-gray-300">{label}</span>
    </label>
  );
}
