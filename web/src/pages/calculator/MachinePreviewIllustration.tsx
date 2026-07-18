/**
 * MachinePreviewIllustration.tsx — U-F3-FIRST-EXTRACTION (slot:quebec /goal yolo iter6)
 *
 * First concrete intra-page extraction from CalculatorPage.tsx (12,856 LOC,
 * top split candidate per U-B1 / U-F5). Extracts the self-contained machine-
 * portrait SVG renderer + its palette table. Net effect: CalculatorPage
 * drops ~160 LOC, this file owns the machine-class illustration concern.
 *
 * This is the **demonstration** of the U-F3-TAB-LEVEL-DYNAMIC-IMPORTS pattern
 * called for in FRONTEND-PLAN-EXTENSION-2026-05-25 §9.2. After this lands,
 * subsequent extractions (the larger machine-mode-conditional sections of
 * CalculatorPage at ~2200+ LOC each) follow the same recipe.
 *
 * Why NOT React.lazy yet:
 *   - The component is ~107 LOC of pure SVG with no async dependencies; the
 *     chunk would be smaller than the lazy-loading overhead.
 *   - Lazy belongs at the route boundary (already in place via App.tsx) and
 *     at heavy-tab boundaries (TBD per spec line 224 per-page operator work).
 *   - Plain extraction is the necessary FIRST step — once the file is its
 *     own module, swapping to `React.lazy(() => import("./MachinePreviewIllustration"))`
 *     is a one-line change when the call site lives inside a heavy tab.
 *
 * Karpathy R11 — match conventions: format mirrors `web/src/components/`
 * single-component-per-file style. No re-export aggregator added; the
 * import path is just the file path.
 */

import type { MachineMode } from "../../data/calculatorWorkspace";
import { MACHINE_MODE_OPTIONS } from "../../data/calculatorWorkspace";

interface MachinePalette {
  accent: string;
  accentSoft: string;
  fill: string;
  line: string;
  glow: string;
}

const MACHINE_PREVIEW_PALETTE: Record<MachineMode, MachinePalette> = {
  mill: {
    accent: "#67e8f9",
    accentSoft: "rgba(103, 232, 249, 0.18)",
    fill: "rgba(12, 44, 64, 0.92)",
    line: "rgba(186, 230, 253, 0.9)",
    glow: "rgba(34, 211, 238, 0.22)",
  },
  lathe: {
    accent: "#fbbf24",
    accentSoft: "rgba(251, 191, 36, 0.18)",
    fill: "rgba(62, 38, 8, 0.92)",
    line: "rgba(254, 240, 138, 0.9)",
    glow: "rgba(245, 158, 11, 0.22)",
  },
  edm: {
    accent: "#f472b6",
    accentSoft: "rgba(244, 114, 182, 0.18)",
    fill: "rgba(72, 16, 54, 0.92)",
    line: "rgba(251, 207, 232, 0.9)",
    glow: "rgba(236, 72, 153, 0.2)",
  },
  wire_edm: {
    accent: "#c084fc",
    accentSoft: "rgba(192, 132, 252, 0.18)",
    fill: "rgba(52, 22, 92, 0.92)",
    line: "rgba(233, 213, 255, 0.9)",
    glow: "rgba(168, 85, 247, 0.2)",
  },
  laser: {
    accent: "#fb7185",
    accentSoft: "rgba(251, 113, 133, 0.18)",
    fill: "rgba(84, 18, 28, 0.92)",
    line: "rgba(255, 228, 230, 0.9)",
    glow: "rgba(244, 63, 94, 0.2)",
  },
  waterjet: {
    accent: "#38bdf8",
    accentSoft: "rgba(56, 189, 248, 0.18)",
    fill: "rgba(18, 42, 84, 0.92)",
    line: "rgba(224, 242, 254, 0.9)",
    glow: "rgba(14, 165, 233, 0.2)",
  },
};

export function MachinePreviewIllustration({ mode }: { mode: MachineMode }) {
  const palette = MACHINE_PREVIEW_PALETTE[mode];
  const label = MACHINE_MODE_OPTIONS.find((item) => item.id === mode)?.label ?? mode;

  const machineShape = (() => {
    switch (mode) {
      case "mill":
        return (
          <>
            <rect x="36" y="96" width="148" height="18" rx="6" fill={palette.fill} />
            <rect x="52" y="34" width="34" height="78" rx="8" fill={palette.fill} />
            <rect x="82" y="28" width="80" height="18" rx="7" fill={palette.fill} />
            <rect x="140" y="46" width="28" height="56" rx="8" fill={palette.fill} />
            <rect x="90" y="80" width="68" height="16" rx="5" fill="rgba(248,250,252,0.12)" stroke={palette.line} strokeWidth="1.5" />
            <rect x="102" y="48" width="14" height="34" rx="5" fill={palette.accent} opacity="0.94" />
            <path d="M59 56h21m-21 11h21m-21 11h21" stroke={palette.line} strokeWidth="2" strokeLinecap="round" opacity="0.76" />
          </>
        );
      case "lathe":
        return (
          <>
            <rect x="26" y="90" width="168" height="18" rx="8" fill={palette.fill} />
            <rect x="36" y="62" width="46" height="30" rx="7" fill={palette.fill} />
            <circle cx="60" cy="77" r="13" fill="rgba(248,250,252,0.13)" stroke={palette.line} strokeWidth="1.8" />
            <circle cx="60" cy="77" r="5.5" fill={palette.accent} />
            <rect x="92" y="70" width="58" height="14" rx="7" fill="rgba(248,250,252,0.14)" stroke={palette.line} strokeWidth="1.5" />
            <rect x="146" y="54" width="26" height="38" rx="6" fill={palette.fill} />
            <path d="M158 54v-14m-11 14 11-14 11 14" stroke={palette.line} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M92 77h-10" stroke={palette.line} strokeWidth="2" strokeLinecap="round" />
          </>
        );
      case "edm":
        return (
          <>
            <rect x="42" y="88" width="136" height="26" rx="8" fill={palette.fill} />
            <rect x="56" y="30" width="30" height="58" rx="7" fill={palette.fill} />
            <rect x="84" y="24" width="68" height="14" rx="6" fill={palette.fill} />
            <rect x="116" y="38" width="10" height="30" rx="4" fill={palette.accent} />
            <rect x="92" y="68" width="58" height="14" rx="6" fill="rgba(248,250,252,0.12)" stroke={palette.line} strokeWidth="1.5" />
            <path d="M121 68v-14" stroke={palette.line} strokeWidth="2" strokeLinecap="round" />
            <path d="M64 46h14m-14 10h14m-14 10h14" stroke={palette.line} strokeWidth="2" strokeLinecap="round" opacity="0.74" />
          </>
        );
      case "wire_edm":
        return (
          <>
            <rect x="38" y="28" width="30" height="82" rx="8" fill={palette.fill} />
            <rect x="154" y="28" width="28" height="82" rx="8" fill={palette.fill} />
            <rect x="68" y="28" width="86" height="14" rx="6" fill={palette.fill} />
            <rect x="82" y="84" width="56" height="18" rx="6" fill="rgba(248,250,252,0.12)" stroke={palette.line} strokeWidth="1.5" />
            <path d="M110 42v42" stroke={palette.accent} strokeWidth="3" strokeDasharray="4 4" strokeLinecap="round" />
            <path d="M98 84h24" stroke={palette.line} strokeWidth="2" strokeLinecap="round" />
            <path d="M48 54h10m96 0h10" stroke={palette.line} strokeWidth="2" strokeLinecap="round" opacity="0.8" />
          </>
        );
      case "laser":
        return (
          <>
            <rect x="34" y="90" width="152" height="18" rx="7" fill={palette.fill} />
            <rect x="40" y="42" width="148" height="16" rx="7" fill={palette.fill} />
            <rect x="66" y="50" width="20" height="42" rx="7" fill={palette.fill} />
            <rect x="136" y="50" width="18" height="26" rx="6" fill={palette.fill} />
            <path d="M145 76v9" stroke={palette.accent} strokeWidth="3" strokeLinecap="round" />
            <path d="M145 86l-10 8h20l-10-8Z" fill={palette.accentSoft} stroke={palette.line} strokeWidth="1.4" />
            <path d="M54 58v32m118-32v32" stroke={palette.line} strokeWidth="2" opacity="0.74" />
          </>
        );
      case "waterjet":
        return (
          <>
            <rect x="34" y="90" width="152" height="18" rx="7" fill={palette.fill} />
            <rect x="42" y="40" width="144" height="14" rx="7" fill={palette.fill} />
            <rect x="72" y="54" width="18" height="36" rx="7" fill={palette.fill} />
            <rect x="134" y="54" width="16" height="20" rx="6" fill={palette.fill} />
            <path d="M142 74v14" stroke={palette.accent} strokeWidth="3" strokeLinecap="round" />
            <path d="M142 90c0 0-3 6-6 10m6-10c0 0 3 6 6 10" stroke={palette.line} strokeWidth="1.7" strokeLinecap="round" />
            <path d="M52 54v34m118-34v34" stroke={palette.line} strokeWidth="2" opacity="0.74" />
          </>
        );
      default:
        return null;
    }
  })();

  return (
    <svg
      viewBox="0 0 220 140"
      role="img"
      aria-label={`${label} machine portrait`}
      className="calculator-toolbar-brand-machine-svg"
    >
      <defs>
        <linearGradient id={`calculator-machine-preview-${mode}`} x1="10%" y1="12%" x2="92%" y2="88%">
          <stop offset="0%" stopColor={palette.accent} stopOpacity="0.95" />
          <stop offset="100%" stopColor={palette.line} stopOpacity="0.72" />
        </linearGradient>
      </defs>
      <rect x="10" y="10" width="200" height="120" rx="20" fill="rgba(3, 10, 22, 0.88)" />
      <rect x="20" y="18" width="180" height="104" rx="16" fill="rgba(9, 18, 33, 0.94)" stroke={palette.line} strokeOpacity="0.16" />
      <path d="M34 112H186" stroke={palette.line} strokeOpacity="0.28" strokeWidth="1.2" />
      <path d="M34 98H186M34 84H186M34 70H186M34 56H186M34 42H186" stroke={palette.line} strokeOpacity="0.09" strokeWidth="1" />
      <path d="M58 26h104" stroke={`url(#calculator-machine-preview-${mode})`} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="42" cy="26" r="4.8" fill={palette.accent} opacity="0.92" />
      <circle cx="178" cy="106" r="20" fill={palette.glow} />
      {machineShape}
    </svg>
  );
}
