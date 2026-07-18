/**
 * v11-post-identifier-banner.mjs — pure renderer for the .cps top-of-file
 * post-identifier comment block that v11 dropped during refactor. Operator
 * at a Hurco WinMax control needs to verify "which post + which control +
 * which date generated this program" before running. Without it, a v8.9 vs
 * v10 vs v11 vs Fusion-default output is indistinguishable at the machine.
 *
 * Renders a Hurco-comment-syntax block — every line wrapped in (...) so it
 * round-trips through any WinMax-compatible interpreter unchanged. ASCII
 * only (v11 ships setCodePage ascii).
 *
 * @milestone POST-BRIDGE-SYNERGY-MS0/U-V11-WINMAX-COMMENT-RESTORE
 * @slot echo · @iter 26 · @date 2026-05-26
 */

export const BANNER_DELIMITER = "(==============================================)";
export const UNKNOWN_PLACEHOLDER = "(UNKNOWN)";

const AsciiLow = 32;
const AsciiHigh = 126;

function keepPrintable(s) {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code >= AsciiLow && code <= AsciiHigh) {
      out += s.charAt(i);
    }
  }
  return out;
}

/** Pure: sanitize a single value for Hurco-comment safety (no parens, ASCII only). */
export function sanitizeBannerValue(value) {
  if (value == null) return UNKNOWN_PLACEHOLDER;
  const s = String(value);
  if (s.length === 0) return UNKNOWN_PLACEHOLDER;
  const withoutParens = s.replace(/[()]/g, "");
  const ascii = keepPrintable(withoutParens).trim();
  return ascii.length === 0 ? UNKNOWN_PLACEHOLDER : ascii;
}

/** Pure: render the 6-line post-identifier banner block. Returns string with newline separators. */
export function renderPostIdentifierBanner(args) {
  const a = args || {};
  const post = sanitizeBannerValue(a.postName ? `${a.postName} ${a.postVersion || ""}`.trim() : null);
  const ctrl = sanitizeBannerValue(a.controlName);
  const machine = sanitizeBannerValue(a.machineModel);
  const date = sanitizeBannerValue(a.postedDate);
  return [
    BANNER_DELIMITER,
    `(POST: ${post})`,
    `(CONTROL: ${ctrl})`,
    `(MACHINE: ${machine})`,
    `(POSTED: ${date})`,
    BANNER_DELIMITER,
  ].join("\n");
}

/** Pure: render the banner with default arguments for the v11 Hurco VM30i shipping config. */
export function renderV11HurcoBanner(postedDate) {
  return renderPostIdentifierBanner({
    postName: "PRISM HURCO VM30i ENHANCED",
    postVersion: "v11",
    controlName: "WinMax ISNC/BNC Compatible",
    machineModel: "HURCO VM30i 3-Axis VMC",
    postedDate: postedDate || "UNDATED",
  });
}

/** Pure: split a rendered banner back into lines (for testing + downstream injection). */
export function bannerLines(banner) {
  if (typeof banner !== "string") return [];
  return banner.split("\n");
}

/** Pure: verify a string matches our banner format (round-trip self-check). */
export function isValidBannerOutput(banner) {
  if (typeof banner !== "string") return false;
  const lines = bannerLines(banner);
  if (lines.length !== 6) return false;
  if (lines[0] !== BANNER_DELIMITER) return false;
  if (lines[5] !== BANNER_DELIMITER) return false;
  for (let i = 1; i <= 4; i++) {
    if (!/^\([A-Z]+: .+\)$/.test(lines[i])) return false;
  }
  return true;
}
