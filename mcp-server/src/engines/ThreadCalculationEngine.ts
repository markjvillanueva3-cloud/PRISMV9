/**
 * PRISM MCP Server - Thread Calculation Engine
 * Session 7.1: Complete Thread Calculations
 * 
 * SAFETY CRITICAL: Wrong thread calculations = assembly failures
 * 
 * Capabilities:
 * - Parse any thread designation (M10x1.5, 1/4-20 UNC, 1/2-14 NPT, etc.)
 * - Calculate tap drill for any engagement %
 * - Thread milling parameters
 * - Stripping strength analysis
 * - Go/No-Go gauge dimensions
 * - G-code generation for tapping and thread milling
 */

import { log } from '../utils/Logger.js';
import { 
  ISO_METRIC_COARSE, ISO_METRIC_FINE, ALL_ISO_METRIC, 
  findISOMetricThread, ISOMetricThread 
} from '../data/threadDataISO.js';
import { 
  UNC_THREADS, UNF_THREADS, UNEF_THREADS, ALL_UNIFIED,
  findUnifiedThread, UnifiedThread 
} from '../data/threadDataUnified.js';
import { 
  NPT_THREADS, NPTF_THREADS, BSP_THREADS, BSPT_THREADS,
  ALL_PIPE_THREADS, findPipeThread, PipeThread 
} from '../data/threadDataPipe.js';
import { 
  ACME_THREADS, TRAPEZOIDAL_THREADS, 
  findACMEThread, findTrapezoidalThread,
  ACMEThread, TrapezoidalThread 
} from '../data/threadDataAcme.js';

// ============================================================================
// TYPES
// ============================================================================

export type ThreadType = 'ISO' | 'UNC' | 'UNF' | 'UNEF' | 'NPT' | 'NPTF' | 'BSP' | 'BSPT' | 'ACME' | 'TRAPEZOIDAL' | 'UNKNOWN';

export interface ThreadSpec {
  designation: string;
  type: ThreadType;
  nominalDiameter: number;  // mm
  pitch: number;            // mm
  majorDiameter: number;    // mm
  pitchDiameter: number;    // mm
  minorDiameter: number;    // mm
  tpi?: number;             // threads per inch (imperial)
  threadAngle: number;      // degrees (60 for ISO/Unified, 55 for Whitworth, 29 for ACME)
  isTapered: boolean;
  taperPerInch?: number;
  originalData: ISOMetricThread | UnifiedThread | PipeThread | ACMEThread | TrapezoidalThread | null;
}

export interface TapDrillResult {
  threadDesignation: string;
  engagementPercent: number;
  tapDrillMM: number;
  tapDrillInch: number;
  tapDrillFractional: string;
  tapDrillLetter: string | null;
  tapDrillNumber: string | null;
  minorDiameter: number;
  theoreticalMinor: number;
  warnings: string[];
}

export interface ThreadMillResult {
  threadDesignation: string;
  toolDiameter: number;
  rpm: number;
  feedRate: number;       // mm/min
  radialDOC: number;      // mm
  axialDOC: number;       // mm (= pitch for single point)
  numberOfPasses: number;
  helixAngle: number;     // degrees
  cycleTime: number;      // seconds
  climbMilling: boolean;
  warnings: string[];
}

export interface StrippingResult {
  threadDesignation: string;
  engagementLength: number;  // mm
  engagementPercent: number;
  internalStrippingForce: number;  // N
  externalStrippingForce: number;  // N
  limitingMode: 'internal' | 'external' | 'balanced';
  safetyFactor: number;
  minimumEngagement: number;  // mm for SF=2
  warnings: string[];
}

export interface GaugeResult {
  threadDesignation: string;
  fitClass: string;
  goGauge: {
    pitchDiameter: number;
    majorDiameter: number;
    type: 'plug' | 'ring';
  };
  noGoGauge: {
    pitchDiameter: number;
    type: 'plug' | 'ring';
  };
  wearLimit: number;
  warnings: string[];
}

// ============================================================================
// THREAD CALCULATION ENGINE
// ============================================================================

export class ThreadCalculationEngine {
  
  // ========== THREAD PARSING & LOOKUP ==========
  
  /**
   * Parse thread designation string into ThreadSpec
   */
  parseThreadDesignation(designation: string): ThreadSpec | null {
    const d = designation.trim().toUpperCase();
    
    // Try ISO Metric (M10, M10x1.5)
    if (d.startsWith('M') && /^M\d/.test(d)) {
      const thread = findISOMetricThread(d);
      if (thread) return this.isoToSpec(thread);
    }
    
    // Try Unified (#8-32, 1/4-20 UNC)
    if (d.includes('UNC') || d.includes('UNF') || d.includes('UNEF') || 
        /^#?\d/.test(d) || /^\d+\/\d+-\d+/.test(d)) {
      const thread = findUnifiedThread(d);
      if (thread) return this.unifiedToSpec(thread);
    }
    
    // Try Pipe (1/2-14 NPT, 1/2 BSP)
    if (d.includes('NPT') || d.includes('BSP') || d.includes('NPS')) {
      const thread = findPipeThread(d);
      if (thread) return this.pipeToSpec(thread);
    }
    
    // Try ACME
    if (d.includes('ACME')) {
      const thread = findACMEThread(d);
      if (thread) return this.acmeToSpec(thread);
    }
    
    // Try Trapezoidal (Tr20x4)
    if (d.startsWith('TR')) {
      const thread = findTrapezoidalThread(d);
      if (thread) return this.trapezoidalToSpec(thread);
    }
    
    log.warn(`[ThreadEngine] Could not parse thread designation: ${designation}`);
    return null;
  }
  
  /**
   * Find thread in all databases
   */
  findThread(designation: string): ThreadSpec | null {
    return this.parseThreadDesignation(designation);
  }
  
  // ========== TAP DRILL CALCULATIONS ==========
  
  /**
   * Calculate tap drill size for given engagement percentage
   * 
   * Formula: Tap Drill = Major Diameter - (Engagement% / 76.98) × Pitch
   * For 75% engagement: Tap Drill ≈ Major - Pitch
   * For 50% engagement: Tap Drill ≈ Major - 0.65 × Pitch
   */
  calculateTapDrill(threadDesignation: string, engagementPercent: number = 75): TapDrillResult | null {
    const thread = this.parseThreadDesignation(threadDesignation);
    if (!thread) return null;
    
    const warnings: string[] = [];
    
    // Validate engagement
    if (engagementPercent < 50) {
      warnings.push('WARNING: Engagement below 50% may result in weak threads');
    }
    if (engagementPercent > 85) {
      warnings.push('WARNING: Engagement above 85% increases tap breakage risk');
    }
    
    // Calculate tap drill — Machinery's Handbook standard formula
    // D_drill = D_major - (engagement% / 76.98) × P
    // 76.98 is the constant for 60° thread forms (ISO/Unified)
    // At engagement%=76.98: D = D_major - P (the common machinist shortcut)
    const engagementFactor = engagementPercent / 76.98;
    const tapDrillMM = thread.majorDiameter - (thread.pitch * engagementFactor);
    const tapDrillInch = tapDrillMM / 25.4;
    
    // Thread depth H for theoretical calculations
    const H = 0.6134 * thread.pitch;
    
    // Find closest fractional/letter/number drill
    const fractional = this.findClosestFractionalDrill(tapDrillInch);
    const letter = this.findClosestLetterDrill(tapDrillInch);
    const number = this.findClosestNumberDrill(tapDrillInch);
    
    // Theoretical minor diameter
    const theoreticalMinor = thread.majorDiameter - (2 * H);
    
    // Material-specific warnings
    if (engagementPercent > 70) {
      warnings.push('For hardened steel (>35 HRC), consider 50-60% engagement');
    }
    
    return {
      threadDesignation: thread.designation,
      engagementPercent,
      tapDrillMM: Math.round(tapDrillMM * 1000) / 1000,
      tapDrillInch: Math.round(tapDrillInch * 10000) / 10000,
      tapDrillFractional: fractional,
      tapDrillLetter: letter,
      tapDrillNumber: number,
      minorDiameter: thread.minorDiameter,
      theoreticalMinor,
      warnings
    };
  }
  
  /**
   * Calculate actual engagement from hole diameter
   */
  calculateEngagement(holeDiameter: number, threadDesignation: string): number | null {
    const thread = this.parseThreadDesignation(threadDesignation);
    if (!thread) return null;
    
    // Machinery's Handbook formula (inverse of calculateTapDrill)
    // engagement% = 76.98 × (D_major - D_drill) / P
    // 76.98 = 100 / 1.29904 where 1.29904 = 1.5 × H/P for 60° thread forms
    const engagement = 76.98 * (thread.majorDiameter - holeDiameter) / thread.pitch;
    return Math.round(Math.max(0, Math.min(100, engagement)) * 10) / 10;
  }
  
  // ========== THREAD MILLING ==========
  
  /**
   * Calculate thread milling parameters
   */
  calculateThreadMillParams(
    threadDesignation: string,
    toolDiameter: number,
    material: string = 'steel',
    singlePoint: boolean = true
  ): ThreadMillResult | null {
    const thread = this.parseThreadDesignation(threadDesignation);
    if (!thread) return null;
    
    const warnings: string[] = [];
    
    // Validate tool diameter (must be smaller than minor diameter)
    if (toolDiameter >= thread.minorDiameter) {
      warnings.push(`ERROR: Tool diameter ${toolDiameter}mm must be smaller than minor diameter ${thread.minorDiameter}mm`);
    }
    
    // Base cutting speed by material (m/min)
    const speeds: Record<string, number> = {
      'aluminum': 200, 'steel': 80, 'stainless': 50, 
      'cast_iron': 100, 'titanium': 30, 'brass': 150
    };
    const vc = speeds[material.toLowerCase()] || 80;
    
    // Calculate RPM
    const rpm = Math.round((vc * 1000) / (Math.PI * toolDiameter));
    
    // Helical interpolation radius
    const helixRadius = (thread.pitchDiameter / 2) - (toolDiameter / 2);
    
    // Feed rate (mm/min) - adjust for helix
    const feedPerTooth = 0.05; // mm/tooth (conservative for threading)
    const teeth = 1; // Single point
    const feedRate = Math.round(rpm * feedPerTooth * teeth);
    
    // DOC
    const radialDOC = (thread.majorDiameter - thread.minorDiameter) / 2;
    const axialDOC = singlePoint ? thread.pitch : thread.pitch * 3; // Multi-form
    
    // Number of passes (typically 2-4 for steel)
    const numberOfPasses = material === 'aluminum' ? 1 : material === 'titanium' ? 4 : 2;
    
    // Helix angle
    const circumference = Math.PI * thread.pitchDiameter;
    const helixAngle = Math.atan(thread.pitch / circumference) * (180 / Math.PI);
    
    // Cycle time estimate (seconds)
    const threadLength = 10; // Assume 10mm thread depth
    const cycleTime = (threadLength / thread.pitch) * (60 / rpm) * numberOfPasses;
    
    return {
      threadDesignation: thread.designation,
      toolDiameter,
      rpm,
      feedRate,
      radialDOC: Math.round(radialDOC * 1000) / 1000,
      axialDOC,
      numberOfPasses,
      helixAngle: Math.round(helixAngle * 100) / 100,
      cycleTime: Math.round(cycleTime * 10) / 10,
      climbMilling: true, // Recommended for thread milling
      warnings
    };
  }
  
  // ========== STRIPPING STRENGTH ==========
  
  /**
   * Calculate thread stripping strength
   * 
   * As = π × n × Le × Dp × (1/(2n) + 0.57735 × (Dp_min - E_s_max))
   */
  calculateStrippingStrength(
    threadDesignation: string,
    engagementLength: number,
    tensileStrengthMPa: number = 400
  ): StrippingResult | null {
    const thread = this.parseThreadDesignation(threadDesignation);
    if (!thread) return null;
    
    const warnings: string[] = [];
    
    // Shear area calculations
    const n = 1 / thread.pitch; // threads per mm
    const Le = engagementLength;
    const Dp = thread.pitchDiameter;
    const Dm = thread.majorDiameter;
    
    // Internal thread (nut) stripping area
    const Asi = Math.PI * n * Le * Dm * (1/(2*n) + 0.57735 * (Dm - Dp));
    
    // External thread (bolt) stripping area  
    const Ase = Math.PI * n * Le * Dp * (1/(2*n) + 0.57735 * (Dp - thread.minorDiameter));
    
    // Stripping forces (shear strength ≈ 0.6 × tensile)
    const shearStrength = 0.6 * tensileStrengthMPa;
    const internalStrip = Asi * shearStrength;
    const externalStrip = Ase * shearStrength;
    
    // Engagement percent
    const fullEngagement = 1.5 * thread.majorDiameter; // Rule of thumb
    const engagementPercent = (engagementLength / fullEngagement) * 100;
    
    // Determine limiting mode
    let limitingMode: 'internal' | 'external' | 'balanced' = 'balanced';
    if (internalStrip < externalStrip * 0.9) limitingMode = 'internal';
    if (externalStrip < internalStrip * 0.9) limitingMode = 'external';
    
    // Safety factor (compared to bolt tensile)
    const boltArea = (Math.PI / 4) * Math.pow(Dp - 0.9382 * thread.pitch, 2);
    const boltTensile = boltArea * tensileStrengthMPa;
    const safetyFactor = Math.min(internalStrip, externalStrip) / boltTensile;
    
    // Minimum engagement for SF=2
    const minEngagement = (2 * boltTensile) / (shearStrength * Math.PI * n * Dp);
    
    if (safetyFactor < 1.5) {
      warnings.push('WARNING: Low safety factor - increase engagement length');
    }
    if (engagementPercent < 60) {
      warnings.push('WARNING: Low engagement - risk of thread stripping');
    }
    
    return {
      threadDesignation: thread.designation,
      engagementLength,
      engagementPercent: Math.round(engagementPercent),
      internalStrippingForce: Math.round(internalStrip),
      externalStrippingForce: Math.round(externalStrip),
      limitingMode,
      safetyFactor: Math.round(safetyFactor * 100) / 100,
      minimumEngagement: Math.round(minEngagement * 100) / 100,
      warnings
    };
  }
  
  // ========== GO/NO-GO GAUGES ==========
  
  /**
   * Calculate Go/No-Go gauge dimensions
   */
  calculateGauges(threadDesignation: string, fitClass: string = '6H'): GaugeResult | null {
    const thread = this.parseThreadDesignation(threadDesignation);
    if (!thread) return null;
    
    const warnings: string[] = [];
    const isInternal = fitClass.includes('H') || fitClass.includes('B');
    
    // Simplified tolerance calculation (actual requires full ISO 965 tables)
    const tolerance = 0.02 * thread.pitch; // Approximation
    
    let goGauge, noGoGauge;
    
    if (isInternal) {
      // Internal thread (plug gauge)
      goGauge = {
        pitchDiameter: thread.pitchDiameter,
        majorDiameter: thread.majorDiameter,
        type: 'plug' as const
      };
      noGoGauge = {
        pitchDiameter: thread.pitchDiameter + tolerance,
        type: 'plug' as const
      };
    } else {
      // External thread (ring gauge)
      goGauge = {
        pitchDiameter: thread.pitchDiameter,
        majorDiameter: thread.majorDiameter,
        type: 'ring' as const
      };
      noGoGauge = {
        pitchDiameter: thread.pitchDiameter - tolerance,
        type: 'ring' as const
      };
    }
    
    return {
      threadDesignation: thread.designation,
      fitClass,
      goGauge,
      noGoGauge,
      wearLimit: tolerance * 0.1,
      warnings
    };
  }
  
  // ========== G-CODE GENERATION ==========
  
  /**
   * Generate G-code for rigid tapping
   */
  generateTappingGcode(
    threadDesignation: string,
    depth: number,
    controller: string = 'FANUC',
    spindleSpeed: number = 500
  ): string {
    const thread = this.parseThreadDesignation(threadDesignation);
    if (!thread) return '(ERROR: Invalid thread designation)';
    
    const pitch = thread.pitch;
    const feedRate = spindleSpeed * pitch; // F = S × pitch for rigid tap
    
    const code = [
      `(RIGID TAPPING: ${thread.designation})`,
      `(PITCH: ${pitch}mm, DEPTH: ${depth}mm)`,
      ``,
      `G90 G54 (Absolute, work offset)`,
      `M29 S${spindleSpeed} (Rigid tap mode)`,
      `G84 Z-${depth} R2.0 F${feedRate.toFixed(1)} (Tap cycle)`,
      `G80 (Cancel canned cycle)`,
      `M05 (Spindle stop)`,
    ];
    
    if (controller === 'HAAS') {
      code[4] = `G84 Z-${depth} R0.1 F${feedRate.toFixed(1)} J2 (Rigid tap, J=retract multiply)`;
    } else if (controller === 'SIEMENS') {
      code[3] = `CYCLE84(2, 0, 2, -${depth}, , ${spindleSpeed}, , ${pitch}, ) (Tapping cycle)`;
    }
    
    return code.join('\n');
  }
  
  /**
   * Generate G-code for thread milling
   */
  generateThreadMillGcode(
    threadDesignation: string,
    depth: number,
    toolDiameter: number,
    controller: string = 'FANUC'
  ): string {
    const thread = this.parseThreadDesignation(threadDesignation);
    if (!thread) return '(ERROR: Invalid thread designation)';
    
    const pitch = thread.pitch;
    const radius = (thread.pitchDiameter / 2) - (toolDiameter / 2);
    const startZ = 2;
    
    const code = [
      `(THREAD MILLING: ${thread.designation})`,
      `(TOOL DIA: ${toolDiameter}mm, PITCH: ${pitch}mm)`,
      `(HELIX RADIUS: ${radius.toFixed(3)}mm)`,
      ``,
      `G90 G54`,
      `G00 X0 Y0`,
      `G00 Z${startZ}`,
      `G01 Z-${depth} F200 (Plunge to depth)`,
      `G01 X${radius.toFixed(3)} F100 (Move to start radius)`,
      ``,
      `(HELICAL INTERPOLATION - CLIMB MILLING)`,
      `G03 X${radius.toFixed(3)} Y0 Z-${(depth - pitch).toFixed(3)} I-${radius.toFixed(3)} J0 F150`,
      ``,
      `G01 X0 F100 (Retract from thread)`,
      `G00 Z${startZ}`,
    ];
    
    return code.join('\n');
  }
  
  // ========== HELPER METHODS ==========
  
  private isoToSpec(t: ISOMetricThread): ThreadSpec {
    return {
      designation: t.designation,
      type: 'ISO',
      nominalDiameter: t.nominalDiameter,
      pitch: t.pitch,
      majorDiameter: t.majorDiameter,
      pitchDiameter: t.pitchDiameter,
      minorDiameter: t.minorDiameter,
      threadAngle: 60,
      isTapered: false,
      originalData: t
    };
  }
  
  private unifiedToSpec(t: UnifiedThread): ThreadSpec {
    return {
      designation: t.designation,
      type: t.series,
      nominalDiameter: t.majorDiameterMM,
      pitch: t.pitchMM,
      majorDiameter: t.majorDiameterMM,
      pitchDiameter: t.pitchDiameterMM,
      minorDiameter: t.minorDiameterMM,
      tpi: t.tpi,
      threadAngle: 60,
      isTapered: false,
      originalData: t
    };
  }
  
  private pipeToSpec(t: PipeThread): ThreadSpec {
    return {
      designation: t.designation,
      type: t.type,
      nominalDiameter: t.majorDiameterMM,
      pitch: 25.4 / t.tpi,
      majorDiameter: t.majorDiameterMM,
      pitchDiameter: t.pitchDiameterInch * 25.4,
      minorDiameter: t.minorDiameterInch * 25.4,
      tpi: t.tpi,
      threadAngle: t.threadAngle,
      isTapered: t.taperPerInch > 0,
      taperPerInch: t.taperPerInch,
      originalData: t
    };
  }
  
  private acmeToSpec(t: ACMEThread): ThreadSpec {
    return {
      designation: t.designation,
      type: 'ACME',
      nominalDiameter: t.nominalSizeInch * 25.4,
      pitch: t.pitch * 25.4,
      majorDiameter: t.majorDiameter * 25.4,
      pitchDiameter: t.pitchDiameter * 25.4,
      minorDiameter: t.minorDiameter * 25.4,
      tpi: t.tpi,
      threadAngle: 29,
      isTapered: false,
      originalData: t
    };
  }
  
  private trapezoidalToSpec(t: TrapezoidalThread): ThreadSpec {
    return {
      designation: t.designation,
      type: 'TRAPEZOIDAL',
      nominalDiameter: t.nominalDiameter,
      pitch: t.pitch,
      majorDiameter: t.majorDiameter,
      pitchDiameter: t.pitchDiameter,
      minorDiameter: t.minorDiameter,
      threadAngle: 30,
      isTapered: false,
      originalData: t
    };
  }
  
  private findClosestFractionalDrill(inch: number): string {
    const fractions = [
      [1,64], [1,32], [3,64], [1,16], [5,64], [3,32], [7,64], [1,8],
      [9,64], [5,32], [11,64], [3,16], [13,64], [7,32], [15,64], [1,4],
      [17,64], [9,32], [19,64], [5,16], [21,64], [11,32], [23,64], [3,8],
      [25,64], [13,32], [27,64], [7,16], [29,64], [15,32], [31,64], [1,2]
    ];
    let closest = '1/4';
    let minDiff = 999;
    for (const [n, d] of fractions) {
      const val = n / d;
      const diff = Math.abs(val - inch);
      if (diff < minDiff) {
        minDiff = diff;
        closest = `${n}/${d}`;
      }
    }
    return closest;
  }
  
  private findClosestLetterDrill(inch: number): string | null {
    const letters: Record<string, number> = {
      'A': 0.234, 'B': 0.238, 'C': 0.242, 'D': 0.246, 'E': 0.250,
      'F': 0.257, 'G': 0.261, 'H': 0.266, 'I': 0.272, 'J': 0.277,
      'K': 0.281, 'L': 0.290, 'M': 0.295, 'N': 0.302, 'O': 0.316,
      'P': 0.323, 'Q': 0.332, 'R': 0.339, 'S': 0.348, 'T': 0.358,
      'U': 0.368, 'V': 0.377, 'W': 0.386, 'X': 0.397, 'Y': 0.404, 'Z': 0.413
    };
    let closest: string | null = null;
    let minDiff = 0.01;
    for (const [letter, size] of Object.entries(letters)) {
      const diff = Math.abs(size - inch);
      if (diff < minDiff) {
        minDiff = diff;
        closest = letter;
      }
    }
    return closest;
  }
  
  private findClosestNumberDrill(inch: number): string | null {
    const numbers: Record<string, number> = {
      '1': 0.228, '2': 0.221, '3': 0.213, '4': 0.209, '5': 0.2055,
      '6': 0.204, '7': 0.201, '8': 0.199, '9': 0.196, '10': 0.1935,
      '11': 0.191, '12': 0.189, '13': 0.185, '14': 0.182, '15': 0.180,
      '16': 0.177, '17': 0.173, '18': 0.1695, '19': 0.166, '20': 0.161,
      '21': 0.159, '22': 0.157, '23': 0.154, '24': 0.152, '25': 0.1495,
      '26': 0.147, '27': 0.144, '28': 0.1405, '29': 0.136, '30': 0.1285,
      '31': 0.120, '32': 0.116, '33': 0.113, '34': 0.111, '35': 0.110,
      '36': 0.1065, '37': 0.104, '38': 0.1015, '39': 0.0995, '40': 0.098,
      '41': 0.096, '42': 0.0935, '43': 0.089, '44': 0.086, '45': 0.082,
      '46': 0.081, '47': 0.0785, '48': 0.076, '49': 0.073, '50': 0.070,
      '51': 0.067, '52': 0.0635, '53': 0.0595, '54': 0.055, '55': 0.052,
      '56': 0.0465, '57': 0.043, '58': 0.042, '59': 0.041, '60': 0.040
    };
    let closest: string | null = null;
    let minDiff = 0.01;
    for (const [num, size] of Object.entries(numbers)) {
      const diff = Math.abs(size - inch);
      if (diff < minDiff) {
        minDiff = diff;
        closest = `#${num}`;
      }
    }
    return closest;
  }
}

// Singleton instance
export const threadEngine = new ThreadCalculationEngine();

console.log('[ThreadCalculationEngine] Initialized');
