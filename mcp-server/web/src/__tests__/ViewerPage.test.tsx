import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ViewerPage } from '../pages/ViewerPage';

vi.mock('../components/viewer/Viewer3D', () => ({
  Viewer3D: ({ children }: { children: React.ReactNode }) => <div data-testid="viewer-3d">{children}</div>,
}));

vi.mock('../components/viewer/ToolpathLayer', () => ({
  AnimatedToolpath: () => <div>toolpath</div>,
}));

vi.mock('../components/viewer/StockMesh', () => ({
  StockMesh: () => <div>stock</div>,
}));

vi.mock('../components/viewer/ToolAssembly', () => ({
  ToolAssembly: () => <div>tool</div>,
}));

vi.mock('../components/viewer/HeatmapOverlay', () => ({
  HeatmapOverlay: () => <div>heatmap</div>,
  ColorScaleLegend: () => <div>legend</div>,
  getHeatmapConfig: () => ({ property: 'speed', min: 0, max: 1 }),
}));

vi.mock('../components/viewer/ViewerToolbar', () => ({
  ViewerToolbar: () => <div>toolbar</div>,
  viewerReducer: (state: unknown) => state,
  DEFAULT_VIEWER_STATE: {
    viewPreset: 'iso',
    showGrid: true,
    showAxes: true,
    showGizmo: true,
    showStock: true,
    showToolpath: true,
    showTool: true,
    showHeatmap: false,
    heatmapType: 'speed',
    renderMode: 'solid',
    colorMode: 'type',
    playing: false,
    playbackSpeed: 1,
    playbackProgress: 0,
  },
}));

vi.mock('../api/viewer', () => ({
  loadViewerSceneCatalog: async () => ({
    source: 'demo',
    scenes: [{ id: 'demo_scene', name: 'Demo Pocket Milling', type: 'demo' }],
    note: 'Live viewer scene routes are not available yet, so PRISM is using the local demo scene as a fallback.',
  }),
  loadViewerScene: async () => ({
    source: 'demo',
    note: 'Using the local demo scene until a live viewer scene is selected or becomes available.',
    scene: {
      id: 'demo',
      name: 'Demo Pocket Milling',
      root: {
        id: 'root',
        name: 'Scene Root',
        type: 'group',
        visible: true,
        transform: {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
        },
        children: [
          {
            id: 'stock',
            name: 'Stock',
            type: 'mesh',
            visible: true,
            transform: {
              position: { x: 0, y: 0, z: 0 },
              rotation: { x: 0, y: 0, z: 0 },
              scale: { x: 1, y: 1, z: 1 },
            },
            mesh: { vertices: [] },
          },
          {
            id: 'tp',
            name: 'Toolpath',
            type: 'toolpath',
            visible: true,
            transform: {
              position: { x: 0, y: 0, z: 0 },
              rotation: { x: 0, y: 0, z: 0 },
              scale: { x: 1, y: 1, z: 1 },
            },
            toolpath: {
              total_points: 40,
              segments: [{ type: 'feed' }, { type: 'feed' }, { type: 'rapid' }],
            },
          },
        ],
      },
    },
  }),
}));

describe('ViewerPage', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the viewer workspace and loads the mocked canvas on demand', async () => {
    render(<ViewerPage />);

    expect(screen.getByRole('heading', { name: '3D Viewer' })).toBeDefined();
    expect(screen.getAllByRole('button', { name: 'Open 3D workspace' }).length).toBe(2);
    expect(await screen.findByText('Demo fallback')).toBeDefined();
    expect(screen.queryByTestId('viewer-3d')).toBeNull();

    fireEvent.click(screen.getAllByRole('button', { name: 'Open 3D workspace' })[0]);

    expect(await screen.findByTestId('viewer-3d')).toBeDefined();
    expect(await screen.findByText('Scene Info')).toBeDefined();
  });

  it('shows screenshot and export actions', () => {
    render(<ViewerPage />);

    expect(screen.getByRole('button', { name: 'Screenshot' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Export JSON' })).toBeDefined();
    expect((screen.getByRole('button', { name: 'Screenshot' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
