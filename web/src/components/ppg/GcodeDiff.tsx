import { useState } from "react";
import { DiffEditor } from "@monaco-editor/react";
import { ppgApi } from "../../api/ppg";
import type { PostController, PpgControllerInfo } from "../../types/ppg";
import {
  GCODE_LANGUAGE_ID,
  gcodeLanguageConfig,
  gcodeTokenProvider,
  gcodeThemeRules,
  gcodeDarkThemeRules,
} from "./gcode-language";
import Spinner from "../ui/Spinner";

let langRegistered = false;

interface GcodeDiffProps {
  gcode: string;
  controllers: PpgControllerInfo[];
  currentController?: PostController;
}

export default function GcodeDiff({
  gcode,
  controllers,
  currentController,
}: GcodeDiffProps) {
  const [controllerA, setControllerA] = useState<string>(currentController ?? "");
  const [controllerB, setControllerB] = useState<string>("");
  const [resultA, setResultA] = useState("");
  const [resultB, setResultB] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCompare = async () => {
    if (!controllerA || !controllerB || !gcode.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await ppgApi.compare({
        controllers: [
          controllerA as PostController,
          controllerB as PostController,
        ],
      });
      const rA = result.results.find(
        (r) => r.controller === controllerA,
      );
      const rB = result.results.find(
        (r) => r.controller === controllerB,
      );
      setResultA(rA?.gcode ?? "");
      setResultB(rB?.gcode ?? "");
    } catch (e) {
      setError((e as Error).message || "Comparison failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDiffMount = (_: unknown, monaco: typeof import("monaco-editor")) => {
    if (!langRegistered) {
      monaco.languages.register({ id: GCODE_LANGUAGE_ID });
      monaco.languages.setLanguageConfiguration(
        GCODE_LANGUAGE_ID,
        gcodeLanguageConfig,
      );
      monaco.languages.setMonarchTokensProvider(
        GCODE_LANGUAGE_ID,
        gcodeTokenProvider,
      );
      monaco.editor.defineTheme("gcode-light", {
        base: "vs",
        inherit: true,
        rules: gcodeThemeRules,
        colors: {},
      });
      monaco.editor.defineTheme("gcode-dark", {
        base: "vs-dark",
        inherit: true,
        rules: gcodeDarkThemeRules,
        colors: {},
      });
      langRegistered = true;
    }
    const isDark = document.documentElement.classList.contains("dark");
    monaco.editor.setTheme(isDark ? "gcode-dark" : "gcode-light");
  };

  // Count differences
  const diffStats = (() => {
    if (!resultA || !resultB) return null;
    const linesA = resultA.split("\n");
    const linesB = resultB.split("\n");
    let changed = 0;
    const maxLen = Math.max(linesA.length, linesB.length);
    for (let i = 0; i < maxLen; i++) {
      if ((linesA[i] ?? "") !== (linesB[i] ?? "")) changed++;
    }
    return {
      linesA: linesA.length,
      linesB: linesB.length,
      changed,
    };
  })();

  return (
    <div className="flex flex-1 flex-col gap-2 p-3">
      {/* Controller selectors */}
      <div className="flex items-center gap-2">
        <select
          value={controllerA}
          onChange={(e) => setControllerA(e.target.value)}
          className="flex-1 rounded border border-slate-300 px-2 py-1
            text-xs dark:border-slate-600 dark:bg-slate-800
            dark:text-slate-100"
          aria-label="Controller A"
        >
          <option value="">Controller A</option>
          {controllers.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <span className="text-xs text-slate-400">vs</span>

        <select
          value={controllerB}
          onChange={(e) => setControllerB(e.target.value)}
          className="flex-1 rounded border border-slate-300 px-2 py-1
            text-xs dark:border-slate-600 dark:bg-slate-800
            dark:text-slate-100"
          aria-label="Controller B"
        >
          <option value="">Controller B</option>
          {controllers.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <button
          type="button"
          disabled={!controllerA || !controllerB || loading}
          onClick={handleCompare}
          className="rounded bg-primary-600 px-3 py-1 text-[11px]
            font-medium text-white hover:bg-primary-700
            disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "..." : "Compare"}
        </button>
      </div>

      {/* Error */}
      {error && <p className="text-xs text-red-500">{error}</p>}

      {/* Diff stats */}
      {diffStats && (
        <div className="flex gap-3 text-[10px] text-slate-500">
          <span>{diffStats.linesA} lines (A)</span>
          <span>{diffStats.linesB} lines (B)</span>
          <span className="text-amber-600">
            {diffStats.changed} changed
          </span>
        </div>
      )}

      {/* Diff editor */}
      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Spinner size="sm" />
          <span className="ml-2 text-xs text-slate-500">
            Comparing...
          </span>
        </div>
      ) : resultA || resultB ? (
        <div className="flex-1 overflow-hidden rounded border
          border-slate-200 dark:border-slate-700">
          <DiffEditor
            height="100%"
            language={GCODE_LANGUAGE_ID}
            original={resultA}
            modified={resultB}
            onMount={handleDiffMount}
            options={{
              readOnly: true,
              fontSize: 12,
              renderSideBySide: true,
              automaticLayout: true,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
            }}
          />
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-xs text-slate-400">
            Select two controllers and click Compare
          </p>
        </div>
      )}
    </div>
  );
}
