---
name: mfg-mobile-lookup
description: Quick data lookups optimized for mobile and shop floor use
---

# Mobile Data Lookup

## When To Use
- Looking up tool data, material specs, or machine info from the shop floor
- Getting quick answers without navigating complex menus on a mobile device
- Retrieving cached data when network connectivity is limited
- Performing barcode or QR code scans to pull up part/tool information

## How To Use
```
prism_intelligence action=mobile_lookup params={query: "speed feed for 12mm carbide endmill in 6061 aluminum", format: "compact"}
prism_intelligence action=mobile_cache params={action: "get", key: "tool_T12_specs"}
```

## What It Returns
- `result` — compact, mobile-formatted answer to the query
- `source` — data source (cached, live database, calculated)
- `confidence` — confidence level of the lookup result
- `related` — list of related lookups the user might need next
- `cached_at` — timestamp if result was served from cache

## Examples
- Quick tool lookup: `mobile_lookup params={query: "tap drill size for M10x1.5"}`
- Material spec lookup: `mobile_lookup params={query: "Ti-6Al-4V hardness and density"}`
- Cache data for offline use: `mobile_cache params={action: "store", key: "job_WO2026_params", data: {...}}`
