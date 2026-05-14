import { useState, useCallback, useEffect } from "react";
import ControllerSelector from "../components/ppg/ControllerSelector";
import TemplateBrowser from "../components/ppg/TemplateBrowser";
import GcodeEditor from "../components/ppg/GcodeEditor";
import GcodePreview from "../components/ppg/GcodePreview";
import ValidationPanel from "../components/ppg/ValidationPanel";
import OptimizeDownload from "../components/ppg/OptimizeDownload";
import AdvancedEnhancer from "../components/ppg/AdvancedEnhancer";
import GcodeDiff from "../components/ppg/GcodeDiff";
import AIIntelligencePanel from "../components/ppg/AIIntelligencePanel";
import { PpgProvider, usePpgContext } from "../contexts/PpgContext";
import { usePpgControllers } from "../hooks/usePpg";
import { SurfaceCrossLink } from "../components/SurfaceCrossLink";

type PanelTab =
  | "controller"
  | "templates"
  | "editor"
  | "preview"
  | "validation";
type RightTab = "editor" | "preview";

/**
 * PPG — Post Processor Generator page shell.
 * Layout: 3-column (>=1280px), 2-column (>=768px), tabbed (<768px).
 */
export default function PpgPage() {
  return (
    <PpgProvider>
      <PpgPageInner />
    </PpgProvider>
  );
}

function PpgPageInner() {
  const { activeController, editorContent } = usePpgContext();

  const [mobileTab, setMobileTab] = useState<PanelTab>("editor");
  const [mdRightTab, setMdRightTab] = useState<RightTab>("editor");
  const [showDiff, setShowDiff] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Keyboard shortcuts: Ctrl+S (validate), Ctrl+Shift+G (generate), Ctrl+D (diff)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && !e.shiftKey && e.key === "s") {
        e.preventDefault();
        setMobileTab("validation");
        setMdRightTab("preview");
      } else if (e.ctrlKey && e.shiftKey && (e.key === "G" || e.key === "g")) {
        e.preventDefault();
        setMobileTab("templates");
      } else if (e.ctrlKey && !e.shiftKey && e.key === "d") {
        e.preventDefault();
        setShowDiff((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const tabs: { id: PanelTab; label: string }[] = [
    { id: "controller", label: "Controllers" },
    { id: "templates", label: "Templates" },
    { id: "editor", label: "Editor" },
    { id: "preview", label: "Preview" },
    { id: "validation", label: "Validation" },
  ];

  const handleTabKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const ids = tabs.map((t) => t.id);
      const idx = ids.indexOf(mobileTab);
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setMobileTab(ids[(idx + 1) % ids.length]);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setMobileTab(ids[(idx - 1 + ids.length) % ids.length]);
      }
    },
    [mobileTab],
  );

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Cross-link: this is the lite editor — the full Generator wizard is at /ppg */}
      <div className="flex justify-end gap-2 border-b border-slate-200 bg-slate-50/40 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-900/40">
        <SurfaceCrossLink
          to="/ppg"
          label="Open full PPG Generator"
          note="5-step wizard, machine picker, post library"
          accent="violet"
        />
        <SurfaceCrossLink
          to="/post-processor"
          label="Pricing & overview"
          note="38-stage pipeline, 12 controllers, tier pricing"
          accent="emerald"
        />
      </div>
      {/* Mobile tab bar — visible below md */}
      <div
        className="flex gap-1 overflow-x-auto border-b border-slate-200
          bg-white px-2 dark:border-slate-700
          dark:bg-slate-900 md:hidden"
        role="tablist"
        aria-label="PPG panels"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={mobileTab === t.id}
            tabIndex={mobileTab === t.id ? 0 : -1}
            onClick={() => setMobileTab(t.id)}
            onKeyDown={handleTabKeyDown}
            className={`whitespace-nowrap px-3 py-2 text-xs
              font-medium border-b-2 transition-colors ${
              mobileTab === t.id
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Desktop/tablet layout */}
      <div className="flex-1 overflow-hidden">
        <div className="hidden h-full md:grid md:grid-cols-[280px_1fr]
          md:gap-0 xl:grid-cols-[280px_1fr_320px]">
          {/* Left sidebar — controller + templates */}
          <aside className="flex flex-col overflow-y-auto border-r
            border-slate-200 bg-slate-50
            dark:border-slate-700 dark:bg-slate-900/50">
            <SidebarPanel />
          </aside>

          {/* Center — editor OR preview (md toggle) */}
          <main className="flex flex-col overflow-hidden">
            <div className="flex border-b border-slate-200
              dark:border-slate-700 xl:hidden">
              {(["editor", "preview"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setMdRightTab(tab)}
                  className={`flex-1 px-3 py-1.5 text-xs font-medium
                    border-b-2 transition-colors ${
                    mdRightTab === tab
                      ? "border-primary-600 text-primary-600"
                      : "border-transparent text-slate-500"
                  }`}
                >
                  {tab === "editor" ? "Editor" : "Preview / Validation"}
                </button>
              ))}
            </div>
            <div className={`flex-1 flex-col overflow-hidden xl:flex ${
              mdRightTab === "editor" ? "flex" : "hidden xl:flex"
            }`}>
              <EditorSection showHelp={showHelp} onToggleHelp={() => setShowHelp((v) => !v)} />
            </div>
            <div className={`flex-1 flex-col overflow-y-auto xl:hidden ${
              mdRightTab === "preview" ? "flex" : "hidden"
            }`}>
              <RightPanel showDiff={showDiff} />
            </div>
          </main>

          {/* Right panel — preview + validation (xl only) */}
          <aside className="hidden flex-col overflow-y-auto border-l
            border-slate-200 bg-slate-50
            dark:border-slate-700 dark:bg-slate-900/50 xl:flex">
            <RightPanel showDiff={showDiff} />
          </aside>
        </div>

        {/* Mobile: show active tab content */}
        <div className="flex h-full flex-col overflow-y-auto md:hidden">
          {(mobileTab === "controller" || mobileTab === "templates") && (
            <SidebarPanel activeTab={mobileTab} />
          )}
          {mobileTab === "editor" && <EditorSection showHelp={showHelp} onToggleHelp={() => setShowHelp((v) => !v)} />}
          {mobileTab === "preview" && (
            <>
              <PanelHeader title="Preview" />
              <GcodePreview
                gcode={editorContent}
                controller={activeController?.id}
              />
            </>
          )}
          {mobileTab === "validation" && (
            <>
              <PanelHeader title="Validation" />
              <ValidationPanel
                gcode={editorContent}
                controller={activeController?.id}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Panel compositions                                                  */
/* ------------------------------------------------------------------ */

function SidebarPanel({
  activeTab,
}: {
  activeTab?: "controller" | "templates";
}) {
  const { activeController, setActiveController, setEditorContent } =
    usePpgContext();

  return (
    <div className="flex flex-1 flex-col">
      <div className={
        activeTab === "templates" ? "hidden md:block" : ""
      }>
        <PanelHeader title="Controller" />
        <ControllerSelector
          value={activeController?.id}
          onChange={setActiveController}
        />
      </div>

      <div className={`flex-1 ${
        activeTab === "controller" ? "hidden md:block" : ""
      }`}>
        <PanelHeader title="Templates" />
        <TemplateBrowser
          controller={activeController?.id}
          onGenerate={setEditorContent}
        />
      </div>
    </div>
  );
}

function EditorSection({ showHelp, onToggleHelp }: {
  showHelp?: boolean;
  onToggleHelp?: () => void;
}) {
  const { editorContent, setEditorContent, activeController } =
    usePpgContext();

  return (
    <div className="flex flex-1 flex-col">
      <PanelHeader
        title="G-Code Editor"
        actions={
          <button
            type="button"
            onClick={onToggleHelp}
            className="rounded px-1.5 py-0.5 text-[10px] text-slate-400
              hover:bg-slate-100 hover:text-slate-600
              dark:hover:bg-slate-700"
            title="Keyboard shortcuts"
            aria-label="Toggle keyboard shortcuts help"
            aria-expanded={showHelp}
          >
            ?
          </button>
        }
      />
      {showHelp && <KeyboardShortcutHelp />}
      <div className="flex-1 overflow-hidden">
        <GcodeEditor
          value={editorContent}
          onChange={setEditorContent}
          controller={activeController?.id}
        />
      </div>
    </div>
  );
}

function RightPanel({ showDiff }: { showDiff: boolean }) {
  const { editorContent, setEditorContent, activeController } =
    usePpgContext();
  const { data: controllerList } = usePpgControllers();

  // Handle AI recommendations
  const handleApplyRecommendation = useCallback(
    (rec: { type: string; code?: string; description: string }) => {
      if (rec.type === "gcode_fix" && rec.code) {
        // Prepend the fix to the G-code
        setEditorContent((prev: string) => rec.code + "\n" + prev);
      }
    },
    [setEditorContent]
  );

  return (
    <div className="flex flex-1 flex-col">
      {/* AI Intelligence Panel — Claude Opus-level AI */}
      <PanelHeader title="AI Intelligence" />
      <div className="border-b border-slate-700 max-h-[400px] overflow-y-auto">
        <AIIntelligencePanel
          gcode={editorContent}
          controller={activeController?.id}
          materialIso="P"
          onApplyRecommendation={handleApplyRecommendation}
        />
      </div>

      {/* Diff view (Ctrl+D toggle) */}
      {showDiff && (
        <>
          <PanelHeader title="Diff Comparison" />
          <GcodeDiff
            gcode={editorContent}
            controllers={controllerList ?? []}
            currentController={activeController?.id}
          />
        </>
      )}

      {/* Preview */}
      <PanelHeader title="Preview" />
      <GcodePreview
        gcode={editorContent}
        controller={activeController?.id}
      />

      {/* Validation */}
      <PanelHeader title="Validation" />
      <ValidationPanel
        gcode={editorContent}
        controller={activeController?.id}
      />

      {/* Advanced Enhancer */}
      <PanelHeader title="Advanced Enhancer" />
      <div className="px-3 py-2">
        <AdvancedEnhancer
          controller={activeController?.id ?? "fanuc"}
          gcode={editorContent}
          onEnhanced={setEditorContent}
        />
      </div>

      {/* Optimize & Download */}
      <PanelHeader title="Optimize & Download" />
      <OptimizeDownload
        gcode={editorContent}
        controller={activeController?.id}
        onOptimized={setEditorContent}
      />
    </div>
  );
}

/* Shared sub-components */

function PanelHeader({
  title,
  actions,
}: {
  title: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b
      border-slate-200 bg-white px-3 py-2
      dark:border-slate-700 dark:bg-slate-800">
      <h2 className="text-xs font-semibold uppercase tracking-wider
        text-slate-500 dark:text-slate-400">
        {title}
      </h2>
      {actions}
    </div>
  );
}

const SHORTCUTS = [
  { keys: "Ctrl+S", action: "Save / Validate" },
  { keys: "Ctrl+Shift+G", action: "Generate from template" },
  { keys: "Ctrl+D", action: "Toggle diff view" },
] as const;

function KeyboardShortcutHelp() {
  return (
    <div className="border-b border-slate-200 bg-slate-50 px-3 py-2
      dark:border-slate-700 dark:bg-slate-800/50">
      <div className="flex items-center gap-4 text-[10px]">
        <span className="font-semibold text-slate-500">Shortcuts:</span>
        {SHORTCUTS.map((s) => (
          <span key={s.keys} className="text-slate-500">
            <kbd className="rounded border border-slate-300 bg-white
              px-1 py-0.5 font-mono text-[9px] text-slate-600
              dark:border-slate-600 dark:bg-slate-700
              dark:text-slate-300">
              {s.keys}
            </kbd>
            {" "}{s.action}
          </span>
        ))}
      </div>
    </div>
  );
}
