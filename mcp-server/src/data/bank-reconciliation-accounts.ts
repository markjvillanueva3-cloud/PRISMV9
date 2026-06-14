/**
 * bank-reconciliation-accounts.ts — GL account designations + policy constants for the
 * bank-reconciliation ("Reconcile") cycle in the PRISM ERP (galaxy:business, slot:hotel).
 *
 * Single source of truth for the accounts BankReconciliationEngine posts to, so the engine
 * NEVER inlines an account number or a policy tolerance (business/GSD.md §2.1 financial-invariant
 * gate, [[feedback_hotel_financial_invariant_gate]]).
 *
 * Account numbers align with the canonical chart of accounts in GeneralLedgerEngine.ts:
 *   1000 Cash                — existing chart member; the book balance being reconciled.
 *   2100 Tax Payable         — existing chart member (unused by this cycle, kept for reference).
 *   5500 Operating Expenses  — existing chart member; bank service fees expense here.
 *   4900 Interest Income     — NOT in MAIN's chart yet (see below). Chart extension.
 *
 * IMPORTANT — account-number collision avoidance: MAIN's chart ALREADY occupies 4000 (Sales
 * Revenue) and 4100 (Service Revenue) as OPERATING revenue. Interest earned on a bank balance is
 * NON-operating income, so it must NOT reuse 4100 (that would credit bank interest into operating
 * Service Revenue and overstate operating revenue). 4900 is unoccupied and sits at the top of the
 * 4xxx revenue band — the conventional slot for an "other / non-operating income" line.
 *
 * A bank reconciliation that ties out (difference ≤ tolerance) posts NOTHING — the books already
 * agree with the bank once timing items (outstanding checks / deposits in transit) clear. What DOES
 * post are the *unrecorded* statement items the bank knows about but the books do not yet:
 *   - bank service fees  → DR 5500 Operating Expenses / CR 1000 Cash      (reduce book cash)
 *   - interest earned    → DR 1000 Cash              / CR 4900 Interest Income (increase book cash)
 * These adjusting entries are what bring the BOOK balance to the bank's cleared cash. The engine
 * RETURNS these lines as DATA (balanced) — it does not post to the GL directly, so it stays pure +
 * testable (the caller hands them to GeneralLedgerEngine.createJournalEntry).
 */

/**
 * GL asset account being reconciled — the company's book cash. Fees credit it (cash leaves);
 * interest debits it (cash arrives). Existing chart member.
 */
export const CASH_ACCOUNT = { number: "1000", name: "Cash" } as const;

/**
 * GL expense account a bank service fee debits. Bank fees are an operating cost of holding the
 * account. Existing chart member (5500 Operating Expenses — name matches the canonical chart
 * string exactly so a name-keyed consumer never drifts).
 */
export const BANK_FEE_EXPENSE_ACCOUNT = { number: "5500", name: "Operating Expenses" } as const;

/**
 * GL income account interest earned credits. NOT in MAIN's chart yet — slots at 4900, the top of
 * the 4xxx revenue band, as a NON-operating income line. 4000 (Sales Revenue) and 4100 (Service
 * Revenue) are already occupied by MAIN as OPERATING revenue, so 4900 is the genuinely-free,
 * correctly-classified slot (reusing 4100 would credit bank interest into operating Service Revenue
 * and overstate it). Adding 4900 in MAIN is purely additive. Until then the engine RETURNS this
 * line as data; it does not post.
 */
export const INTEREST_INCOME_ACCOUNT = { number: "4900", name: "Interest Income" } as const;

/**
 * Reconciliation closeness threshold, in dollars. A bank rec is considered RECONCILED iff the
 * absolute residual difference is ≤ this. Per spec: one cent. This is the honesty gate — the engine
 * NEVER forces reconciled=true; it computes the residual and sets the flag from it.
 */
export const RECONCILE_TOLERANCE_DOLLARS = 0.01;

/**
 * Floating-point slack (one tenth of a cent) for the internal balanced-GL / both-ways money
 * reconciliation invariants. Strictly tighter than RECONCILE_TOLERANCE_DOLLARS — the latter is the
 * business "did it tie out" gate; this is the arithmetic "did our own math close" guard.
 */
export const MONEY_RECONCILE_TOLERANCE = 0.001;

/** Schema version for the bank-reconciliation account/policy snapshot. */
export const BANK_RECONCILIATION_SCHEMA_VERSION = "1.0.0";
