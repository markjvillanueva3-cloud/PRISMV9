import { useRef, useCallback, useEffect } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import {
  GCODE_LANGUAGE_ID,
  gcodeLanguageConfig,
  gcodeTokenProvider,
  gcodeThemeRules,
  gcodeDarkThemeRules,
} from "./gcode-language";

interface GcodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  controller?: string;
  onSave?: () => void;
}

let languageRegistered = false;

export default function GcodeEditor({
  value,
  onChange,
  onSave,
}: GcodeEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import("monaco-editor") | null>(null);

  const handleMount: OnMount = useCallback(
    (ed, monaco) => {
      editorRef.current = ed;
      monacoRef.current = monaco;

      // Register G-code language (once globally)
      if (!languageRegistered) {
        monaco.languages.register({ id: GCODE_LANGUAGE_ID });
        monaco.languages.setLanguageConfiguration(
          GCODE_LANGUAGE_ID,
          gcodeLanguageConfig,
        );
        monaco.languages.setMonarchTokensProvider(
          GCODE_LANGUAGE_ID,
          gcodeTokenProvider,
        );

        // Light theme
        monaco.editor.defineTheme("gcode-light", {
          base: "vs",
          inherit: true,
          rules: gcodeThemeRules,
          colors: {},
        });

        // Dark theme
        monaco.editor.defineTheme("gcode-dark", {
          base: "vs-dark",
          inherit: true,
          rules: gcodeDarkThemeRules,
          colors: {},
        });

        languageRegistered = true;
      }

      // Apply theme based on current color scheme
      const isDark = document.documentElement.classList.contains("dark");
      monaco.editor.setTheme(isDark ? "gcode-dark" : "gcode-light");

      // Ctrl+S → save/validate
      if (onSave) {
        ed.addCommand(
          monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
          () => onSave(),
        );
      }

      ed.focus();
    },
    [onSave],
  );

  // Sync dark mode changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (!editorRef.current || !monacoRef.current) return;
      const isDark = document.documentElement.classList.contains("dark");
      monacoRef.current.editor.setTheme(isDark ? "gcode-dark" : "gcode-light");
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <Editor
      height="100%"
      language={GCODE_LANGUAGE_ID}
      value={value}
      onChange={(v) => onChange(v ?? "")}
      onMount={handleMount}
      options={{
        fontSize: 13,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        lineNumbers: "on",
        minimap: { enabled: true, maxColumn: 80 },
        bracketPairColorization: { enabled: true },
        wordWrap: "off",
        scrollBeyondLastLine: false,
        renderLineHighlight: "line",
        automaticLayout: true,
        tabSize: 2,
        folding: true,
        glyphMargin: true,
        lineDecorationsWidth: 5,
        padding: { top: 8 },
      }}
      loading={
        <div className="flex h-full items-center justify-center">
          <span className="text-xs text-slate-400">
            Loading editor...
          </span>
        </div>
      }
    />
  );
}
