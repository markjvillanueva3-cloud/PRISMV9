---
name: multi-tenant-setup
description: 'Multi-tenant and multi-shop configuration guide. Use when the user needs to set up multiple facilities, divisions, or customer tenants with isolated data and shared resources.'
license: MIT
metadata:
  author: PRISM
  version: "1.0.0"
  product: Platform
---

# Multi-Tenant & Multi-Shop Configuration Guide

## When to Use
- Setting up multiple shop locations under one organization
- Configuring tenant isolation for contract manufacturing clients
- Sharing tool libraries or material databases across facilities
- Managing per-tenant billing, permissions, and data boundaries

## How It Works
1. Create organization and tenants via admin configuration
2. Configure data isolation boundaries (machines, jobs, inventory)
3. Set up shared resources (tool libraries, material DB, formulas)
4. Assign user roles and permissions per tenant
5. Configure cross-tenant reporting for corporate dashboards

## Returns
- Tenant configuration with isolation boundaries
- Shared resource mappings and access controls
- User role matrix (admin, engineer, operator, viewer)
- Cross-tenant aggregation rules for reporting

## Example
**Input:** "Set up 3 shops: Main (20 machines), Satellite (8 machines), Swiss dept (4 machines)"
**Output:** 3 tenants created under Org. Main: full access, 20 machines, 15 users. Satellite: linked tool library (read-only from Main), 8 machines, 6 users. Swiss: isolated Swiss-type material/tool DB, 4 machines, 3 users. Corporate dashboard aggregates OEE across all 32 machines. Shared: material pricing DB, customer master.
