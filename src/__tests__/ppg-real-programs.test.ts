/**
 * PPG Real Program Tests — validates the pipeline against actual shop-floor programs
 * from the Box extraction. These are production programs, not synthetic test data.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

// Lazy import to avoid bundle issues
const getPipeline = async () => {
  const mod = await import('../engines/PostProcessorPipelineEngine.js');
  return mod.postProcessorPipelineEngine;
};

describe('PPG Real Program Pipeline Tests', () => {
  // ── Haas multi-tool production program ──
  const haasMultiTool = path.resolve(__dirname, '../__tests__/fixtures/haas-programs/O01289.nc');

  it('parses a real Haas NC file into blocks', async () => {
    if (!fs.existsSync(haasMultiTool)) return; // skip if fixture missing
    const gcode = fs.readFileSync(haasMultiTool, 'utf8');
    const pipeline = await getPipeline();

    const result = await pipeline.process({
      gcode,
      controller: 'haas_ngc',
      aggressiveness: 0.5,
      optimization_target: 'balanced',
      include_analytics: true,
    });

    expect(result).toBeDefined();
    expect(result.stages).toBeDefined();
    expect(result.stages.length).toBeGreaterThan(0);
    // Stage 0.1 (parse) should pass
    const parseStage = result.stages.find((s: any) => s.stage.includes('parse'));
    expect(parseStage?.status).toBe('pass');
  });

  it('produces output G-code from a real Haas program', async () => {
    if (!fs.existsSync(haasMultiTool)) return;
    const gcode = fs.readFileSync(haasMultiTool, 'utf8');
    const pipeline = await getPipeline();

    const result = await pipeline.process({
      gcode,
      controller: 'haas_ngc',
      aggressiveness: 0.5,
      include_analytics: true,
      material: { name: '4140 Steel', iso_group: 'P', kc1_1: 1800, mc: 0.25 },
    });

    expect(result.output_gcode).toBeDefined();
    expect(result.output_gcode!.length).toBeGreaterThan(gcode.length * 0.5);
    // Output should still contain core G-code commands
    expect(result.output_gcode).toMatch(/G[019]/);
    expect(result.output_gcode).toMatch(/[MTS]\d/);
  });

  it('computes physics analytics for real cutting parameters', async () => {
    if (!fs.existsSync(haasMultiTool)) return;
    const gcode = fs.readFileSync(haasMultiTool, 'utf8');
    const pipeline = await getPipeline();

    const result = await pipeline.process({
      gcode,
      controller: 'haas_ngc',
      aggressiveness: 0.5,
      include_analytics: true,
      material: { name: '4140 Steel', iso_group: 'P', kc1_1: 1800, mc: 0.25 },
      tools: [
        { tool_number: 1, diameter_mm: 12.7, flute_count: 4, type: 'flat_endmill', material: 'carbide' },
      ],
    });

    if (result.analytics?.overall) {
      // Cycle time should be positive
      expect(result.analytics.overall.total_cycle_time_s).toBeGreaterThan(0);
      // Cutting time should be less than total
      expect(result.analytics.overall.cutting_time_s).toBeLessThanOrEqual(
        result.analytics.overall.total_cycle_time_s
      );
    }

    // No NaN in any numeric analytics field
    if (result.analytics?.per_operation) {
      for (const op of result.analytics.per_operation) {
        expect(op.force_range_N[0]).not.toBeNaN();
        expect(op.force_range_N[1]).not.toBeNaN();
        expect(op.power_range_kW[0]).not.toBeNaN();
        expect(op.mrr_cm3_min).not.toBeNaN();
      }
    }
  });

  // ── Okuma OSP programs ──
  const okumaFixtures = path.resolve(__dirname, '../__tests__/fixtures/okuma-programs');

  it('handles Okuma OSP dialect (G270/G180, G96/G97 CSS)', async () => {
    const files = fs.existsSync(okumaFixtures)
      ? fs.readdirSync(okumaFixtures).filter(f => f.endsWith('.min'))
      : [];
    if (files.length === 0) return;

    const gcode = fs.readFileSync(path.join(okumaFixtures, files[0]), 'utf8');
    const pipeline = await getPipeline();

    const result = await pipeline.process({
      gcode,
      controller: 'okuma',
      aggressiveness: 0.5,
      include_analytics: true,
    });

    expect(result).toBeDefined();
    expect(result.stages.length).toBeGreaterThan(0);
    // Should not crash on Okuma-specific codes
    expect(result.overall_status).toBeDefined();
  });

  // ── Pipeline doesn't produce NaN speeds or feeds ──
  it('never outputs NaN S or F values in optimized G-code', async () => {
    if (!fs.existsSync(haasMultiTool)) return;
    const gcode = fs.readFileSync(haasMultiTool, 'utf8');
    const pipeline = await getPipeline();

    const result = await pipeline.process({
      gcode,
      controller: 'haas_ngc',
      aggressiveness: 0.7,
      material: { name: '1018 Steel', iso_group: 'P', kc1_1: 1500, mc: 0.25 },
    });

    if (result.output_gcode) {
      const lines = result.output_gcode.split('\n');
      for (const line of lines) {
        // Check for NaN in S values
        if (/S\s*NaN/i.test(line)) {
          throw new Error(`NaN spindle speed found: ${line}`);
        }
        // Check for NaN in F values
        if (/F\s*NaN/i.test(line)) {
          throw new Error(`NaN feed rate found: ${line}`);
        }
      }
    }
  });

  // ── Pipeline handles large programs without OOM ──
  it('processes a 300+ line program without timeout', async () => {
    // Use the ALL STAR program from extracted data if available
    const bigProg = path.resolve('data/programs/haas/ALL_STAR__ALL STAR HDD CUTTER OP1.NC');
    if (!fs.existsSync(bigProg)) return;

    const gcode = fs.readFileSync(bigProg, 'utf8');
    const pipeline = await getPipeline();

    const start = Date.now();
    const result = await pipeline.process({
      gcode,
      controller: 'haas_ngc',
      aggressiveness: 0.5,
      include_analytics: true,
      material: { name: 'Steel', iso_group: 'P', kc1_1: 1700, mc: 0.25 },
    });
    const elapsed = Date.now() - start;

    expect(result.stages.length).toBeGreaterThan(5);
    expect(elapsed).toBeLessThan(30000); // should finish in under 30s
  }, 35000);
});
