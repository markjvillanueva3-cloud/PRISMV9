/**
 * LocalizationBundleEngine — HCAP15 i18n bundle structural model + coverage.
 *
 * Pure-core: caller supplies per-locale key→value maps; engine produces
 * coverage report (which keys are missing from which locales), placeholder
 * consistency check ({name} appearing in en but not in es, etc.), and a
 * per-locale completeness percentage against the base locale.
 *
 * @module engines/LocalizationBundleEngine
 */

import { z } from "zod";

export const LocaleEntrySchema = z.object({
  locale: z.string().min(2).max(20).regex(/^[a-z]{2}(-[A-Z]{2})?$/i, "BCP47-ish locale tag"),
  strings: z.record(z.string(), z.string()),
});
export type LocaleEntry = z.infer<typeof LocaleEntrySchema>;

export interface LocaleCoverage {
  locale: string;
  total_keys: number;
  matched_keys: number;
  missing_keys: string[];
  extra_keys: string[];
  placeholder_drift: { key: string; base_placeholders: string[]; locale_placeholders: string[] }[];
  completeness_pct: number;
}

export interface BundleStructure {
  bundle_id: string;
  base_locale: string;
  base_key_count: number;
  locale_count: number;
  coverages: LocaleCoverage[];
  worst_locale: string | null;
}

const PLACEHOLDER_RE = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;

function placeholders(s: string): string[] {
  const matches = [...s.matchAll(PLACEHOLDER_RE)];
  return matches.map((m) => m[1]).sort();
}

export class LocalizationBundleEngine {
  static validateLocale(e: unknown): LocaleEntry { return LocaleEntrySchema.parse(e); }

  /** Analyze coverage of N locales against the base locale. */
  static analyze(
    bundle_id: string,
    base_locale: string,
    locales: readonly LocaleEntry[],
  ): BundleStructure {
    if (!bundle_id) throw new Error("LocalizationBundle.analyze: bundle_id required");
    if (!Array.isArray(locales)) throw new Error("LocalizationBundle.analyze: locales must be an array");
    for (const l of locales) LocaleEntrySchema.parse(l);
    const base = locales.find((l) => l.locale === base_locale);
    if (!base) throw new Error(`LocalizationBundle.analyze: base_locale '${base_locale}' not in locales`);
    const baseKeys = Object.keys(base.strings).sort();
    const basePlaceholders = new Map<string, string[]>();
    for (const k of baseKeys) basePlaceholders.set(k, placeholders(base.strings[k]));

    const coverages: LocaleCoverage[] = [];
    for (const l of locales) {
      if (l.locale === base_locale) continue;
      const localeKeys = new Set(Object.keys(l.strings));
      const missing_keys = baseKeys.filter((k) => !localeKeys.has(k));
      const extra_keys = [...localeKeys].filter((k) => !basePlaceholders.has(k)).sort();
      const matched_keys = baseKeys.length - missing_keys.length;
      const placeholder_drift: LocaleCoverage["placeholder_drift"] = [];
      for (const k of baseKeys) {
        if (!localeKeys.has(k)) continue;
        const basePh = basePlaceholders.get(k) ?? [];
        const locPh = placeholders(l.strings[k]);
        if (JSON.stringify(basePh) !== JSON.stringify(locPh)) {
          placeholder_drift.push({ key: k, base_placeholders: basePh, locale_placeholders: locPh });
        }
      }
      coverages.push({
        locale: l.locale,
        total_keys: baseKeys.length,
        matched_keys,
        missing_keys, extra_keys, placeholder_drift,
        completeness_pct: baseKeys.length === 0 ? 100 : (matched_keys / baseKeys.length) * 100,
      });
    }
    const worst_locale = coverages.length === 0 ? null
      : coverages.reduce((w, c) => c.completeness_pct < w.completeness_pct ? c : w).locale;
    return {
      bundle_id, base_locale,
      base_key_count: baseKeys.length,
      locale_count: locales.length,
      coverages, worst_locale,
    };
  }

  static renderStructure(s: BundleStructure): string {
    const lines = s.coverages.map((c) =>
      `  ${c.locale}: ${c.completeness_pct.toFixed(1)}% (${c.matched_keys}/${c.total_keys}) missing=${c.missing_keys.length} drift=${c.placeholder_drift.length}`,
    );
    return [
      `[I18N ${s.bundle_id}] base=${s.base_locale} locales=${s.locale_count} keys=${s.base_key_count}${s.worst_locale ? ` worst=${s.worst_locale}` : ""}`,
      ...lines,
    ].join("\n");
  }
}

export const localizationBundleEngine = LocalizationBundleEngine;
