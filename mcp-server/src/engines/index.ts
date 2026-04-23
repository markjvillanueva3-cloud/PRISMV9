/**
 * PRISM MCP Server — engines barrel (intentionally empty)
 *
 * The previous 7,000-line re-export barrel produced 359 duplicate-identifier
 * errors under strict type-check because multiple engine modules legitimately
 * export same-named types (Vector3, AABB, CollisionResult, ToolMaterial,
 * SpeedFeedInput, etc.).
 *
 * A grep of the full tree shows zero files import from `../engines` or
 * `../../engines` as a module — all engine consumers use direct paths like
 * `../../engines/KienzleForceEngine.js`. The barrel is therefore dead code
 * and is cleared here to unblock strict compilation.
 *
 * If a future caller needs re-exports from this barrel, add them explicitly
 * and alias conflicting type names, e.g.:
 *   export type { Vector3 as GeomVector3 } from "./GeometryEngine.js";
 */
export {};
