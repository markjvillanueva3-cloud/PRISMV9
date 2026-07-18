import { useState, useMemo } from "react";

// ---------------------------------------------------------------------------
// Types (local — no backend endpoint yet, uses static/mock data)
// ---------------------------------------------------------------------------

interface ToolItem {
  id: string;
  name: string;
  quantity: number;
  location: string;
  condition: "good" | "fair" | "worn" | "replace";
  lastUsed: string;
}

interface MaterialItem {
  id: string;
  name: string;
  stock: number;
  unit: string;
  reorderPoint: number;
  supplier: string;
}

type Tab = "tools" | "materials";
type SortDir = "asc" | "desc";

const CONDITION_COLORS: Record<string, string> = {
  good: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  fair: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  worn: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  replace: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

type ToolSortKey = keyof ToolItem;
type MaterialSortKey = keyof MaterialItem;

function getToolValue(item: ToolItem, key: string): string | number {
  switch (key as ToolSortKey) {
    case "name": return item.name;
    case "quantity": return item.quantity;
    case "location": return item.location;
    case "condition": return item.condition;
    case "lastUsed": return item.lastUsed;
    default: return item.name;
  }
}

function getMaterialValue(item: MaterialItem, key: string): string | number {
  switch (key as MaterialSortKey) {
    case "name": return item.name;
    case "stock": return item.stock;
    case "reorderPoint": return item.reorderPoint;
    case "supplier": return item.supplier;
    default: return item.name;
  }
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface InventoryProps {
  tools?: ToolItem[];
  materials?: MaterialItem[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Inventory({ tools = [], materials = [] }: InventoryProps) {
  const [tab, setTab] = useState<Tab>("tools");
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState<string>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const toggleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Tabs */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1" role="tablist" aria-label="Inventory type">
          <TabBtn active={tab === "tools"} onClick={() => setTab("tools")} label="Tools" />
          <TabBtn active={tab === "materials"} onClick={() => setTab("materials")} label="Materials" />
        </div>

        <input
          type="search"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ml-auto rounded-md border border-slate-300 px-2.5 py-1.5 text-xs
            shadow-sm placeholder:text-slate-400 focus:border-primary-500
            focus:outline-none focus:ring-1 focus:ring-primary-500
            dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          aria-label="Search inventory"
        />
      </div>

      {/* Tool table */}
      {tab === "tools" && (
        <ToolTable
          items={tools}
          search={search}
          sortCol={sortCol}
          sortDir={sortDir}
          onSort={toggleSort}
        />
      )}

      {/* Material table */}
      {tab === "materials" && (
        <MaterialTable
          items={materials}
          search={search}
          sortCol={sortCol}
          sortDir={sortDir}
          onSort={toggleSort}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tool Table
// ---------------------------------------------------------------------------

function ToolTable({
  items,
  search,
  sortCol,
  sortDir,
  onSort,
}: {
  items: ToolItem[];
  search: string;
  sortCol: string;
  sortDir: SortDir;
  onSort: (col: string) => void;
}) {
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let list = q
      ? items.filter(
          (t) => t.name.toLowerCase().includes(q) || t.location.toLowerCase().includes(q),
        )
      : items;

    list = [...list].sort((a, b) => {
      const av = getToolValue(a, sortCol);
      const bv = getToolValue(b, sortCol);
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [items, search, sortCol, sortDir]);

  const headers: { key: ToolSortKey; label: string }[] = [
    { key: "name", label: "Tool" },
    { key: "quantity", label: "Qty" },
    { key: "location", label: "Location" },
    { key: "condition", label: "Condition" },
    { key: "lastUsed", label: "Last Used" },
  ];

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-700">
            {headers.map((h) => (
              <th
                key={h.key}
                onClick={() => onSort(h.key)}
                className="cursor-pointer px-3 py-2 text-left font-medium text-slate-500 hover:text-slate-700"
              >
                {h.label}
                {sortCol === h.key && (
                  <span className="ml-0.5 text-[10px]">{sortDir === "asc" ? "▲" : "▼"}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
                {search ? "No tools match" : "No tools in inventory"}
              </td>
            </tr>
          ) : (
            filtered.map((t) => (
              <tr key={t.id} className="border-b border-slate-100 dark:border-slate-700/50">
                <td className="px-3 py-2 font-medium text-slate-700 dark:text-slate-300">
                  {t.name}
                </td>
                <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{t.quantity}</td>
                <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{t.location}</td>
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${CONDITION_COLORS[t.condition]}`}>
                    {t.condition}
                  </span>
                </td>
                <td className="px-3 py-2 text-slate-500">{t.lastUsed}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Material Table
// ---------------------------------------------------------------------------

function MaterialTable({
  items,
  search,
  sortCol,
  sortDir,
  onSort,
}: {
  items: MaterialItem[];
  search: string;
  sortCol: string;
  sortDir: SortDir;
  onSort: (col: string) => void;
}) {
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let list = q
      ? items.filter(
          (m) => m.name.toLowerCase().includes(q) || m.supplier.toLowerCase().includes(q),
        )
      : items;

    list = [...list].sort((a, b) => {
      const av = getMaterialValue(a, sortCol);
      const bv = getMaterialValue(b, sortCol);
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [items, search, sortCol, sortDir]);

  const headers: { key: MaterialSortKey; label: string }[] = [
    { key: "name", label: "Material" },
    { key: "stock", label: "Stock" },
    { key: "reorderPoint", label: "Reorder Point" },
    { key: "supplier", label: "Supplier" },
  ];

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-700">
            {headers.map((h) => (
              <th
                key={h.key}
                onClick={() => onSort(h.key)}
                className="cursor-pointer px-3 py-2 text-left font-medium text-slate-500 hover:text-slate-700"
              >
                {h.label}
                {sortCol === h.key && (
                  <span className="ml-0.5 text-[10px]">{sortDir === "asc" ? "▲" : "▼"}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-3 py-6 text-center text-slate-400">
                {search ? "No materials match" : "No materials in inventory"}
              </td>
            </tr>
          ) : (
            filtered.map((m) => {
              const lowStock = m.stock <= m.reorderPoint;
              return (
                <tr
                  key={m.id}
                  className={`border-b border-slate-100 dark:border-slate-700/50 ${
                    lowStock ? "bg-red-50/50 dark:bg-red-900/5" : ""
                  }`}
                >
                  <td className="px-3 py-2 font-medium text-slate-700 dark:text-slate-300">
                    {m.name}
                    {lowStock && (
                      <span className="ml-1.5 text-[10px] font-medium text-red-600 dark:text-red-400">
                        Low Stock
                      </span>
                    )}
                  </td>
                  <td className={`px-3 py-2 ${lowStock ? "font-medium text-red-600 dark:text-red-400" : "text-slate-600 dark:text-slate-400"}`}>
                    {m.stock} {m.unit}
                  </td>
                  <td className="px-3 py-2 text-slate-500">
                    {m.reorderPoint} {m.unit}
                  </td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{m.supplier}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab button
// ---------------------------------------------------------------------------

function TabBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
        active
          ? "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
          : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
      }`}
    >
      {label}
    </button>
  );
}
