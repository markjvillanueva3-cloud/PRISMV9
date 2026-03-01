import { useState, useCallback } from "react";

type PanelTab = "controller" | "templates" | "editor" | "preview" | "validation";
type RightTab = "editor" | "preview";

/**
 * PPG — Post Processor Generator page shell.
 * Layout: 3-column (>=1280px), 2-column (>=768px), tabbed (<768px).
 * Left sidebar: controller selector + template browser
 * Center: G-code editor
 * Right: preview + validation
 */
export default function PpgPage() {
  const [mobileTab, setMobileTab] = useState<PanelTab>("editor");
  const [mdRightTab, setMdRightTab] = useState<RightTab>("editor");

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
      {/* Mobile tab bar — visible below md */}
      <div
        className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-2 dark:border-slate-700 dark:bg-slate-900 md:hidden"
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
            className={`whitespace-nowrap px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
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
        {/* 3-column: xl+ | 2-column: md-xl | tabbed: <md */}
        <div className="hidden h-full md:grid md:grid-cols-[280px_1fr] md:gap-0 xl:grid-cols-[280px_1fr_320px]">
          {/* Left sidebar — controller + templates */}
          <aside className="flex flex-col overflow-y-auto border-r border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50">
            <SidebarPanel />
          </aside>

          {/* Center — editor OR preview (md toggle), always editor at xl */}
          <main className="flex flex-col overflow-hidden">
            {/* md-only tab toggle between Editor and Preview */}
            <div className="flex border-b border-slate-200 dark:border-slate-700 xl:hidden">
              {(["editor", "preview"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setMdRightTab(tab)}
                  className={`flex-1 px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
                    mdRightTab === tab
                      ? "border-primary-600 text-primary-600"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {tab === "editor" ? "Editor" : "Preview / Validation"}
                </button>
              ))}
            </div>
            {/* At xl: always show editor. At md-lg: show based on tab */}
            <div className={`flex-1 flex-col overflow-hidden xl:flex ${mdRightTab === "editor" ? "flex" : "hidden xl:flex"}`}>
              <EditorPanel />
            </div>
            <div className={`flex-1 flex-col overflow-y-auto xl:hidden ${mdRightTab === "preview" ? "flex" : "hidden"}`}>
              <PreviewPanel />
            </div>
          </main>

          {/* Right panel — preview + validation (xl only, always visible) */}
          <aside className="hidden flex-col overflow-y-auto border-l border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50 xl:flex">
            <PreviewPanel />
          </aside>
        </div>

        {/* Mobile: show active tab content */}
        <div className="flex h-full flex-col overflow-y-auto md:hidden">
          {(mobileTab === "controller" || mobileTab === "templates") && (
            <SidebarPanel activeTab={mobileTab} />
          )}
          {mobileTab === "editor" && <EditorPanel />}
          {(mobileTab === "preview" || mobileTab === "validation") && (
            <PreviewPanel activeTab={mobileTab} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Panel placeholders — will be replaced by real components in U02-U09 */
/* ------------------------------------------------------------------ */

function SidebarPanel({ activeTab }: { activeTab?: "controller" | "templates" }) {
  return (
    <div className="flex flex-1 flex-col">
      {/* Controller selector section */}
      <div className={`${activeTab === "templates" ? "hidden md:block" : ""}`}>
        <PanelHeader title="Controller" />
        <div className="p-3">
          <div className="rounded-md border border-dashed border-slate-300 p-6 text-center text-xs text-slate-400 dark:border-slate-600">
            ControllerSelector — U03
          </div>
        </div>
      </div>

      {/* Template browser section */}
      <div className={`flex-1 ${activeTab === "controller" ? "hidden md:block" : ""}`}>
        <PanelHeader title="Templates" />
        <div className="p-3">
          <div className="rounded-md border border-dashed border-slate-300 p-6 text-center text-xs text-slate-400 dark:border-slate-600">
            TemplateBrowser — U04
          </div>
        </div>
      </div>
    </div>
  );
}

function EditorPanel() {
  return (
    <div className="flex flex-1 flex-col">
      <PanelHeader title="G-Code Editor" actions={<EditorActions />} />
      <div className="flex flex-1 items-center justify-center bg-white p-4 dark:bg-slate-800">
        <div className="w-full rounded-md border border-dashed border-slate-300 p-12 text-center text-sm text-slate-400 dark:border-slate-600">
          <p className="mb-1 text-base font-medium text-slate-500">Monaco Editor — U05</p>
          <p>G-code syntax highlighting, controller-aware keywords</p>
        </div>
      </div>
    </div>
  );
}

function EditorActions() {
  return (
    <div className="flex items-center gap-1.5">
      <ActionButton label="Validate" disabled />
      <ActionButton label="Generate" disabled />
      <ActionButton label="Optimize" disabled />
    </div>
  );
}

function PreviewPanel({ activeTab }: { activeTab?: "preview" | "validation" }) {
  return (
    <div className="flex flex-1 flex-col">
      {/* Preview section */}
      <div className={`${activeTab === "validation" ? "hidden xl:block" : ""} flex-1`}>
        <PanelHeader title="Preview" />
        <div className="p-3">
          <div className="rounded-md border border-dashed border-slate-300 p-6 text-center text-xs text-slate-400 dark:border-slate-600">
            GcodePreview — U06
          </div>
        </div>
      </div>

      {/* Validation section */}
      <div className={`${activeTab === "preview" ? "hidden xl:block" : ""}`}>
        <PanelHeader title="Validation" />
        <div className="p-3">
          <div className="rounded-md border border-dashed border-slate-300 p-6 text-center text-xs text-slate-400 dark:border-slate-600">
            ValidationPanel — U09
          </div>
        </div>
      </div>
    </div>
  );
}

/* Shared sub-components */

function PanelHeader({ title, actions }: { title: string; actions?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {title}
      </h2>
      {actions}
    </div>
  );
}

function ActionButton({ label, disabled }: { label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      className="rounded px-2 py-1 text-[11px] font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-slate-700 dark:hover:text-slate-300"
    >
      {label}
    </button>
  );
}
