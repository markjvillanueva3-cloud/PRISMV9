import { describe, expect, it } from 'vitest';
import type { ToolCatalogItem } from '../data/calculatorWorkspace';
import {
  buildInsertOptionsForTool,
  inferToolBodyType,
  scoreToolForToolpath,
  selectPreferredToolForToolpath,
  toolSupportsToolpath,
} from '../utils/calculatorTooling';

const facePath = {
  label: 'Face Mill',
  path: 'Manual > Face Mill',
  operationId: 'face_milling',
};

const drillPath = {
  label: 'Peck Drill',
  path: 'Manual > Drill',
  operationId: 'drilling',
};

const latheProfilePath = {
  label: 'Turn Profile',
  path: 'Operation Navigator > Turning > Teach Mode',
  operationId: 'turning_finish',
};

const latheThreadPath = {
  label: 'Lathe Thread',
  path: 'Lathe Toolpaths > Thread',
  operationId: 'turning_finish',
};

const liveToolPath = {
  label: 'C/Y Live Tooling',
  path: 'Mill-Turn Toolpaths > C/Y Milling',
  operationId: 'turning_finish',
};

const engravePath = {
  label: 'Engrave Serial Number',
  path: 'Conversational > Engrave > Mark',
  operationId: 'finishing',
};

describe('calculator tooling selection', () => {
  it('blocks obviously incompatible tool and toolpath combinations', () => {
    const drillTool: ToolCatalogItem = {
      id: 'drill-1',
      mode: 'mill',
      family: 'Carbide Drill',
      label: '0.25 in carbide drill',
      description: 'High performance drill',
      holder: 'Hydraulic chuck',
      coating: 'AlTiN',
      defaultDiameter: 6.35,
      defaultFlutes: 2,
      operation: 'drilling',
      geometryClass: 'drill',
      supportedOperations: ['drilling'],
      toolpathKeywords: ['drill'],
    };

    expect(toolSupportsToolpath(drillTool, facePath)).toBe(false);
    expect(scoreToolForToolpath(drillTool, facePath)).toBe(0);
    expect(toolSupportsToolpath(drillTool, drillPath)).toBe(true);
  });

  it('infers indexable bodies and recommends grades that match the material family', () => {
    const faceMill: ToolCatalogItem = {
      id: 'fm-1',
      mode: 'mill',
      family: 'Indexable Face Mill',
      label: '32 mm face mill body',
      description: 'Indexable face mill body with SEKT1204 inserts',
      holder: 'Shell mill arbor',
      coating: 'TiAlN',
      defaultDiameter: 32,
      defaultFlutes: 5,
      operation: 'face_milling',
      geometryClass: 'face-mill',
      bodyType: 'indexable',
      insertType: 'SEKT1204',
      insertCount: 5,
      insertGrades: ['P25', 'M25', 'K25'],
      insertPriceUsd: 9.5,
      supportedOperations: ['face_milling'],
      toolpathKeywords: ['face'],
      coolantThrough: true,
      wiperGeometry: true,
    };

    expect(inferToolBodyType(faceMill)).toBe('indexable');

    const insertOptions = buildInsertOptionsForTool({
      tool: faceMill,
      material: { group: 'steel', name: '4140 prehard' } as any,
      toolpath: facePath,
      machine: { coolantOptionIds: ['flood', 'tsc'] } as any,
    });

    expect(insertOptions.length).toBeGreaterThan(0);
    expect(insertOptions[0]?.recommended).toBe(true);
    expect(insertOptions[0]?.insertGrade).toBe('P25');
  });

  it('keeps standard turning finish paths on finishing inserts instead of live tools', () => {
    const finishingInsert: ToolCatalogItem = {
      id: 'turn-finish',
      mode: 'lathe',
      family: 'Positive finishing insert',
      label: 'VBMT finishing insert',
      description: 'Lathe finish insert for OD and profile finishing.',
      holder: 'VDI 40 finishing holder',
      coating: 'CVD P15',
      defaultDiameter: 12,
      defaultFlutes: 1,
      operation: 'turning_finish',
      geometryClass: 'finishing-insert',
      supportedOperations: ['turning_finish'],
      toolpathKeywords: ['finish', 'profile', 'wave'],
      wiperGeometry: true,
    };

    const liveToolEndmill: ToolCatalogItem = {
      id: 'live-tool-endmill',
      mode: 'lathe',
      family: 'Live Tool End Mill',
      label: '0.375 in live-tool end mill',
      description: 'Driven-tool end mill for mill-turn cross milling.',
      holder: 'ER live tooling holder',
      coating: 'AlTiN',
      defaultDiameter: 9.525,
      defaultFlutes: 4,
      operation: 'turning_finish',
      geometryClass: 'live-tool-endmill',
      supportedOperations: ['turning_finish'],
      toolpathKeywords: ['live', 'mill-turn', 'sync'],
    };

    expect(toolSupportsToolpath(finishingInsert, latheProfilePath)).toBe(true);
    expect(toolSupportsToolpath(liveToolEndmill, latheProfilePath)).toBe(false);
    expect(selectPreferredToolForToolpath([liveToolEndmill, finishingInsert], latheProfilePath)?.id).toBe('turn-finish');
  });

  it('keeps threading paths on threading inserts instead of generic finish or live tools', () => {
    const threadingInsert: ToolCatalogItem = {
      id: 'turn-thread',
      mode: 'lathe',
      family: 'Laydown threading insert',
      label: 'Laydown threading insert',
      description: 'Single-point external and internal thread generation.',
      holder: 'SER laydown holder',
      coating: 'PVD threading grade',
      defaultDiameter: 16,
      defaultFlutes: 1,
      operation: 'turning_finish',
      geometryClass: 'threading-insert',
      supportedOperations: ['turning_finish'],
      toolpathKeywords: ['thread'],
    };

    const finishingInsert: ToolCatalogItem = {
      id: 'turn-finish',
      mode: 'lathe',
      family: 'Positive finishing insert',
      label: 'VBMT finishing insert',
      description: 'Lathe finish insert for OD and profile finishing.',
      holder: 'VDI 40 finishing holder',
      coating: 'CVD P15',
      defaultDiameter: 12,
      defaultFlutes: 1,
      operation: 'turning_finish',
      geometryClass: 'finishing-insert',
      supportedOperations: ['turning_finish'],
      toolpathKeywords: ['finish', 'profile', 'wave'],
    };

    const liveToolEndmill: ToolCatalogItem = {
      id: 'live-tool-endmill',
      mode: 'lathe',
      family: 'Live Tool End Mill',
      label: '0.375 in live-tool end mill',
      description: 'Driven-tool end mill for mill-turn cross milling.',
      holder: 'ER live tooling holder',
      coating: 'AlTiN',
      defaultDiameter: 9.525,
      defaultFlutes: 4,
      operation: 'turning_finish',
      geometryClass: 'live-tool-endmill',
      supportedOperations: ['turning_finish'],
      toolpathKeywords: ['live', 'mill-turn', 'sync'],
    };

    const cutTap: ToolCatalogItem = {
      id: 'tp-cut-tap',
      mode: 'lathe',
      family: 'Cut Tap',
      label: 'M2x0.4 Cut Tap',
      description: 'Driven-tool cut tap for rigid tapping routines.',
      holder: 'Live-tool tapping holder',
      coating: 'TiCN',
      defaultDiameter: 2,
      defaultFlutes: 3,
      operation: 'threading',
      geometryClass: 'tap',
      supportedOperations: ['threading'],
      toolpathKeywords: ['tap', 'rigid'],
    };

    expect(toolSupportsToolpath(threadingInsert, latheThreadPath)).toBe(true);
    expect(toolSupportsToolpath(liveToolEndmill, latheThreadPath)).toBe(false);
    expect(toolSupportsToolpath(cutTap, latheThreadPath)).toBe(false);
    expect(selectPreferredToolForToolpath([liveToolEndmill, finishingInsert, cutTap, threadingInsert], latheThreadPath)?.id).toBe('turn-thread');
  });

  it('still allows live-tool cutters on explicit mill-turn live tooling paths', () => {
    const liveToolEndmill: ToolCatalogItem = {
      id: 'live-tool-endmill',
      mode: 'lathe',
      family: 'Live Tool End Mill',
      label: '0.375 in live-tool end mill',
      description: 'Driven-tool end mill for mill-turn cross milling.',
      holder: 'ER live tooling holder',
      coating: 'AlTiN',
      defaultDiameter: 9.525,
      defaultFlutes: 4,
      operation: 'turning_finish',
      geometryClass: 'live-tool-endmill',
      supportedOperations: ['turning_finish'],
      toolpathKeywords: ['live', 'mill-turn', 'sync'],
    };

    expect(toolSupportsToolpath(liveToolEndmill, liveToolPath)).toBe(true);
    expect(scoreToolForToolpath(liveToolEndmill, liveToolPath)).toBeGreaterThan(0);
  });

  it('prefers chamfer or engraving cutters for engraving toolpaths over generic finishers', () => {
    const chamferTool: ToolCatalogItem = {
      id: 'engrave-chamfer',
      mode: 'mill',
      family: 'Engraving / Chamfer Mill',
      label: '90 deg engraving mill',
      description: 'Fine-tip engrave and mark cutter.',
      holder: 'Shrink-fit holder',
      coating: 'AlTiN',
      defaultDiameter: 6,
      defaultFlutes: 2,
      operation: 'finishing',
      geometryClass: 'chamfer',
      supportedOperations: ['finishing'],
      toolpathKeywords: ['engrave', 'mark', 'serial'],
    };

    const squareEndmill: ToolCatalogItem = {
      id: 'square-finisher',
      mode: 'mill',
      family: 'Square End Mill',
      label: '6 mm square end mill',
      description: 'General finishing end mill.',
      holder: 'Hydraulic holder',
      coating: 'AlTiN',
      defaultDiameter: 6,
      defaultFlutes: 4,
      operation: 'finishing',
      geometryClass: 'square-endmill',
      supportedOperations: ['finishing'],
      toolpathKeywords: ['finish', 'profile'],
    };

    expect(toolSupportsToolpath(chamferTool, engravePath)).toBe(true);
    expect(scoreToolForToolpath(chamferTool, engravePath)).toBeGreaterThan(
      scoreToolForToolpath(squareEndmill, engravePath),
    );
    expect(selectPreferredToolForToolpath([squareEndmill, chamferTool], engravePath)?.id).toBe('engrave-chamfer');
  });
});
