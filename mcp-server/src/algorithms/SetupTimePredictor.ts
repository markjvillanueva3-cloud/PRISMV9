/**
 * SetupTimePredictor — Business/ERP #7.5
 * Linear regression on (#tools, #features, fixture complexity, #ops) →
 * setup-time minutes. Coefficients pre-trained on JM Die historical data.
 * Operator-tunable per shop via custom_coefficients.
 */
interface AtomicValue<T = number> { value: T; unit: string; uncertainty: number; source: string; confidence?: number }

export interface SetupTimeInput {
  tool_count: number;
  feature_count: number;
  /** 0-3: 0=vise/clamp, 1=custom fixture, 2=fixture + indicating, 3=multi-axis tilt. */
  fixture_complexity: 0 | 1 | 2 | 3;
  op_count: number;
  /** Whether part requires probing → adds 5 min per setup. */
  requires_probing?: boolean;
  /** Custom coefficient override (rare). */
  custom_coefficients?: { intercept: number; tools: number; features: number; fixture: number; ops: number };
}

export interface SetupTimeResult {
  predicted_setup_min: AtomicValue;
  per_factor_contribution_min: { tools: number; features: number; fixture: number; ops: number; probing: number; intercept: number };
  notes: string[];
  source: string;
}

// Pre-trained on JM Die historical data — see reference_jm_die_setup_time_regression
const DEFAULT_COEFFS = { intercept: 15, tools: 2.5, features: 0.8, fixture: 12, ops: 1.5 };
const PROBE_MINUTES = 5;
const TOOL_MAX = 50;
const FEATURE_MAX = 500;
const OP_MAX = 500;
const SETUP_MIN_MIN = 5;     // shop-floor floor
const SETUP_MIN_MAX = 480;   // 8 hours ceiling

function av(v: number, source: string, conf: number): AtomicValue {
  return { value: v, unit: "min", uncertainty: v * 0.25, source, confidence: conf };
}
function emit(reason: string): SetupTimeResult {
  return { predicted_setup_min: av(0, "invalid-input", 0), per_factor_contribution_min: { tools: 0, features: 0, fixture: 0, ops: 0, probing: 0, intercept: 0 }, notes: [reason], source: "SetupTimePredictor v1.0.0" };
}

export function predict(input: SetupTimeInput): SetupTimeResult {
  if (!input) return emit("missing input");
  if (!Number.isFinite(input.tool_count) || input.tool_count < 0 || input.tool_count > TOOL_MAX) return emit(`tool_count outside [0, ${TOOL_MAX}]`);
  if (!Number.isFinite(input.feature_count) || input.feature_count < 0 || input.feature_count > FEATURE_MAX) return emit(`feature_count outside [0, ${FEATURE_MAX}]`);
  if (!Number.isInteger(input.fixture_complexity) || input.fixture_complexity < 0 || input.fixture_complexity > 3) return emit(`fixture_complexity must be integer in [0, 3]`);
  if (!Number.isFinite(input.op_count) || input.op_count < 0 || input.op_count > OP_MAX) return emit(`op_count outside [0, ${OP_MAX}]`);

  const c = input.custom_coefficients ?? DEFAULT_COEFFS;
  const toolsContrib = c.tools * input.tool_count;
  const featuresContrib = c.features * input.feature_count;
  const fixtureContrib = c.fixture * input.fixture_complexity;
  const opsContrib = c.ops * input.op_count;
  const probingContrib = input.requires_probing ? PROBE_MINUTES : 0;
  let total = c.intercept + toolsContrib + featuresContrib + fixtureContrib + opsContrib + probingContrib;
  const notes: string[] = [];
  if (total < SETUP_MIN_MIN) { notes.push(`predicted ${total.toFixed(1)} min below shop-floor floor ${SETUP_MIN_MIN}min — clamped`); total = SETUP_MIN_MIN; }
  if (total > SETUP_MIN_MAX) { notes.push(`predicted ${total.toFixed(1)} min exceeds 8h ceiling — split into multiple setups`); total = SETUP_MIN_MAX; }
  if (input.fixture_complexity === 3) notes.push("multi-axis tilt fixture: verify fixture clearance under 5-axis rotation");
  if (input.tool_count > 20) notes.push("high tool count: presetting recommended to absorb tool-touch time off-machine");

  return {
    predicted_setup_min: av(total, "JM-Die regression coefficients", 0.80),
    per_factor_contribution_min: { tools: toolsContrib, features: featuresContrib, fixture: fixtureContrib, ops: opsContrib, probing: probingContrib, intercept: c.intercept },
    notes, source: "SetupTimePredictor v1.0.0",
  };
}

export const SetupTimePredictor = { version: "1.0.0" as const, predict };
