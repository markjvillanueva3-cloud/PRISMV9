# ERP Integration Patterns (HOTEL)

**Galaxy:** HOTEL (Business ERP)
**Status:** Core Capability - Master Level

## Description
Patterns and best practices for integrating PRISM with enterprise resource planning (ERP) systems for quoting, scheduling, capacity, and financial data.

## Key Patterns
- Real-time data synchronization (orders, inventory, capacity)
- Bidirectional flow between quoting and ERP
- Event-driven updates (job completion, tool life, quality)
- Master data management (parts, customers, processes)

## PRISM Implementation
- Integration layer in QuoteToShipOrchestratorEngine and business engines
- API and file-based integration options

## JM Die Notes
- ERP integration is critical for accurate quoting and capacity planning
- Rule: Always validate ERP data against actual shop floor conditions

**Last Updated:** 2026-06-12 (loop-enforced, critic-reviewed)