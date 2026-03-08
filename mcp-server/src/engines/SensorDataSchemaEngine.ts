/**
 * SensorDataSchemaEngine — Unified Sensor Data Model
 *
 * Real-time machining sensor stream ingestion, validation, and buffering.
 * Supports spindle load, vibration, force, and temperature sensor types
 * with O(1) ring-buffer storage and schema validation.
 *
 * Actions: sensor_validate
 */

// ============================================================================
// TYPES
// ============================================================================

/** Atomic value wrapper used across PRISM engines. */
export interface AtomicValue<T> {
  value: T;
  unit: string;
  formula?: string;
  confidence?: number;
}

/** Sensor type discriminator. */
export type SensorType = "spindle_load" | "vibration" | "force" | "temperature";

/** Spindle load sample — motor current / torque / power. */
export interface SpindleLoadSample {
  timestamp_ms: number;
  load_pct: number;
  power_kw: number;
  torque_nm: number;
  rpm_actual: number;
}

/** Tri-axial vibration sample — accelerometer + derived velocity/displacement. */
export interface VibrationSample {
  timestamp_ms: number;
  accel_x_g: number;
  accel_y_g: number;
  accel_z_g: number;
  velocity_mm_s: number;
  displacement_um: number;
}

/** Cutting force sample — dynamometer Fx/Fy/Fz with optional moments. */
export interface ForceSample {
  timestamp_ms: number;
  fx_n: number;
  fy_n: number;
  fz_n: number;
  mx_nm?: number;
  my_nm?: number;
  mz_nm?: number;
}

/** Temperature sample — tool / workpiece / coolant thermocouples. */
export interface TemperatureSample {
  timestamp_ms: number;
  tool_temp_c: number;
  workpiece_temp_c: number;
  coolant_temp_c: number;
}

/** Union of all sample types. */
export type AnySample = SpindleLoadSample | VibrationSample | ForceSample | TemperatureSample;

// ============================================================================
// RING BUFFER
// ============================================================================

/**
 * Circular ring buffer with O(1) push and ordered retrieval.
 * Overwrites oldest samples when capacity is reached.
 */
export class RingBuffer<T> {
  private buf: (T | undefined)[];
  private head = 0;
  private count = 0;
  private readonly cap: number;

  constructor(capacity = 10000) {
    this.cap = Math.max(1, capacity);
    this.buf = new Array(this.cap);
  }

  /** Add a sample. Overwrites oldest if full. */
  push(sample: T): void {
    this.buf[this.head] = sample;
    this.head = (this.head + 1) % this.cap;
    if (this.count < this.cap) this.count++;
  }

  /** Return all samples in chronological order. */
  getAll(): T[] {
    if (this.count === 0) return [];
    const start = this.count < this.cap ? 0 : this.head;
    const result: T[] = new Array(this.count);
    for (let i = 0; i < this.count; i++) {
      result[i] = this.buf[(start + i) % this.cap] as T;
    }
    return result;
  }

  /** Return the last n samples (most recent). */
  getLast(n: number): T[] {
    const take = Math.min(n, this.count);
    if (take === 0) return [];
    const result: T[] = new Array(take);
    const startIdx = (this.head - take + this.cap) % this.cap;
    for (let i = 0; i < take; i++) {
      result[i] = this.buf[(startIdx + i) % this.cap] as T;
    }
    return result;
  }

  /** Reset buffer to empty state. */
  clear(): void {
    this.head = 0;
    this.count = 0;
    this.buf = new Array(this.cap);
  }

  /** Current number of stored samples. */
  get size(): number {
    return this.count;
  }

  /** Whether the buffer has reached capacity. */
  get isFull(): boolean {
    return this.count >= this.cap;
  }
}

// ============================================================================
// SCHEMA DEFINITIONS (field validators per sensor type)
// ============================================================================

interface FieldSpec {
  name: string;
  type: "number";
  required: boolean;
}

const SPINDLE_FIELDS: FieldSpec[] = [
  { name: "timestamp_ms", type: "number", required: true },
  { name: "load_pct", type: "number", required: true },
  { name: "power_kw", type: "number", required: true },
  { name: "torque_nm", type: "number", required: true },
  { name: "rpm_actual", type: "number", required: true },
];

const VIBRATION_FIELDS: FieldSpec[] = [
  { name: "timestamp_ms", type: "number", required: true },
  { name: "accel_x_g", type: "number", required: true },
  { name: "accel_y_g", type: "number", required: true },
  { name: "accel_z_g", type: "number", required: true },
  { name: "velocity_mm_s", type: "number", required: true },
  { name: "displacement_um", type: "number", required: true },
];

const FORCE_FIELDS: FieldSpec[] = [
  { name: "timestamp_ms", type: "number", required: true },
  { name: "fx_n", type: "number", required: true },
  { name: "fy_n", type: "number", required: true },
  { name: "fz_n", type: "number", required: true },
  { name: "mx_nm", type: "number", required: false },
  { name: "my_nm", type: "number", required: false },
  { name: "mz_nm", type: "number", required: false },
];

const TEMPERATURE_FIELDS: FieldSpec[] = [
  { name: "timestamp_ms", type: "number", required: true },
  { name: "tool_temp_c", type: "number", required: true },
  { name: "workpiece_temp_c", type: "number", required: true },
  { name: "coolant_temp_c", type: "number", required: true },
];

const SCHEMA_MAP: Record<SensorType, FieldSpec[]> = {
  spindle_load: SPINDLE_FIELDS,
  vibration: VIBRATION_FIELDS,
  force: FORCE_FIELDS,
  temperature: TEMPERATURE_FIELDS,
};

// ============================================================================
// SENSOR DATA STORE
// ============================================================================

/** Buffer status summary for a single sensor type. */
export interface BufferStatus {
  type: SensorType;
  depth: number;
  full: boolean;
  expected_hz: number;
  actual_hz: number;
  time_range_ms: number;
}

/**
 * Central store for real-time sensor data with per-type ring buffers,
 * sample-rate tracking, and retrieval helpers.
 */
export class SensorDataStore {
  readonly spindle = new RingBuffer<SpindleLoadSample>();
  readonly vibration = new RingBuffer<VibrationSample>();
  readonly force = new RingBuffer<ForceSample>();
  readonly temperature = new RingBuffer<TemperatureSample>();

  private rates: Record<SensorType, number> = {
    spindle_load: 1000,
    vibration: 5000,
    force: 2000,
    temperature: 10,
  };

  /** Validate and ingest an array of samples into the appropriate buffer. */
  ingest(type: SensorType, samples: AnySample[]): { accepted: number; rejected: number } {
    const fields = SCHEMA_MAP[type];
    let accepted = 0;
    let rejected = 0;
    const buf = this.getBuffer(type);
    for (const s of samples) {
      if (validateSample(s, fields).length === 0) {
        buf.push(s as any);
        accepted++;
      } else {
        rejected++;
      }
    }
    return { accepted, rejected };
  }

  /** Retrieve samples from a specific sensor buffer. */
  getSamples(type: SensorType, count?: number): AnySample[] {
    const buf = this.getBuffer(type);
    return count ? buf.getLast(count) : buf.getAll();
  }

  /** Set the expected sample rate in Hz for a sensor type. */
  setSampleRate(type: SensorType, hz: number): void {
    this.rates[type] = Math.max(0.001, hz);
  }

  /** Get status of all sensor buffers. */
  getStatus(): BufferStatus[] {
    return (["spindle_load", "vibration", "force", "temperature"] as SensorType[]).map((type) => {
      const buf = this.getBuffer(type);
      const all = buf.getAll();
      let time_range_ms = 0;
      let actual_hz = 0;
      if (all.length >= 2) {
        const first = (all[0] as any).timestamp_ms as number;
        const last = (all[all.length - 1] as any).timestamp_ms as number;
        time_range_ms = last - first;
        actual_hz = time_range_ms > 0 ? ((all.length - 1) / time_range_ms) * 1000 : 0;
      }
      return {
        type,
        depth: buf.size,
        full: buf.isFull,
        expected_hz: this.rates[type],
        actual_hz: Math.round(actual_hz * 100) / 100,
        time_range_ms,
      };
    });
  }

  private getBuffer(type: SensorType): RingBuffer<any> {
    switch (type) {
      case "spindle_load": return this.spindle;
      case "vibration": return this.vibration;
      case "force": return this.force;
      case "temperature": return this.temperature;
    }
  }
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

function validateSample(sample: any, fields: FieldSpec[]): string[] {
  const errors: string[] = [];
  if (typeof sample !== "object" || sample === null) {
    errors.push("sample must be a non-null object");
    return errors;
  }
  for (const f of fields) {
    const val = sample[f.name];
    if (val === undefined || val === null) {
      if (f.required) errors.push(`missing required field '${f.name}'`);
    } else if (typeof val !== f.type) {
      errors.push(`field '${f.name}' must be ${f.type}, got ${typeof val}`);
    } else if (f.type === "number" && !Number.isFinite(val)) {
      errors.push(`field '${f.name}' must be finite number`);
    }
  }
  return errors;
}

// ============================================================================
// ENGINE
// ============================================================================

/** Validation result returned by the engine. */
export interface SensorValidationResult {
  valid: boolean;
  errors: string[];
  validated_count: number;
}

/** Input to the validate method. */
export interface SensorValidationInput {
  type: SensorType;
  samples: any[];
}

/**
 * SensorDataSchemaEngine — validates sensor sample arrays against
 * their respective schemas and reports per-sample errors.
 */
export class SensorDataSchemaEngine {
  /**
   * Validate an array of sensor samples against the schema for the given type.
   * Returns an AtomicValue-wrapped result with validity, errors, and count.
   */
  validate(input: SensorValidationInput): AtomicValue<SensorValidationResult> {
    const { type, samples } = input;
    const allErrors: string[] = [];

    if (!SCHEMA_MAP[type]) {
      return {
        value: { valid: false, errors: [`unknown sensor type '${type}'`], validated_count: 0 },
        unit: "validation_result",
        confidence: 1,
      };
    }

    if (!Array.isArray(samples)) {
      return {
        value: { valid: false, errors: ["samples must be an array"], validated_count: 0 },
        unit: "validation_result",
        confidence: 1,
      };
    }

    const fields = SCHEMA_MAP[type];
    let validCount = 0;
    for (let i = 0; i < samples.length; i++) {
      const errs = validateSample(samples[i], fields);
      if (errs.length > 0) {
        allErrors.push(...errs.map((e) => `[${i}] ${e}`));
      } else {
        validCount++;
      }
    }

    return {
      value: {
        valid: allErrors.length === 0,
        errors: allErrors,
        validated_count: validCount,
      },
      unit: "validation_result",
      formula: `schema_check(${type}, n=${samples.length})`,
      confidence: 1,
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/** Singleton engine instance. */
export const sensorDataSchemaEngine = new SensorDataSchemaEngine();
