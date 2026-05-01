/**
 * PRISM Calculation Handlers
 * ==========================
 */

export async function handleCalculation(name: string, args: any, registries: any): Promise<any> {
  switch (name) {
    case 'prism_formula_calc':
      return registries.formulas.handleTool(name, args);
    case 'prism_speed_feed':
      return calculateSpeedFeed(args, registries);
    case 'prism_cutting_force':
      return calculateCuttingForce(args, registries);
    case 'prism_tool_life':
      return calculateToolLife(args, registries);
    default:
      throw new Error(`Unknown calculation: ${name}`);
  }
}

async function calculateSpeedFeed(args: any, registries: any): Promise<any> {
  const material = await registries.materials.get(args.material_id);
  if (!material) return { success: false, error: 'MATERIAL_NOT_FOUND' };

  const tool = await registries.tools.get(args.tool_id);
  if (!tool) return { success: false, error: 'TOOL_NOT_FOUND' };

  // Use Kienzle model for cutting force
  const kc1_1 = material.kienzle?.kc1_1 || 2000;
  const mc = material.kienzle?.mc || 0.25;
  const machinability = material.machining?.machinability_rating || 100;

  // Calculate base cutting speed
  const baseSpeed = (machinability / 100) * (tool.cutting_data?.recommended_sfm_max || 200);
  const rpm = (baseSpeed * 1000) / (Math.PI * (args.diameter || tool.geometry?.diameter || 10));
  const feedPerTooth = tool.cutting_data?.feed_per_tooth_max || 0.1;
  const feedRate = rpm * feedPerTooth * (tool.geometry?.flutes || 4);

  // Calculate MRR and power
  const doc = args.doc || 2;
  const woc = args.woc || (tool.geometry?.diameter || 10) * 0.5;
  const mrr = feedRate * doc * woc / 1000;
  const kc = kc1_1 / Math.pow(feedPerTooth, mc);
  const power = (kc * feedRate * doc * woc) / (60 * 1e6);

  return {
    success: true,
    rpm: Math.round(rpm),
    feed_rate: Math.round(feedRate),
    feed_per_tooth: feedPerTooth,
    surface_speed: Math.round(baseSpeed),
    mrr: Math.round(mrr * 100) / 100,
    power_required: Math.round(power * 100) / 100,
    tool_life_estimate: 60,
    warnings: [],
  };
}

async function calculateCuttingForce(args: any, registries: any): Promise<any> {
  const material = await registries.materials.get(args.material_id);
  if (!material) return { success: false, error: 'MATERIAL_NOT_FOUND' };

  const kc1_1 = material.kienzle?.kc1_1 || 2000;
  const mc = material.kienzle?.mc || 0.25;
  const h = args.feed || 0.1;
  const b = args.doc || 2;
  const gamma = args.rake_angle || 6;
  const wearFactor = args.wear_factor || 1.0;

  // Kienzle equation: Fc = kc1.1 * h^(1-mc) * b * correction factors
  const gammaCorrection = 1 - (gamma - 6) * 0.01;
  const kc = kc1_1 * Math.pow(h, -mc) * gammaCorrection * wearFactor;
  const Fc = kc * h * b;
  const Ff = Fc * 0.4;
  const Fp = Fc * 0.25;
  const power = (Fc * args.cutting_speed || 100) / 60000;

  return {
    success: true,
    Fc: Math.round(Fc),
    Ff: Math.round(Ff),
    Fp: Math.round(Fp),
    power: Math.round(power * 100) / 100,
  };
}

async function calculateToolLife(args: any, registries: any): Promise<any> {
  const material = await registries.materials.get(args.material_id);
  if (!material) return { success: false, error: 'MATERIAL_NOT_FOUND' };

  const C = material.taylor?.C || 200;
  const n = material.taylor?.n || 0.25;
  const V = args.cutting_speed || 100;

  // Taylor equation: V * T^n = C
  const T = Math.pow(C / V, 1 / n);

  return {
    success: true,
    tool_life_minutes: Math.round(T),
    confidence_interval: [Math.round(T * 0.8), Math.round(T * 1.2)],
  };
}

export default handleCalculation;
