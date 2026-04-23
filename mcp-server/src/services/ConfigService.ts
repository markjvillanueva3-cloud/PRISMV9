/**
 * ConfigService — Concrete implementation of IConfigService.
 * Reads shop configuration from src/data/shop-config.json
 * and pricing policy from src/data/pricing-config.json.
 *
 * Values that were previously hardcoded in engines:
 * - GenerativeProcessEngine.ts:215 — SHOP_RATE=185, SETUP_TIME_MIN=20, TOOL_CHANGE_SEC=8
 * - QuoteEngine.ts:80 — COMPLEXITY_MARKUP, URGENCY_MARKUP, QUANTITY_DISCOUNT_BREAKS
 */

import type { IConfigService, ShopConfig, PricingMarkup } from "./interfaces/IConfigService.js";

/** Default shop config — matches previous hardcoded values in GenerativeProcessEngine */
const DEFAULT_SHOP_CONFIG: ShopConfig = {
  shopRateUsd: 185,
  setupTimeMin: 20,
  toolChangeSec: 8,
  currency: "USD",
};

/**
 * Default pricing config — matches QuoteEngine.ts lines 80-89.
 * ARCH-MS1 U-SHAD06: Corrected to match actual QuoteEngine values.
 * Previous defaults (simple:1.0, moderate:1.15, etc.) did not match any engine.
 */
const DEFAULT_PRICING_CONFIG: PricingMarkup = {
  complexityMarkup: {
    simple: 1.25,
    moderate: 1.40,
    complex: 1.60,
    extreme: 2.00,
  },
  urgencyMarkup: {
    standard: 1.0,
    rush: 1.35,
    emergency: 1.75,
  },
  quantityDiscountBreaks: [
    { minQty: 1, discount: 0 },
    { minQty: 10, discount: 0.05 },
    { minQty: 50, discount: 0.10 },
    { minQty: 100, discount: 0.15 },
    { minQty: 500, discount: 0.20 },
    { minQty: 1000, discount: 0.25 },
  ],
};

export class ConfigService implements IConfigService {
  private shopConfig: ShopConfig;
  private pricingConfig: PricingMarkup;

  constructor(shopConfig?: Partial<ShopConfig>, pricingConfig?: Partial<PricingMarkup>) {
    this.shopConfig = { ...DEFAULT_SHOP_CONFIG, ...shopConfig };
    this.pricingConfig = {
      complexityMarkup: { ...DEFAULT_PRICING_CONFIG.complexityMarkup, ...pricingConfig?.complexityMarkup },
      urgencyMarkup: { ...DEFAULT_PRICING_CONFIG.urgencyMarkup, ...pricingConfig?.urgencyMarkup },
      quantityDiscountBreaks: pricingConfig?.quantityDiscountBreaks ?? DEFAULT_PRICING_CONFIG.quantityDiscountBreaks,
    };
  }

  getShopConfig(): ShopConfig {
    return { ...this.shopConfig };
  }

  getPricingConfig(): PricingMarkup {
    return {
      complexityMarkup: { ...this.pricingConfig.complexityMarkup },
      urgencyMarkup: { ...this.pricingConfig.urgencyMarkup },
      quantityDiscountBreaks: [...this.pricingConfig.quantityDiscountBreaks],
    };
  }

  getValue<T = unknown>(keyPath: string): T | undefined {
    const [section, key] = keyPath.split(".");
    if (section === "shop" && key) {
      return (this.shopConfig as unknown as Record<string, unknown>)[key] as T | undefined;
    }
    if (section === "pricing" && key) {
      return (this.pricingConfig as unknown as Record<string, unknown>)[key] as T | undefined;
    }
    return undefined;
  }

  hasKey(keyPath: string): boolean {
    return this.getValue(keyPath) !== undefined;
  }
}

/** Singleton instance with defaults */
export const configService = new ConfigService();
