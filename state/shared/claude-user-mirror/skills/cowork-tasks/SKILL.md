---
name: cowork-tasks
description: Pre-built multi-step task templates for Cowork desktop agent mode. Includes enrich-catalog, wire-engine, test-sweep, generate-docs workflows.
model: sonnet
effort: medium
argument-hint: "[enrich-catalog|wire-engine|test-sweep|generate-docs]"
---

# Cowork Task Templates

Select a task template based on the argument provided. Execute all steps sequentially.

## enrich-catalog

Multi-step workflow to enrich an existing PRISM catalog with missing data.

1. **Identify target**: Ask which catalog type (tool, machine, material, holder) or auto-detect from context
2. **Audit gaps**: Read the catalog file in `src/data/`, count entries missing required fields:
   - Tools: diameter_mm, flute_count, material, coating, max_rpm, feed_per_tooth
   - Machines: max_rpm, max_feed, axes, controller, work_envelope
   - Holders: taper_type, bore_diameter_mm, gauge_length_mm
3. **Search for data**: Use WebSearch to find manufacturer specs for entries with missing fields
4. **Validate**: Cross-check found values against physics constraints (e.g., carbide endmill max RPM by diameter)
5. **Write**: Update the catalog TypeScript file, preserving existing fields and interfaces
6. **Test**: Run `npx vitest run` on related test files to verify no regressions
7. **Report**: Summarize entries enriched, fields filled, remaining gaps

## wire-engine

Multi-step workflow to create a new PRISM engine and wire it into the system.

1. **Create engine**: Write `src/engines/{Name}Engine.ts` with:
   - TypeScript class, static methods, Zod input validation
   - JSDoc on all public methods
   - Physics formulas referencing `src/physics/constants.ts` where applicable
2. **Create schema**: Write `src/tools/schemas/{name}ActionSchemas.ts` with Zod schemas for each action
3. **Wire dispatcher**: Add action names to the target dispatcher's z.enum, add case statements with lazy imports
4. **Export**: Add engine export to `src/engines/index.ts`
5. **Create tests**: Write `src/__tests__/{Name}Engine.test.ts` with minimum 10 test cases
6. **Build check**: Run `npm run build` (or `~/.claude/hooks/lib/prism-build.sh`) and fix any TS errors
7. **Test run**: Run `npx vitest run src/__tests__/{Name}Engine.test.ts`
8. **Report**: Engine name, action count, test count, dispatcher target

## test-sweep

Multi-step workflow to find and test untested or under-tested engines.

1. **Scan engines**: List all `src/engines/*.ts` files
2. **Scan tests**: List all test files in `src/__tests__/`
3. **Find gaps**: Identify engines with no corresponding test file or <10 test cases
4. **Prioritize**: Sort by engine complexity (line count) descending
5. **Generate**: For top 5 untested engines, create test scaffolds with:
   - Import and basic instantiation test
   - One test per public static method
   - Edge case tests (zero, negative, extreme)
6. **Run**: Execute `npx vitest run` on new test files
7. **Report**: Coverage delta, pass/fail counts, remaining untested engines

## generate-docs

Multi-step workflow to audit and generate missing JSDoc documentation.

1. **Scan**: Find all public methods in `src/engines/*.ts` missing JSDoc
2. **Prioritize**: Sort by engine importance (dispatchers that reference them)
3. **Generate**: Add JSDoc blocks with:
   - @description — what the method does
   - @param — each parameter with type and purpose
   - @returns — return type and structure
   - @example — usage example where non-obvious
4. **Verify**: Run `npm run build` to ensure no TS errors introduced
5. **Report**: Methods documented, files modified, remaining gaps
