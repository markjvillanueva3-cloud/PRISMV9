import { persistenceBridge } from "../db/PersistenceBridge.js";

/**
 * GeneralLedgerEngine — Chart of accounts, journal entries, trial balance, P&L, balance sheet.
 * Provides the accounting backbone that ties invoicing (AR), purchasing (AP),
 * payroll, and job costing into proper double-entry bookkeeping.
 */

export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

export interface Account {
  code: string;
  name: string;
  type: AccountType;
  parent_code?: string;
  balance: number;
  normal_balance: 'debit' | 'credit';
}

export interface JournalEntry {
  id: string;
  date: string;
  description: string;
  source: string;
  reference_id?: string;
  lines: JournalLine[];
  posted: boolean;
}

export interface JournalLine {
  account_code: string;
  account_name: string;
  debit: number;
  credit: number;
  memo?: string;
}

export interface TrialBalance {
  as_of: string;
  accounts: { code: string; name: string; type: AccountType; debit: number; credit: number }[];
  total_debits: number;
  total_credits: number;
  balanced: boolean;
}

export interface IncomeStatement {
  period_start: string;
  period_end: string;
  revenue: { account: string; amount: number }[];
  total_revenue: number;
  expenses: { account: string; amount: number }[];
  total_expenses: number;
  net_income: number;
  margin_pct: number;
}

export interface BalanceSheet {
  as_of: string;
  assets: { account: string; amount: number }[];
  total_assets: number;
  liabilities: { account: string; amount: number }[];
  total_liabilities: number;
  equity: { account: string; amount: number }[];
  total_equity: number;
  balanced: boolean;
}

const DEFAULT_CHART: Omit<Account, 'balance'>[] = [
  // Assets
  { code: '1000', name: 'Cash', type: 'asset', normal_balance: 'debit' },
  { code: '1100', name: 'Accounts Receivable', type: 'asset', normal_balance: 'debit' },
  { code: '1200', name: 'Raw Material Inventory', type: 'asset', normal_balance: 'debit' },
  { code: '1210', name: 'Tool Inventory', type: 'asset', normal_balance: 'debit' },
  { code: '1300', name: 'Work in Process', type: 'asset', normal_balance: 'debit' },
  { code: '1500', name: 'Machinery & Equipment', type: 'asset', normal_balance: 'debit' },
  { code: '1510', name: 'Accumulated Depreciation', type: 'asset', normal_balance: 'credit' },
  // Liabilities
  { code: '2000', name: 'Accounts Payable', type: 'liability', normal_balance: 'credit' },
  { code: '2100', name: 'Accrued Payroll', type: 'liability', normal_balance: 'credit' },
  { code: '2200', name: 'Payroll Taxes Payable', type: 'liability', normal_balance: 'credit' },
  { code: '2300', name: 'Sales Tax Payable', type: 'liability', normal_balance: 'credit' },
  // Equity
  { code: '3000', name: 'Owner Equity', type: 'equity', normal_balance: 'credit' },
  { code: '3100', name: 'Retained Earnings', type: 'equity', normal_balance: 'credit' },
  // Revenue
  { code: '4000', name: 'Job Revenue', type: 'revenue', normal_balance: 'credit' },
  { code: '4100', name: 'Secondary Ops Revenue', type: 'revenue', normal_balance: 'credit' },
  // Expenses
  { code: '5000', name: 'Direct Labor', type: 'expense', normal_balance: 'debit' },
  { code: '5100', name: 'Direct Material', type: 'expense', normal_balance: 'debit' },
  { code: '5200', name: 'Tooling Expense', type: 'expense', normal_balance: 'debit' },
  { code: '5300', name: 'Machine Expense', type: 'expense', normal_balance: 'debit' },
  { code: '5400', name: 'Shop Overhead', type: 'expense', normal_balance: 'debit' },
  { code: '5500', name: 'Cost of Goods Sold', type: 'expense', normal_balance: 'debit' },
  { code: '6000', name: 'Payroll Expense', type: 'expense', normal_balance: 'debit' },
  { code: '6100', name: 'Payroll Tax Expense', type: 'expense', normal_balance: 'debit' },
  { code: '6200', name: 'Benefits Expense', type: 'expense', normal_balance: 'debit' },
  { code: '6300', name: 'Depreciation Expense', type: 'expense', normal_balance: 'debit' },
  { code: '7000', name: 'Administrative Expense', type: 'expense', normal_balance: 'debit' },
];

class GeneralLedgerEngine {
  private accounts: Map<string, Account> = new Map();
  private entries: JournalEntry[] = [];
  private nextEntryId = 1;

  constructor() {
    for (const acct of DEFAULT_CHART) {
      this.accounts.set(acct.code, { ...acct, balance: 0 });
    }
  }

  getChartOfAccounts(): Account[] {
    return [...this.accounts.values()].sort((a, b) => a.code.localeCompare(b.code));
  }

  addAccount(account: Omit<Account, 'balance'>): Account {
    if (this.accounts.has(account.code)) throw new Error(`Account ${account.code} already exists`);
    const acct: Account = { ...account, balance: 0 };
    this.accounts.set(account.code, acct);
    persistenceBridge.persist("gl_accounts", account.code, acct as any);
    return acct;
  }

  createJournalEntry(params: {
    date: string;
    description: string;
    source: string;
    reference_id?: string;
    lines: { account_code: string; debit?: number; credit?: number; memo?: string }[];
    auto_post?: boolean;
  }): JournalEntry {
    // Validate double-entry
    const totalDebits = params.lines.reduce((s, l) => s + (l.debit ?? 0), 0);
    const totalCredits = params.lines.reduce((s, l) => s + (l.credit ?? 0), 0);
    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      throw new Error(`Journal entry not balanced: debits=${totalDebits.toFixed(2)} credits=${totalCredits.toFixed(2)}`);
    }

    const entry: JournalEntry = {
      id: `JE-${String(this.nextEntryId++).padStart(5, '0')}`,
      date: params.date,
      description: params.description,
      source: params.source,
      reference_id: params.reference_id,
      lines: params.lines.map((l) => {
        const acct = this.accounts.get(l.account_code);
        return {
          account_code: l.account_code,
          account_name: acct?.name ?? 'Unknown',
          debit: l.debit ?? 0,
          credit: l.credit ?? 0,
          memo: l.memo,
        };
      }),
      posted: false,
    };

    this.entries.push(entry);
    persistenceBridge.persistAppend("gl_journal_entries", entry as any);

    if (params.auto_post !== false) {
      this.postEntry(entry.id);
    }

    return entry;
  }

  postEntry(entry_id: string): void {
    const entry = this.entries.find((e) => e.id === entry_id);
    if (!entry) throw new Error(`Entry ${entry_id} not found`);
    if (entry.posted) return;

    for (const line of entry.lines) {
      const acct = this.accounts.get(line.account_code);
      if (!acct) continue;
      if (acct.normal_balance === 'debit') {
        acct.balance += line.debit - line.credit;
      } else {
        acct.balance += line.credit - line.debit;
      }
      persistenceBridge.persist("gl_accounts", line.account_code, acct as any);
    }
    entry.posted = true;
    persistenceBridge.persist("gl_journal_entries", entry.id, entry as any);
  }

  // Pre-built journal entry templates for common shop transactions
  recordInvoice(params: { invoice_id: string; amount: number; tax: number; date: string }): JournalEntry {
    return this.createJournalEntry({
      date: params.date,
      description: `Invoice ${params.invoice_id}`,
      source: 'invoicing',
      reference_id: params.invoice_id,
      lines: [
        { account_code: '1100', debit: params.amount + params.tax },
        { account_code: '4000', credit: params.amount },
        { account_code: '2300', credit: params.tax },
      ],
    });
  }

  recordPayment(params: { invoice_id: string; amount: number; date: string }): JournalEntry {
    return this.createJournalEntry({
      date: params.date,
      description: `Payment for ${params.invoice_id}`,
      source: 'payment',
      reference_id: params.invoice_id,
      lines: [
        { account_code: '1000', debit: params.amount },
        { account_code: '1100', credit: params.amount },
      ],
    });
  }

  recordPurchase(params: { po_id: string; amount: number; tax: number; category: string; date: string }): JournalEntry {
    const category = params.category;
    const expenseAccount = category === 'raw_material' ? '5100' :
      category === 'cutting_tool' ? '5200' : category === 'machine_part' ? '5300' : '5400';
    return this.createJournalEntry({
      date: params.date,
      description: `PO ${params.po_id}`,
      source: 'purchasing',
      reference_id: params.po_id,
      lines: [
        { account_code: expenseAccount, debit: params.amount },
        { account_code: '2000', credit: params.amount + params.tax },
        ...(params.tax > 0 ? [{ account_code: expenseAccount, debit: params.tax }] : []),
      ],
    });
  }

  recordPayroll(params: { period: string; gross: number; taxes: number; net: number; date: string }): JournalEntry {
    return this.createJournalEntry({
      date: params.date,
      description: `Payroll ${params.period}`,
      source: 'payroll',
      lines: [
        { account_code: '6000', debit: params.gross },
        { account_code: '6100', debit: params.taxes },
        { account_code: '1000', credit: params.net },
        { account_code: '2200', credit: params.taxes },
        { account_code: '2100', credit: params.gross - params.net },
      ],
    });
  }

  recordJobCost(params: { job_id: string; labor: number; material: number; tooling: number; overhead: number; date: string }): JournalEntry {
    return this.createJournalEntry({
      date: params.date,
      description: `Job cost ${params.job_id}`,
      source: 'job_costing',
      reference_id: params.job_id,
      lines: [
        { account_code: '1300', debit: params.labor + params.material + params.tooling + params.overhead },
        { account_code: '5000', credit: params.labor },
        { account_code: '5100', credit: params.material },
        { account_code: '5200', credit: params.tooling },
        { account_code: '5400', credit: params.overhead },
      ],
    });
  }

  /**
   * Release WIP to COGS when a job ships.
   * Completes the double-entry cycle: WIP was debited at job costing,
   * now we credit WIP and debit COGS (account 5500) to recognize the expense.
   *
   * Reference: Standard manufacturing cost accounting — WIP release at shipment.
   */
  recordWipToCogs(params: { job_id: string; amount: number; date: string }): JournalEntry {
    if (params.amount <= 0) {
      throw new Error(`recordWipToCogs: amount must be positive, got ${params.amount}`);
    }
    return this.createJournalEntry({
      date: params.date,
      description: `WIP→COGS release for job ${params.job_id}`,
      source: 'job_costing',
      reference_id: params.job_id,
      lines: [
        { account_code: '5500', debit: params.amount, memo: 'COGS recognition at shipment' },
        { account_code: '1300', credit: params.amount, memo: 'WIP release' },
      ],
    });
  }

  getTrialBalance(as_of?: string): TrialBalance {
    const accounts: TrialBalance['accounts'] = [];
    let total_debits = 0, total_credits = 0;

    for (const acct of this.accounts.values()) {
      if (acct.balance === 0) continue;
      const debit = acct.normal_balance === 'debit' ? Math.max(acct.balance, 0) : Math.max(-acct.balance, 0);
      const credit = acct.normal_balance === 'credit' ? Math.max(acct.balance, 0) : Math.max(-acct.balance, 0);
      accounts.push({ code: acct.code, name: acct.name, type: acct.type, debit, credit });
      total_debits += debit;
      total_credits += credit;
    }

    return {
      as_of: as_of ?? new Date().toISOString().slice(0, 10),
      accounts: accounts.sort((a, b) => a.code.localeCompare(b.code)),
      total_debits,
      total_credits,
      balanced: Math.abs(total_debits - total_credits) < 0.01,
    };
  }

  getIncomeStatement(period_start: string, period_end: string): IncomeStatement {
    const revenue: { account: string; amount: number }[] = [];
    const expenses: { account: string; amount: number }[] = [];

    for (const acct of this.accounts.values()) {
      if (acct.balance === 0) continue;
      if (acct.type === 'revenue') {
        revenue.push({ account: acct.name, amount: acct.balance });
      } else if (acct.type === 'expense') {
        expenses.push({ account: acct.name, amount: acct.balance });
      }
    }

    const total_revenue = revenue.reduce((s, r) => s + r.amount, 0);
    const total_expenses = expenses.reduce((s, e) => s + e.amount, 0);
    const net_income = total_revenue - total_expenses;

    return {
      period_start, period_end,
      revenue: revenue.sort((a, b) => b.amount - a.amount),
      total_revenue,
      expenses: expenses.sort((a, b) => b.amount - a.amount),
      total_expenses,
      net_income,
      margin_pct: total_revenue > 0 ? (net_income / total_revenue) * 100 : 0,
    };
  }

  getBalanceSheet(as_of?: string): BalanceSheet {
    const assets: { account: string; amount: number }[] = [];
    const liabilities: { account: string; amount: number }[] = [];
    const equity: { account: string; amount: number }[] = [];

    for (const acct of this.accounts.values()) {
      if (acct.balance === 0) continue;
      if (acct.type === 'asset') assets.push({ account: acct.name, amount: acct.balance });
      else if (acct.type === 'liability') liabilities.push({ account: acct.name, amount: acct.balance });
      else if (acct.type === 'equity') equity.push({ account: acct.name, amount: acct.balance });
    }

    // Add retained earnings from P&L
    const pl = this.getIncomeStatement('', as_of ?? new Date().toISOString().slice(0, 10));
    if (pl.net_income !== 0) {
      equity.push({ account: 'Current Period Net Income', amount: pl.net_income });
    }

    const total_assets = assets.reduce((s, a) => s + a.amount, 0);
    const total_liabilities = liabilities.reduce((s, l) => s + l.amount, 0);
    const total_equity = equity.reduce((s, e) => s + e.amount, 0);

    return {
      as_of: as_of ?? new Date().toISOString().slice(0, 10),
      assets, total_assets,
      liabilities, total_liabilities,
      equity, total_equity,
      balanced: Math.abs(total_assets - (total_liabilities + total_equity)) < 0.01,
    };
  }

  listEntries(filter?: { source?: string; from?: string; to?: string }): JournalEntry[] {
    let result = [...this.entries];
    if (filter?.source) result = result.filter((e) => e.source === filter.source);
    if (filter?.from) result = result.filter((e) => e.date >= filter.from!);
    if (filter?.to) result = result.filter((e) => e.date <= filter.to!);
    return result;
  }
}

export const generalLedgerEngine = new GeneralLedgerEngine();

// ─── Persistence Bridge Registration ────────────────────────────────────────
persistenceBridge.registerMap({
  entity: "gl_accounts",
  getMap: () => (generalLedgerEngine as any).accounts as Map<string, any>,
  keyField: "code",
});
persistenceBridge.registerArray({
  entity: "gl_journal_entries",
  getArray: () => (generalLedgerEngine as any).entries as any[],
  setArray: (data: any[]) => { (generalLedgerEngine as any).entries = data; },
  keyField: "id",
});
