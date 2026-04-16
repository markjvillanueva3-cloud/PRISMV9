/**
 * EquipmentAssetEngine — BIZ-MS5 U-BIZ37
 * Asset registry with straight-line and MACRS depreciation, calibration due tracking, transfer history.
 */
import { persistenceBridge } from "../db/PersistenceBridge.js";

export interface AssetRecord {
  id: string;
  asset_tag: string;
  name: string;
  category: "machine" | "fixture" | "gage" | "tooling" | "other";
  manufacturer: string;
  model_number: string;
  serial_number: string;
  location: string;
  purchase_date: string;
  purchase_cost: number;
  salvage_value: number;
  useful_life_years: number;
  depreciation_method: "straight_line" | "macrs_5yr" | "macrs_7yr";
  current_book_value: number;
  status: "active" | "disposed" | "transferred";
  calibration_required: boolean;
  last_calibration_date: string | undefined;
  next_calibration_date: string | undefined;
  calibration_interval_days: number | undefined;
  notes: string | undefined;
  created_at: string;
}

export interface AssetTransfer {
  id: string;
  asset_id: string;
  from_location: string;
  to_location: string;
  transferred_at: string;
  transferred_by: string;
  reason: string;
}

export interface DepreciationSchedule {
  asset_id: string;
  year: number;
  beginning_book_value: number;
  depreciation_amount: number;
  ending_book_value: number;
  cumulative_depreciation: number;
}

// IRS Rev. Proc. 87-57 half-year convention rates
const MACRS_5YR = [20, 32, 19.2, 11.52, 11.52, 5.76]; // 6 years
const MACRS_7YR = [14.29, 24.49, 17.49, 12.49, 8.93, 8.92, 8.93, 4.46]; // 8 years

class EquipmentAssetEngine {
  private assets = new Map<string, AssetRecord>();
  private assetTransfers = new Map<string, AssetTransfer>();

  constructor() {
    persistenceBridge.registerMap({ entity: "assets", getMap: () => this.assets as unknown as Map<string, any>, keyField: "id" });
    persistenceBridge.registerMap({ entity: "asset_transfers", getMap: () => this.assetTransfers as unknown as Map<string, any>, keyField: "id" });
  }

  computeDepreciation(
    purchaseCost: number,
    salvageValue: number,
    usefulLifeYears: number,
    method: string,
    monthsElapsed: number,
  ): number {
    const maxDepr = purchaseCost - salvageValue;
    if (maxDepr <= 0) return 0;

    if (method === "straight_line") {
      const annual = maxDepr / usefulLifeYears;
      return Math.min(annual * (monthsElapsed / 12), maxDepr);
    }

    const rates = method === "macrs_5yr" ? MACRS_5YR : MACRS_7YR;
    const yearIndex = Math.floor(monthsElapsed / 12);
    let cumulative = 0;
    for (let i = 0; i <= yearIndex && i < rates.length; i++) {
      if (i < yearIndex) {
        cumulative += purchaseCost * (rates[i] / 100);
      } else {
        // Partial year
        const monthsInYear = Math.min(monthsElapsed - i * 12, 12);
        cumulative += purchaseCost * (rates[i] / 100) * (monthsInYear / 12);
      }
    }
    return Math.min(cumulative, maxDepr);
  }

  registerAsset(params: Omit<AssetRecord, "id" | "current_book_value" | "created_at">): AssetRecord {
    const monthsSincePurchase = Math.max(0,
      (Date.now() - Date.parse(params.purchase_date)) / (30.44 * 24 * 60 * 60 * 1000),
    );
    const depr = this.computeDepreciation(
      params.purchase_cost, params.salvage_value, params.useful_life_years,
      params.depreciation_method, monthsSincePurchase,
    );
    const asset: AssetRecord = {
      ...params,
      id: `AST-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      current_book_value: params.purchase_cost - depr,
      created_at: new Date().toISOString(),
    };
    this.assets.set(asset.id, asset);
    persistenceBridge.persist("assets", asset.id, asset as any);
    return asset;
  }

  getDepreciationSchedule(assetId: string): DepreciationSchedule[] {
    const asset = this.assets.get(assetId);
    if (!asset) throw new Error(`Asset not found: ${assetId}`);

    const schedule: DepreciationSchedule[] = [];
    let cumDepr = 0;
    const totalYears = asset.depreciation_method === "macrs_5yr" ? 6
      : asset.depreciation_method === "macrs_7yr" ? 8
      : asset.useful_life_years;

    for (let year = 1; year <= totalYears; year++) {
      const beg = asset.purchase_cost - cumDepr;
      const yearDepr = this.computeDepreciation(
        asset.purchase_cost, asset.salvage_value,
        asset.useful_life_years, asset.depreciation_method, year * 12,
      ) - cumDepr;

      cumDepr += yearDepr;
      schedule.push({
        asset_id: assetId,
        year,
        beginning_book_value: Math.round(beg * 100) / 100,
        depreciation_amount: Math.round(yearDepr * 100) / 100,
        ending_book_value: Math.round((beg - yearDepr) * 100) / 100,
        cumulative_depreciation: Math.round(cumDepr * 100) / 100,
      });
    }
    return schedule;
  }

  listAssets(filters?: {
    category?: string;
    location?: string;
    calibration_required?: boolean;
    status?: string;
  }): AssetRecord[] {
    let results = Array.from(this.assets.values());
    if (filters?.category) results = results.filter(a => a.category === filters.category);
    if (filters?.location) results = results.filter(a => a.location === filters.location);
    if (filters?.calibration_required !== undefined) {
      results = results.filter(a => a.calibration_required === filters.calibration_required);
    }
    if (filters?.status) results = results.filter(a => a.status === filters.status);
    return results.sort((a, b) => a.name.localeCompare(b.name));
  }

  transferAsset(assetId: string, params: {
    to_location: string;
    transferred_by: string;
    reason: string;
  }): AssetTransfer {
    const asset = this.assets.get(assetId);
    if (!asset) throw new Error(`Asset not found: ${assetId}`);

    const transfer: AssetTransfer = {
      id: `XFER-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      asset_id: assetId,
      from_location: asset.location,
      to_location: params.to_location,
      transferred_at: new Date().toISOString(),
      transferred_by: params.transferred_by,
      reason: params.reason,
    };

    asset.location = params.to_location;
    this.assets.set(assetId, asset);
    this.assetTransfers.set(transfer.id, transfer);
    persistenceBridge.persist("assets", assetId, asset as any);
    persistenceBridge.persist("asset_transfers", transfer.id, transfer as any);
    return transfer;
  }

  getDueCalibrations(daysAhead?: number): Array<{ asset: AssetRecord; days_until_due: number }> {
    const threshold = daysAhead ?? 30;
    const results: Array<{ asset: AssetRecord; days_until_due: number }> = [];

    for (const asset of this.assets.values()) {
      if (!asset.calibration_required || !asset.next_calibration_date) continue;
      const daysUntil = Math.floor(
        (Date.parse(asset.next_calibration_date) - Date.now()) / 86400000,
      );
      if (daysUntil <= threshold) {
        results.push({ asset, days_until_due: daysUntil });
      }
    }
    return results.sort((a, b) => a.days_until_due - b.days_until_due);
  }
}

export const equipmentAssetEngine = new EquipmentAssetEngine();
