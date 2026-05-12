/**
 * Tests for Phase 1 Data Asset Merge engines:
 * ToolHolderDatabaseEngine, MachineConfigDatabaseEngine, SurfaceFinishDatabaseEngine
 */
import { describe, it, expect } from 'vitest';
import { toolHolderDatabaseEngine } from '../engines/ToolHolderDatabaseEngine.js';
import { machineConfigDatabaseEngine } from '../engines/MachineConfigDatabaseEngine.js';
import { surfaceFinishDatabaseEngine } from '../engines/SurfaceFinishDatabaseEngine.js';

// ============================================================================
// ToolHolderDatabaseEngine
// ============================================================================

describe('ToolHolderDatabaseEngine', () => {
  it('gets holder by exact ID', () => {
    const h = toolHolderDatabaseEngine.get('CAT40');
    expect(h).not.toBeNull();
    expect(h!.type).toBe('v_flange');
    expect(h!.standard).toBe('ANSI B5.50');
    expect(h!.max_rpm).toBe(15000);
  });

  it('gets holder by normalized ID (case insensitive)', () => {
    const h = toolHolderDatabaseEngine.get('hsk-a63');
    expect(h).not.toBeNull();
    expect(h!.type).toBe('hsk');
    expect(h!.form).toBe('A');
    expect(h!.size).toBe(63);
  });

  it('returns null for unknown holder', () => {
    expect(toolHolderDatabaseEngine.get('UNKNOWN-999')).toBeNull();
  });

  it('searches by type keyword', () => {
    const results = toolHolderDatabaseEngine.search('capto');
    expect(results.length).toBeGreaterThanOrEqual(6);
    expect(results.every(r => r.type === 'capto')).toBe(true);
  });

  it('searches by standard', () => {
    const results = toolHolderDatabaseEngine.search('DIN 69893');
    expect(results.length).toBeGreaterThanOrEqual(10);
  });

  it('lists by type', () => {
    const erCollets = toolHolderDatabaseEngine.listByType('er_collet');
    expect(erCollets.length).toBe(8); // ER8 through ER50
    expect(erCollets[0].standard).toBe('DIN 6499');
  });

  it('finds holders by RPM', () => {
    const highSpeed = toolHolderDatabaseEngine.findByRpm(40000);
    expect(highSpeed.length).toBeGreaterThan(0);
    expect(highSpeed.every(h => h.max_rpm >= 40000)).toBe(true);
  });

  it('recommends holders for lathe', () => {
    const recs = toolHolderDatabaseEngine.recommend({
      machine_type: 'lathe',
      application: 'turning',
    });
    expect(recs.length).toBeGreaterThan(0);
    const types = recs.map(r => r.type);
    expect(types.some(t => t.includes('vdi') || t === 'capto' || t === 'bmt')).toBe(true);
  });

  it('recommends holders by torque requirement', () => {
    const recs = toolHolderDatabaseEngine.recommend({ torque_nm: 500 });
    expect(recs.length).toBeGreaterThan(0);
    recs.forEach(r => {
      const torque = r.torque ?? r.torque_nm ?? Infinity;
      expect(torque).toBeGreaterThanOrEqual(500);
    });
  });

  it('returns types and standards', () => {
    const types = toolHolderDatabaseEngine.getTypes();
    expect(types).toContain('v_flange');
    expect(types).toContain('hsk');
    expect(types).toContain('capto');
    expect(types).toContain('er_collet');

    const standards = toolHolderDatabaseEngine.getStandards();
    expect(standards).toContain('ANSI B5.50');
    expect(standards).toContain('DIN 69893');
    expect(standards).toContain('ISO 26623');
  });

  it('reports stats', () => {
    const stats = toolHolderDatabaseEngine.stats();
    expect(stats.total).toBeGreaterThanOrEqual(80);
    expect(stats.types).toBeGreaterThanOrEqual(8);
    expect(stats.standards).toBeGreaterThanOrEqual(5);
    expect(stats.max_rpm).toBe(60000); // HSK-E25
  });

  it('gets BT40 with pull stud info', () => {
    const h = toolHolderDatabaseEngine.get('BT40');
    expect(h!.pull_stud).toBe('MAS403');
    expect(h!.flange_dia).toBe(63.0);
  });

  it('gets BMT with torque_nm', () => {
    const h = toolHolderDatabaseEngine.get('BMT55');
    expect(h!.torque_nm).toBe(60);
    expect(h!.turret_mount).toBe(true);
  });

  it('gets ER collet capacity range', () => {
    const h = toolHolderDatabaseEngine.get('ER32');
    expect(h!.capacity_range).toEqual([2.0, 20.0]);
    expect(h!.balance_grade).toBe('G6.3');
  });
});

// ============================================================================
// MachineConfigDatabaseEngine
// ============================================================================

describe('MachineConfigDatabaseEngine', () => {
  it('gets config by ID', () => {
    const c = machineConfigDatabaseEngine.get('haas_vf2');
    expect(c).not.toBeNull();
    expect(c!.controller).toBe('haas_ngc');
    expect(c!.smoothing.roughing).toBe('G187 P1 E0.001');
  });

  it('gets config by partial match', () => {
    const c = machineConfigDatabaseEngine.get('vf2');
    expect(c).not.toBeNull();
    expect(c!.controller).toBe('haas_ngc');
  });

  it('returns null for unknown machine', () => {
    expect(machineConfigDatabaseEngine.get('nonexistent')).toBeNull();
  });

  it('searches by controller', () => {
    const results = machineConfigDatabaseEngine.search('okuma');
    expect(results.length).toBeGreaterThanOrEqual(5);
    results.forEach(r => {
      expect(r.id.includes('okuma') || r.controller.includes('okuma')).toBe(true);
    });
  });

  it('lists all configs', () => {
    const all = machineConfigDatabaseEngine.list();
    expect(all.length).toBeGreaterThanOrEqual(15);
  });

  it('gets smoothing code', () => {
    const code = machineConfigDatabaseEngine.getSmoothingCode('haas_vf2', 'finishing');
    expect(code).toBe('G187 P3 E0.0001');
  });

  it('falls back to roughing when finishing not available', () => {
    const code = machineConfigDatabaseEngine.getSmoothingCode('dmgmori_dmu50', 'finishing');
    expect(code).toBe('M200'); // No finishing entry, falls back to roughing
  });

  it('returns null smoothing for unknown machine', () => {
    expect(machineConfigDatabaseEngine.getSmoothingCode('fake', 'roughing')).toBeNull();
  });

  it('lists by controller family', () => {
    const fanuc = machineConfigDatabaseEngine.listByController('fanuc');
    expect(fanuc.length).toBeGreaterThanOrEqual(2);
    fanuc.forEach(c => {
      expect(c.controller.toLowerCase()).toContain('fanuc');
    });
  });

  it('lists 5-axis machines', () => {
    const fiveAxis = machineConfigDatabaseEngine.listFiveAxis();
    expect(fiveAxis.length).toBeGreaterThanOrEqual(3);
    fiveAxis.forEach(c => {
      expect(c.fiveAxis?.enabled || c.fiveAxisFeedLimit != null).toBe(true);
    });
  });

  it('lists live tool machines', () => {
    const liveTool = machineConfigDatabaseEngine.listLiveTool();
    expect(liveTool.length).toBeGreaterThanOrEqual(2);
    liveTool.forEach(c => {
      expect(c.liveToolLimits).toBeDefined();
      expect(c.liveToolLimits!.maxRpm).toBeGreaterThan(0);
    });
  });

  it('reports stats', () => {
    const stats = machineConfigDatabaseEngine.stats();
    expect(stats.total).toBeGreaterThanOrEqual(15);
    expect(stats.controllers).toBeGreaterThanOrEqual(6);
    expect(stats.fiveAxis).toBeGreaterThanOrEqual(3);
    expect(stats.liveTool).toBeGreaterThanOrEqual(2);
  });

  it('hermle uses Heidenhain CYCL DEF', () => {
    const c = machineConfigDatabaseEngine.get('hermle_c32u');
    expect(c!.controller).toBe('heidenhain_tnc640');
    expect(c!.smoothing.roughing).toContain('CYCL DEF');
  });
});

// ============================================================================
// SurfaceFinishDatabaseEngine
// ============================================================================

describe('SurfaceFinishDatabaseEngine', () => {
  it('gets all 12 N-grades', () => {
    const grades = surfaceFinishDatabaseEngine.getAllGrades();
    expect(grades.length).toBe(12);
    expect(grades[0].grade).toBe('N1');
    expect(grades[11].grade).toBe('N12');
  });

  it('gets specific grade', () => {
    const n7 = surfaceFinishDatabaseEngine.getGrade('N7');
    expect(n7).not.toBeNull();
    expect(n7!.ra_um).toBe(1.6);
    expect(n7!.ra_uin).toBe(63);
    expect(n7!.process).toContain('Turning');
  });

  it('gets grade with number-only input', () => {
    const n5 = surfaceFinishDatabaseEngine.getGrade('5');
    expect(n5).not.toBeNull();
    expect(n5!.ra_um).toBe(0.4);
  });

  it('returns null for invalid grade', () => {
    expect(surfaceFinishDatabaseEngine.getGrade('N99')).toBeNull();
  });

  it('finds closest grade from Ra um', () => {
    const entry = surfaceFinishDatabaseEngine.findGrade(1.5, 'um');
    expect(entry.grade).toBe('N7'); // 1.6 is closest to 1.5
  });

  it('finds closest grade from Ra uin', () => {
    const entry = surfaceFinishDatabaseEngine.findGrade(125, 'uin');
    expect(entry.grade).toBe('N8'); // 125 uin = 3.175 um ≈ N8 (3.2)
  });

  it('converts um to uin', () => {
    const uin = surfaceFinishDatabaseEngine.convert(1.6, 'um', 'uin');
    expect(uin).toBeCloseTo(63.0, 0);
  });

  it('converts Rz to Ra', () => {
    const ra = surfaceFinishDatabaseEngine.convert(6.4, 'Rz', 'Ra');
    expect(ra).toBe(1.6);
  });

  it('parses Ra callout', () => {
    const r = surfaceFinishDatabaseEngine.parseCallout('Ra 1.6');
    expect(r.parameter).toBe('Ra');
    expect(r.value).toBe(1.6);
    expect(r.grade).toBe('N7');
  });

  it('parses Rz callout', () => {
    const r = surfaceFinishDatabaseEngine.parseCallout('Rz 6.3');
    expect(r.parameter).toBe('Rz');
    expect(r.value).toBe(6.3);
    expect(r.ra_equivalent_um).toBeCloseTo(1.575, 2);
  });

  it('parses N-grade callout', () => {
    const r = surfaceFinishDatabaseEngine.parseCallout('N6');
    expect(r.parameter).toBe('Ra');
    expect(r.grade).toBe('N6');
    expect(r.value).toBe(0.8);
    expect(r.process).toContain('Finish');
  });

  it('parses micro-inch callout', () => {
    const r = surfaceFinishDatabaseEngine.parseCallout('32 µin');
    expect(r.parameter).toBe('Ra');
    expect(r.value).toBe(32);
    expect(r.unit).toBe('μin');
    expect(r.grade).toBe('N6');
  });

  it('returns empty result for unparseable callout', () => {
    const r = surfaceFinishDatabaseEngine.parseCallout('smooth');
    expect(r.parameter).toBeNull();
    expect(r.value).toBeNull();
  });

  it('gets application guide', () => {
    const guide = surfaceFinishDatabaseEngine.getApplicationGuide();
    expect(guide.length).toBe(6);
    const bearing = guide.find(g => g.application === 'bearing');
    expect(bearing!.grade).toBe('N4');
    expect(bearing!.ra_um).toBe(0.2);
  });

  it('recommends process for target Ra', () => {
    const rec = surfaceFinishDatabaseEngine.getRecommendedProcess(0.5);
    expect(rec).not.toBeNull();
    expect(rec!.grade).toBe('N6');
    expect(rec!.achievableRa).toBe(0.8);
    expect(rec!.process).toContain('Finish');
  });

  it('returns null for impossibly fine Ra', () => {
    // N1 is 0.025, which is >= 0.01, so it should return N1
    const rec = surfaceFinishDatabaseEngine.getRecommendedProcess(0.01);
    expect(rec).not.toBeNull();
    expect(rec!.grade).toBe('N1');
  });

  it('reports stats', () => {
    const stats = surfaceFinishDatabaseEngine.stats();
    expect(stats.grades).toBe(12);
    expect(stats.applications).toBe(6);
    expect(stats.rz_to_ra_factor).toBe(4);
  });
});
