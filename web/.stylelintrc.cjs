// U-V2-STYLELINT-NO-INLINE-HEX (slot:quebec /goal-loop iter4-extended)
// Spec: state/shared/specs/FRONTEND-PLAN-EXTENSION-2026-05-25.md §9.5 U-V2.
//
// Reject inline hex/rgba in JSX style props and CSS files. The existing
// `prism-glow-*` / `prism-chip` / `prism-spectrum-fill` token system in
// index.css is the source-of-truth for colors; inline literals fork it
// silently. This config surfaces the violations; it does NOT auto-fix
// because the right replacement is a token name (CSS var or class), and
// only the operator knows which one matches intent.
//
// Run: npm run lint:style
// Install: npm install --save-dev stylelint stylelint-config-standard
//   (the package.json devDeps already declare both)

module.exports = {
  extends: ["stylelint-config-standard"],
  rules: {
    // Reject inline hex AND rgba/rgb literals in stylesheets. Use design
    // tokens (CSS custom properties / Tailwind theme keys) instead.
    "color-no-hex": [true, { severity: "warning" }],
    "function-disallowed-list": [
      ["rgb", "rgba", "hsl", "hsla"],
      { severity: "warning", message: "Use design tokens / Tailwind theme keys instead of raw color functions." },
    ],
    // Pre-existing convention: no inline `!important` outside index.css.
    "declaration-no-important": [true, { severity: "warning" }],
    // The PRISM theme uses lowercase hex everywhere; surface inconsistency.
    "color-hex-length": "long",
    "color-hex-alpha": "always",
    // Class naming — kebab-case-with-prefix is the existing PRISM convention.
    "selector-class-pattern": null,
    // Tailwind / shadcn directives are NOT stylelint-native; whitelist them.
    "at-rule-no-unknown": [
      true,
      { ignoreAtRules: ["tailwind", "apply", "variants", "responsive", "screen", "layer"] },
    ],
  },
  // The first stylelint pass on a 107KB index.css will surface many existing
  // violations. Surface-only — do NOT auto-block until U-V2 cleanup unit
  // lands separately. Per spec §9.5 the audit is the deliverable; the cleanup
  // is operator-gated.
  ignoreFiles: ["node_modules/**", "dist/**", "**/*.snap"],
};
