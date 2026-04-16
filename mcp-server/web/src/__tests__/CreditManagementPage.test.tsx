/**
 * ProgramDatabaseEngine — In-memory program database for parsed CNC programs
 *
 * Stores parsed program metadata from all parsers (Okuma, Haas, Hurco,
 * Roku-Roku). Provides fast queries by machine, customer, operation type,
 * date range, and tool. Used by pattern mining and optimization pipelines.
 *
 * Uses a simple in-memory store with JSON persistence (no SQLite dependency
 * needed — the dataset fits in memory and persistence is via JSON snapshots).
 *
 * @module ProgramDatabaseEngine
 */
import { log } from "../utils/Logger.js";
import * as fs from "fs";
import * as path from "path";
// ============================================================================
// ENGINE
// ============================================================================
export class ProgramDatabaseEngine {
    records = new Map();
    persistPath;
    constructor(persistPath) {
        this.persistPath = persistPath ?? path.join(process.cwd(), "data", "program-database.json");
    }
    /**
     * Add a parsed program record.
     */
    addRecord(record) {
        this.records.set(record.id, record);
    }
    /**
     * Add multiple records in batch.
     */
    addBatch(records) {
        for (const r of records) {
            this.records.set(r.id, r);
        }
        return records.length;
    }
    /**
     * Get a record by ID.
     */
    getRecord(id) {
        return this.records.get(id);
    }
    /**
     * Query programs with filters.
     */
    query(q) {
        let results = Array.from(this.records.values());
        if (q.machine_type) {
            results = results.filter(r => r.machine_type === q.machine_type);
        }
        if (q.customer) {
            const cust = q.customer.toUpperCase();
            results = results.filter(r => r.customer.toUpperCase().includes(cust));
        }
        if (q.operation_type) {
            const op = q.operation_type;
            results = results.filter(r => r.operations.includes(op));
        }
        if (q.has_threading !== undefined) {
            results = results.filter(r => r.has_threading === q.has_threading);
        }
        if (q.has_bar_feeder !== undefined) {
            results = results.filter(r => r.has_bar_feeder === q.has_bar_feeder);
        }
        if (q.has_c_axis !== undefined) {
            results = results.filter(r => r.has_c_axis === q.has_c_axis);
        }
        if (q.has_probing !== undefined) {
            results = results.filter(r => r.has_probing === q.has_probing);
        }
        if (q.has_high_speed !== undefined) {
        