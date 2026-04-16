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
// RING BUFFER
// ============================================================================
/**
 * Circular ring buffer with O(1) push and ordered retrieval.
 * Overwrites oldest samples when capacity is reached.
 */
export class RingBuffer {
    buf;
    head = 0;
    count = 0;
    cap;
    constructor(capacity = 10000) {
        this.cap = Math.max(1, capacity);
        this.buf = new Array(this.cap);
    }
    /** Add a sample. Overwrites oldest if full. */
    push(sample) {
        this.buf[this.head] = sample;
        this.head = (this.head + 1) % this.cap;
        if (this.count < this.cap)
            this.count++;
    }
    /** Return all samples in chronological order. */
    getAll() {
        if (this.count === 0)
            return [];
        const start = this.count < this.cap ? 0 : this.head;
        const result = new Array(this.count);
        for (let i = 0; i < this.count; i++) {
            result[i] = this.buf[(start + i) % this.cap];
        }
        return result;
    }
    /** Return the last n samples (most recent). */
    getLast(n) {
        const take = Math.min(n, this.count);
        if (take === 0)
            return [];
        const result = new Array(take);
        const startIdx = (this.head - take + this.cap) % this.cap;
        for (let i = 0; i < take; i++) {
            result[i] = this.buf[(startIdx + i) % this.cap];
        }
        return result;
    }
    /** Reset buffer to empty state. */
    clear() {
        this.head = 0;
        this.count = 0;
        this.buf = new Array(this.cap);
    }
    /** Current number of stored samples. */
    get size() {
        return this.count;
    }
    /** Whether the buffer has reached capacity. */
    get isFull() {
        return this.count >= this.cap;
    }
}
const SPINDLE_FIELDS = [
    { name: "timestamp_ms", type: "number", required: true },
    { name: "load_pct", type: "number", required: true },
    { name: "power_kw", type: "number", required: true },
    { name: "torque_nm", type: "number", required: true },
    { name: "rpm_actual", type: "number", required: true },
];
const VIBRATION_FIELDS = [
    { name: "timestamp_ms", type: "number", required: true },
    { name: "accel_x_g", type: "number", required: true },
    { name: "accel_y_g", type: "number", required: true },
    { name: "accel_z_g", type: "number", required: true },
    { name: "velocity_mm_s", type: "number", required: true },
    { name: "displacement_um", type: "number", required: true },
];
const FORCE_FIELDS = [
    { name: "timestamp_ms", type: "number", required: true },
    { name: "fx_n", type: "number", required: true },
    { name: "fy_n", type: "number", required: true },
    { name: "fz_n", type: "number", required: true },
    { name: "mx_nm", type: "number", required: false },
    { name: "my_nm", type: "number", required: false },
    { name: "mz_nm", type: "number", required: false },
];
const TEMPERATURE_FIELDS = [
    { name: "timestamp_ms", type: "number", required: true },
    { name: "tool_temp_c", type: "number", required: true },
    { name: "workpiece_temp_c", type: "number", required: true },
    { name: "coolant_temp_c", type: "number", required: true },
];
const SCHEMA_MAP = {
    spindle_load: SPINDLE_FIELDS,
    vibration: VIBRATION_FIELDS,
    force: FORCE_FIELDS,
    temperature: TEMPERATURE_FIELDS,
};
/**
 * Central store for real-time sensor data with per-type ring buffers,
 * sample-rate tracking, and retrieval helpers.
 */
export class SensorDataStore {
    spindle = new RingBuffer();
    vibration = new RingBuffer();
    force = new RingBuffer();
    temperature = new RingBuffer();
    rates = {
        spindle_load: 1000,
        vibration: 5000,
        force: 2000,
        temperature: 10,
    };
    /** Validate and ingest an array of samples into the appropriate buffer. */
    ingest(type, samples) {
        const fields = SCHEMA_MAP[type];
        let accepted = 0;
        let rejected = 0;
        const buf = this.getBuffer(type);
        for (const s of