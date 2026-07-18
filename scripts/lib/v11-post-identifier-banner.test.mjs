/**
 * v11-post-identifier-banner.test.mjs — concrete-value tests for the .cps
 * post-identifier banner renderer. Every assertion is exact-value equality.
 *
 * @milestone POST-BRIDGE-SYNERGY-MS0/U-V11-WINMAX-COMMENT-RESTORE
 * @slot echo · @iter 26 · @date 2026-05-26
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  BANNER_DELIMITER,
  UNKNOWN_PLACEHOLDER,
  sanitizeBannerValue,
  renderPostIdentifierBanner,
  renderV11HurcoBanner,
  bannerLines,
  isValidBannerOutput,
} from "./v11-post-identifier-banner.mjs";

describe("constants", () => {
  it("BANNER_DELIMITER is 46 equals signs wrapped in parens", () => {
    assert.equal(BANNER_DELIMITER, "(==============================================)");
  });
  it("UNKNOWN_PLACEHOLDER = '(UNKNOWN)'", () => {
    assert.equal(UNKNOWN_PLACEHOLDER, "(UNKNOWN)");
  });
});

describe("sanitizeBannerValue", () => {
  it("null → UNKNOWN_PLACEHOLDER", () => {
    assert.equal(sanitizeBannerValue(null), "(UNKNOWN)");
  });
  it("undefined → UNKNOWN_PLACEHOLDER", () => {
    assert.equal(sanitizeBannerValue(undefined), "(UNKNOWN)");
  });
  it("empty string → UNKNOWN_PLACEHOLDER", () => {
    assert.equal(sanitizeBannerValue(""), "(UNKNOWN)");
  });
  it("ASCII value passes through", () => {
    assert.equal(sanitizeBannerValue("v11"), "v11");
  });
  it("strips parens", () => {
    assert.equal(sanitizeBannerValue("WinMax (BNC)"), "WinMax BNC");
  });
  it("trims whitespace", () => {
    assert.equal(sanitizeBannerValue("  hello  "), "hello");
  });
  it("strips non-printable bytes", () => {
    assert.equal(sanitizeBannerValue("abc\x00\x01def"), "abcdef");
  });
  it("only-parens string → UNKNOWN_PLACEHOLDER", () => {
    assert.equal(sanitizeBannerValue("(((())))"), "(UNKNOWN)");
  });
  it("number coerced to string", () => {
    assert.equal(sanitizeBannerValue(123), "123");
  });
});

describe("renderPostIdentifierBanner: full args", () => {
  const banner = renderPostIdentifierBanner({
    postName: "PRISM HURCO VM30i ENHANCED",
    postVersion: "v11",
    controlName: "WinMax ISNC/BNC Compatible",
    machineModel: "HURCO VM30i 3-Axis VMC",
    postedDate: "2026-05-26",
  });

  it("renders 6 lines", () => {
    assert.equal(bannerLines(banner).length, 6);
  });
  it("line 0 = delimiter", () => {
    assert.equal(bannerLines(banner)[0], BANNER_DELIMITER);
  });
  it("line 1 = POST line", () => {
    assert.equal(bannerLines(banner)[1], "(POST: PRISM HURCO VM30i ENHANCED v11)");
  });
  it("line 2 = CONTROL line", () => {
    assert.equal(bannerLines(banner)[2], "(CONTROL: WinMax ISNC/BNC Compatible)");
  });
  it("line 3 = MACHINE line", () => {
    assert.equal(bannerLines(banner)[3], "(MACHINE: HURCO VM30i 3-Axis VMC)");
  });
  it("line 4 = POSTED line", () => {
    assert.equal(bannerLines(banner)[4], "(POSTED: 2026-05-26)");
  });
  it("line 5 = delimiter", () => {
    assert.equal(bannerLines(banner)[5], BANNER_DELIMITER);
  });
});

describe("renderPostIdentifierBanner: defaults on missing args", () => {
  it("null args → UNKNOWN placeholders on all 4 data lines", () => {
    const banner = renderPostIdentifierBanner(null);
    assert.equal(bannerLines(banner)[1], "(POST: (UNKNOWN))");
  });
  it("empty args → CONTROL = UNKNOWN", () => {
    assert.equal(bannerLines(renderPostIdentifierBanner({}))[2], "(CONTROL: (UNKNOWN))");
  });
  it("only postName → version trims to bare name", () => {
    const banner = renderPostIdentifierBanner({ postName: "BareName" });
    assert.equal(bannerLines(banner)[1], "(POST: BareName)");
  });
});

describe("renderV11HurcoBanner: shipping default", () => {
  it("POST line names PRISM HURCO VM30i ENHANCED v11", () => {
    const banner = renderV11HurcoBanner("2026-05-26");
    assert.equal(bannerLines(banner)[1], "(POST: PRISM HURCO VM30i ENHANCED v11)");
  });
  it("CONTROL line names WinMax ISNC/BNC", () => {
    const banner = renderV11HurcoBanner("2026-05-26");
    assert.equal(bannerLines(banner)[2], "(CONTROL: WinMax ISNC/BNC Compatible)");
  });
  it("MACHINE line names HURCO VM30i 3-Axis VMC", () => {
    const banner = renderV11HurcoBanner("2026-05-26");
    assert.equal(bannerLines(banner)[3], "(MACHINE: HURCO VM30i 3-Axis VMC)");
  });
  it("POSTED line uses passed date", () => {
    const banner = renderV11HurcoBanner("2026-05-26");
    assert.equal(bannerLines(banner)[4], "(POSTED: 2026-05-26)");
  });
  it("omitted date → UNDATED", () => {
    const banner = renderV11HurcoBanner();
    assert.equal(bannerLines(banner)[4], "(POSTED: UNDATED)");
  });
});

describe("bannerLines + isValidBannerOutput round-trip", () => {
  it("null banner → bannerLines returns empty array", () => {
    assert.equal(bannerLines(null).length, 0);
  });
  it("non-string → isValidBannerOutput returns false", () => {
    assert.equal(isValidBannerOutput(123), false);
  });
  it("wrong line count → invalid", () => {
    assert.equal(isValidBannerOutput("just one line"), false);
  });
  it("rendered v11 banner is valid", () => {
    assert.equal(isValidBannerOutput(renderV11HurcoBanner("2026-05-26")), true);
  });
  it("rendered banner with nulls is still valid (UNKNOWN fills)", () => {
    assert.equal(isValidBannerOutput(renderPostIdentifierBanner({})), true);
  });
  it("missing top delimiter → invalid", () => {
    const lines = bannerLines(renderV11HurcoBanner("2026-05-26"));
    lines[0] = "broken";
    assert.equal(isValidBannerOutput(lines.join("\n")), false);
  });
  it("missing bottom delimiter → invalid", () => {
    const lines = bannerLines(renderV11HurcoBanner("2026-05-26"));
    lines[5] = "broken";
    assert.equal(isValidBannerOutput(lines.join("\n")), false);
  });
});
