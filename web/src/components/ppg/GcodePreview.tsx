import { useMemo } from "react";

interface GcodePreviewProps {
  gcode: string;
  controller?: string;
}

interface GcodeSection {
  label: string;
  lines: string[];
  color: string;
}

/** Classify G-code lines into logical sections */
function parseGcodeSections(gcode: string): GcodeSection[] {
  if (!gcode.trim()) return [];

  const lines = gcode.split("\n");
  const sections: GcodeSection[] = [];
  let current: GcodeSection = {
    label: "Header",
    lines: [],
    color: "text-slate-500",
  };

  for (const line of lines) {
    const trimmed = line.trim().toUpperCase();

    if (/^[%O]/.test(trimmed) || /^\(.*PROGRAM/.test(trimmed)) {
      if (current.lines.length) sections.push(current);
      current = { label: "Program Start", lines: [], color: "text-purple-600" };
    } else if (/^T\d/.test(trimmed) || /TOOL\s*(CALL|CHANGE)/i.test(trimmed)) {
      if (current.lines.length) sections.push(current);
      current = { label: "Tool Change", lines: [], color: "text-amber-600" };
    } else if (/M0?[89]/.test(trimmed) || /COOLANT/i.test(trimmed)) {
      if (current.lines.length) sections.push(current);
      current = { label: "Coolant", lines: [], color: "text-cyan-600" };
    } else if (/M30|M99|END\s*PGM/.test(trimmed)) {
      if (current.lines.length) sections.push(current);
      current = { label: "Program End", lines: [], color: "text-slate-500" };
    }

    current.lines.push(line);
  }

  if (current.lines.length) sections.push(current);
  return sections;
}

export default function GcodePreview({
  gcode,
  controller,
}: GcodePreviewProps) {
  const sections = useMemo(() => parseGcodeSections(gcode), [gcode]);

  const lineCount = useMemo(
    () => gcode.split("\n").filter((l) => l.trim()).length,
    [gcode],
  );

  const toolCount = useMemo(() => {
    const tools = new Set<string>();
    for (const line of gcode.split("\n")) {
      const match = line.match(/T(\d+)/i);
      if (match) tools.add(match[1]);
    }
    return tools.size;
  }, [gcode]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(gcode);
    } catch {
      // Clipboard API may be unavailable in insecure contexts
    }
  };

  const handleDownload = () => {
    const ext = controller === "heidenhain" ? ".h" : ".nc";
    const blob = new Blob([gcode], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `program${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!gcode.trim()) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-xs text-slate-400">
          No G-code to preview. Generate or type code in the editor.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-3">
      {/* Metadata bar */}
      <div className="flex items-center gap-3 text-[10px] text-slate-500">
        <span>{lineCount} lines</span>
        <span>{toolCount} tool{toolCount !== 1 ? "s" : ""}</span>
        {controller && (
          <span className="rounded bg-slate-100 px-1.5 py-0.5
            dark:bg-slate-700">
            {controller}
          </span>
        )}
        <div className="ml-auto flex gap-1">
          <button
            type="button"
            onClick={handleCopy}
            className="rounded px-2 py-0.5 hover:bg-slate-100
              dark:hover:bg-slate-700"
          >
            Copy
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="rounded px-2 py-0.5 hover:bg-slate-100
              dark:hover:bg-slate-700"
          >
            Download
          </button>
        </div>
      </div>

      {/* Section-highlighted code */}
      <div className="rounded-md border border-slate-200 bg-white
        dark:border-slate-700 dark:bg-slate-800">
        {sections.map((section, i) => (
          <div key={`${section.label}-${i}`} className="border-b border-slate-100
            last:border-b-0 dark:border-slate-700/50">
            <div className={`px-2 py-0.5 text-[9px] font-semibold
              uppercase tracking-wider ${section.color}`}>
              {section.label}
            </div>
            <pre className="overflow-x-auto px-3 py-1 font-mono
              text-[11px] text-slate-700 dark:text-slate-300">
              {section.lines.join("\n")}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}
