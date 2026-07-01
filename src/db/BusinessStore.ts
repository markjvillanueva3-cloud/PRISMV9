/**
 * BusinessStore — Persistence Adapter Pattern for PRISM Business Engines
 * =====================================================================
 *
 * Provides IBusinessStore<T> interface with two implementations:
 *   - PostgresBusinessStore<T> — uses real PostgreSQL via DatabaseConnection
 *   - InMemoryBusinessStore<T> — uses JavaScript Maps (development fallback)
 *
 * Factory: getStore(entity, config) returns Postgres if DATABASE_URL is set,
 * else InMemory. Engines call getStore() and never worry about which backend.
 *
 * @version 1.1.0 — Session 5-1 (U-PERS2), post-review fixes applied
 */

import { db, type QueryResult } from "./connection.js";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface StoreRecord {
  id?: string;
  [key: string]: unknown;
}

export interface QueryFilter {
  where?: Record<string, unknown>;
  orderBy?: string;
  order?: "ASC" | "DESC";
  limit?: number;
  offset?: number;
}

export interface StoreResult<T> {
  data: T | null;
  ok: boolean;
  error?: string;
}

export interface StoreListResult<T> {
  data: T[];
  total: number;
  ok: boolean;
  error?: string;
}

// ─── Interface ──────────────────────────────────────────────────────────────

export interface IBusinessStore<T extends StoreRecord> {
  save(record: T): Promise<StoreResult<T>>;
  findById(id: string): Promise<StoreResult<T>>;
  findByField(field: string, value: unknown): Promise<StoreResult<T>>;
  findAll(filter?: QueryFilter): Promise<StoreListResult<T>>;
  update(id: string, changes: Partial<T>): Promise<StoreResult<T>>;
  delete(id: string): Promise<StoreResult<T>>;
  query(filter: QueryFilter): Promise<StoreListResult<T>>;
  count(where?: Record<string, unknown>): Promise<number>;
  clear(): Promise<void>;
}

// ─── Entity Configuration ───────────────────────────────────────────────────

export interface EntityConfig {
  tableName: string;
  primaryKey: string;
  /** Column used as the business key (e.g., wo_number, invoice_number) */
  businessKey?: string;
  /** Columns that are JSONB in Postgres (serialized/deserialized automatically) */
  jsonColumns?: string[];
  /** Columns that are TEXT[] in Postgres */
  arrayColumns?: string[];
  /** Whether the table has an updated_at column */
  hasUpdatedAt?: boolean;
  /** All known column names for this entity (for SQL identifier validation) */
  knownColumns: string[];
}

// ─── SQL Identifier Validation (C1 fix) ─────────────────────────────────────

const SAFE_IDENTIFIER_RE = /^[a-z_][a-z0-9_]*$/i;

function validateIdentifier(name: string, context: string): void {
  if (!SAFE_IDENTIFIER_RE.test(name)) {
    throw new Error(`Invalid SQL identifier in ${context}: "${name}"`);
  }
}

function validateColumn(name: string, config: EntityConfig): void {
  validateIdentifier(name, config.tableName);
  if (!config.knownColumns.includes(name)) {
    throw new Error(
      `Unknown column "${name}" for entity "${config.tableName}". ` +
      `Known columns: ${config.knownColumns.join(", ")}`
    );
  }
}

// ─── Entity Registry ────────────────────────────────────────────────────────

const ENTITY_CONFIGS: Record<string, EntityConfig> = {
  work_orders: {
    tableName: "work_orders",
    primaryKey: "id",
    businessKey: "wo_number",
    hasUpdatedAt: true,
    knownColumns: ["id", "wo_number", "part_number", "revision", "material", "quantity", "due_date", "customer", "status", "erp_source", "erp_external_id", "notes", "created_at", "updated_at"],
  },
  wo_routing_steps: {
    tableName: "wo_routing_steps",
    primaryKey: "id",
    arrayColumns: ["tool_list"],
    hasUpdatedAt: false,
    knownColumns: ["id", "work_order_id", "step", "operation", "work_center", "estimated_time_min", "actual_time_min", "setup_time_min", "tool_list", "created_at"],
  },
  prism_plans: {
    tableName: "prism_plans",
    primaryKey: "id",
    businessKey: "wo_number",
    jsonColumns: ["estimated_cost"],
    arrayColumns: ["recommendations"],
    hasUpdatedAt: true,
    knownColumns: ["id", "wo_number", "part_number", "material", "quantity", "total_cycle_time_min", "total_setup_time_min", "estimated_cost", "recommendations", "created_at", "updated_at"],
  },
  prism_plan_steps: {
    tableName: "prism_plan_steps",
    primaryKey: "id",
    jsonColumns: ["parameters", "tool_recommendation"],
    hasUpdatedAt: false,
    knownColumns: ["id", "plan_id", "step", "operation", "work_center", "prism_cycle_time_min", "prism_setup_time_min", "parameters", "tool_recommendation", "created_at"],
  },
  cost_feedback: {
    tableName: "cost_feedback",
    primaryKey: "id",
    jsonColumns: ["actual_cost", "estimated_cost", "variance"],
    hasUpdatedAt: false,
    knownColumns: ["id", "wo_number", "actual_cost", "estimated_cost", "variance", "recorded_at", "recorded_by"],
  },
  quality_records: {
    tableName: "quality_records",
    primaryKey: "id",
    jsonColumns: ["details"],
    hasUpdatedAt: false,
    knownColumns: ["id", "wo_number", "record_type", "inspector", "result", "details", "recorded_at"],
  },
  quality_measurements: {
    tableName: "quality_measurements",
    primaryKey: "id",
    hasUpdatedAt: false,
    knownColumns: ["id", "quality_record_id", "feature_name", "nominal", "tolerance_plus", "tolerance_minus", "actual", "unit", "in_tolerance", "measured_at"],
  },
  employees: {
    tableName: "employees",
    primaryKey: "id",
    businessKey: "employee_id",
    arrayColumns: ["skills", "certifications"],
    jsonColumns: ["emergency_contact", "overtime_policy", "shift_differential"],
    hasUpdatedAt: true,
    knownColumns: ["id", "employee_id", "name", "email", "phone", "department", "role", "shift", "hire_date", "hourly_rate", "status", "skills", "certifications", "emergency_contact", "notes", "clearance_level", "auth_user_id", "overtime_policy", "shift_differential", "created_at", "updated_at"],
  },
  time_entries: {
    tableName: "time_entries",
    primaryKey: "id",
    hasUpdatedAt: true,
    knownColumns: ["id", "employee_id", "employee_name", "shift_date", "clock_in", "clock_out", "hours_worked", "status", "overtime_hours", "break_minutes", "notes", "handoff_notes", "created_at", "updated_at"],
  },
  job_time_entries: {
    tableName: "job_time_entries",
    primaryKey: "id",
    jsonColumns: ["pause_periods"],
    hasUpdatedAt: true,
    knownColumns: ["id", "job_id", "employee_id", "employee_name", "operation", "machine_id", "start_time", "end_time", "elapsed_min", "quantity_completed", "scrap_count", "status", "notes", "process_type", "pause_periods", "good_parts", "scrap_reason", "improvement_note", "takt_time_sec", "quality_project_id", "created_at", "updated_at"],
  },
  invoices: {
    tableName: "invoices",
    primaryKey: "id",
    businessKey: "invoice_number",
    hasUpdatedAt: true,
    knownColumns: ["id", "invoice_number", "customer_id", "customer_name", "job_id", "status", "invoice_date", "due_date", "subtotal", "tax_rate", "tax_amount", "total", "amount_paid", "payment_terms", "notes", "created_at", "updated_at"],
  },
  invoice_line_items: {
    tableName: "invoice_line_items",
    primaryKey: "id",
    hasUpdatedAt: false,
    knownColumns: ["id", "invoice_id", "description", "quantity", "unit_price", "amount", "seq_order"],
  },
  purchase_orders: {
    tableName: "purchase_orders",
    primaryKey: "id",
    businessKey: "po_number",
    hasUpdatedAt: true,
    knownColumns: ["id", "po_number", "vendor_id", "vendor_name", "status", "order_date", "expected_date", "subtotal", "tax", "shipping", "total", "payment_terms", "ship_to", "notes", "approved_by", "approved_at", "created_at", "updated_at"],
  },
  po_line_items: {
    tableName: "po_line_items",
    primaryKey: "id",
    hasUpdatedAt: false,
    knownColumns: ["id", "po_id", "item_description", "part_number", "quantity", "unit_price", "amount", "received_qty", "seq_order"],
  },
  po_receivings: {
    tableName: "po_receivings",
    primaryKey: "id",
    hasUpdatedAt: false,
    knownColumns: ["id", "po_id", "line_item_id", "received_qty", "received_date", "received_by", "condition", "notes", "created_at"],
  },
  gl_accounts: {
    tableName: "gl_accounts",
    primaryKey: "id",
    businessKey: "code",
    hasUpdatedAt: true,
    knownColumns: ["id", "code", "name", "account_type", "normal_balance", "balance", "parent_code", "active", "created_at", "updated_at"],
  },
  gl_journal_entries: {
    tableName: "gl_journal_entries",
    primaryKey: "id",
    businessKey: "entry_number",
    hasUpdatedAt: false,
    knownColumns: ["id", "entry_number", "entry_date", "description", "reference", "source", "status", "total_debit", "total_credit", "posted_by", "posted_at", "created_at"],
  },
  gl_journal_lines: {
    tableName: "gl_journal_lines",
    primaryKey: "id",
    hasUpdatedAt: false,
    knownColumns: ["id", "entry_id", "account_code", "debit", "credit", "memo", "seq_order"],
  },
  customer_communications: {
    tableName: "customer_communications",
    primaryKey: "id",
    hasUpdatedAt: false,
    knownColumns: ["id", "customer_id", "comm_type", "subject", "body", "direction", "logged_by", "logged_at"],
  },
  tool_inventory: {
    tableName: "tool_inventory",
    primaryKey: "id",
    businessKey: "tool_id",
    hasUpdatedAt: true,
    knownColumns: ["id", "tool_id", "description", "category", "quantity_on_hand", "reorder_point", "reorder_quantity", "unit_cost", "location", "last_used_date", "notes", "created_at", "updated_at"],
  },
  customers: {
    tableName: "customers",
    primaryKey: "id",
    businessKey: "customer_id",
    hasUpdatedAt: true,
    knownColumns: ["id", "customer_id", "name", "company", "contact_name", "email", "phone", "address", "pricing_tier", "credit_limit", "current_balance", "status", "tags", "notes", "created_at", "updated_at"],
    arrayColumns: ["tags"],
  },
  sales_opportunities: {
    tableName: "sales_opportunities",
    primaryKey: "id",
    hasUpdatedAt: false,
    knownColumns: ["id", "customer_id", "description", "estimated_value", "probability_pct", "stage", "source", "close_date", "lost_reason", "created_at"],
  },
  shop_profiles: {
    tableName: "shop_profiles",
    primaryKey: "id",
    hasUpdatedAt: true,
    jsonColumns: ["rates", "machines"],
    knownColumns: ["id", "name", "rates", "machines", "overhead_pct", "material_markup_pct", "tooling_cost_per_op", "material_cost_per_part_default", "created_at", "updated_at"],
  },

  // ── INFRA-1-2 U-PER2: Registry Persistence ──────────────────────────────
  materials: {
    tableName: "materials",
    primaryKey: "id",
    businessKey: "name",
    hasUpdatedAt: true,
    jsonColumns: [
      "physical", "mechanical", "thermal", "machining",
      "kienzle", "johnson_cook", "taylor", "tribology",
      "chip_formation", "thermal_machining", "surface_integrity",
      "machinability", "cutting_recommendations", "surface",
      "process_specific", "weldability", "classification",
      "designation", "chemistry", "composition", "statistics",
      "standards", "metadata",
    ],
    arrayColumns: ["common_names", "applications", "data_sources", "sources"],
    knownColumns: [
      "id", "name", "iso_group", "category", "subcategory", "material_type",
      "iso_p_equivalent", "condition", "density_kg_m3", "hardness_hrc",
      "tensile_strength_mpa", "thermal_conductivity", "machinability_factor",
      "specific_cutting_force_n_mm2", "data_quality", "param_count", "notes",
      // JSONB columns
      "physical", "mechanical", "thermal", "machining",
      "kienzle", "johnson_cook", "taylor", "tribology",
      "chip_formation", "thermal_machining", "surface_integrity",
      "machinability", "cutting_recommendations", "surface",
      "process_specific", "weldability", "classification",
      "designation", "chemistry", "composition", "statistics",
      "standards", "metadata",
      // Array columns
      "common_names", "applications", "data_sources", "sources",
      // Timestamps
      "created_at", "updated_at",
    ],
  },
  machines: {
    tableName: "machines",
    primaryKey: "id",
    businessKey: "name",
    hasUpdatedAt: true,
    jsonColumns: [
      "envelope", "spindle", "axes", "tool_changer", "table_specs",
      "controller_specs", "footprint", "price_range", "kinematic_chain",
      "metadata",
    ],
    arrayColumns: ["options", "typical_applications"],
    knownColumns: [
      "id", "name", "brand", "model", "type", "controller",
      "max_rpm", "max_power_kw", "max_torque_nm", "spindle_taper",
      "x_travel_mm", "y_travel_mm", "z_travel_mm",
      "tool_capacity", "pallet_count", "hourly_rate_usd",
      "weight_kg", "power_requirement_kva", "simultaneous_axes",
      "high_speed_machining", "rigid_tapping", "probing_ready",
      "automation_ready", "layer", "year_introduced",
      "active", "notes",
      // JSONB columns
      "envelope", "spindle", "axes", "tool_changer", "table_specs",
      "controller_specs", "footprint", "price_range", "kinematic_chain",
      "metadata",
      // Array columns
      "options", "typical_applications",
      // Timestamps
      "created_at", "updated_at",
    ],
  },
};

// ─── PostgresBusinessStore ──────────────────────────────────────────────────

export class PostgresBusinessStore<T extends StoreRecord> implements IBusinessStore<T> {
  constructor(private config: EntityConfig) {}

  async save(record: T): Promise<StoreResult<T>> {
    const cols: string[] = [];
    const vals: unknown[] = [];
    const placeholders: string[] = [];
    let idx = 1;

    for (const [key, value] of Object.entries(record)) {
      if (key === this.config.primaryKey && !value) continue;
      validateColumn(key, this.config);
      cols.push(key);
      vals.push(this.serializeValue(key, value));
      placeholders.push(`$${idx++}`);
    }

    // H7: upsert support — ON CONFLICT DO UPDATE if business key exists
    let sql: string;
    if (this.config.businessKey && cols.includes(this.config.businessKey)) {
      const updateSets = cols
        .filter(c => c !== this.config.primaryKey && c !== this.config.businessKey)
        .map((c, i) => `${c} = EXCLUDED.${c}`)
        .join(", ");
      sql = `INSERT INTO ${this.config.tableName} (${cols.join(", ")})
        VALUES (${placeholders.join(", ")})
        ON CONFLICT (${this.config.businessKey}) DO UPDATE SET ${updateSets || `${cols[0]} = EXCLUDED.${cols[0]}`}
        RETURNING *`;
    } else {
      sql = `INSERT INTO ${this.config.tableName} (${cols.join(", ")})
        VALUES (${placeholders.join(", ")})
        RETURNING *`;
    }

    const result = await db.query<T>(sql, vals);
    if (result.rowCount === 0) {
      return { data: null, ok: false, error: "Insert returned no rows" };
    }
    return { data: result.rows[0], ok: true };
  }

  async findById(id: string): Promise<StoreResult<T>> {
    const sql = `SELECT * FROM ${this.config.tableName} WHERE ${this.config.primaryKey} = $1`;
    const result = await db.query<T>(sql, [id]);
    if (result.rowCount === 0) {
      return { data: null, ok: false, error: "Not found" };
    }
    return { data: result.rows[0], ok: true };
  }

  async findByField(field: string, value: unknown): Promise<StoreResult<T>> {
    validateColumn(field, this.config);
    const sql = `SELECT * FROM ${this.config.tableName} WHERE ${field} = $1 LIMIT 1`;
    const result = await db.query<T>(sql, [value]);
    if (result.rowCount === 0) {
      return { data: null, ok: false, error: "Not found" };
    }
    return { data: result.rows[0], ok: true };
  }

  async findAll(filter?: QueryFilter): Promise<StoreListResult<T>> {
    return this.query(filter ?? {});
  }

  async update(id: string, changes: Partial<T>): Promise<StoreResult<T>> {
    const sets: string[] = [];
    const vals: unknown[] = [];
    let idx = 1;

    for (const [key, value] of Object.entries(changes)) {
      if (key === this.config.primaryKey) continue;
      validateColumn(key, this.config);
      sets.push(`${key} = $${idx++}`);
      vals.push(this.serializeValue(key, value));
    }

    if (sets.length === 0) {
      return this.findById(id);
    }

    // Only add updated_at if the table has that column (H3 fix)
    if (this.config.hasUpdatedAt) {
      sets.push(`updated_at = NOW()`);
    }

    vals.push(id);
    const sql = `UPDATE ${this.config.tableName}
      SET ${sets.join(", ")}
      WHERE ${this.config.primaryKey} = $${idx}
      RETURNING *`;

    const result = await db.query<T>(sql, vals);
    if (result.rowCount === 0) {
      return { data: null, ok: false, error: "Not found" };
    }
    return { data: result.rows[0], ok: true };
  }

  async delete(id: string): Promise<StoreResult<T>> {
    const sql = `DELETE FROM ${this.config.tableName} WHERE ${this.config.primaryKey} = $1 RETURNING *`;
    const result = await db.query<T>(sql, [id]);
    if (result.rowCount === 0) {
      return { data: null, ok: false, error: "Not found" };
    }
    return { data: result.rows[0], ok: true };
  }

  async query(filter: QueryFilter): Promise<StoreListResult<T>> {
    const conditions: string[] = [];
    const vals: unknown[] = [];
    let idx = 1;

    if (filter.where) {
      for (const [key, value] of Object.entries(filter.where)) {
        validateColumn(key, this.config);
        if (value === null) {
          conditions.push(`${key} IS NULL`);
        } else if (Array.isArray(value)) {
          conditions.push(`${key} = ANY($${idx++})`);
          vals.push(value);
        } else {
          conditions.push(`${key} = $${idx++}`);
          vals.push(value);
        }
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Validate orderBy column (C1 fix)
    let orderClause = "";
    if (filter.orderBy) {
      validateColumn(filter.orderBy, this.config);
      // P0-3: runtime-validate order direction to prevent SQL injection
      const direction = filter.order === "DESC" ? "DESC" : "ASC";
      orderClause = `ORDER BY ${filter.orderBy} ${direction}`;
    }

    // H4: enforce default and max LIMIT to prevent unbounded queries
    const MAX_LIMIT = 10000;
    const DEFAULT_LIMIT = 1000;
    const effectiveLimit = Math.min(filter.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

    let limitClause = "";
    let offsetClause = "";
    const countVals = [...vals]; // separate vals for count query
    limitClause = `LIMIT $${idx++}`;
    vals.push(effectiveLimit);
    if (filter.offset !== undefined && filter.offset > 0) {
      offsetClause = `OFFSET $${idx++}`;
      vals.push(filter.offset);
    }

    // Count query uses only where-clause params (M3 fix — dedicated count)
    const countSql = `SELECT COUNT(*) as cnt FROM ${this.config.tableName} ${whereClause}`;
    const countResult = await db.query<{ cnt: string }>(countSql, countVals);
    const total = parseInt(countResult.rows[0]?.cnt ?? "0", 10);

    const dataSql = `SELECT * FROM ${this.config.tableName} ${whereClause} ${orderClause} ${limitClause} ${offsetClause}`;
    const dataResult = await db.query<T>(dataSql, vals);

    return {
      data: dataResult.rows,
      total,
      ok: true,
    };
  }

  async count(where?: Record<string, unknown>): Promise<number> {
    // M3 fix: dedicated count query instead of delegating to query()
    const conditions: string[] = [];
    const vals: unknown[] = [];
    let idx = 1;

    if (where) {
      for (const [key, value] of Object.entries(where)) {
        validateColumn(key, this.config);
        if (value === null) {
          conditions.push(`${key} IS NULL`);
        } else if (Array.isArray(value)) {
          conditions.push(`${key} = ANY($${idx++})`);
          vals.push(value);
        } else {
          conditions.push(`${key} = $${idx++}`);
          vals.push(value);
        }
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const sql = `SELECT COUNT(*) as cnt FROM ${this.config.tableName} ${whereClause}`;
    const result = await db.query<{ cnt: string }>(sql, vals);
    return parseInt(result.rows[0]?.cnt ?? "0", 10);
  }

  async clear(): Promise<void> {
    // H3: whitelist approach — only allow in test environments
    const isTestEnv = process.env.NODE_ENV === "test" ||
      (process.env.DATABASE_URL?.includes("localhost") ?? false);
    if (!isTestEnv) {
      throw new Error(`clear() is only allowed in test environments (table: ${this.config.tableName})`);
    }
    await db.query(`DELETE FROM ${this.config.tableName}`);
  }

  private serializeValue(key: string, value: unknown): unknown {
    if (this.config.jsonColumns?.includes(key) && typeof value === "object" && value !== null) {
      return JSON.stringify(value);
    }
    return value;
  }
}

// ─── InMemoryBusinessStore ──────────────────────────────────────────────────

export class InMemoryBusinessStore<T extends StoreRecord> implements IBusinessStore<T> {
  private store: Map<string, T> = new Map();
  private idIndex: Map<string, string> = new Map(); // id → map key (M2 fix)
  private autoId = 1;

  constructor(private config: EntityConfig) {}

  async save(record: T): Promise<StoreResult<T>> {
    // H4 fix: single ID generation point
    const id = (record.id as string) ??
      (record[this.config.businessKey ?? ""] as string) ??
      `auto-${this.autoId++}`;

    const saved = { ...record, id } as T;
    const mapKey = this.computeKey(saved);
    this.store.set(mapKey, saved);
    if (id !== mapKey) {
      this.idIndex.set(id, mapKey); // M2 fix: secondary index
    }
    return { data: saved, ok: true };
  }

  async findById(id: string): Promise<StoreResult<T>> {
    // Direct lookup
    const direct = this.store.get(id);
    if (direct) return { data: direct, ok: true };
    // M2 fix: secondary index lookup by id field
    const mapKey = this.idIndex.get(id);
    if (mapKey) {
      const record = this.store.get(mapKey);
      if (record) return { data: record, ok: true };
    }
    return { data: null, ok: false, error: "Not found" };
  }

  async findByField(field: string, value: unknown): Promise<StoreResult<T>> {
    for (const record of this.store.values()) {
      if (record[field] === value) {
        return { data: record, ok: true };
      }
    }
    return { data: null, ok: false, error: "Not found" };
  }

  async findAll(filter?: QueryFilter): Promise<StoreListResult<T>> {
    return this.query(filter ?? {});
  }

  async update(id: string, changes: Partial<T>): Promise<StoreResult<T>> {
    const found = await this.findById(id);
    if (!found.ok || !found.data) {
      return { data: null, ok: false, error: "Not found" };
    }
    const updated = { ...found.data, ...changes } as T;
    const mapKey = this.computeKey(updated);
    this.store.set(mapKey, updated);
    return { data: updated, ok: true };
  }

  async delete(id: string): Promise<StoreResult<T>> {
    // Direct key
    const direct = this.store.get(id);
    if (direct) {
      this.store.delete(id);
      this.idIndex.delete(String(direct.id));
      return { data: direct, ok: true };
    }
    // Via id index
    const mapKey = this.idIndex.get(id);
    if (mapKey) {
      const record = this.store.get(mapKey);
      this.store.delete(mapKey);
      this.idIndex.delete(id);
      return { data: record ?? null, ok: !!record };
    }
    return { data: null, ok: false, error: "Not found" };
  }

  async query(filter: QueryFilter): Promise<StoreListResult<T>> {
    let results = [...this.store.values()];

    if (filter.where) {
      results = results.filter((record) => {
        for (const [key, value] of Object.entries(filter.where!)) {
          if (value === null) {
            if (record[key] !== null && record[key] !== undefined) return false;
          } else if (Array.isArray(value)) {
            if (!value.includes(record[key])) return false;
          } else {
            if (record[key] !== value) return false;
          }
        }
        return true;
      });
    }

    const total = results.length;

    if (filter.orderBy) {
      const field = filter.orderBy;
      const dir = filter.order === "DESC" ? -1 : 1;
      results.sort((a, b) => {
        const av = a[field], bv = b[field];
        if (av === bv) return 0;
        if (av === null || av === undefined) return 1;
        if (bv === null || bv === undefined) return -1;
        return av < bv ? -dir : dir;
      });
    }

    if (filter.offset) results = results.slice(filter.offset);
    if (filter.limit) results = results.slice(0, filter.limit);

    return { data: results, total, ok: true };
  }

  async count(where?: Record<string, unknown>): Promise<number> {
    if (!where) return this.store.size;
    const result = await this.query({ where });
    return result.total;
  }

  async clear(): Promise<void> {
    this.store.clear();
    this.idIndex.clear();
  }

  /** Get all records as an array (convenience for migration from Map usage). */
  getAll(): T[] {
    return [...this.store.values()];
  }

  /** Direct Map access for backward compatibility during migration. */
  getMap(): Map<string, T> {
    return this.store;
  }

  /** M8 fix: reset for testing */
  reset(): void {
    this.store.clear();
    this.idIndex.clear();
    this.autoId = 1;
  }

  // H4 fix: single key computation, no autoId side effects
  private computeKey(record: T): string {
    if (this.config.businessKey && record[this.config.businessKey]) {
      return String(record[this.config.businessKey]);
    }
    return String(record.id);
  }
}

// ─── Factory ────────────────────────────────────────────────────────────────

// P0-1: instance cache — same entity always returns same store instance
const storeCache = new Map<string, IBusinessStore<any>>();
let lastMode: "postgres" | "memory" | null = null;

export function getStore<T extends StoreRecord>(entity: string): IBusinessStore<T> {
  const config = ENTITY_CONFIGS[entity];
  if (!config) {
    throw new Error(`Unknown entity: ${entity}. Register it in ENTITY_CONFIGS.`);
  }

  const currentMode = db.isConnected() ? "postgres" : "memory";

  // Invalidate cache if mode changed (e.g., DB came online)
  if (lastMode !== null && lastMode !== currentMode) {
    storeCache.clear();
  }
  lastMode = currentMode;

  const cached = storeCache.get(entity);
  if (cached) return cached as IBusinessStore<T>;

  const store = currentMode === "postgres"
    ? new PostgresBusinessStore<T>(config)
    : new InMemoryBusinessStore<T>(config);

  storeCache.set(entity, store);
  return store;
}

/** Clear the store cache (for testing). */
export function resetStoreCache(): void {
  storeCache.clear();
  lastMode = null;
}

export async function initPersistence(): Promise<{ mode: "postgres" | "memory" }> {
  const connected = await db.connect();
  return { mode: connected ? "postgres" : "memory" };
}

/**
 * Run a function within a database transaction.
 * Throws in memory mode — callers requiring atomicity must handle this.
 */
export async function withTransaction<R>(
  fn: (query: (sql: string, params?: unknown[]) => Promise<QueryResult>) => Promise<R>
): Promise<R> {
  if (db.isConnected()) {
    return db.transaction(fn);
  }
  throw new Error("Transactions require a PostgreSQL connection. Set DATABASE_URL.");
}

export async function persistenceHealth(): Promise<{
  mode: "postgres" | "memory";
  connected: boolean;
  tables: Record<string, number>;
}> {
  const connected = db.isConnected();
  const tables: Record<string, number> = {};

  if (connected) {
    for (const [name, config] of Object.entries(ENTITY_CONFIGS)) {
      try {
        const result = await db.query<{ cnt: string }>(
          `SELECT COUNT(*) as cnt FROM ${config.tableName}`
        );
        tables[name] = parseInt(result.rows[0]?.cnt ?? "0", 10);
      } catch {
        tables[name] = -1;
      }
    }
  }

  return { mode: connected ? "postgres" : "memory", connected, tables };
}

/** Expose entity configs for external validation. */
export function getEntityConfig(entity: string): EntityConfig | undefined {
  return ENTITY_CONFIGS[entity];
}
