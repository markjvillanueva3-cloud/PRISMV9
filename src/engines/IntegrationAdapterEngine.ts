/**
 * IntegrationAdapterEngine — Export adapters for external systems.
 * QuickBooks IIF/CSV, bank reconciliation BAI2, tax summary, generic CSV.
 */

export interface ExportResult {
  format: string;
  filename: string;
  content: string;
  record_count: number;
  total_amount: number;
}

export interface BankReconciliation {
  statement_date: string;
  bank_balance: number;
  book_balance: number;
  outstanding_deposits: { date: string; amount: number; reference: string }[];
  outstanding_checks: { date: string; amount: number; reference: string }[];
  adjusted_bank: number;
  adjusted_book: number;
  reconciled: boolean;
  difference: number;
}

type Transaction = {
  date: string;
  type: string;
  reference: string;
  description: string;
  amount: number;
  account: string;
  category?: string;
};

class IntegrationAdapterEngine {

  /** Export transactions as QuickBooks IIF format */
  exportQuickBooksIIF(transactions: Transaction[]): ExportResult {
    const lines: string[] = [
      '!TRNS\tTRNSID\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tMEMO',
      '!SPL\tSPLID\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tMEMO',
      '!ENDTRNS',
    ];

    let total = 0;
    for (let i = 0; i < transactions.length; i++) {
      const t = transactions[i];
      total += Math.abs(t.amount);
      lines.push(`TRNS\t${i + 1}\t${t.type}\t${t.date}\t${t.account}\t${t.description}\t${t.amount.toFixed(2)}\t${t.reference}`);
      lines.push(`SPL\t${i + 1}\t${t.type}\t${t.date}\t${t.category ?? 'Uncategorized'}\t\t${(-t.amount).toFixed(2)}\t`);
      lines.push('ENDTRNS');
    }

    return {
      format: 'QuickBooks IIF',
      filename: `qb_export_${new Date().toISOString().slice(0, 10)}.iif`,
      content: lines.join('\n'),
      record_count: transactions.length,
      total_amount: total,
    };
  }

  /** Export as generic CSV */
  exportCSV(transactions: Transaction[]): ExportResult {
    const header = 'Date,Type,Reference,Description,Amount,Account,Category';
    const rows = transactions.map((t) =>
      `${t.date},${t.type},${t.reference},"${t.description}",${t.amount.toFixed(2)},${t.account},${t.category ?? ''}`
    );

    return {
      format: 'CSV',
      filename: `export_${new Date().toISOString().slice(0, 10)}.csv`,
      content: [header, ...rows].join('\n'),
      record_count: transactions.length,
      total_amount: transactions.reduce((s, t) => s + Math.abs(t.amount), 0),
    };
  }

  /** Export payroll summary for tax filing */
  exportPayrollTaxSummary(params: {
    period: string;
    employees: {
      name: string; ssn_last4: string;
      gross: number; federal_tax: number; state_tax: number;
      social_security: number; medicare: number; net: number;
    }[];
  }): ExportResult {
    const lines = [
      `PAYROLL TAX SUMMARY — Period: ${params.period}`,
      `Generated: ${new Date().toISOString().slice(0, 10)}`,
      '',
      'Employee,SSN Last 4,Gross Pay,Federal Tax,State Tax,Social Security,Medicare,Net Pay',
    ];

    let totalGross = 0, totalFed = 0, totalState = 0, totalSS = 0, totalMed = 0, totalNet = 0;
    for (const emp of params.employees) {
      lines.push(`"${emp.name}",${emp.ssn_last4},${emp.gross.toFixed(2)},${emp.federal_tax.toFixed(2)},${emp.state_tax.toFixed(2)},${emp.social_security.toFixed(2)},${emp.medicare.toFixed(2)},${emp.net.toFixed(2)}`);
      totalGross += emp.gross; totalFed += emp.federal_tax; totalState += emp.state_tax;
      totalSS += emp.social_security; totalMed += emp.medicare; totalNet += emp.net;
    }

    lines.push(`"TOTALS",,${totalGross.toFixed(2)},${totalFed.toFixed(2)},${totalState.toFixed(2)},${totalSS.toFixed(2)},${totalMed.toFixed(2)},${totalNet.toFixed(2)}`);
    lines.push('', `Employer FICA Match: $${(totalSS + totalMed).toFixed(2)}`);
    lines.push(`Total Tax Liability: $${(totalFed + totalState + (totalSS + totalMed) * 2).toFixed(2)}`);

    return {
      format: 'Payroll Tax CSV',
      filename: `payroll_tax_${params.period}.csv`,
      content: lines.join('\n'),
      record_count: params.employees.length,
      total_amount: totalGross,
    };
  }

  /** Bank reconciliation */
  reconcileBank(params: {
    statement_date: string;
    bank_balance: number;
    book_balance: number;
    deposits_in_transit: { date: string; amount: number; reference: string }[];
    outstanding_checks: { date: string; amount: number; reference: string }[];
    bank_charges?: number;
    interest_earned?: number;
  }): BankReconciliation {
    const depositTotal = params.deposits_in_transit.reduce((s, d) => s + d.amount, 0);
    const checkTotal = params.outstanding_checks.reduce((s, c) => s + c.amount, 0);

    const adjustedBank = params.bank_balance + depositTotal - checkTotal;
    const adjustedBook = params.book_balance - (params.bank_charges ?? 0) + (params.interest_earned ?? 0);
    const difference = Math.round((adjustedBank - adjustedBook) * 100) / 100;

    return {
      statement_date: params.statement_date,
      bank_balance: params.bank_balance,
      book_balance: params.book_balance,
      outstanding_deposits: params.deposits_in_transit,
      outstanding_checks: params.outstanding_checks,
      adjusted_bank: adjustedBank,
      adjusted_book: adjustedBook,
      reconciled: Math.abs(difference) < 0.01,
      difference,
    };
  }

  /** Export AR aging report as CSV */
  exportARAging(invoices: {
    id: string; customer: string; date: string; due_date: string;
    total: number; paid: number; balance: number;
  }[]): ExportResult {
    const now = Date.now();
    const header = 'Invoice,Customer,Date,Due Date,Total,Paid,Balance,Days Outstanding,Aging Bucket';
    const rows = invoices.map((inv) => {
      const days = Math.floor((now - new Date(inv.due_date).getTime()) / 86400000);
      const bucket = days <= 0 ? 'Current' : days <= 30 ? '1-30' : days <= 60 ? '31-60' : days <= 90 ? '61-90' : '90+';
      return `${inv.id},"${inv.customer}",${inv.date},${inv.due_date},${inv.total.toFixed(2)},${inv.paid.toFixed(2)},${inv.balance.toFixed(2)},${Math.max(days, 0)},${bucket}`;
    });

    return {
      format: 'AR Aging CSV',
      filename: `ar_aging_${new Date().toISOString().slice(0, 10)}.csv`,
      content: [header, ...rows].join('\n'),
      record_count: invoices.length,
      total_amount: invoices.reduce((s, i) => s + i.balance, 0),
    };
  }

  /** List supported export formats */
  listFormats(): { format: string; description: string; use_case: string }[] {
    return [
      { format: 'QuickBooks IIF', description: 'Intuit interchange format for journal entries', use_case: 'Import transactions into QuickBooks Desktop' },
      { format: 'CSV', description: 'Generic comma-separated values', use_case: 'Import into any spreadsheet or accounting system' },
      { format: 'Payroll Tax CSV', description: 'Payroll tax summary with FICA', use_case: 'Quarterly 941 filing preparation' },
      { format: 'AR Aging CSV', description: 'Accounts receivable aging buckets', use_case: 'Collections management and credit review' },
      { format: 'Bank Reconciliation', description: 'Statement vs book balance matching', use_case: 'Monthly bank statement reconciliation' },
    ];
  }
}

export const integrationAdapterEngine = new IntegrationAdapterEngine();
