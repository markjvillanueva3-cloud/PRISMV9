/**
 * Physics Preview Web Worker
 * LATHE-PROD-READY-MS0/U-LPR-WEBWORKER
 *
 * Runs physics calculations off the main thread for responsive UI.
 * Frontend uses this for PREVIEW only — backend is authoritative for release-grade.
 *
 * Calculations:
 * - Cutting force estimation (simplified Kienzle)
 * - Surface finish prediction (simplified)
 * - Cycle time estimation
 * - Tool deflection preview
 */

export interface PhysicsPreviewInput {
  operation: 'cutting_force' | 'surface_finish' | 'cycle_time' | 'deflection';
  params: Record<string, number>;
}

export interface PhysicsPreviewResult {
  operation: string;
  value: number;
  unit: string;
  confidence: 'preview' | 'estimate';
  warning?: string;
}

/**
 * Simplified Kienzle cutting force for preview
 * Fc = kc1.1 * b * h^(1-mc)
 */
function calculateCuttingForcePreview(params: Record<string, number>): PhysicsPreviewResult {
  const {
    kc11 = 1800,    // Specific cutting force [MPa]
    mc = 0.25,      // Kienzle exponent
    ap = 2,         // Depth of cut [mm]
    f = 0.2,        // Feed [mm/rev]
  } = params;

  const b = ap;                           // Width of cut ≈ ap for turning
  const h = f;                            // Chip thickness ≈ f for κr=90°
  const Fc = kc11 * b * Math.pow(h, 1 - mc);

  return {
    operation: 'cutting_force',
    value: Math.round(Fc),
    unit: 'N',
    confidence: 'preview',
    warning: Fc > 5000 ? 'High cutting force - verify with backend' : undefined,
  };
}

/**
 * Simplified surface finish prediction for preview
 * Ra ≈ f² / (32 * r)  (ideal, no BUE/vibration)
 */
function calculateSurfaceFinishPreview(params: Record<string, number>): PhysicsPreviewResult {
  const {
    f = 0.15,       // Feed [mm/rev]
    r = 0.8,        // Nose radius [mm]
  } = params;

  const Ra = (f * f) / (32 * r) * 1000;  // Convert to µm

  return {
    operation: 'surface_finish',
    value: Math.round(Ra * 100) / 100,
    unit: 'µm Ra',
    confidence: 'preview',
    warning: Ra > 6.3 ? 'Rough finish - consider reducing feed' : undefined,
  };
}

/**
 * Simplified cycle time estimation for preview
 */
function calculateCycleTimePreview(params: Record<string, number>): PhysicsPreviewResult {
  const {
    length = 50,        // Cut length [mm]
    f = 0.2,            // Feed [mm/rev]
    rpm = 1500,         // Spindle RPM
    passes = 1,         // Number of passes
    rapidTime = 5,      // Rapid traverse time [s]
  } = params;

  const feedRate = f * rpm;               // mm/min
  const cutTime = (length / feedRate) * 60 * passes;  // seconds
  const totalTime = cutTime + rapidTime;

  return {
    operation: 'cycle_time',
    value: Math.round(totalTime * 10) / 10,
    unit: 's',
    confidence: 'estimate',
  };
}

/**
 * Simplified tool deflection preview
 * δ = F * L³ / (3 * E * I)
 */
function calculateDeflectionPreview(params: Record<string, number>): PhysicsPreviewResult {
  const {
    force = 500,        // Cutting force [N]
    length = 40,        // Tool overhang [mm]
    diameter = 20,      // Tool shank diameter [mm]
    E = 210000,         // Young's modulus [MPa] (steel)
  } = params;

  const I = (Math.PI * Math.pow(diameter, 4)) / 64;  // mm^4
  const delta = (force * Math.pow(length, 3)) / (3 * E * I);  // mm

  return {
    operation: 'deflection',
    value: Math.round(delta * 1000) / 1000,
    unit: 'mm',
    confidence: 'preview',
    warning: delta > 0.05 ? 'High deflection - reduce overhang or increase shank diameter' : undefined,
  };
}

/**
 * Main calculation dispatcher
 */
export function calculate(input: PhysicsPreviewInput): PhysicsPreviewResult {
  switch (input.operation) {
    case 'cutting_force':
      return calculateCuttingForcePreview(input.params);
    case 'surface_finish':
      return calculateSurfaceFinishPreview(input.params);
    case 'cycle_time':
      return calculateCycleTimePreview(input.params);
    case 'deflection':
      return calculateDeflectionPreview(input.params);
    default:
      return {
        operation: input.operation,
        value: 0,
        unit: 'unknown',
        confidence: 'preview',
        warning: `Unknown operation: ${input.operation}`,
      };
  }
}

/**
 * Batch calculation for multiple operations
 */
export function calculateBatch(inputs: PhysicsPreviewInput[]): PhysicsPreviewResult[] {
  return inputs.map(calculate);
}

// Expose functions for Comlink
const workerApi = {
  calculate,
  calculateBatch,
};

export type PhysicsWorkerApi = typeof workerApi;

// Self-registration for web worker context
if (typeof self !== 'undefined' && 'postMessage' in self) {
  self.onmessage = (event: MessageEvent) => {
    const { id, method, args } = event.data;
    try {
      const fn = workerApi[method as keyof typeof workerApi];
      if (typeof fn === 'function') {
        const result = (fn as (...args: unknown[]) => unknown)(...args);
        self.postMessage({ id, result });
      } else {
        self.postMessage({ id, error: `Unknown method: ${method}` });
      }
    } catch (error) {
      self.postMessage({ id, error: String(error) });
    }
  };
}
