/**
 * RegexCatalogEngine — HCAP14 named-regex catalog with safe-compile gating.
 *
 * Pure-core: caller registers named regex patterns; engine compiles + caches
 * + offers match/test/extract surfaces.  Each pattern is validated at
 * registration time so callers never hit a malformed pattern at runtime.
 *
 * Includes a catastrophic-backtracking heuristic (nested unbounded quantifiers
 * over the same character class) — flagged on register but not auto-blocked.
 *
 * @module engines/RegexCatalogEngine
 */

import { z } from "zod";

export const RegexFlagsSchema = z.string().regex(/^[gimsuy]*$/, "flags must be subset of gimsuy");

export const RegexEntrySchema = z.object({
  name: z.string().min(1).max(120),
  pattern: z.string().min(1).max(2000),
  flags: RegexFlagsSchema.default(""),
  description: z.string().max(500).optional(),
});
export type RegexEntry = z.infer<typeof RegexEntrySchema>;

export interface RegexCatalogState {
  entries: Map<string, { entry: RegexEntry; compiled: RegExp; suspicious: boolean }>;
}

const BACKTRACK_RE = /\([^)]*\+[^)]*\)\+|\([^)]*\*[^)]*\)\+|\([^)]*\+[^)]*\)\*/;

export class RegexCatalogEngine {
  static validateEntry(e: unknown): RegexEntry { return RegexEntrySchema.parse(e); }
  static empty(): RegexCatalogState { return { entries: new Map() }; }

  /** Register a pattern; compiles eagerly + flags suspicious patterns. */
  static register(state: RegexCatalogState, entry: RegexEntry): RegexCatalogState {
    RegexEntrySchema.parse(entry);
    if (state.entries.has(entry.name)) {
      throw new Error(`RegexCatalog.register: duplicate name ${entry.name}`);
    }
    let compiled: RegExp;
    try {
      compiled = new RegExp(entry.pattern, entry.flags);
    } catch (e) {
      throw new Error(`RegexCatalog.register: invalid pattern: ${e instanceof Error ? e.message : "?"}`);
    }
    const suspicious = BACKTRACK_RE.test(entry.pattern);
    const next = new Map(state.entries);
    next.set(entry.name, { entry, compiled, suspicious });
    return { entries: next };
  }

  /** Test if a string matches a named pattern. */
  static test(state: RegexCatalogState, name: string, input: string): boolean {
    const slot = state.entries.get(name);
    if (!slot) throw new Error(`RegexCatalog.test: pattern ${name} not registered`);
    return slot.compiled.test(input);
  }

  /** Extract all matches for a named pattern (returns empty array on no match). */
  static extractAll(state: RegexCatalogState, name: string, input: string): string[] {
    const slot = state.entries.get(name);
    if (!slot) throw new Error(`RegexCatalog.extractAll: pattern ${name} not registered`);
    const globalFlags = slot.entry.flags.includes("g") ? slot.entry.flags : slot.entry.flags + "g";
    const re = new RegExp(slot.entry.pattern, globalFlags);
    const matches = [...input.matchAll(re)];
    return matches.map((m) => m[0]);
  }

  /** Deregister a named pattern. */
  static deregister(state: RegexCatalogState, name: string): RegexCatalogState {
    if (!state.entries.has(name)) {
      throw new Error(`RegexCatalog.deregister: pattern ${name} not found`);
    }
    const next = new Map(state.entries);
    next.delete(name);
    return { entries: next };
  }

  /** List all registered patterns. */
  static list(state: RegexCatalogState): { name: string; suspicious: boolean }[] {
    return [...state.entries.entries()].map(([name, slot]) => ({ name, suspicious: slot.suspicious }));
  }

  static renderState(state: RegexCatalogState): string {
    if (state.entries.size === 0) return "[REGEX-CATALOG] (empty)";
    return [
      `[REGEX-CATALOG] ${state.entries.size} registered`,
      ...[...state.entries.entries()].map(([name, slot]) =>
        `  ${name}: /${slot.entry.pattern}/${slot.entry.flags}${slot.suspicious ? " ⚠ suspicious-backtrack" : ""}`,
      ),
    ].join("\n");
  }
}

export const regexCatalogEngine = RegexCatalogEngine;
