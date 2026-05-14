/**
 * G-code language definition for Monaco Editor.
 * Supports Fanuc, Siemens, Haas, Mazak, Okuma, Heidenhain dialects.
 */
import type { languages } from "monaco-editor";

export const GCODE_LANGUAGE_ID = "gcode";

export const gcodeLanguageConfig: languages.LanguageConfiguration = {
  comments: {
    lineComment: ";",
    blockComment: ["(", ")"],
  },
  brackets: [["(", ")"]],
  autoClosingPairs: [{ open: "(", close: ")" }],
  surroundingPairs: [{ open: "(", close: ")" }],
  folding: {
    markers: {
      start: /^\s*O\d+|^\s*%/,
      end: /^\s*M30|^\s*M99|^\s*%/,
    },
  },
};

export const gcodeTokenProvider: languages.IMonarchLanguage = {
  defaultToken: "",
  ignoreCase: true,

  tokenizer: {
    root: [
      // Line numbers (N-words)
      [/N\d+/, "keyword.line-number"],

      // Program numbers
      [/O\d+/, "keyword.program"],

      // G-codes — motion, canned cycles, coordinate systems
      [/G\d{1,3}(\.\d)?/, "keyword.gcode"],

      // M-codes — machine functions
      [/M\d{1,3}/, "keyword.mcode"],

      // Tool calls
      [/T\d+/, "keyword.tool"],

      // Coordinates and parameters
      [/[XYZABCUVW]-?[\d.]+/, "variable.coordinate"],

      // Feed rate
      [/F[\d.]+/, "variable.feed"],

      // Spindle speed
      [/S[\d.]+/, "variable.spindle"],

      // Dwell / radius / other params
      [/[RPQHDLE]-?[\d.]+/, "variable.param"],

      // Work offsets
      [/G5[4-9](\.\d)?/, "keyword.offset"],

      // Fanuc macro variables (#nnn)
      [/#\d+/, "variable.macro"],

      // Fanuc macro expressions
      [/#\[/, { token: "variable.macro", next: "@macroExpr" }],

      // Siemens R-parameters (R1, R100, etc.)
      [/R\d+/, "variable.rparam"],

      // Siemens cycle calls
      [/CYCLE\d+/, "keyword.cycle"],

      // Heidenhain cycle definitions
      [/CYCL DEF/, "keyword.cycle"],

      // Heidenhain conversational keywords
      [
        /\b(BLK FORM|TOOL CALL|TOOL DEF|END PGM|L |CC |C |CHF |RND )/,
        "keyword.heidenhain",
      ],

      // Parenthesized comments — Fanuc/Haas style
      [/\(/, "comment", "@comment"],

      // Semicolon comments — Siemens/Heidenhain style
      [/;.*$/, "comment"],

      // Program start/end markers
      [/%/, "keyword.marker"],

      // Numbers
      [/-?[\d.]+/, "number"],

      // Whitespace
      [/\s+/, "white"],
    ],

    comment: [
      [/[^)]+/, "comment"],
      [/\)/, "comment", "@pop"],
    ],

    macroExpr: [
      [/[^\]]+/, "variable.macro"],
      [/\]/, "variable.macro", "@pop"],
    ],
  },
};

/** Theme rules for G-code syntax */
export const gcodeThemeRules: {
  token: string;
  foreground?: string;
  fontStyle?: string;
}[] = [
  { token: "keyword.gcode", foreground: "2563EB", fontStyle: "bold" },
  { token: "keyword.mcode", foreground: "DC2626", fontStyle: "bold" },
  { token: "keyword.tool", foreground: "D97706" },
  { token: "keyword.line-number", foreground: "9CA3AF" },
  { token: "keyword.program", foreground: "7C3AED", fontStyle: "bold" },
  { token: "keyword.offset", foreground: "2563EB" },
  { token: "keyword.cycle", foreground: "7C3AED" },
  { token: "keyword.heidenhain", foreground: "7C3AED" },
  { token: "keyword.marker", foreground: "9CA3AF" },
  { token: "variable.coordinate", foreground: "059669" },
  { token: "variable.feed", foreground: "0891B2" },
  { token: "variable.spindle", foreground: "E11D48" },
  { token: "variable.param", foreground: "6366F1" },
  { token: "variable.macro", foreground: "EA580C" },
  { token: "variable.rparam", foreground: "EA580C" },
  { token: "comment", foreground: "6B7280", fontStyle: "italic" },
  { token: "number", foreground: "B45309" },
];

/** Dark theme overrides */
export const gcodeDarkThemeRules: typeof gcodeThemeRules = [
  { token: "keyword.gcode", foreground: "60A5FA", fontStyle: "bold" },
  { token: "keyword.mcode", foreground: "F87171", fontStyle: "bold" },
  { token: "keyword.tool", foreground: "FBBF24" },
  { token: "keyword.line-number", foreground: "6B7280" },
  { token: "keyword.program", foreground: "A78BFA", fontStyle: "bold" },
  { token: "keyword.offset", foreground: "60A5FA" },
  { token: "keyword.cycle", foreground: "A78BFA" },
  { token: "keyword.heidenhain", foreground: "A78BFA" },
  { token: "keyword.marker", foreground: "6B7280" },
  { token: "variable.coordinate", foreground: "34D399" },
  { token: "variable.feed", foreground: "22D3EE" },
  { token: "variable.spindle", foreground: "FB7185" },
  { token: "variable.param", foreground: "818CF8" },
  { token: "variable.macro", foreground: "FB923C" },
  { token: "variable.rparam", foreground: "FB923C" },
  { token: "comment", foreground: "9CA3AF", fontStyle: "italic" },
  { token: "number", foreground: "FCD34D" },
];
