import { persistenceBridge } from "../db/PersistenceBridge.js";

/**
 * CustomerManagementEngine — CRM for job shops. Customer records, credit limits,
 * pricing tiers, communication log, win/loss tracking, sales pipeline.
 */

export interface Customer {
  id: string;
  name: string;
  company: string;
  contact_name: string;
  email: string;
  phone: string;
  address: { street: string; city: string; state: string; zip: string };
  credit_limit: number;
  current_balance: number;
  payment_terms: string;
  pricing_tier: 'standard' | 'preferred' | 'contract' | 'wholesale';
  discount_pct: number;
  tax_exempt: boolean;
  tax_id?: string;
  status: 'active' | 'inactive' | 'on_hold' | 'prospect';
  created_at: string;
  notes?: string;
  tags: string[];
}

export interface CommunicationLog {
  id: string;
  customer_id: string;
  date: string;
  type: 'email' | 'phone' | 'meeting' | 'site_visit' | 'rfq' | 'complaint' | 'note';
  subject: string;
  details: string;
  logged_by: string;
  follow_up_date?: string;
  follow_up_done?: boolean;
}

export interface SalesOpportunity {
  id: string;
  customer_id: string;
  description: string;
  estimated_value: number;
  stage: 'prospect' | 'rfq_received' | 'quoted' | 'negotiating' | 'won' | 'lost';
  probability_pct: number;
  created_at: string;
  close_date?: string;
  lost_reason?: string;
  quote_id?: string;
}

export interface CustomerAnalytics {
  customer_id: string;
  customer_name: string;
  total_revenue: number;
  total_jobs: number;
  avg_job_value: number;
  on_time_delivery_pct: number;
  avg_margin_pct: number;
  quote_win_rate: number;
  last_order_date: string;
  lifetime_months: number;
}

class CustomerManagementEngine {
  private customers: Map<string, Customer> = new Map();
  private commLogs: CommunicationLog[] = [];
  private opportunities: SalesOpportunity[] = [];
  private jobHistory: Map<string, { revenue: number; margin: number; on_time: boolean; date: string }[]> = new Map();
  private nextId = 1;

  createCustomer(params: Omit<Customer, 'id' | 'current_balance' | 'created_at' | 'status'> & { status?: Customer['status'] }): Customer {
    const id = `CUST-${String(this.nextId++).padStart(4, '0')}`;
    const customer: Customer = {
      ...params,
      id,
      current_balance: 0,
      status: params.status ?? 'active',
      created_at: new Date().toISOString(),
    };
    this.customers.set(id, customer);
    persistenceBridge.persist("customers", id, customer as any);
    return customer;
  }

  getCustomer(id: string): Customer | undefined {
    return this.customers.get(id);
  }

  updateCustomer(id: string, updates: Partial<Omit<Customer, 'id' | 'created_at'>>): Customer {
    const cust = this.customers.get(id);
    if (!cust) throw new Error(`Customer ${id} not found`);
    Object.assign(cust, updates);
    persistenceBridge.persist("customers", id, cust as any);
    return cust;
  }

  searchCustomers(query: string): Customer[] {
    const q = query.toLowerCase();
    return [...this.customers.values()].filter((c) =>
      c.name.toLowerCase().includes(q) ||
      c.company.toLowerCase().includes(q) ||
      c.contact_name.toLowerCase().includes(q) ||
      c.tags.some((t) => t.toLowerCase().includes(q))
    );
  }

  listCustomers(filter?: { status?: string; tier?: string }): Customer[] {
    let result = [...this.customers.values()];
    if (filter?.status) result = result.filter((c) => c.status === filter.status);
    if (filter?.tier) result = result.filter((c) => c.pricing_tier === filter.tier);
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }

  checkCredit(customer_id: string, order_amount: number): {
    approved: boolean;
    credit_limit: number;
    current_balance: number;
    available_credit: number;
    order_amount: number;
    over_limit_by: number;
  } {
    const cust = this.customers.get(customer_id);
    if (!cust) throw new Error(`Customer ${customer_id} not found`);
    const available = cust.credit_limit - cust.current_balance;
    return {
      approved: order_amount <= available,
      credit_limit: cust.credit_limit,
      current_balance: cust.current_balance,
      available_credit: available,
      order_amount,
      over_limit_by: Math.max(order_amount - available, 0),
    };
  }

  // --- Communication Log ---
  logCommunication(params: Omit<CommunicationLog, 'id'>): CommunicationLog {
    const log: CommunicationLog = { ...params, id: `COMM-${Date.now()}` };
    this.commLogs.push(log);
    persistenceBridge.persistAppend("customer_communications", log as any);
    return log;
  }

  getCommHistory(customer_id: string, limit?: number): CommunicationLog[] {
    const logs = this.commLogs
      .filter((l) => l.customer_id === customer_id)
      .sort((a, b) => b.date.localeCompare(a.date));
    return limit ? logs.slice(0, limit) : logs;
  }

  getPendingFollowUps(): CommunicationLog[] {
    const today = new Date().toISOString().slice(0, 10);
    return this.commLogs.filter((l) =>
      l.follow_up_date && l.follow_up_date <= today && !l.follow_up_done
    );
  }

  // --- Sales Pipeline ---
  createOpportunity(params: Omit<SalesOpportunity, 'id' | 'created_at'>): SalesOpportunity {
    const opp: SalesOpportunity = { ...params, id: `OPP-${Date.now()}`, created_at: new Date().toISOString() };
    this.opportunities.push(opp);
    persistenceBridge.persistAppend("sales_opportunities", opp as any);
    return opp;
  }

  updateOpportunity(id: string, updates: Partial<Pick<SalesOpportunity, 'stage' | 'probability_pct' | 'close_date' | 'lost_reason'>>): SalesOpportunity {
    const opp = this.opportunities.find((o) => o.id === id);
    if (!opp) throw new Error(`Opportunity ${id} not found`);
    Object.assign(opp, updates);
    persistenceBridge.persist("sales_opportunities", id, opp as any);
    return opp;
  }

  salesPipeline(): {
    stages: { stage: string; count: number; value: number; weighted_value: number }[];
    total_pipeline: number;
    weighted_pipeline: number;
    win_rate: number;
    avg_deal_size: number;
  } {
    const stageMap = new Map<string, { count: number; value: number; weighted: number }>();
    for (const opp of this.opportunities) {
      const existing = stageMap.get(opp.stage) ?? { count: 0, value: 0, weighted: 0 };
      existing.count++;
      existing.value += opp.estimated_value;
      existing.weighted += opp.estimated_value * (opp.probability_pct / 100);
      stageMap.set(opp.stage, existing);
    }

    const stages = [...stageMap.entries()].map(([stage, data]) => ({
      stage, count: data.count, value: data.value, weighted_value: Math.round(data.weighted),
    }));

    const total = this.opportunities.reduce((s, o) => s + o.estimated_value, 0);
    const weighted = this.opportunities.reduce((s, o) => s + o.estimated_value * (o.probability_pct / 100), 0);
    const won = this.opportunities.filter((o) => o.stage === 'won').length;
    const closed = this.opportunities.filter((o) => o.stage === 'won' || o.stage === 'lost').length;

    return {
      stages,
      total_pipeline: total,
      weighted_pipeline: Math.round(weighted),
      win_rate: closed > 0 ? Math.round((won / closed) * 100) : 0,
      avg_deal_size: this.opportunities.length > 0 ? Math.round(total / this.opportunities.length) : 0,
    };
  }

  // --- Analytics ---
  recordJobForCustomer(customer_id: string, revenue: number, margin: number, on_time: boolean): void {
    const history = this.jobHistory.get(customer_id) ?? [];
    history.push({ revenue, margin, on_time, date: new Date().toISOString().slice(0, 10) });
    this.jobHistory.set(customer_id, history);

    const cust = this.customers.get(customer_id);
    if (cust) {
      cust.current_balance += revenue;
      persistenceBridge.persist("customers", customer_id, cust as any);
    }
  }

  customerAnalytics(customer_id: string): CustomerAnalytics {
    const cust = this.customers.get(customer_id);
    if (!cust) throw new Error(`Customer ${customer_id} not found`);
    const jobs = this.jobHistory.get(customer_id) ?? [];
    const totalRevenue = jobs.reduce((s, j) => s + j.revenue, 0);
    const onTime = jobs.filter((j) => j.on_time).length;

    const quotes = this.opportunities.filter((o) => o.customer_id === customer_id);
    const won = quotes.filter((o) => o.stage === 'won').length;
    const closed = quotes.filter((o) => o.stage === 'won' || o.stage === 'lost').length;

    const created = new Date(cust.created_at);
    const months = Math.max(1, Math.floor((Date.now() - created.getTime()) / (30 * 86400000)));

    return {
      customer_id,
      customer_name: cust.name,
      total_revenue: totalRevenue,
      total_jobs: jobs.length,
      avg_job_value: jobs.length > 0 ? Math.round(totalRevenue / jobs.length) : 0,
      on_time_delivery_pct: jobs.length > 0 ? Math.round((onTime / jobs.length) * 100) : 100,
      avg_margin_pct: jobs.length > 0 ? Math.round(jobs.reduce((s, j) => s + j.margin, 0) / jobs.length * 10) / 10 : 0,
      quote_win_rate: closed > 0 ? Math.round((won / closed) * 100) : 0,
      last_order_date: jobs.length > 0 ? jobs[jobs.length - 1].date : 'none',
      lifetime_months: months,
    };
  }

  topCustomers(limit: number = 10): CustomerAnalytics[] {
    const analytics = [...this.customers.keys()].map((id) => this.customerAnalytics(id));
    return analytics.sort((a, b) => b.total_revenue - a.total_revenue).slice(0, limit);
  }
}

export const customerManagementEngine = new CustomerManagementEngine();

// ─── Persistence Bridge Registration ────────────────────────────────────────
persistenceBridge.registerMap({
  entity: "customers",
  getMap: () => (customerManagementEngine as any).customers as Map<string, any>,
  keyField: "id",
});
persistenceBridge.registerArray({
  entity: "customer_communications",
  getArray: () => (customerManagementEngine as any).commLogs as any[],
  setArray: (data: any[]) => { (customerManagementEngine as any).commLogs = data; },
  keyField: "id",
});
persistenceBridge.registerArray({
  entity: "sales_opportunities",
  getArray: () => (customerManagementEngine as any).opportunities as any[],
  setArray: (data: any[]) => { (customerManagementEngine as any).opportunities = data; },
  keyField: "id",
});
