---
name: api-integration-guide
description: 'API integration guide. Use when the user needs to connect PRISM to external systems like ERP, MES, CAD/CAM software, or IoT/MTConnect data sources.'
license: MIT
metadata:
  author: PRISM
  version: "1.0.0"
  product: Integration
---

# API Integration Guide

## When to Use
- Connecting PRISM to ERP systems (SAP, Epicor, JobBOSS)
- Integrating with CAD/CAM software (Fusion 360, Mastercam, SolidWorks)
- Setting up MTConnect or OPC-UA machine data feeds
- Building custom dashboards or mobile apps on PRISM data

## How It Works
1. Authenticate via API key or OAuth2 flow
2. Select integration type: REST, webhook, or streaming
3. Map data fields between PRISM and external system
4. Configure sync cadence (real-time, hourly, daily)
5. Test with sandbox data before production go-live

## Returns
- API endpoint documentation with request/response examples
- Field mapping configuration between systems
- Webhook setup for event-driven notifications
- Error handling and retry configuration

## Example
**Input:** "Connect PRISM to Epicor ERP for job status sync"
**Output:** Integration configured: PRISM → Epicor via REST API. Job status (started/complete/scrapped) pushed on state change. Material consumption synced hourly. Cycle times posted per-op for labor tracking. Webhook: POST to Epicor /api/v2/jobs/{id}/status with auth token. Retry: 3x with exponential backoff. Sandbox test: 5 jobs synced successfully.
