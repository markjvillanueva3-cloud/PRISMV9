import { billingApi } from "../../api/billing";

interface Tier {
  name: string;
  price: string;
  popular?: boolean;
  plan: string;
}

const TIERS: Tier[] = [
  { name: "Free", price: "$0/mo", plan: "free" },
  { name: "Starter", price: "$29/mo", plan: "starter" },
  { name: "Pro", price: "$79/mo", plan: "pro", popular: true },
  { name: "Shop", price: "$199/mo", plan: "shop" },
  { name: "Enterprise", price: "$499/mo", plan: "enterprise" },
];

interface FeatureRow {
  label: string;
  values: string[];
}

const FEATURES: FeatureRow[] = [
  {
    label: "Speed & Feed calculations",
    values: ["10/day", "Unlimited", "Unlimited", "Unlimited", "Unlimited"],
  },
  {
    label: "Material database",
    values: ["Basic", "Full", "Full", "Full", "Full + Custom"],
  },
  {
    label: "Tool catalog",
    values: ["100 tools", "10K tools", "Full 86K", "Full + Custom", "Full + Custom + API"],
  },
  {
    label: "Program generation",
    values: ["—", "2/day", "5/day", "20/day", "Unlimited"],
  },
  {
    label: "Post processors",
    values: ["—", "—", "1 included", "3 included", "All 20"],
  },
  {
    label: "Simulation",
    values: ["—", "—", "Basic", "Full", "Full + Monte Carlo"],
  },
  {
    label: "API access",
    values: ["—", "—", "—", "—", "Full REST API"],
  },
  {
    label: "Support",
    values: ["Community", "Email", "Priority", "Dedicated", "24/7"],
  },
];

export default function PricingTable() {
  async function handleSelect(plan: string) {
    if (plan === "free") return;
    try {
      const { url } = await billingApi.createCheckout(plan);
      window.location.href = url;
    } catch (err) {
      console.error("Checkout error:", err);
    }
  }

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
      <table className="min-w-[640px] w-full text-sm">
        <thead>
          <tr>
            <th className="w-48 px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800">
              Feature
            </th>
            {TIERS.map((tier) => (
              <th
                key={tier.plan}
                className={`px-4 py-4 text-center ${
                  tier.popular
                    ? "bg-primary-600 text-white"
                    : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                }`}
              >
                <div className="flex flex-col items-center gap-1">
                  {tier.popular && (
                    <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                      Most Popular
                    </span>
                  )}
                  <span className="font-bold">{tier.name}</span>
                  <span
                    className={`text-xs font-normal ${
                      tier.popular ? "text-primary-100" : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    {tier.price}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSelect(tier.plan)}
                    disabled={tier.plan === "free"}
                    className={`mt-1 rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                      tier.popular
                        ? "bg-white text-primary-700 hover:bg-primary-50"
                        : tier.plan === "free"
                          ? "cursor-default bg-slate-200 text-slate-400 dark:bg-slate-700 dark:text-slate-500"
                          : "bg-primary-600 text-white hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600"
                    }`}
                  >
                    {tier.plan === "free" ? "Current" : "Select"}
                  </button>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-900">
          {FEATURES.map((row, idx) => (
            <tr
              key={row.label}
              className={idx % 2 === 0 ? "" : "bg-slate-50/50 dark:bg-slate-800/30"}
            >
              <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">
                {row.label}
              </td>
              {row.values.map((val, i) => (
                <td
                  key={i}
                  className={`px-4 py-3 text-center ${
                    TIERS[i].popular
                      ? "text-primary-700 dark:text-primary-400 font-medium"
                      : val === "—"
                        ? "text-slate-300 dark:text-slate-600"
                        : "text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {val === "—" ? (
                    <span aria-label="Not included">—</span>
                  ) : (
                    val
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
