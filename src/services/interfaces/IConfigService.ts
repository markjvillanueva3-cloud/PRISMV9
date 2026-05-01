/**
 * IConfigService — Service contract for shop configuration and business policy.
 * Externalizes shop rates, pricing policy, setup times, etc. from engine code.
 * Backed by src/data/shop-config.json and src/data/pricing-config.json.
 */

export interface ShopConfig {
  /** Hourly shop rate in USD */
  shopRateUsd: number;
  /** Default setup time in minutes */
  setupTimeMin: number;
  /** Tool change time in seconds */
  toolChangeSec: number;
  /** Currency code */
  currency: string;
}

export interface PricingMarkup {
  /** Complexity multiplier table: complexity_level → markup_factor */
  complexityMarkup: Record<string, number>;
  /** Urgency multiplier table: urgency_level → markup_factor */
  urgencyMarkup: Record<string, number>;
  /** Quantity discount breaks: min_qty → discount_factor */
  quantityDiscountBreaks: Array<{ minQty: number; discount: number }>;
}

export interface IConfigService {
  /** Get shop floor configuration (rates, times, currency) */
  getShopConfig(): ShopConfig;

  /** Get pricing policy (markups, discounts) */
  getPricingConfig(): PricingMarkup;

  /** Get a specific config value by key path (e.g., "shop.shopRateUsd") */
  getValue<T = unknown>(keyPath: string): T | undefined;

  /** Check if a config key exists */
  hasKey(keyPath: string): boolean;
}
