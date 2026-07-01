/** LocalizationBundleEngine tests — HCAP15.  Exact-value assertions only. */
import { describe, it, expect } from "vitest";
import { LocalizationBundleEngine, type LocaleEntry } from "../engines/LocalizationBundleEngine.js";

const en: LocaleEntry = { locale: "en", strings: {
  hello: "Hello {name}",
  bye: "Goodbye",
  buy: "Buy {qty} items for {total}",
} };
const es: LocaleEntry = { locale: "es", strings: {
  hello: "Hola {name}",
  bye: "Adiós",
  buy: "Comprar {qty} artículos",   // drift: missing {total}
} };
const fr: LocaleEntry = { locale: "fr", strings: {
  hello: "Bonjour {name}",          // bye + buy missing
} };

describe("LocalizationBundleEngine.analyze", () => {
  it("computes coverage % per locale", () => {
    const s = LocalizationBundleEngine.analyze("b", "en", [en, es, fr]);
    const esC = s.coverages.find((c) => c.locale === "es")!;
    const frC = s.coverages.find((c) => c.locale === "fr")!;
    expect(esC.completeness_pct).toBeCloseTo(100, 5);
    expect(frC.completeness_pct).toBeCloseTo(100 / 3, 5);
  });

  it("identifies missing_keys per locale", () => {
    const s = LocalizationBundleEngine.analyze("b", "en", [en, fr]);
    const frC = s.coverages.find((c) => c.locale === "fr")!;
    expect(frC.missing_keys.sort()).toEqual(["buy", "bye"]);
  });

  it("identifies placeholder_drift (missing {total} in es)", () => {
    const s = LocalizationBundleEngine.analyze("b", "en", [en, es]);
    const esC = s.coverages.find((c) => c.locale === "es")!;
    expect(esC.placeholder_drift).toHaveLength(1);
    expect(esC.placeholder_drift[0].key).toBe("buy");
    expect(esC.placeholder_drift[0].base_placeholders).toEqual(["qty", "total"]);
    expect(esC.placeholder_drift[0].locale_placeholders).toEqual(["qty"]);
  });

  it("identifies worst_locale by completeness", () => {
    const s = LocalizationBundleEngine.analyze("b", "en", [en, es, fr]);
    expect(s.worst_locale).toBe("fr");
  });

  it("excludes base_locale from coverages (length=2 when 3 locales given)", () => {
    const s = LocalizationBundleEngine.analyze("b", "en", [en, es, fr]);
    expect(s.coverages.length).toBe(2);
    expect(s.coverages.find((c) => c.locale === "en") === undefined).toBe(true);
  });

  it("throws when base_locale not in locales", () => {
    expect(() => LocalizationBundleEngine.analyze("b", "zh", [en, es])).toThrow(/base_locale/);
  });

  it("throws on empty bundle_id", () => {
    expect(() => LocalizationBundleEngine.analyze("", "en", [en])).toThrow();
  });

  it("rejects bad locale tag (zod regex)", () => {
    expect(() => LocalizationBundleEngine.analyze("b", "en", [
      { locale: "english!", strings: {} } as never,
    ])).toThrow();
  });

  it("identifies extra_keys present in locale but not in base (exact equal)", () => {
    const enSmall: LocaleEntry = { locale: "en", strings: { hello: "Hi" } };
    const esExtra: LocaleEntry = { locale: "es", strings: { hello: "Hola", extra: "Extra" } };
    const s = LocalizationBundleEngine.analyze("b", "en", [enSmall, esExtra]);
    expect(s.coverages[0].extra_keys).toEqual(["extra"]);
    expect(s.coverages[0].matched_keys).toBe(1);
  });

  it("renderStructure shows worst locale + per-locale completeness", () => {
    const md = LocalizationBundleEngine.renderStructure(
      LocalizationBundleEngine.analyze("b1", "en", [en, fr]),
    );
    expect(md.includes("[I18N b1]")).toBe(true);
    expect(md.includes("worst=fr")).toBe(true);
    expect(md.includes("keys=3")).toBe(true);
  });
});
