/**
 * L8-P1-MS2 P0-U15: Learning Web UI Tests
 *
 * Tests for: learning types, API client structure, cross-links,
 * chart math, context reducer, and component exports.
 */
import { describe, it, expect } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';

const WEB_SRC = path.resolve(__dirname, '../../web/src');

// ── File Existence Tests ──────────────────────────────────────────────

describe('L8-P1-MS2: Learning Web UI file structure', () => {
  const requiredFiles = [
    'api/learning.ts',
    'types/learning.ts',
    'hooks/useLearning.ts',
    'pages/LearningDashboard.tsx',
    'components/learning/Assessment.tsx',
    'components/learning/LearningPath.tsx',
    'components/learning/ProgressTracker.tsx',
    'components/learning/KnowledgeSearch.tsx',
    'components/learning/MaterialWizard.tsx',
    'components/learning/ToolWizard.tsx',
    'components/learning/MachineWizard.tsx',
    'components/learning/DigitalTwin.tsx',
    'components/learning/LearningLayout.tsx',
    'components/charts/RadarChart.tsx',
    'components/charts/ProgressRing.tsx',
    'components/charts/BarChart.tsx',
    'components/charts/Sparkline.tsx',
    'components/charts/index.ts',
    'contexts/LearningContext.tsx',
    'utils/crossLinks.ts',
  ];

  for (const file of requiredFiles) {
    it(`${file} exists`, () => {
      expect(fs.existsSync(path.join(WEB_SRC, file))).toBe(true);
    });
  }
});

// ── API Client Structure ──────────────────────────────────────────────

describe('L8-P1-MS2: Learning API client', () => {
  it('exports all 10 endpoint functions', () => {
    const src = fs.readFileSync(path.join(WEB_SRC, 'api/learning.ts'), 'utf-8');
    const exports = [
      'assess', 'plan', 'progress', 'recommend',
      'searchKnowledge', 'searchTribal',
      'selectMaterial', 'selectTool', 'selectMachine', 'twin',
    ];
    for (const fn of exports) {
      expect(src).toContain(`export async function ${fn}`);
    }
  });

  it('targets /api/v1/learning base path', () => {
    const src = fs.readFileSync(path.join(WEB_SRC, 'api/learning.ts'), 'utf-8');
    expect(src).toContain("'/api/v1/learning'");
  });

  it('all endpoints use POST method', () => {
    const src = fs.readFileSync(path.join(WEB_SRC, 'api/learning.ts'), 'utf-8');
    // Should use the post() helper, not fetch directly
    expect(src).toContain("method: 'POST'");
    // Each function should call post<T>
    const postCalls = (src.match(/return post</g) || []).length;
    expect(postCalls).toBe(10);
  });
});

// ── Types Completeness ────────────────────────────────────────────────

describe('L8-P1-MS2: Learning types', () => {
  it('defines all domain types', () => {
    const src = fs.readFileSync(path.join(WEB_SRC, 'types/learning.ts'), 'utf-8');
    const types = [
      'LearningDomain', 'SkillLevel', 'AssessmentResult',
      'LearningModule', 'LearningPlan',
      'ProgressEntry', 'ProgressSummary', 'Badge',
      'KnowledgeResult',
      'MaterialRecommendation', 'ToolRecommendation', 'MachineRecommendation',
      'TwinStatus', 'TwinAlert', 'TwinHistory',
    ];
    for (const t of types) {
      expect(src).toContain(t);
    }
  });

  it('LearningDomain has 4 values', () => {
    const src = fs.readFileSync(path.join(WEB_SRC, 'types/learning.ts'), 'utf-8');
    expect(src).toContain("'CAD'");
    expect(src).toContain("'CAM'");
    expect(src).toContain("'ShopPractice'");
    expect(src).toContain("'MachineOperation'");
  });
});

// ── React Hooks ───────────────────────────────────────────────────────

describe('L8-P1-MS2: Learning hooks', () => {
  it('exports 10 hook functions', () => {
    const src = fs.readFileSync(path.join(WEB_SRC, 'hooks/useLearning.ts'), 'utf-8');
    const hooks = [
      'useAssess', 'useLearningPlan', 'useProgress', 'useRecommend',
      'useKnowledgeSearch', 'useTribalSearch',
      'useMaterialSelect', 'useToolSelect', 'useMachineSelect', 'useTwin',
    ];
    for (const h of hooks) {
      expect(src).toContain(`export function ${h}`);
    }
  });

  it('uses generic useAsync pattern', () => {
    const src = fs.readFileSync(path.join(WEB_SRC, 'hooks/useLearning.ts'), 'utf-8');
    expect(src).toContain('function useAsync');
    expect(src).toContain('loading');
    expect(src).toContain('error');
  });
});

// ── Cross-Links ───────────────────────────────────────────────────────

describe('L8-P1-MS2: Cross-links', () => {
  // Dynamic import to test actual function logic
  let crossLinks: typeof import('../../web/src/utils/crossLinks');

  it('crossLinks module is importable', async () => {
    crossLinks = await import('../../web/src/utils/crossLinks');
    expect(crossLinks).toBeDefined();
  });

  it('buildSfcUrl creates correct URL', async () => {
    crossLinks = await import('../../web/src/utils/crossLinks');
    const url = crossLinks.buildSfcUrl('AISI 4140');
    expect(url).toContain('/calculator?');
    expect(url).toContain('material=');
    expect(url).toContain('AISI');
  });

  it('buildPpgUrl creates correct URL', async () => {
    crossLinks = await import('../../web/src/utils/crossLinks');
    const url = crossLinks.buildPpgUrl('Face Milling');
    expect(url).toContain('/ppg?');
    expect(url).toContain('operation=');
  });

  it('buildKnowledgeUrl with domain filter', async () => {
    crossLinks = await import('../../web/src/utils/crossLinks');
    const url = crossLinks.buildKnowledgeUrl('speeds and feeds', 'CAM');
    expect(url).toContain('/learning/knowledge?');
    expect(url).toContain('domain=CAM');
  });
});

// ── Chart Components ──────────────────────────────────────────────────

describe('L8-P1-MS2: Chart components', () => {
  it('chart index exports all 4 components', () => {
    const src = fs.readFileSync(path.join(WEB_SRC, 'components/charts/index.ts'), 'utf-8');
    expect(src).toContain('RadarChart');
    expect(src).toContain('ProgressRing');
    expect(src).toContain('BarChart');
    expect(src).toContain('Sparkline');
  });

  it('RadarChart renders SVG with polygon', () => {
    const src = fs.readFileSync(path.join(WEB_SRC, 'components/charts/RadarChart.tsx'), 'utf-8');
    expect(src).toContain('<svg');
    expect(src).toContain('<polygon');
    expect(src).toContain('getPoint');
  });

  it('ProgressRing uses SVG circle with dasharray', () => {
    const src = fs.readFileSync(path.join(WEB_SRC, 'components/charts/ProgressRing.tsx'), 'utf-8');
    expect(src).toContain('strokeDasharray');
    expect(src).toContain('strokeDashoffset');
  });
});

// ── Learning Layout ───────────────────────────────────────────────────

describe('L8-P1-MS2: Learning layout', () => {
  it('defines 9 nav items for all learning routes', () => {
    const src = fs.readFileSync(path.join(WEB_SRC, 'components/learning/LearningLayout.tsx'), 'utf-8');
    const routes = [
      '/learning', '/learning/assessment', '/learning/path',
      '/learning/progress', '/learning/knowledge',
      '/learning/material-wizard', '/learning/tool-wizard',
      '/learning/machine-wizard', '/learning/twin',
    ];
    for (const route of routes) {
      expect(src).toContain(route);
    }
  });

  it('uses Outlet for nested routing', () => {
    const src = fs.readFileSync(path.join(WEB_SRC, 'components/learning/LearningLayout.tsx'), 'utf-8');
    expect(src).toContain('<Outlet');
  });
});

// ── App.tsx Integration ───────────────────────────────────────────────

describe('L8-P1-MS2: App.tsx route integration', () => {
  it('imports all learning components', () => {
    const src = fs.readFileSync(path.join(WEB_SRC, 'App.tsx'), 'utf-8');
    const imports = [
      'LearningProvider', 'LearningLayout', 'LearningDashboard',
      'Assessment', 'LearningPath', 'ProgressTracker',
      'KnowledgeSearch', 'MaterialWizard', 'ToolWizard',
      'MachineWizard', 'DigitalTwin',
    ];
    for (const imp of imports) {
      expect(src).toContain(imp);
    }
  });

  it('wraps routes in LearningProvider', () => {
    const src = fs.readFileSync(path.join(WEB_SRC, 'App.tsx'), 'utf-8');
    expect(src).toContain('<LearningProvider>');
    expect(src).toContain('</LearningProvider>');
  });

  it('has nested learning routes under /learning', () => {
    const src = fs.readFileSync(path.join(WEB_SRC, 'App.tsx'), 'utf-8');
    expect(src).toContain('path="learning"');
    expect(src).toContain('element={<LearningLayout />}');
  });
});

// ── Context / State ───────────────────────────────────────────────────

describe('L8-P1-MS2: Learning context', () => {
  it('exports LearningProvider and useLearningContext', () => {
    const src = fs.readFileSync(path.join(WEB_SRC, 'contexts/LearningContext.tsx'), 'utf-8');
    expect(src).toContain('export function LearningProvider');
    expect(src).toContain('export function useLearningContext');
  });

  it('uses localStorage for persistence', () => {
    const src = fs.readFileSync(path.join(WEB_SRC, 'contexts/LearningContext.tsx'), 'utf-8');
    expect(src).toContain('localStorage.getItem');
    expect(src).toContain('localStorage.setItem');
  });

  it('supports SET_SKILLS, SET_PATH, ADD_SEARCH actions', () => {
    const src = fs.readFileSync(path.join(WEB_SRC, 'contexts/LearningContext.tsx'), 'utf-8');
    expect(src).toContain("'SET_SKILLS'");
    expect(src).toContain("'SET_PATH'");
    expect(src).toContain("'ADD_SEARCH'");
  });
});

// ── Component Content Checks ──────────────────────────────────────────

describe('L8-P1-MS2: Component quality', () => {
  const components = [
    'components/learning/Assessment.tsx',
    'components/learning/LearningPath.tsx',
    'components/learning/ProgressTracker.tsx',
    'components/learning/KnowledgeSearch.tsx',
    'components/learning/MaterialWizard.tsx',
    'components/learning/ToolWizard.tsx',
    'components/learning/MachineWizard.tsx',
    'components/learning/DigitalTwin.tsx',
  ];

  for (const file of components) {
    const name = path.basename(file, '.tsx');

    it(`${name} uses hooks from useLearning`, () => {
      const src = fs.readFileSync(path.join(WEB_SRC, file), 'utf-8');
      expect(src).toContain("from '../../hooks/useLearning'");
    });

    it(`${name} handles loading state`, () => {
      const src = fs.readFileSync(path.join(WEB_SRC, file), 'utf-8');
      expect(src).toContain('loading');
      expect(src).toMatch(/LoadingState|loading/);
    });

    it(`${name} has no TODO/FIXME placeholders`, () => {
      const src = fs.readFileSync(path.join(WEB_SRC, file), 'utf-8');
      expect(src).not.toMatch(/TODO|FIXME|HACK|XXX/);
    });
  }
});

// ── Layout nav includes Learning ──────────────────────────────────────

describe('L8-P1-MS2: Main Layout nav', () => {
  it('Layout.tsx includes Learning nav item', () => {
    const src = fs.readFileSync(path.join(WEB_SRC, 'components/Layout.tsx'), 'utf-8');
    expect(src).toContain("'/learning'");
    expect(src).toContain("'Learning'");
  });
});
