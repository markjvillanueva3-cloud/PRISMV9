/**
 * GCodeSafetyAnalyzerEngine companion test (U-PP-MISSING-ENGINE-TESTS, slot:echo).
 *
 * The central P5 safety gate had NO companion test despite CLAUDE.md §11 claiming one.
 * A 24-rule crash/injury safety analyzer must not ship untested. These tests encode the
 * *intent* of each rule (R9): they fail if the safety logic changes, not merely if a value
 * is returned. Score math is hand-traced; per-rule isolation uses minimal programs that trip
 * exactly the targeted rule (or assert the specific rule_id surfaces).
 *
 * Score model (verified at GCodeSafetyAnalyzerEngine.ts:1489-1496):
 *   score = clamp_[0,100]( 100 - (15*critical + 5*high + 1*medium) )
 *   safe  = critical.length === 0 && high.length === 0   (aerospace also requires medium === 0)
 */
import { describe, it, expect } from 'vitest';
import {
  GCodeSafetyAnalyzerEngine,
  gcSafetyAnalyzer,
  type SafetyAnalysisConfig,
  type ToolData,
} from '../engines/GCodeSafetyAnalyzerEngine.js';

const engine = new GCodeSafetyAnalyzerEngine();

function cfg(partial: Partial<SafetyAnalysisConfig> = {}): SafetyAnalysisConfig {
  return { controller: 'fanuc', strictness: 'standard', ...partial };
}

const ids = (issues: { rule_id: string }[]) => issues.map((i) => i.rule_id);

// A program hand-verified to trip ZERO of the 24 rules on a fanuc/standard analysis.
// Safe-start codes present (G90 G80 G40 G49 G17), spindle before cut, feed specified,
// tool-length comp (G43) active before any cut, program end M30.
const CLEAN_FANUC = [
  'G90 G80 G40 G49 G17 G54',
  'M6 T1',
  'G43 H1 Z50.',
  'M3 S1000',
  'G1 Z5. F100',
  'G1 X10. Y10. F100',
  'G0 Z50.',
  'M5',
  'M30',
].join('\n');

describe('GCodeSafetyAnalyzerEngine — clean program & score math', () => {
  it('a fully-compliant program scores 100/100, safe=true, zero issues', () => {
    const r = engine.analyze(CLEAN_FANUC, cfg());
    expect(r.critical).toHaveLength(0);
    expect(r.high).toHaveLength(0);
    expect(r.medium).toHaveLength(0);
    expect(r.score).toBe(100);
    expect(r.safe).toBe(true);
    expect(r.summary).toContain('100/100');
  });

  it('exactly one critical (CRIT-01) yields score 85 = 100 - 15, safe=false', () => {
    // Identical to CLEAN_FANUC but the in-cut retract becomes a rapid into Z-negative.
    const prog = [
      'G90 G80 G40 G49 G17 G54',
      'M6 T1',
      'G43 H1 Z50.',
      'M3 S1000',
      'G0 Z-5.', // CRIT-01: rapid (G0) below Z0
      'G0 Z50.',
      'M5',
      'M30',
    ].join('\n');
    const r = engine.analyze(prog, cfg());
    expect(r.critical).toHaveLength(1);
    expect(r.critical[0].rule_id).toBe('CRIT-01');
    expect(r.high).toHaveLength(0);
    expect(r.medium).toHaveLength(0);
    expect(r.score).toBe(85); // 100 - 15*1
    expect(r.safe).toBe(false);
    expect(r.summary).toContain('DO NOT RUN');
  });

  it('score is clamped at 0, never negative, for a heavily unsafe program', () => {
    // Many criticals + highs; penalty far exceeds 100 → must floor at 0.
    const prog = [
      'G0 Z-1.', 'G0 Z-2.', 'G0 Z-3.', 'G0 Z-4.', 'G0 Z-5.',
      'G0 Z-6.', 'G0 Z-7.', 'G0 Z-8.', 'G0 Z-9.', 'G0 Z-10.',
    ].join('\n');
    const r = engine.analyze(prog, cfg());
    expect(r.critical.length).toBeGreaterThanOrEqual(7);
    expect(r.score).toBe(0);
    expect(r.score).toBeGreaterThanOrEqual(0);
  });
});

describe('GCodeSafetyAnalyzerEngine — critical rule isolation', () => {
  it('CRIT-02: cutting move with no active spindle', () => {
    const prog = 'G90 G80 G40 G49 G17 G54\nG1 X10. Y10. F100\nM30';
    const r = engine.analyze(prog, cfg());
    expect(ids(r.critical)).toContain('CRIT-02');
  });

  it('CRIT-05: feed move with zero/missing feed rate', () => {
    const prog = 'G90 G80 G40 G49 G17 G54\nM3 S1000\nG1 X10. Y10.\nM30';
    const r = engine.analyze(prog, cfg());
    expect(ids(r.critical)).toContain('CRIT-05');
  });

  it('CRIT-06: RH tapping cycle (G84) with spindle running CCW (M4)', () => {
    const prog = 'G90 G80 G40 G49 G17 G54\nM4 S500\nG84 X0 Y0 Z-10. R2. F100\nG80\nM30';
    const r = engine.analyze(prog, cfg());
    expect(ids(r.critical)).toContain('CRIT-06');
  });

  it('CRIT-08: G28 reference return while cutter comp (G41) is active', () => {
    const prog = 'G90 G80 G40 G49 G17 G54\nM3 S1000\nG41 D1 X10. F100\nG28 G91 Z0\nM30';
    const r = engine.analyze(prog, cfg());
    expect(ids(r.critical)).toContain('CRIT-08');
  });

  it('CRIT-04: tool change (M6) below the clearance plane (Z-negative)', () => {
    const prog = 'G90 G80 G40 G49 G17 G54\nM3 S1000\nG1 Z-10. F100\nM6 T2\nM30';
    const r = engine.analyze(prog, cfg());
    expect(ids(r.critical)).toContain('CRIT-04');
  });

  it('CRIT-09: axis move beyond the machine travel envelope', () => {
    const prog = 'G90 G80 G40 G49 G17 G54\nM3 S1000\nG1 X9999. Y0 F100\nM30';
    const r = engine.analyze(
      prog,
      cfg({ machine_envelope: { x_min: -500, x_max: 500, y_min: -300, y_max: 300, z_min: -400, z_max: 100 } }),
    );
    expect(ids(r.critical)).toContain('CRIT-09');
  });
});

describe('GCodeSafetyAnalyzerEngine — strictness gating (R9: behavior must change with config)', () => {
  const highSpeedNoCoolant = 'G90 G80 G40 G49 G17 G54\nM3 S5000\nG1 X10. Y10. F500\nM30';

  it('CRIT-03 (no coolant at high RPM) is SILENT under standard strictness', () => {
    const r = engine.analyze(highSpeedNoCoolant, cfg({ strictness: 'standard' }));
    expect(ids(r.critical)).not.toContain('CRIT-03');
    expect(r.safe).toBe(true);
  });

  it('CRIT-03 FIRES under strict strictness for the same program', () => {
    const r = engine.analyze(highSpeedNoCoolant, cfg({ strictness: 'strict' }));
    expect(ids(r.critical)).toContain('CRIT-03');
  });

  it('aerospace strictness fails a program that has only medium issues', () => {
    // CLEAN program minus the program-end → MED-20 only. safe under standard, NOT under aerospace.
    const noEnd = CLEAN_FANUC.replace('\nM30', '');
    const std = engine.analyze(noEnd, cfg({ strictness: 'standard' }));
    expect(std.medium.length).toBeGreaterThan(0);
    expect(std.safe).toBe(true); // standard: medium issues don't make it unsafe
    const aero = engine.analyze(noEnd, cfg({ strictness: 'aerospace' }));
    expect(aero.safe).toBe(false); // aerospace: any medium issue fails
  });
});

describe('GCodeSafetyAnalyzerEngine — high & medium rules', () => {
  it('HIGH-16: spindle RPM exceeds the tool max', () => {
    const tools: ToolData[] = [{ tool_num: 1, diameter: 10, max_rpm: 5000, type: 'endmill' }];
    const prog = 'G90 G80 G40 G49 G17 G54\nT1\nM3 S8000\nG43 H1 Z50.\nM30';
    const r = engine.analyze(prog, cfg({ tool_data: tools }));
    expect(ids(r.high)).toContain('HIGH-16');
  });

  it('HIGH-18: missing safe-start block', () => {
    const prog = 'M3 S1000\nG1 X10. Y10. F100\nM5\nM30';
    const r = engine.analyze(prog, cfg());
    expect(ids(r.high)).toContain('HIGH-18');
  });

  it('MED-20: program with no M30/M02 end code', () => {
    const prog = 'G90 G80 G40 G49 G17 G54\nM3 S1000\nG1 X10. Y10. F100\nM5';
    const r = engine.analyze(prog, cfg());
    expect(ids(r.medium)).toContain('MED-20');
  });
});

describe('GCodeSafetyAnalyzerEngine — controller-specific dialect rules', () => {
  it('HIGH-19: Okuma lathe program missing the G50 S<max_rpm> clamp', () => {
    // M3 added so the no-spindle (CRIT-02) rule does not mask the target rule.
    const prog = 'G90 G00 X0 Z5.\nG96 S200 M3\nG1 X10. F.1\nM30';
    const r = engine.analyze(prog, cfg({ controller: 'okuma' }));
    expect(ids(r.high)).toContain('HIGH-19');
  });

  it('HIGH-19 is satisfied when G50 S<rpm> is present in the header', () => {
    const prog = 'G50 S3000\nG90 G00 X0 Z5.\nG96 S200 M3\nG1 X10. F.1\nM30';
    const r = engine.analyze(prog, cfg({ controller: 'okuma' }));
    expect(ids(r.high)).not.toContain('HIGH-19');
  });

  it('MED-22: inline parenthetical comment on a Siemens (semicolon) controller', () => {
    // The rule targets INLINE comments leaked onto a code line; a full-line comment is
    // (correctly) parsed as a comment and skipped, so the fixture must be inline.
    const prog = 'G90 G40 G17\nG1 X10. F100 (FANUC-STYLE COMMENT)\nM30';
    const r = engine.analyze(prog, cfg({ controller: 'siemens' }));
    expect(ids(r.medium)).toContain('MED-22');
  });
});

describe('GCodeSafetyAnalyzerEngine — JM-Die leading-dot decimal parsing', () => {
  it('tracks a modal leading-dot feed (F.006) so a later modal cut does NOT false-fire CRIT-05', () => {
    // Regression for U-GCANALYZER-MODAL-F-TRACK: `.006` must parse as 0.006, not 0.
    const prog = 'G90 G80 G40 G49 G17 G54\nM3 S1000\nG1 X1. F.006\nX2.\nM30';
    const r = engine.analyze(prog, cfg());
    expect(ids(r.critical)).not.toContain('CRIT-05');
    expect(r.safe).toBe(true);
  });
});

describe('GCodeSafetyAnalyzerEngine — quickCheck (critical-only fast path)', () => {
  it('flags CRIT-01 on a rapid into stock and returns ONLY critical-severity issues', () => {
    const issues = engine.quickCheck('G0 Z-5.\nG1 X10. F100');
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(ids(issues)).toContain('CRIT-01');
    expect(issues.every((i) => i.severity === 'critical')).toBe(true);
  });
});

describe('GCodeSafetyAnalyzerEngine — autoFix', () => {
  it('inserts a safe-start block for HIGH-18 and re-analysis clears the issue', () => {
    const prog = 'M3 S1000\nG1 X10. Y10. F100\nM5\nM30';
    const fix = engine.autoFix(prog, cfg());
    expect(fix.fixes_applied.some((f) => f.startsWith('HIGH-18'))).toBe(true);
    expect(fix.fixed_gcode).toContain('G90'); // safe-start codes inserted
    const re = engine.analyze(fix.fixed_gcode, cfg());
    expect(ids(re.high)).not.toContain('HIGH-18'); // the fix actually fixes
  });

  it('adds M30 for MED-20 but reports a CRIT-01 as unfixable (never changes machining intent)', () => {
    const prog = 'G90 G80 G40 G49 G17 G54\nM3 S1000\nG0 Z-5.';
    const fix = engine.autoFix(prog, cfg());
    expect(fix.fixed_gcode).toContain('M30');
    expect(fix.fixes_applied.some((f) => f.startsWith('MED-20'))).toBe(true);
    expect(fix.unfixable.some((u) => u.startsWith('CRIT-01'))).toBe(true);
  });
});

describe('GCodeSafetyAnalyzerEngine — generateSafetyReport', () => {
  it('renders PASS for a clean program and FAIL for an unsafe one', () => {
    const pass = engine.generateSafetyReport(CLEAN_FANUC, cfg());
    expect(pass).toContain('G-CODE SAFETY ANALYSIS REPORT');
    expect(pass).toContain('Status:       PASS');
    expect(pass).toContain('100/100');

    const fail = engine.generateSafetyReport('G0 Z-5.', cfg());
    expect(fail).toContain('Status:       FAIL');
    expect(fail).toContain('CRITICAL ISSUES');
  });
});

describe('GCodeSafetyAnalyzerEngine — validatePipelineOutput (machine-limit gate)', () => {
  it('BLOCKS spindle RPM over the machine max', () => {
    const r = engine.validatePipelineOutput({
      gcode: 'G1 X10 S20000 F100',
      pipeline: 'mill',
      machine_limits: { max_rpm: 15000 },
    });
    expect(r.safe).toBe(false);
    expect(r.blocks.map((b) => b.rule)).toContain('spindle_rpm');
  });

  it('passes a within-limits program (safe=true, no blocks)', () => {
    const r = engine.validatePipelineOutput({
      gcode: 'G1 X10 Y10 S8000 F2000',
      pipeline: 'mill',
      machine_limits: { max_rpm: 15000, max_feed_mm_min: 30000, x_travel_mm: 1000, y_travel_mm: 600 },
    });
    expect(r.safe).toBe(true);
    expect(r.blocks).toHaveLength(0);
  });
});

describe('GCodeSafetyAnalyzerEngine — adversarial inputs', () => {
  it('empty program does not throw and flags the missing safe-start (HIGH-18)', () => {
    const r = engine.analyze('', cfg());
    expect(r.safe).toBe(false);
    expect(ids(r.high)).toContain('HIGH-18');
  });

  it('garbage / non-G-code input is handled without throwing', () => {
    expect(() => engine.analyze('hello world\nthis is not gcode\n# notes', cfg())).not.toThrow();
  });

  it('rejects input over the 50MB hard size cap with a descriptive error', () => {
    const big = 'A'.repeat(50 * 1024 * 1024 + 1);
    expect(() => engine.analyze(big, cfg())).toThrow(/exceeds maximum size/);
  });

  it('the exported singleton is a usable engine instance', () => {
    const r = gcSafetyAnalyzer.analyze(CLEAN_FANUC, cfg());
    expect(r.score).toBe(100);
  });
});
