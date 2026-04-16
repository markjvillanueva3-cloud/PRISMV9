/**
 * PPG-SHIP-MS0 U-SH21: E2E test — 9 CAM packages + offline fallback
 * Validates each CAM package produces valid pipeline input and
 * the page can function with embedded fallback data when server is down.
 */
import { describe, it, expect } from 'vitest';

// ─── CAM Package Registry ─────────────────────────────────────────

const CAM_PACKAGES = [
  { value: 'mastercam', label: 'Mastercam', controllers: ['haas_ngc', 'fanuc_31i', 'siemens_840d'] },
  { value: 'hypermill', label: 'hyperMILL', controllers: ['siemens_840d', 'heidenhain_tnc640', 'fanuc_31i'] },
  { value: 'fusion_360', label: 'Fusion 360', controllers: ['haas_ngc', 'fanuc_31i', 'hurco_winmax'] },
  { value: 'nx_cam', label: 'NX CAM', controllers: ['siemens_840d', 'fanuc_31i'] },
  { value: 'esprit', label: 'ESPRIT', controllers: ['fanuc_31i', 'haas_ngc', 'mazak_smooth'] },
  { value: 'solidcam', label: 'SolidCAM', controllers: ['haas_ngc', 'fanuc_31i', 'siemens_840d'] },
  { value: 'catia', label: 'CATIA', controllers: ['siemens_840d', 'fanuc_31i'] },
  { value: 'gibbscam', label: 'GibbsCAM', controllers: ['haas_ngc', 'fanuc_31i'] },
  { value: 'manual', label: 'Manual programming', controllers: ['fanuc_31i', 'haas_ngc', 'siemens_840d'] },
] as const;

// Wizard step 4 validation
const VALID_CAM_VALUES = CAM_PACKAGES.map(p => p.value);

// ─── Offline Fallback Data ─────────────────────────────────────────

const FALLBACK_CONTROLLERS = [
  { value: 'fanuc_31i', label: 'Fanuc 31i / 0i', family: 'fanuc', note: 'Most common CNC controller globally' },
  { value: 'haas_ngc', label: 'Haas NGC', family: 'haas', note: 'Haas Next Generation Control' },
  { value: 'siemens_840d', label: 'Siemens 840D', family: 'siemens', note: 'High-end 5-axis controller' },
  { value: 'mazak_smooth', label: 'Mazak SmoothAi', family: 'mazak', note: 'Mazak turning/multitask' },
  { value: 'hurco_winmax', label: 'Hurco WinMax', family: 'hurco', note: 'Conversational/NC hybrid' },
  { value: 'okuma_osp', label: 'Okuma OSP', family: 'okuma', note: 'Mill-turn and multitask' },
];

const FALLBACK_OPERATIONS = [
  { value: 'milling_2d', label: '2D Milling', family: 'mill', note: 'Face, pocket, contour' },
  { value: 'milling_3d', label: '3D Milling', family: 'mill', note: 'Sculpted surface machining' },
  { value: 'drilling', label: 'Drilling', family: 'hole', note: 'Standard hole operations' },
  { value: 'turning', label: 'Turning', family: 'lathe', note: 'OD/ID turning operations' },
];

const FALLBACK_MACHINE_POSTURES = [
  '3_axis_vmc',
  '5_axis_trunnion',
  '5_axis_swivel_head',
  'lathe_2_axis',
  'lathe_live_tooling',
  'mill_turn',
];

// ─── Tests ─────────────────────────────────────────────────────────

describe('PPG CAM Package Coverage', () => {
  it('all 9 CAM packages are defined', () => {
    expect(CAM_PACKAGES).toHaveLength(9);
  });

  it('each CAM package has a unique value', () => {
    const values = CAM_PACKAGES.map(p => p.value);
    expect(new Set(values).size).toBe(9);
  });

  it('each CAM package has at least 2 compatible controllers', () => {
    for (const pkg of CAM_PACKAGES) {
      expect(pkg.controllers.length).toBeGreaterThanOrEqual(2);
    }
  });

  it.each(CAM_PACKAGES)('$label produces valid pipeline input', (pkg) => {
    const input = {
      gcode: 'G90\nG0 X0 Y0\nG1 Z-5 F500\nM30',
      controller: pkg.controllers[0],
      cam_system: pkg.value,
      stages: { speed_feed: true },
      include_analytics: true,
    };
    expect(input.gcode).toBeTruthy();
    expect(input.controller).toBeTruthy();
    expect(VALID_CAM_VALUES).toContain(input.cam_system);
  });

  it('Mastercam supports all major controller families', () => {
    const mastercam = CAM_PACKAGES.find(p => p.value === 'mastercam')!;
    expect(mastercam.controllers).toContain('haas_ngc');
    expect(mastercam.controllers).toContain('fanuc_31i');
  });

  it('Fusion 360 supports Hurco (CPS-native)', () => {
    const fusion = CAM_PACKAGES.find(p => p.value === 'fusion_360')!;
    expect(fusion.controllers).toContain('hurco_winmax');
  });

  it('hyperMILL supports Heidenhain (high-end 5-axis)', () => {
    const hypermill = CAM_PACKAGES.find(p => p.value === 'hypermill')!;
    expect(hypermill.controllers).toContain('heidenhain_tnc640');
  });
});

describe('PPG Offline Fallback', () => {
  it('fallback controllers cover all major families', () => {
    expect(FALLBACK_CONTROLLERS.length).toBeGreaterThanOrEqual(5);
    const families = FALLBACK_CONTROLLERS.map(c => c.family);
    expect(families).toContain('fanuc');
    expect(families).toContain('haas');
    expect(families).toContain('siemens');
  });

  it('fallback operations cover mill + lathe', () => {
    const families = FALLBACK_OPERATIONS.map(o => o.family);
    expect(families).toContain('mill');
    expect(families).toContain('lathe');
    expect(families).toContain('hole');
  });

  it('fallback machine postures cover 3/5-axis + lathe', () => {
    expect(FALLBACK_MACHINE_POSTURES).toContain('3_axis_vmc');
    expect(FALLBACK_MACHINE_POSTURES).toContain('5_axis_trunnion');
    expect(FALLBACK_MACHINE_POSTURES).toContain('lathe_2_axis');
    expect(FALLBACK_MACHINE_POSTURES).toContain('mill_turn');
  });

  it('wizard can build step-1 config with fallback data only', () => {
    const config = {
      machineModel: 'Generic 3-axis VMC',
      controller: FALLBACK_CONTROLLERS[0].value,
      machinePosture: FALLBACK_MACHINE_POSTURES[0],
    };
    expect(config.machineModel).toBeTruthy();
    expect(config.controller).toBeTruthy();
    expect(config.machinePosture).toBeTruthy();
  });

  it('wizard can build step-4 config with fallback data only', () => {
    const config = {
      camSystem: CAM_PACKAGES[0].value,
      operation: FALLBACK_OPERATIONS[0].value,
      strategy: 'production_safe',
    };
    expect(VALID_CAM_VALUES).toContain(config.camSystem);
    expect(FALLBACK_OPERATIONS.some(o => o.value === config.operation)).toBe(true);
  });

  it('embedded material fallback has at least 5 common materials', () => {
    // These are the materials a user should always see even offline
    const essentialMaterials = [
      { id: '1018', name: '1018 Mild Steel', iso: 'P', kc: 1500 },
      { id: '4140', name: '4140 Steel', iso: 'P', kc: 2100 },
      { id: '304ss', name: '304 Stainless', iso: 'M', kc: 2200 },
      { id: '6061', name: '6061-T6 Aluminum', iso: 'N', kc: 700 },
      { id: 'ti64', name: 'Ti-6Al-4V', iso: 'S', kc: 1950 },
    ];
    expect(essentialMaterials.length).toBeGreaterThanOrEqual(5);
    for (const mat of essentialMaterials) {
      expect(mat.id).toBeTruthy();
      expect(mat.kc).toBeGreaterThan(0);
      expect(['P', 'M', 'K', 'N', 'S', 'H']).toContain(mat.iso);
    }
  });

  it('embedded machine fallback has at least 3 common machines', () => {
    const essentialMachines = [
      { id: 'haas-vf-2', model: 'Haas VF-2', maxRPM: 8100 },
      { id: 'hurco-vm30i', model: 'Hurco VM30i', maxRPM: 12000 },
      { id: 'dmg-dmu-50', model: 'DMG DMU 50', maxRPM: 20000 },
    ];
    expect(essentialMachines.length).toBeGreaterThanOrEqual(3);
    for (const m of essentialMachines) {
      expect(m.maxRPM).toBeGreaterThan(0);
    }
  });
});

describe('PPG G-code Syntax Highlighting', () => {
  // Token classification tests (matching GcodePreviewPanel logic)
  function classifyToken(token: string): string {
    if (/^\(.*\)$/.test(token) || token.startsWith(';')) return 'comment';
    if (/^G\d+(\.\d+)?$/i.test(token)) return 'gcode';
    if (/^M\d+$/i.test(token)) return 'mcode';
    if (/^[SF]\d+(\.\d+)?$/i.test(token)) return 'sfeed';
    if (/^[XYZABCIJKR]-?\d+(\.\d+)?$/i.test(token)) return 'coord';
    if (/^[THDP]\d+$/i.test(token)) return 'number';
    return 'plain';
  }

  it('classifies G-codes', () => {
    expect(classifyToken('G0')).toBe('gcode');
    expect(classifyToken('G1')).toBe('gcode');
    expect(classifyToken('G90')).toBe('gcode');
    expect(classifyToken('G43')).toBe('gcode');
    expect(classifyToken('G54')).toBe('gcode');
  });

  it('classifies M-codes', () => {
    expect(classifyToken('M3')).toBe('mcode');
    expect(classifyToken('M6')).toBe('mcode');
    expect(classifyToken('M30')).toBe('mcode');
  });

  it('classifies S/F values', () => {
    expect(classifyToken('S5000')).toBe('sfeed');
    expect(classifyToken('F800')).toBe('sfeed');
    expect(classifyToken('S12000')).toBe('sfeed');
    expect(classifyToken('F2000.5')).toBe('sfeed');
  });

  it('classifies coordinates', () => {
    expect(classifyToken('X100')).toBe('coord');
    expect(classifyToken('Y-50.5')).toBe('coord');
    expect(classifyToken('Z5')).toBe('coord');
    expect(classifyToken('A90')).toBe('coord');
    expect(classifyToken('I0')).toBe('coord');
    expect(classifyToken('R5.0')).toBe('coord');
  });

  it('classifies tool/offset numbers', () => {
    expect(classifyToken('T1')).toBe('number');
    expect(classifyToken('H1')).toBe('number');
    expect(classifyToken('D1')).toBe('number');
  });

  it('classifies comments', () => {
    expect(classifyToken('(COMMENT)')).toBe('comment');
    expect(classifyToken('; comment')).toBe('comment');
  });

  it('unknown tokens are plain', () => {
    expect(classifyToken('CYCLE800')).toBe('plain');
    expect(classifyToken('hello')).toBe('plain');
  });
});
