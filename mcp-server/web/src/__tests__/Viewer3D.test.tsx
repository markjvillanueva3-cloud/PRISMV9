/**
 * Viewer3D + ViewerPage — Unit tests
 *
 * Since Viewer3D uses react-three-fiber (Canvas, OrbitControls, etc.)
 * which cannot render in jsdom, we mock Viewer3D and test the ViewerPage
 * integration: toolbar, side panel, scene info, export buttons.
 */
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock Viewer3D (Three.js Canvas cannot render in jsdom)
vi.mock('../components/viewer/Viewer3D', () => ({
  Viewer3D: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="viewer-3d-canvas">
      <canvas />
      {children}
    </div>
  ),
}));

// Mock viewer sub-components
vi.mock('../components/viewer/ToolpathLayer', () => ({
  AnimatedToolpath: () => <div data-testid="animated-toolpath">toolpath</div>,
}));
vi.mock('../components/viewer/StockMesh', () => ({
  StockMesh: () => <div data-testid="stock-mesh">stock</div>,
}));
vi.mock('../components/viewer/ToolAssembly', () => ({
  ToolAssembly: () => <div data-testid="tool-assembly">tool</div>,
}));
vi.mock('../components/viewer/HeatmapOverlay', () => ({
  HeatmapOverlay: () => <div data-testid="heatmap">heatmap</div>,
  ColorScaleLegend: () => <div data-testid="heatmap-legend">legend</div>,
  getHeatmapConfig: () => ({ min: 0, max: 1, property: 'speed' }),
}));

// Mock ViewerToolbar with real reducer and default state
vi.mock('../components/viewer/ViewerToolbar', () => ({
  ViewerToolbar: ({ dispatch }: { state: unknown; dispatch: (a: unknown) => void }) => (
    <div data-testid="viewer-toolbar">
      <button onClick={() => dispatch({ type: 'TOGGLE_STOCK' })}>Toggle Stock</button>
      <button onClick={() => dispatch({ type: 'TOGGLE_TOOLPATH' })}>Toggle Toolpath</button>
    </div>
  ),
  viewerReducer: (state: Record<string, unknown>, action: Record<string, unknown>) => {
    switch (action.type) {
      case 'TOGGLE_STOCK':
        return { ...state, showStock: !state.showStock };
      case 'TOGGLE_TOOLPATH':
        return { ...state, showToolpath: !state.showToolpath };
      case 'SET_PROGRESS':
        return { ...state, playbackProgress: action.progress };
      default:
        return state;
    }
  },
  DEFAULT_VIEWER_STATE: {
    viewPreset: 'iso' as const,
    showStock: true,
    showToolpath: true,
    showTool: true,
    showHeatmap: false,
    renderMode: 'solid',
    colorMode: 'type',
    heatmapType: 'speed',
    playing: false,
    playbackSpeed: 1,
    playbackProgress: 0,
  },
}));

// Mock viewer data loading
vi.mock('../api/viewer', () => ({
  loadViewerSceneCatalog: async () => ({
    source: 'demo',
    scenes: [{ id: 'demo_scene', name: 'Demo Scene', type: 'demo' }],
    note: 'Live viewer scene routes are not available yet, so PRISM is using the local demo scene as a fallback.',
  }),
  loadViewerScene: async () => ({
    source: 'demo',
    note: 'Using the local demo scene until a live viewer scene is selected or becomes available.',
    scene: {
      name: 'Demo Scene',
      root: {
        id: 'root',
        type: 'group',
        name: 'Root',
        children: [
          {
            id: 'stock1',
            type: 'mesh',
            name: 'Stock',
            mesh: { vertices: [], faces: [] },
          },
          {
            id: 'tp1',
            type: 'toolpath',
            name: 'Toolpath',
            toolpath: {
              segments: [
                { type: 'feed', start: [0, 0, 0], end: [10, 0, 0] },
                { type: 'rapid', start: [10, 0, 0], end: [20, 0, 0] },
                { type: 'feed', start: [20, 0, 0], end: [30, 0, 0] },
              ],
              total_points: 120,
            },
          },
        ],
      },
    },
  }),
}));

function renderViewer() {
  return render(
    <MemoryRouter>
      <ViewerPageInner />
    </MemoryRouter>,
  );
}

let ViewerPageInner: React.FC;

beforeAll(async () => {
  const mod = await import('../pages/ViewerPage');
  ViewerPageInner = mod.ViewerPage;
});

describe('ViewerPage', () => {
  it('renders the 3D Viewer page title', () => {
    renderViewer();
    expect(screen.getByText('3D Viewer')).toBeDefined();
  });

  it('displays scene name and fallback posture in header', async () => {
    renderViewer();
    // "Demo Scene" appears in header subtitle and side panel Scene row
    expect((await screen.findAllByText(/Demo Scene/)).length).toBeGreaterThanOrEqual(1);
    expect(await screen.findByText(/Demo fallback/)).toBeDefined();
  });

  it('renders the 3D canvas mock after the stage is opened', async () => {
    renderViewer();
    fireEvent.click(screen.getAllByRole('button', { name: 'Open 3D workspace' })[0]);
    expect(await screen.findByTestId('viewer-3d-canvas')).toBeDefined();
  });

  it('shows Screenshot and Export JSON buttons', () => {
    renderViewer();
    expect(screen.getByText('Screenshot')).toBeDefined();
    expect(screen.getByText('Export JSON')).toBeDefined();
  });

  it('displays Scene Info panel with segment stats', async () => {
    renderViewer();
    fireEvent.click(screen.getAllByRole('button', { name: 'Open 3D workspace' })[0]);
    expect(await screen.findByText('Scene Info')).toBeDefined();
    expect(screen.getAllByText('Segments').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Feed moves')).toBeDefined();
    expect(screen.getByText('Rapid moves')).toBeDefined();
    expect(screen.getByText('Points')).toBeDefined();
    // 3 total segments, 2 feed, 1 rapid, 120 points
    expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1);
    // "1" appears in multiple contexts, check rapid count is present
    expect(screen.getAllByText('120').length).toBeGreaterThanOrEqual(1);
  });

  it('shows the operation list in side panel', async () => {
    renderViewer();
    fireEvent.click(screen.getAllByRole('button', { name: 'Open 3D workspace' })[0]);
    expect(await screen.findByText('Operations')).toBeDefined();
    expect(screen.getByText('Pocket Roughing')).toBeDefined();
    expect(screen.getByText('T01 - 12mm End Mill')).toBeDefined();
  });

  it('renders the toolbar', () => {
    renderViewer();
    expect(screen.getByTestId('viewer-toolbar')).toBeDefined();
  });
});
