import { useState } from "react";
import { billingApi } from "../api/billing";

interface Controller {
  name: string;
  family: string;
  id: string;
}

const CONTROLLERS: Controller[] = [
  { name: "Fanuc 0i", family: "Fanuc", id: "fanuc-0i" },
  { name: "Fanuc 16i", family: "Fanuc", id: "fanuc-16i" },
  { name: "Fanuc 18i", family: "Fanuc", id: "fanuc-18i" },
  { name: "Fanuc 30i", family: "Fanuc", id: "fanuc-30i" },
  { name: "Fanuc 31i", family: "Fanuc", id: "fanuc-31i" },
  { name: "Siemens 828D", family: "Siemens", id: "siemens-828d" },
  { name: "Siemens 840D", family: "Siemens", id: "siemens-840d" },
  { name: "Siemens ONE", family: "Siemens", id: "siemens-one" },
  { name: "Heidenhain TNC640", family: "Heidenhain", id: "heidenhain-tnc640" },
  { name: "Heidenhain TNC7", family: "Heidenhain", id: "heidenhain-tnc7" },
  { name: "Haas NGC", family: "Haas", id: "haas-ngc" },
  { name: "Mazak SmoothAi", family: "Mazak", id: "mazak-smoothai" },
  { name: "Mazak SmoothG", family: "Mazak", id: "mazak-smoothg" },
  { name: "Okuma P300", family: "Okuma", id: "okuma-p300" },
  { name: "Okuma P500", family: "Okuma", id: "okuma-p500" },
  { name: "Brother", family: "Brother", id: "brother" },
  { name: "Mitsubishi", family: "Mitsubishi", id: "mitsubishi" },
  { name: "Fagor", family: "Fagor", id: "fagor" },
  { name: "Generic ISO", family: "Generic", id: "generic-iso" },
  { name: "Generic Conversational", family: "Generic", id: "generic-conversational" },
];

const FAMILY_COLORS: Record<string, string> = {
  Fanuc: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  Siemens: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  Heidenhain: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  Haas: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  Mazak: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  Okuma: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  Brother: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
  Mitsubishi: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  Fagor: "bg-lime-100 text-lime-700 dark:bg-lime-900/40 dark:text-lime-300",
  Generic: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
};

type PurchaseType = "monthly" | "annual" | "permanent";

const PRICE_OPTIONS: { type: PurchaseType; label: string; price: string }[] = [
  { type: "monthly", label: "Monthly", price: "$9/mo" },
  { type: "annual", label: "Annual", price: "$79/yr" },
  { type: "permanent", label: "Permanent", price: "$199" },
];

const isEnterprise = false; // TODO: wire to billing context

export default function PostProcessorStorePage() {
  const [purchasing, setPurchasing] = useState<Record<string, PurchaseType>>({});
  const [loading, setLoading] = useState<string | null>(null);

  async function handlePurchase(controller: Controller) {
    const type = purchasing[controller.id] ?? "monthly";
    setLoading(controller.id);
    try {
      const { url } = await billingApi.purchasePost(controller.id, type);
      window.location.href = url;
    } catch (err) {
      console.error("Purchase failed:", err);
    } finally {
      setLoading(null);
    }
  }

  async function handleBundle(type: "five-pack" | "all-20") {
    setLoading(type);
    try {
      const controllerId = type === "five-pack" ? "bundle-5pack" : "bundle-all20";
      const { url } = await billingApi.purchasePost(controllerId, "permanent");
      window.location.href = url;
    } catch (err) {
      console.error("Bundle purchase failed:", err);
    } finally {
      setLoading(null);
    }
  }

  function setType(id: string, type: PurchaseType) {
    setPurchasing((prev) => ({ ...prev, [id]: type }));
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Post-Processor Store
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Purchase CNC controller post-processors. 20 dialects covering Fanuc, Siemens, Heidenhain,
          Haas, Mazak, Okuma and more.
        </p>
      </div>

      {/* Enterprise banner */}
      {isEnterprise && (
        <div className="flex items-center gap-3 rounded-xl border border-green-300 bg-green-50 px-5 py-4 dark:border-green-700 dark:bg-green-950/40">
          <svg
            className="h-6 w-6 text-green-600 dark:text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="font-semibold text-green-800 dark:text-green-300">
              Enterprise Plan — All 20 Post-Processors Included
            </p>
            <p className="text-sm text-green-700 dark:text-green-400">
              You have full access to every controller dialect at no additional cost.
            </p>
          </div>
        </div>
      )}

      {/* Bundle options */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 px-5 py-4 shadow-sm dark:border-slate-700 dark:from-slate-800 dark:to-slate-900">
          <div>
            <p className="font-bold text-slate-800 dark:text-slate-100">5-Pack Bundle</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Choose any 5 controllers — best value for small shops.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleBundle("five-pack")}
            disabled={loading === "five-pack" || isEnterprise}
            className="ml-4 flex-shrink-0 rounded-lg bg-primary-600 px-4 py-2 text-sm font-bold text-white hover:bg-primary-700 disabled:opacity-50 dark:bg-primary-500 dark:hover:bg-primary-600"
          >
            {loading === "five-pack" ? "..." : "$799"}
          </button>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-primary-200 bg-gradient-to-br from-primary-50 to-primary-100 px-5 py-4 shadow-sm dark:border-primary-800 dark:from-primary-950/50 dark:to-primary-900/30">
          <div>
            <p className="font-bold text-primary-800 dark:text-primary-200">
              All 20 Controllers
            </p>
            <p className="text-sm text-primary-600 dark:text-primary-400">
              Full access to every dialect — perfect for large operations.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleBundle("all-20")}
            disabled={loading === "all-20" || isEnterprise}
            className="ml-4 flex-shrink-0 rounded-lg bg-primary-600 px-4 py-2 text-sm font-bold text-white hover:bg-primary-700 disabled:opacity-50 dark:bg-primary-500 dark:hover:bg-primary-600"
          >
            {loading === "all-20" ? "..." : "$2,499"}
          </button>
        </div>
      </div>

      {/* Controller grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
        {CONTROLLERS.map((ctrl) => {
          const selectedType = purchasing[ctrl.id] ?? "monthly";
          const isLoading = loading === ctrl.id;
          const badgeClass =
            FAMILY_COLORS[ctrl.family] ?? "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300";

          return (
            <div
              key={ctrl.id}
              className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
            >
              {/* Header */}
              <div className="mb-3 flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold leading-tight text-slate-800 dark:text-slate-100">
                  {ctrl.name}
                </h3>
                <span
                  className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeClass}`}
                >
                  {ctrl.family}
                </span>
              </div>

              {/* Price type selector */}
              <div className="mb-3 grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-700/60">
                {PRICE_OPTIONS.map((opt) => (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => setType(ctrl.id, opt.type)}
                    className={`rounded-md py-1 text-[10px] font-semibold transition-colors ${
                      selectedType === opt.type
                        ? "bg-white text-primary-700 shadow-sm dark:bg-slate-600 dark:text-primary-300"
                        : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    }`}
                  >
                    {opt.price}
                  </button>
                ))}
              </div>

              {/* Purchase button */}
              <button
                type="button"
                onClick={() => handlePurchase(ctrl)}
                disabled={isLoading || isEnterprise}
                className="mt-auto w-full rounded-lg bg-primary-600 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-primary-500 dark:hover:bg-primary-600"
              >
                {isEnterprise
                  ? "Included"
                  : isLoading
                    ? "Redirecting…"
                    : `Buy ${PRICE_OPTIONS.find((o) => o.type === selectedType)?.price}`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
