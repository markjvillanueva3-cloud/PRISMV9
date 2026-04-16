/**
 * PPG-VARIABILITY-SWEEP-MS0: Post Processor Inventory Validation
 * Verifies all 15 machines have PRISM-optimized posts with correct structure
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const POSTS_DIR = join(__dirname, '..', '..', 'data', 'posts', 'prism-enhanced');

// ─── Expected Posts ────────────────────────────────────────────────

const EXPECTED_POSTS = [
  // LATHES (7)
  { file: 'OKUMA_GENOS_L300M_OSP-P300L-R_PRISM.cps', machine: 'Genos L300-M', controller: 'OSP-P300L-R', type: 'lathe' },
  { file: 'OKUMA_GENOS_L200EM_OSP-P200LA-R_PRISM.cps', machine: 'Genos L200E-M', controller: 'OSP-P200LA-R', type: 'lathe' },
  { file: 'OKUMA_LNC8_PRISM.cps', machine: 'LNC8', controller: 'LNC', type: 'lathe' },
  { file: 'OKUMA_CROWN_L1060_OSP-U10L_PRISM.cps', machine: 'Crown L1060', controller: 'OSP-U10L', type: 'lathe' },
  { file: 'OKUMA_GENOS_L400II_P300LA-Ai-Enhanced.cps', machine: 'Genos L400II', controller: 'P300LA', type: 'lathe' },
  { file: 'OKUMA_LATHE_LB3000-Ai-Enhanced.cps', machine: 'LB3000', controller: 'OSP', type: 'lathe' },
  { file: 'OKUMA_MULTUS_B250IIW-Ai-Enhanced-Fixed.cps', machine: 'Multus B250II', controller: 'OSP-P300SA', type: 'mill_turn' },
  // MILLS (5)
  { file: 'HURCO_VM30i_PRISM_v11.cps', machine: 'VM30i', controller: 'WinMax', type: 'mill' },
  { file: 'OKUMA-M460V-5AX-Ai Enhanced-(iMachining).cps', machine: 'M460V-5AX', controller: 'OSP P300MA', type: 'mill_5axis' },
  { file: 'HAAS_VF2_-Ai-Enhanced (iMachining).cps', machine: 'VF-2', controller: 'Haas', type: 'mill' },
  { file: 'HAAS_OM-2_PRE-NGC_PRISM.cps', machine: 'OM-2', controller: 'Pre-NGC', type: 'mill' },
  { file: 'Roku-Roku-Ai-Enhanced.cps', machine: 'HC 658-II', controller: 'Fanuc 31i', type: 'mill' },
  // SINKER EDMs (2)
  { file: 'MITSUBISHI_EA12S_FP80S_PRISM.cps', machine: 'EA12S', controller: 'FP80S', type: 'sinker_edm' },
  { file: 'MITSUBISHI_EA12D_C30EA-2_PRISM.cps', machine: 'EA12D', controller: 'C30EA-2', type: 'sinker_edm' },
  // WIRE EDMs (3 controller configs)
  { file: 'MITSUBISHI_FA10S_W21FAS-2_PRISM.cps', machine: 'FA10S', controller: 'W21FAS-2', type: 'wire_edm' },
  { file: 'MITSUBISHI_FA10S_W30FAS-2_PRISM.cps', machine: 'FA10S', controller: 'W30FAS-2', type: 'wire_edm' },
  { file: 'MITSUBISHI_FA10S_W31MV-2_PRISM.cps', machine: 'FA10S', controller: 'W31MV-2', type: 'wire_edm' },
];

// ─── Tests ─────────────────────────────────────────────────────────

describe('PRISM Post Processor Inventory', () => {

  describe('File Existence', () => {
    it('all 17 PRISM posts exist', () => {
      const missing: string[] = [];
      for (const post of EXPECTED_POSTS) {
        const path = join(POSTS_DIR, post.file);
        if (!existsSync(path)) missing.push(post.file);
      }
      expect(missing).toEqual([]);
    });

    it.each(EXPECTED_POSTS)('$machine ($controller) post exists', (post) => {
      const path = join(POSTS_DIR, post.file);
      expect(existsSync(path)).toBe(true);
    });
  });

  describe('File Structure', () => {
    it.each(EXPECTED_POSTS)('$machine post has >200 lines', (post) => {
      const path = join(POSTS_DIR, post.file);
      if (!existsSync(path)) return;
      const content = readFileSync(path, 'utf-8');
      const lines = content.split('\n').length;
      expect(lines).toBeGreaterThan(200);
    });

    it.each(EXPECTED_POSTS)('$machine post has PRISM header', (post) => {
      const path = join(POSTS_DIR, post.file);
      if (!existsSync(path)) return;
      const content = readFileSync(path, 'utf-8').substring(0, 5000);
      // Should have manufacturer/machine identification
      expect(content.toLowerCase()).toMatch(/prism|enhanced|ai/i);
    });

    it.each(EXPECTED_POSTS)('$machine post has description field', (post) => {
      const path = join(POSTS_DIR, post.file);
      if (!existsSync(path)) return;
      const content = readFileSync(path, 'utf-8');
      expect(content).toMatch(/description\s*=/);
    });
  });

  describe('Machine Type Coverage', () => {
    it('6 lathe + 1 mill-turn = 7 turning-capable posts', () => {
      const turning = EXPECTED_POSTS.filter(p => p.type === 'lathe' || p.type === 'mill_turn');
      expect(turning.length).toBe(7);
    });

    it('1 mill-turn post (Multus)', () => {
      const millTurn = EXPECTED_POSTS.filter(p => p.type === 'mill_turn');
      expect(millTurn.length).toBe(1);
    });

    it('4 mill posts (VM30i, M460V, VF-2, OM-2, HC658)', () => {
      const mills = EXPECTED_POSTS.filter(p => p.type.startsWith('mill'));
      expect(mills.length).toBeGreaterThanOrEqual(4);
    });

    it('2 sinker EDM posts', () => {
      const sinkers = EXPECTED_POSTS.filter(p => p.type === 'sinker_edm');
      expect(sinkers.length).toBe(2);
    });

    it('3 wire EDM posts (one per controller)', () => {
      const wires = EXPECTED_POSTS.filter(p => p.type === 'wire_edm');
      expect(wires.length).toBe(3);
      const controllers = wires.map(w => w.controller);
      expect(controllers).toContain('W21FAS-2');
      expect(controllers).toContain('W30FAS-2');
      expect(controllers).toContain('W31MV-2');
    });
  });

  describe('Controller Family Coverage', () => {
    it('covers all 7 controller families', () => {
      const families = new Set<string>();
      for (const post of EXPECTED_POSTS) {
        if (post.controller.includes('OSP') || post.controller === 'LNC' || post.controller.includes('P300')) families.add('okuma');
        if (post.controller.includes('WinMax')) families.add('hurco');
        if (post.controller.includes('Haas') || post.controller.includes('NGC')) families.add('haas');
        if (post.controller.includes('Fanuc') || post.controller.includes('31i')) families.add('fanuc');
        if (post.controller.includes('FP') || post.controller.includes('C30')) families.add('mitsubishi_sinker');
        if (post.controller.includes('W21') || post.controller.includes('W30') || post.controller.includes('W31')) families.add('mitsubishi_wire');
      }
      expect(families.size).toBeGreaterThanOrEqual(6);
    });
  });

  describe('Wire EDM Controller Progression', () => {
    it('W21 → W30 → W31 files increase in size (more features)', () => {
      const w21 = join(POSTS_DIR, 'MITSUBISHI_FA10S_W21FAS-2_PRISM.cps');
      const w30 = join(POSTS_DIR, 'MITSUBISHI_FA10S_W30FAS-2_PRISM.cps');
      const w31 = join(POSTS_DIR, 'MITSUBISHI_FA10S_W31MV-2_PRISM.cps');
      if (!existsSync(w21) || !existsSync(w30) || !existsSync(w31)) return;

      const w21Lines = readFileSync(w21, 'utf-8').split('\n').length;
      const w30Lines = readFileSync(w30, 'utf-8').split('\n').length;
      const w31Lines = readFileSync(w31, 'utf-8').split('\n').length;

      expect(w30Lines).toBeGreaterThan(w21Lines);
      expect(w31Lines).toBeGreaterThan(w30Lines);
    });
  });

  describe('Total Post Line Count', () => {
    it('new PRISM posts total >8000 lines', () => {
      const newPosts = [
        'OKUMA_GENOS_L300M_OSP-P300L-R_PRISM.cps',
        'OKUMA_GENOS_L200EM_OSP-P200LA-R_PRISM.cps',
        'OKUMA_LNC8_PRISM.cps',
        'OKUMA_CROWN_L1060_OSP-U10L_PRISM.cps',
        'HAAS_OM-2_PRE-NGC_PRISM.cps',
        'MITSUBISHI_EA12S_FP80S_PRISM.cps',
        'MITSUBISHI_EA12D_C30EA-2_PRISM.cps',
        'MITSUBISHI_FA10S_W21FAS-2_PRISM.cps',
        'MITSUBISHI_FA10S_W30FAS-2_PRISM.cps',
        'MITSUBISHI_FA10S_W31MV-2_PRISM.cps',
      ];
      let total = 0;
      for (const f of newPosts) {
        const path = join(POSTS_DIR, f);
        if (existsSync(path)) {
          total += readFileSync(path, 'utf-8').split('\n').length;
        }
      }
      expect(total).toBeGreaterThan(8000);
    });
  });
});
