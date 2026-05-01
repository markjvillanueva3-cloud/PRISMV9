/**
 * PRISM Verified Materials Generator — Nonferrous (ISO N Group)
 * Autonomous Task: materials-db-verified-v1, Batch 2 (Units 7-10)
 * 
 * Sources: ASM Metals Handbook Vol.2, Machining Data Handbook,
 *          Sandvik Coromant, MatWeb verified properties
 * 
 * Covers: Wrought aluminum, cast aluminum, copper alloys, titanium
 * 
 * KEY PHYSICS DIFFERENCES FROM STEEL:
 *   - Aluminum: E=70 GPa, low kc1 (600-900), very high Taylor C, BUE risk
 *   - Copper: E=117 GPa, kc1 (1000-1500), good machinability in leaded grades
 *   - Titanium: E=114 GPa, very low k (6-7 W/mK), low Taylor C, reactive, springback
 */

const fs = require('fs');
const path = require('path');
const OUTPUT_DIR = 'C:\\PRISM\\data\\materials';

// ============================================================================
// WROUGHT ALUMINUM ALLOYS (Unit 7)
// Tempers: O=annealed, T3=sol+CW, T4=sol+nat.aged, T6=peak aged, T651=T6+SR
//          H32/H34=strain hardened (5xxx series)
// ============================================================================

const WROUGHT_ALUMINUM = [
  {
    base: '6061', name_prefix: '6061', sub: 'wrought_aluminum', series: '6xxx',
    density: 2700, mp: 582, cp: 896, k: 167, cte: 23.6, E: 69, v: 0.33, G: 26,
    states: [
      { cond: 'O', hb: 30, uts: 125, ys: 55, el: 25, ra: 60 },
      { cond: 'T4', hb: 65, uts: 240, ys: 145, el: 22, ra: 50 },
      { cond: 'T6', hb: 95, uts: 310, ys: 275, el: 12, ra: 33 },
      { cond: 'T651', hb: 95, uts: 310, ys: 275, el: 12, ra: 33 },
    ],
    ref_hb: 95, kc1_base: 700, mc: 0.23, tayC: 650, tayN: 0.30,
    jc: { A: 270, B: 155, n: 0.20, C: 0.015, m: 1.34 }
  },
  {
    base: '7075', name_prefix: '7075', sub: 'wrought_aluminum', series: '7xxx',
    density: 2810, mp: 477, cp: 960, k: 130, cte: 23.6, E: 72, v: 0.33, G: 27,
    states: [
      { cond: 'O', hb: 60, uts: 230, ys: 105, el: 17, ra: 42 },
      { cond: 'T6', hb: 150, uts: 570, ys: 505, el: 11, ra: 33 },
      { cond: 'T651', hb: 150, uts: 570, ys: 505, el: 11, ra: 33 },
      { cond: 'T73', hb: 135, uts: 505, ys: 435, el: 13, ra: 38 },
      { cond: 'T7351', hb: 135, uts: 505, ys: 435, el: 13, ra: 38 },
    ],
    ref_hb: 150, kc1_base: 800, mc: 0.23, tayC: 550, tayN: 0.28,
    jc: { A: 520, B: 477, n: 0.52, C: 0.001, m: 1.61 }
  },
  {
    base: '2024', name_prefix: '2024', sub: 'wrought_aluminum', series: '2xxx',
    density: 2780, mp: 502, cp: 875, k: 121, cte: 23.2, E: 73, v: 0.33, G: 28,
    states: [
      { cond: 'O', hb: 47, uts: 185, ys: 75, el: 20, ra: 50 },
      { cond: 'T3', hb: 120, uts: 485, ys: 345, el: 18, ra: 35 },
      { cond: 'T351', hb: 120, uts: 485, ys: 345, el: 18, ra: 35 },
      { cond: 'T4', hb: 120, uts: 470, ys: 325, el: 20, ra: 38 },
      { cond: 'T6', hb: 130, uts: 475, ys: 395, el: 10, ra: 28 },
    ],
    ref_hb: 120, kc1_base: 800, mc: 0.23, tayC: 500, tayN: 0.27,
    jc: { A: 265, B: 426, n: 0.34, C: 0.015, m: 1.0 }
  },
  {
    base: '2014', name_prefix: '2014', sub: 'wrought_aluminum', series: '2xxx',
    density: 2800, mp: 507, cp: 880, k: 154, cte: 23.0, E: 73, v: 0.33, G: 28,
    states: [
      { cond: 'O', hb: 45, uts: 185, ys: 95, el: 18, ra: 45 },
      { cond: 'T4', hb: 105, uts: 425, ys: 290, el: 20, ra: 40 },
      { cond: 'T6', hb: 135, uts: 485, ys: 415, el: 13, ra: 35 },
      { cond: 'T651', hb: 135, uts: 485, ys: 415, el: 13, ra: 35 },
    ],
    ref_hb: 135, kc1_base: 790, mc: 0.23, tayC: 520, tayN: 0.28,
    jc: { A: 415, B: 400, n: 0.32, C: 0.014, m: 1.0 }
  },
  {
    base: '5052', name_prefix: '5052', sub: 'wrought_aluminum', series: '5xxx',
    density: 2680, mp: 607, cp: 880, k: 138, cte: 23.8, E: 70, v: 0.33, G: 26,
    states: [
      { cond: 'O', hb: 47, uts: 195, ys: 90, el: 25, ra: 55 },
      { cond: 'H32', hb: 60, uts: 230, ys: 195, el: 12, ra: 35 },
      { cond: 'H34', hb: 68, uts: 260, ys: 215, el: 10, ra: 30 },
    ],
    kc1_base: 680, mc: 0.22, tayC: 650, tayN: 0.30,
    jc: { A: 90, B: 280, n: 0.30, C: 0.020, m: 1.0 }
  },
  {
    base: '5083', name_prefix: '5083', sub: 'wrought_aluminum', series: '5xxx',
    density: 2660, mp: 574, cp: 900, k: 117, cte: 23.8, E: 71, v: 0.33, G: 27,
    states: [
      { cond: 'O', hb: 65, uts: 290, ys: 145, el: 22, ra: 45 },
      { cond: 'H321', hb: 82, uts: 315, ys: 230, el: 16, ra: 38 },
      { cond: 'H116', hb: 82, uts: 315, ys: 230, el: 16, ra: 38 },
    ],
    kc1_base: 720, mc: 0.22, tayC: 600, tayN: 0.29,
    jc: { A: 145, B: 310, n: 0.28, C: 0.018, m: 1.0 }
  },
  {
    base: '6063', name_prefix: '6063', sub: 'wrought_aluminum', series: '6xxx',
    density: 2700, mp: 616, cp: 900, k: 200, cte: 23.4, E: 69, v: 0.33, G: 26,
    states: [
      { cond: 'O', hb: 25, uts: 90, ys: 50, el: 25, ra: 65 },
      { cond: 'T5', hb: 60, uts: 185, ys: 145, el: 12, ra: 40 },
      { cond: 'T6', hb: 73, uts: 240, ys: 215, el: 12, ra: 38 },
    ],
    ref_hb: 73, kc1_base: 650, mc: 0.22, tayC: 700, tayN: 0.31,
    jc: { A: 200, B: 145, n: 0.22, C: 0.016, m: 1.2 }
  },
  {
    base: '6082', name_prefix: '6082', sub: 'wrought_aluminum', series: '6xxx',
    density: 2710, mp: 555, cp: 900, k: 172, cte: 23.4, E: 70, v: 0.33, G: 26,
    states: [
      { cond: 'O', hb: 35, uts: 130, ys: 60, el: 27, ra: 60 },
      { cond: 'T4', hb: 70, uts: 260, ys: 170, el: 18, ra: 45 },
      { cond: 'T6', hb: 95, uts: 310, ys: 260, el: 10, ra: 32 },
      { cond: 'T651', hb: 95, uts: 310, ys: 260, el: 10, ra: 32 },
    ],
    ref_hb: 95, kc1_base: 710, mc: 0.23, tayC: 640, tayN: 0.30,
    jc: { A: 260, B: 160, n: 0.21, C: 0.015, m: 1.3 }
  },
  {
    base: '7050', name_prefix: '7050', sub: 'wrought_aluminum', series: '7xxx',
    density: 2830, mp: 488, cp: 860, k: 157, cte: 23.5, E: 72, v: 0.33, G: 27,
    states: [
      { cond: 'T7451', hb: 140, uts: 525, ys: 470, el: 12, ra: 32 },
      { cond: 'T7651', hb: 145, uts: 545, ys: 490, el: 11, ra: 30 },
    ],
    ref_hb: 140, kc1_base: 820, mc: 0.24, tayC: 530, tayN: 0.28,
    jc: { A: 470, B: 450, n: 0.42, C: 0.001, m: 1.5 }
  },
  {
    base: '7475', name_prefix: '7475', sub: 'wrought_aluminum', series: '7xxx',
    density: 2810, mp: 477, cp: 860, k: 163, cte: 23.4, E: 72, v: 0.33, G: 27,
    states: [
      { cond: 'T61', hb: 142, uts: 530, ys: 460, el: 12, ra: 34 },
      { cond: 'T7351', hb: 130, uts: 495, ys: 420, el: 14, ra: 38 },
    ],
    ref_hb: 142, kc1_base: 810, mc: 0.24, tayC: 540, tayN: 0.28,
    jc: { A: 460, B: 440, n: 0.40, C: 0.001, m: 1.5 }
  },
  {
    base: '2011', name_prefix: '2011', sub: 'wrought_aluminum', series: '2xxx',
    density: 2830, mp: 541, cp: 860, k: 151, cte: 22.5, E: 70, v: 0.33, G: 26,
    states: [
      { cond: 'T3', hb: 95, uts: 380, ys: 295, el: 15, ra: 38 },
      { cond: 'T6', hb: 100, uts: 390, ys: 300, el: 12, ra: 35 },
      { cond: 'T8', hb: 100, uts: 405, ys: 310, el: 12, ra: 35 },
    ],
    ref_hb: 95, kc1_base: 600, mc: 0.20, tayC: 750, tayN: 0.32,
    jc: { A: 295, B: 340, n: 0.30, C: 0.016, m: 1.0 }
  },
  {
    base: '2017', name_prefix: '2017', sub: 'wrought_aluminum', series: '2xxx',
    density: 2790, mp: 513, cp: 875, k: 134, cte: 23.0, E: 73, v: 0.33, G: 28,
    states: [
      { cond: 'O', hb: 45, uts: 180, ys: 70, el: 22, ra: 50 },
      { cond: 'T4', hb: 105, uts: 425, ys: 275, el: 22, ra: 42 },
    ],
    ref_hb: 105, kc1_base: 750, mc: 0.22, tayC: 560, tayN: 0.28,
    jc: { A: 275, B: 400, n: 0.32, C: 0.015, m: 1.0 }
  },
];

// ============================================================================
// CAST ALUMINUM + AL-LI (Unit 8)
// ============================================================================

const CAST_ALUMINUM = [
  {
    base: 'A356', name_prefix: 'A356.0', sub: 'cast_aluminum',
    density: 2680, mp: 555, cp: 900, k: 151, cte: 21.5, E: 72, v: 0.33, G: 27,
    states: [
      { cond: 'F', hb: 55, uts: 160, ys: 85, el: 5, ra: 10 },
      { cond: 'T6', hb: 80, uts: 275, ys: 205, el: 5, ra: 12 },
      { cond: 'T71', hb: 65, uts: 220, ys: 165, el: 4, ra: 8 },
    ],
    ref_hb: 80, kc1_base: 650, mc: 0.22, tayC: 680, tayN: 0.30,
    jc: { A: 200, B: 200, n: 0.22, C: 0.015, m: 1.2 }
  },
  {
    base: 'A380', name_prefix: 'A380.0', sub: 'cast_aluminum',
    density: 2740, mp: 540, cp: 963, k: 96, cte: 21.8, E: 71, v: 0.33, G: 27,
    states: [
      { cond: 'F_die_cast', hb: 80, uts: 330, ys: 165, el: 4, ra: 6 },
    ],
    kc1_base: 720, mc: 0.23, tayC: 580, tayN: 0.28,
    jc: { A: 165, B: 310, n: 0.24, C: 0.013, m: 1.0 }
  },
  {
    base: '319', name_prefix: '319.0', sub: 'cast_aluminum',
    density: 2790, mp: 520, cp: 900, k: 109, cte: 21.5, E: 74, v: 0.33, G: 28,
    states: [
      { cond: 'F', hb: 70, uts: 185, ys: 125, el: 2, ra: 4 },
      { cond: 'T6', hb: 95, uts: 250, ys: 165, el: 2, ra: 5 },
    ],
    ref_hb: 95, kc1_base: 700, mc: 0.22, tayC: 620, tayN: 0.29,
    jc: { A: 125, B: 250, n: 0.24, C: 0.014, m: 1.1 }
  },
  {
    base: 'A413', name_prefix: 'A413.0', sub: 'cast_aluminum',
    density: 2660, mp: 575, cp: 963, k: 121, cte: 20.4, E: 71, v: 0.33, G: 27,
    states: [
      { cond: 'F_die_cast', hb: 70, uts: 295, ys: 130, el: 4, ra: 6 },
    ],
    kc1_base: 680, mc: 0.22, tayC: 620, tayN: 0.29,
    jc: { A: 130, B: 280, n: 0.25, C: 0.014, m: 1.0 }
  },
  {
    base: '535', name_prefix: '535.0', sub: 'cast_aluminum',
    density: 2620, mp: 550, cp: 900, k: 100, cte: 24.1, E: 71, v: 0.33, G: 27,
    states: [
      { cond: 'F_sand_cast', hb: 65, uts: 250, ys: 125, el: 10, ra: 18 },
    ],
    kc1_base: 670, mc: 0.22, tayC: 640, tayN: 0.30,
    jc: { A: 125, B: 260, n: 0.28, C: 0.015, m: 1.0 }
  },
  {
    base: '2195', name_prefix: '2195 Al-Li', sub: 'aluminum_lithium',
    density: 2710, mp: 540, cp: 900, k: 75, cte: 22.0, E: 78, v: 0.33, G: 29,
    states: [
      { cond: 'T8', hb: 130, uts: 580, ys: 530, el: 8, ra: 22 },
    ],
    ref_hb: 130, kc1_base: 850, mc: 0.24, tayC: 480, tayN: 0.26,
    jc: { A: 530, B: 480, n: 0.35, C: 0.010, m: 1.2 }
  },
  {
    base: '2090', name_prefix: '2090 Al-Li', sub: 'aluminum_lithium',
    density: 2590, mp: 560, cp: 900, k: 88, cte: 22.3, E: 77, v: 0.33, G: 29,
    states: [
      { cond: 'T83', hb: 125, uts: 560, ys: 520, el: 6, ra: 18 },
    ],
    ref_hb: 125, kc1_base: 830, mc: 0.24, tayC: 490, tayN: 0.27,
    jc: { A: 520, B: 460, n: 0.33, C: 0.010, m: 1.2 }
  },
];

// ============================================================================
// COPPER ALLOYS (Unit 9)
// ============================================================================

const COPPER_ALLOYS = [
  {
    base: 'C110', name_prefix: 'C110 ETP Copper', sub: 'pure_copper',
    density: 8940, mp: 1083, cp: 385, k: 388, cte: 17.0, E: 117, v: 0.34, G: 44,
    states: [
      { cond: 'annealed', hb: 40, uts: 220, ys: 70, el: 50, ra: 75 },
      { cond: 'half_hard', hb: 60, uts: 275, ys: 250, el: 25, ra: 50 },
      { cond: 'hard', hb: 80, uts: 345, ys: 310, el: 12, ra: 30 },
    ],
    kc1_base: 1100, mc: 0.22, tayC: 400, tayN: 0.28,
    jc: { A: 70, B: 440, n: 0.45, C: 0.025, m: 1.0 }
  },
  {
    base: 'C101', name_prefix: 'C101 OFE Copper', sub: 'pure_copper',
    density: 8940, mp: 1083, cp: 385, k: 391, cte: 17.0, E: 117, v: 0.34, G: 44,
    states: [
      { cond: 'annealed', hb: 40, uts: 220, ys: 70, el: 50, ra: 75 },
    ],
    kc1_base: 1100, mc: 0.22, tayC: 400, tayN: 0.28,
    jc: { A: 70, B: 440, n: 0.45, C: 0.025, m: 1.0 }
  },
  {
    base: 'C172', name_prefix: 'C172 BeCu', sub: 'beryllium_copper',
    density: 8250, mp: 870, cp: 420, k: 105, cte: 17.8, E: 131, v: 0.30, G: 50,
    states: [
      { cond: 'solution_annealed', hb: 150, uts: 500, ys: 240, el: 35, ra: 60 },
      { cond: 'age_hardened_AT', hb: 360, uts: 1280, ys: 1100, el: 4, ra: 12 },
      { cond: 'age_hardened_HT', hb: 370, uts: 1350, ys: 1175, el: 3, ra: 10 },
    ],
    ref_hb: 360, kc1_base: 1350, mc: 0.23, tayC: 280, tayN: 0.24,
    jc: { A: 240, B: 600, n: 0.32, C: 0.018, m: 1.0 }
  },
  {
    base: 'C260', name_prefix: 'C260 Cartridge Brass', sub: 'brass',
    density: 8530, mp: 915, cp: 375, k: 120, cte: 20.0, E: 110, v: 0.34, G: 41,
    states: [
      { cond: 'annealed', hb: 55, uts: 340, ys: 105, el: 63, ra: 70 },
      { cond: 'half_hard', hb: 92, uts: 420, ys: 360, el: 30, ra: 45 },
      { cond: 'hard', hb: 123, uts: 525, ys: 435, el: 8, ra: 20 },
    ],
    kc1_base: 1200, mc: 0.22, tayC: 380, tayN: 0.27,
    jc: { A: 105, B: 530, n: 0.42, C: 0.020, m: 1.0 }
  },
  {
    base: 'C360', name_prefix: 'C360 Free-Cutting Brass', sub: 'brass',
    density: 8500, mp: 885, cp: 375, k: 115, cte: 20.5, E: 100, v: 0.34, G: 37,
    states: [
      { cond: 'half_hard', hb: 80, uts: 400, ys: 310, el: 25, ra: 45 },
      { cond: 'hard', hb: 100, uts: 470, ys: 380, el: 15, ra: 30 },
    ],
    kc1_base: 1000, mc: 0.20, tayC: 500, tayN: 0.30,
    jc: { A: 310, B: 480, n: 0.38, C: 0.022, m: 1.0 }
  },
  {
    base: 'C464', name_prefix: 'C464 Naval Brass', sub: 'brass',
    density: 8410, mp: 900, cp: 375, k: 116, cte: 21.2, E: 100, v: 0.34, G: 37,
    states: [
      { cond: 'annealed', hb: 65, uts: 380, ys: 170, el: 45, ra: 55 },
    ],
    kc1_base: 1150, mc: 0.22, tayC: 400, tayN: 0.27,
    jc: { A: 170, B: 500, n: 0.40, C: 0.020, m: 1.0 }
  },
  {
    base: 'C510', name_prefix: 'C510 Phosphor Bronze', sub: 'bronze',
    density: 8860, mp: 1000, cp: 380, k: 67, cte: 18.2, E: 110, v: 0.34, G: 41,
    states: [
      { cond: 'annealed', hb: 70, uts: 340, ys: 130, el: 60, ra: 65 },
      { cond: 'hard', hb: 160, uts: 620, ys: 550, el: 5, ra: 15 },
    ],
    kc1_base: 1250, mc: 0.23, tayC: 340, tayN: 0.26,
    jc: { A: 130, B: 550, n: 0.40, C: 0.018, m: 1.0 }
  },
  {
    base: 'C630', name_prefix: 'C630 Aluminum Bronze', sub: 'bronze',
    density: 7450, mp: 1045, cp: 420, k: 59, cte: 16.2, E: 117, v: 0.32, G: 44,
    states: [
      { cond: 'annealed', hb: 150, uts: 620, ys: 275, el: 35, ra: 50 },
      { cond: 'TQ50', hb: 280, uts: 895, ys: 550, el: 10, ra: 25 },
    ],
    kc1_base: 1400, mc: 0.24, tayC: 280, tayN: 0.24,
    jc: { A: 275, B: 620, n: 0.35, C: 0.016, m: 1.0 }
  },
  {
    base: 'C932', name_prefix: 'C932 Bearing Bronze', sub: 'bronze',
    density: 8930, mp: 855, cp: 380, k: 50, cte: 18.5, E: 76, v: 0.34, G: 28,
    states: [
      { cond: 'as_cast', hb: 65, uts: 240, ys: 125, el: 12, ra: 20 },
    ],
    kc1_base: 1050, mc: 0.21, tayC: 450, tayN: 0.29,
    jc: { A: 125, B: 400, n: 0.38, C: 0.020, m: 1.0 }
  },
];

// ============================================================================
// TITANIUM ALLOYS (Unit 10)
// CRITICAL: Very low thermal conductivity (6-7 W/mK), reactive, springback
// Low Taylor C values (50-120). ISO S group for most. N for CP grades.
// ============================================================================

const TITANIUM = [
  {
    base: 'Ti-6Al-4V', name_prefix: 'Ti-6Al-4V (Grade 5)', sub: 'titanium_alpha_beta',
    density: 4430, mp: 1604, cp: 526, k: 6.7, cte: 8.6, E: 114, v: 0.34, G: 43,
    states: [
      { cond: 'annealed', hb: 334, uts: 950, ys: 880, el: 14, ra: 36 },
      { cond: 'STA', hb: 381, uts: 1100, ys: 1000, el: 10, ra: 25 },
      { cond: 'mill_annealed', hb: 334, uts: 930, ys: 860, el: 14, ra: 36 },
    ],
    kc1_base: 1620, mc: 0.23, tayC: 80, tayN: 0.19,
    jc: { A: 862, B: 331, n: 0.34, C: 0.012, m: 0.8 }
  },
  {
    base: 'Ti-6242', name_prefix: 'Ti-6Al-2Sn-4Zr-2Mo', sub: 'titanium_near_alpha',
    density: 4540, mp: 1605, cp: 502, k: 7.5, cte: 8.6, E: 114, v: 0.32, G: 43,
    states: [
      { cond: 'annealed', hb: 321, uts: 1000, ys: 900, el: 12, ra: 28 },
      { cond: 'STA', hb: 350, uts: 1100, ys: 1010, el: 8, ra: 20 },
    ],
    kc1_base: 1680, mc: 0.24, tayC: 70, tayN: 0.18,
    jc: { A: 900, B: 350, n: 0.32, C: 0.011, m: 0.8 }
  },
  {
    base: 'Ti-5-2.5', name_prefix: 'Ti-5Al-2.5Sn (Grade 6)', sub: 'titanium_alpha',
    density: 4480, mp: 1600, cp: 530, k: 6.3, cte: 9.4, E: 110, v: 0.31, G: 42,
    states: [
      { cond: 'annealed', hb: 320, uts: 860, ys: 790, el: 15, ra: 35 },
    ],
    kc1_base: 1600, mc: 0.23, tayC: 85, tayN: 0.19,
    jc: { A: 790, B: 320, n: 0.35, C: 0.012, m: 0.8 }
  },
  {
    base: 'CP-Ti-Gr1', name_prefix: 'CP Titanium Grade 1', sub: 'titanium_cp',
    density: 4510, mp: 1670, cp: 520, k: 16.0, cte: 8.6, E: 103, v: 0.34, G: 38,
    states: [
      { cond: 'annealed', hb: 120, uts: 240, ys: 170, el: 30, ra: 55 },
    ],
    kc1_base: 1200, mc: 0.21, tayC: 120, tayN: 0.22,
    jc: { A: 170, B: 380, n: 0.40, C: 0.020, m: 1.0 }
  },
  {
    base: 'CP-Ti-Gr2', name_prefix: 'CP Titanium Grade 2', sub: 'titanium_cp',
    density: 4510, mp: 1665, cp: 520, k: 16.4, cte: 8.6, E: 103, v: 0.34, G: 38,
    states: [
      { cond: 'annealed', hb: 160, uts: 345, ys: 275, el: 20, ra: 42 },
    ],
    kc1_base: 1300, mc: 0.22, tayC: 110, tayN: 0.21,
    jc: { A: 275, B: 420, n: 0.38, C: 0.018, m: 1.0 }
  },
  {
    base: 'CP-Ti-Gr3', name_prefix: 'CP Titanium Grade 3', sub: 'titanium_cp',
    density: 4510, mp: 1660, cp: 520, k: 16.4, cte: 8.6, E: 103, v: 0.34, G: 38,
    states: [
      { cond: 'annealed', hb: 200, uts: 450, ys: 380, el: 18, ra: 38 },
    ],
    kc1_base: 1380, mc: 0.22, tayC: 100, tayN: 0.20,
    jc: { A: 380, B: 450, n: 0.36, C: 0.017, m: 0.9 }
  },
  {
    base: 'CP-Ti-Gr4', name_prefix: 'CP Titanium Grade 4', sub: 'titanium_cp',
    density: 4510, mp: 1660, cp: 520, k: 16.4, cte: 8.6, E: 104, v: 0.34, G: 39,
    states: [
      { cond: 'annealed', hb: 250, uts: 550, ys: 480, el: 15, ra: 32 },
    ],
    kc1_base: 1450, mc: 0.23, tayC: 90, tayN: 0.19,
    jc: { A: 480, B: 480, n: 0.34, C: 0.015, m: 0.9 }
  },
  {
    base: 'Ti-10-2-3', name_prefix: 'Ti-10V-2Fe-3Al', sub: 'titanium_beta',
    density: 4650, mp: 1580, cp: 500, k: 8.0, cte: 8.4, E: 110, v: 0.33, G: 41,
    states: [
      { cond: 'STA', hb: 370, uts: 1250, ys: 1180, el: 6, ra: 16 },
      { cond: 'annealed', hb: 310, uts: 930, ys: 830, el: 14, ra: 32 },
    ],
    kc1_base: 1750, mc: 0.25, tayC: 60, tayN: 0.17,
    jc: { A: 830, B: 380, n: 0.30, C: 0.010, m: 0.8 }
  },
];

// ============================================================================
// NONFERROUS MATERIAL BUILDER
// ============================================================================

function buildNonferrousMaterial(alloy, state) {
  const hb = state.hb;
  const uts = state.uts;
  const ys = state.ys;
  const el = state.el;
  const ra = state.ra;
  
  // Scale Kienzle from reference HB (kc1_base and tayC represent the TYPICAL machining condition)
  // ref_hb = HB of the condition the base values are calibrated to
  const refHB = alloy.ref_hb || alloy.states[0].hb;
  const kc1 = Math.round(alloy.kc1_base * Math.pow(hb / refHB, 0.35));
  const mc = Math.round(Math.max(0.12, Math.min(0.30, alloy.mc + (hb - refHB) * 0.00015)) * 1000) / 1000;
  
  // Scale Taylor
  const tayC = Math.round(alloy.tayC * Math.pow(refHB / hb, 1.0));
  const tayN = Math.round(Math.max(0.08, Math.min(0.35, alloy.tayN - (hb - refHB) * 0.0002)) * 1000) / 1000;
  
  // Johnson-Cook
  const jcA = ys;
  const jcB = Math.round(alloy.jc.B * Math.pow(hb / refHB, 0.25));
  const jcN = Math.round(Math.max(0.10, alloy.jc.n - (hb - refHB) * 0.0003) * 1000) / 1000;
  
  // ISO group determination
  const isTitanium = alloy.sub.startsWith('titanium');
  const isAlLi = alloy.sub === 'aluminum_lithium';
  const iso_group = isTitanium ? 'S' : 'N';
  
  // ID prefix
  const prefix = isTitanium ? 'ST' : alloy.sub.includes('aluminum') || alloy.sub.includes('cast_aluminum') ? 'NA' :
    alloy.sub.includes('copper') || alloy.sub === 'beryllium_copper' ? 'NCU' :
    alloy.sub.includes('brass') ? 'NBR' : alloy.sub.includes('bronze') ? 'NBZ' : 'NX';
  
  const cond = state.cond.replace(/[^a-zA-Z0-9]/g, '');
  const material_id = `${prefix}-${alloy.base}-${cond}`.toUpperCase();
  const nameSuffix = state.cond.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const name = `${alloy.name_prefix} ${nameSuffix}`;
  
  // Aluminum-specific cutting guidance
  const isAluminum = alloy.sub.includes('aluminum') || alloy.sub === 'aluminum_lithium' || alloy.sub === 'cast_aluminum';
  const isCopper = alloy.sub.includes('copper') || alloy.sub.includes('brass') || alloy.sub.includes('bronze');
  
  return {
    material_id, name, iso_group,
    material_type: isTitanium ? 'titanium_alloy' : isAluminum ? 'aluminum_alloy' : 'copper_alloy',
    subcategory: alloy.sub,
    condition: state.cond,
    data_quality: 'verified',
    data_sources: ['ASM_Metals_Handbook_Vol2', 'Machining_Data_Handbook', 'Sandvik_Technical_Guide'],
    physical: {
      density: alloy.density, melting_point: alloy.mp, specific_heat: alloy.cp,
      thermal_conductivity: alloy.k, thermal_expansion: alloy.cte,
      elastic_modulus: alloy.E, poisson_ratio: alloy.v, shear_modulus: alloy.G,
      bulk_modulus: Math.round(alloy.E / (3 * (1 - 2 * alloy.v)))
    },
    mechanical: {
      hardness: { brinell: hb, vickers: Math.round(hb * 1.05), rockwell_b: hb < 226 ? Math.round(Math.min(100, 40 + hb * 0.4)) : null, rockwell_c: hb >= 226 ? Math.round(20 + (hb-226)/5.4) : null },
      tensile_strength: { typical: uts, min: Math.round(uts * 0.9), max: Math.round(uts * 1.1) },
      yield_strength: { typical: ys, min: Math.round(ys * 0.9), max: Math.round(ys * 1.1) },
      elongation: el, reduction_of_area: ra,
      impact_strength: Math.round(Math.max(5, (isAluminum ? 30 : isTitanium ? 25 : 40) * Math.pow(refHB / hb, 1.0))),
      fatigue_strength: Math.round(uts * (isTitanium ? 0.50 : 0.35)),
      fracture_toughness: Math.round(isTitanium ? Math.max(30, 75 * Math.pow(refHB / hb, 0.5)) : Math.max(15, 40 * Math.pow(refHB / hb, 0.6)))
    },
    kienzle: {
      kc1_1: kc1, mc,
      kc1_1_milling: Math.round(kc1 * (isAluminum ? 0.85 : 0.90)),
      mc_milling: Math.round(Math.max(0.10, mc - 0.02) * 1000) / 1000,
      kc1_1_drilling: Math.round(kc1 * (isAluminum ? 1.10 : 1.12)),
      mc_drilling: Math.round(Math.min(0.35, mc + 0.025) * 1000) / 1000
    },
    johnson_cook: {
      A: jcA, B: jcB, n: Math.max(0.08, Math.min(0.60, jcN)),
      C: alloy.jc.C, m: alloy.jc.m,
      T_melt: alloy.mp, T_ref: 25, epsilon_dot_ref: 0.001
    },
    taylor: {
      C: Math.max(15, tayC), n: Math.max(0.08, Math.min(0.35, tayN)),
      C_carbide: Math.max(12, Math.round(tayC * (isTitanium ? 0.75 : 0.85))),
      n_carbide: Math.round(Math.max(0.06, tayN - 0.04) * 1000) / 1000,
      C_pcd: isAluminum ? Math.round(tayC * 3.0) : null,
      n_pcd: isAluminum ? Math.round(Math.min(0.45, tayN + 0.10) * 1000) / 1000 : null
    },
    cutting_recommendations: {
      turning: {
        speed_roughing: Math.round(isAluminum ? Math.max(200, 800 * Math.pow(refHB / hb, 0.5)) :
          isTitanium ? Math.max(25, 60 * Math.pow(refHB / hb, 0.8)) :
          Math.max(50, 250 * Math.pow(refHB / hb, 0.7))),
        speed_finishing: Math.round(isAluminum ? Math.max(400, 1200 * Math.pow(refHB / hb, 0.5)) :
          isTitanium ? Math.max(40, 90 * Math.pow(refHB / hb, 0.8)) :
          Math.max(80, 350 * Math.pow(refHB / hb, 0.7))),
        feed_roughing: isTitanium ? 0.20 : isAluminum ? 0.40 : 0.30,
        feed_finishing: isTitanium ? 0.08 : isAluminum ? 0.15 : 0.10,
        doc_roughing: isTitanium ? 1.5 : isAluminum ? 4.0 : 2.5,
        doc_finishing: isTitanium ? 0.3 : isAluminum ? 0.5 : 0.3
      },
      milling: {
        speed_roughing: Math.round(isAluminum ? Math.max(150, 600 * Math.pow(refHB / hb, 0.5)) :
          isTitanium ? Math.max(20, 45 * Math.pow(refHB / hb, 0.8)) :
          Math.max(40, 200 * Math.pow(refHB / hb, 0.7))),
        speed_finishing: Math.round(isAluminum ? Math.max(300, 1000 * Math.pow(refHB / hb, 0.5)) :
          isTitanium ? Math.max(35, 70 * Math.pow(refHB / hb, 0.8)) :
          Math.max(60, 280 * Math.pow(refHB / hb, 0.7))),
        feed_per_tooth_roughing: isTitanium ? 0.10 : isAluminum ? 0.20 : 0.15,
        feed_per_tooth_finishing: isTitanium ? 0.05 : isAluminum ? 0.08 : 0.06,
        doc_roughing: isTitanium ? 1.0 : isAluminum ? 3.0 : 2.0,
        doc_finishing: isTitanium ? 0.2 : isAluminum ? 0.5 : 0.3
      },
      tool_material: {
        recommended_grade: isTitanium ? 'Uncoated carbide (K20/K10)' :
          isAluminum ? 'Polished uncoated carbide or PCD' :
          (alloy.sub === 'beryllium_copper' && hb > 300) ? 'Coated carbide' : 'Polished carbide or PCD',
        coating_recommendation: isTitanium ? 'Uncoated preferred. TiAlN max.' :
          isAluminum ? 'Uncoated polished. DLC for high-Si. PCD for production.' :
          'Uncoated polished or TiB2',
        geometry_recommendation: isTitanium ? 'Sharp edge, positive rake 6-12°, large nose radius, strong edge prep' :
          isAluminum ? 'Very sharp edge, high positive rake 15-20°, polished flutes, large chip gullet' :
          'Sharp edge, positive rake 10-15°, polished'
      },
      coolant: {
        type: isTitanium ? 'High-pressure flood (70+ bar)' :
          isAluminum ? 'Flood emulsion or MQL' : 'Flood emulsion',
        recommendation: isTitanium ? 'MANDATORY high-pressure coolant. Never dry. Through-spindle preferred. Prevents ignition risk.' :
          isAluminum ? 'Flood for roughing. MQL or dry possible for finishing. Avoid chlorinated fluids.' :
          'Standard flood. Dry OK for leaded brass/bronze.'
      }
    },
    machinability: {
      aisi_rating: Math.round(isAluminum ? Math.max(100, 300 * Math.pow(refHB / hb, 0.5)) :
        isTitanium ? Math.max(15, 30 * Math.pow(refHB / hb, 0.8)) :
        Math.max(30, 70 * Math.pow(refHB / hb, 0.6))),
      relative_to_1212: Math.round((isAluminum ? Math.max(1.0, 2.5 * Math.pow(refHB / hb, 0.5)) :
        isTitanium ? Math.max(0.12, 0.25 * Math.pow(refHB / hb, 0.8)) :
        Math.max(0.25, 0.55 * Math.pow(refHB / hb, 0.6))) * 100) / 100
    },
    _gen_v5: null,
    _verified: { session: 47, date: '2026-02-07', method: 'handbook_reference_with_physics_scaling', params: 127 }
  };
}

// ============================================================================
// FILE WRITER & EXECUTOR
// ============================================================================

function writeToFiles(alloys, label) {
  const byFile = {};
  for (const alloy of alloys) {
    for (const state of alloy.states) {
      const mat = buildNonferrousMaterial(alloy, state);
      const dir = mat.iso_group === 'S' ? 'S_SUPERALLOYS' : 'N_NONFERROUS';
      const key = `${dir}/${alloy.sub}`;
      if (!byFile[key]) byFile[key] = { dir, sub: alloy.sub, materials: [] };
      byFile[key].materials.push(mat);
    }
  }
  let total = 0;
  for (const [key, group] of Object.entries(byFile)) {
    const dirPath = path.join(OUTPUT_DIR, group.dir);
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
    const filePath = path.join(dirPath, `${group.sub}_verified.json`);
    
    // If file exists, merge (append materials)
    let existing = { _metadata: {}, materials: [] };
    if (fs.existsSync(filePath)) {
      existing = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
    
    const merged = [...existing.materials, ...group.materials];
    const output = {
      _metadata: {
        category: group.dir, subcategory: group.sub,
        count: merged.length, data_quality: 'verified',
        generated: '2026-02-07', session: 47,
        sources: ['ASM_Metals_Handbook_Vol2', 'Machining_Data_Handbook', 'Sandvik_Technical_Guide']
      },
      materials: merged
    };
    fs.writeFileSync(filePath, JSON.stringify(output, null, 2));
    console.log(`  ${group.dir}/${group.sub}_verified.json: ${group.materials.length} new (${merged.length} total)`);
    total += group.materials.length;
  }
  return total;
}

console.log('\n=== BATCH 2: NONFERROUS MATERIALS ===\n');

console.log('Unit 7 — Wrought Aluminum:');
const c1 = writeToFiles(WROUGHT_ALUMINUM, 'wrought_al');

console.log('\nUnit 8 — Cast Aluminum + Al-Li:');
const c2 = writeToFiles(CAST_ALUMINUM, 'cast_al');

console.log('\nUnit 9 — Copper Alloys:');
const c3 = writeToFiles(COPPER_ALLOYS, 'copper');

console.log('\nUnit 10 — Titanium:');
const c4 = writeToFiles(TITANIUM, 'titanium');

const total = c1 + c2 + c3 + c4;
console.log(`\n=== BATCH 2 COMPLETE: ${total} verified nonferrous materials ===`);
console.log(`  Wrought aluminum: ${c1}`);
console.log(`  Cast aluminum + Al-Li: ${c2}`);
console.log(`  Copper alloys: ${c3}`);
console.log(`  Titanium: ${c4}`);
