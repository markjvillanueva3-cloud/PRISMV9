/**
 * PRISM Product Engine — Thin Re-export Dispatcher
 * ==================================================
 * Backward-compatible re-export layer. All implementation has been split into:
 *
 *   ProductEngineShared.ts  — Shared constants, types, utilities
 *   ProductSFCEngine.ts     — Speed & Feed Calculator (MS0, 10 actions)
 *   ProductPPGEngine.ts     — Post Processor Generator (MS1, 10 actions)
 *   ProductShopEngine.ts    — Shop Manager / Quoting (MS2, 10 actions)
 *   ProductACNCEngine.ts    — Auto CNC Programmer (MS3, 10 actions)
 *
 * Anyone importing from ProductEngine.ts still gets everything they need.
 */

// ─── Re-export product dispatchers ──────────────────────────────────────────

export { productSFC } from "./ProductSFCEngine.js";
export { productPPG } from "./ProductPPGEngine.js";
export { productShop } from "./ProductShopEngine.js";
export { productACNC } from "./ProductACNCEngine.js";

// ─── Re-export all types ────────────────────────────────────────────────────

export type {
  ProductTier,
  SFCAction,
  PPGAction,
  ShopAction,
  ACNCAction,
  ProductAction,
  SFCInput,
  SFCResult,
  SFCCompareResult,
  SFCOptimizeResult,
} from "./ProductEngineShared.js";
