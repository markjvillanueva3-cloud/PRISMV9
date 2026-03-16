import { billingApi } from "../../api/billing";

interface UpgradePromptProps {
  feature: string;
  currentPlan: string;
  requiredPlan: string;
}

export default function UpgradePrompt({ feature, currentPlan, requiredPlan }: UpgradePromptProps) {
  async function handleUpgrade() {
    try {
      const { url } = await billingApi.createCheckout(requiredPlan.toLowerCase());
      window.location.href = url;
    } catch (err) {
      console.error("Checkout failed:", err);
    }
  }

  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-600 dark:bg-amber-950/40">
      <svg
        className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
        />
      </svg>
      <div className="flex-1">
        <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
          <span className="font-semibold">{feature}</span> requires the{" "}
          <span className="font-semibold">{requiredPlan}</span> plan.
        </p>
        <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">
          You are on the <span className="font-medium">{currentPlan}</span> plan. Upgrade to unlock
          this feature.
        </p>
      </div>
      <button
        type="button"
        onClick={handleUpgrade}
        className="flex-shrink-0 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 dark:bg-amber-600 dark:hover:bg-amber-500"
      >
        Upgrade to {requiredPlan}
      </button>
    </div>
  );
}
