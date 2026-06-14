---
name: reference_hotel_business_engine_buckets_2026_05_28
description: 355 business engines grouped into 8 functional buckets with canonical members
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.144Z
aliases: reference_hotel_business_engine_buckets_2026_05_28
---


355 business/ERP/HR engines (flat in mcp-server/src/engines/) by bucket:
- Accounting/Finance: GeneralLedger, Billing, AccountingHardening, JobProfitabilityWaterfall, ActualCost, JobCosting, FinancialAnalysis, JMDieFinancialBaseline.
- HR (22 Employee*): payroll/PTO/benefits/timeclock/shift/swap/taskhandoff/performance/expense/multijob-concurrency/per-op-part/mobile/dailydigest/roleacademy + HRCompliance.
- ERP: ERPIntegration (7 vendors) + WorkOrder/CostFeedback/Quality/ToolInventory/Import, JMDieErpSimulation.
- CRM: Customer{Management,Knowledge,Portal,PortfolioMiner,ComplaintIntake,MaterialMap}, JMCustomerVendorDatabase.
- Quote (charlie-owned, consumed): InstantQuote, BlueprintToQuote, Additive/Casting/InjectionMold quote.
- Job/Sched: Job{Lifecycle,Traveler,ShopScheduling,RoutingTemplate,DeskAggregator}, Capacity{Planning,MonteCarlo}, EngineeringChangeOrder.
- Quality/Compliance/Audit: Compliance, ISO9001QMS, ITARComplianceTagger, CAPAWorkflow, LOTOLog, KaizenLeanSigma, Audit{,Manager,Logging,ConsensusAuditLog}, DepartmentAuditDashboard.
- Hotel-specific: HotelGateEngines, HotelERPTribalKnowledgeEngine (17 ERP categories, wired hotel_tribal_*).
