# JM-VENDOR-COST-INDEX — JM Tool & Die accounts-payable cost basis (quoting galaxy)

> Generated 2026-05-29 · source: `H:/PRISM/Docustrata/Report_from_J.M._Tool__Die_LLC.pdf` (880-page QuickBooks A/P) · owner: slot:charlie (quoting). Cost half of the data-ceiling fix (U-QP-ACCOUNTING-WIRE).

**20736 line-items · 174 vendors · gross spend $10,082,733.9 · credits $66,501.06 · net $10,016,232.84**

## Spend by category (the quoting cost-basis priors)
| category | line-items | net spend | vendors | unit-cost min / median / max |
|----------|-----------:|----------:|--------:|------------------------------|
| tooling-consumable | 7150 | $4,889,640.48 | 49 | $0 / $33.87 / $6750 (n=7122) |
| material | 5652 | $2,711,841.54 | 32 | $0 / $3.39 / $7899.12 (n=5613) |
| misc | 4533 | $1,262,535.47 | 112 | $-23.2 / $38.14 / $23498 (n=4506) |
| overhead-utility | 332 | $748,513.33 | 45 | $0 / $58.96 / $89130.35 (n=323) |
| outside-process | 2822 | $347,134.07 | 39 | $0 / $3.25 / $2025 (n=2817) |
| inspection-quality | 120 | $33,703.59 | 9 | $-30 / $160 / $1974.25 (n=118) |
| freight-shipping | 127 | $22,864.36 | 34 | $4.86 / $17.27 / $3836.18 (n=127) |

## Top 25 vendors by net spend
| vendor | line-items | net spend | top category | date range |
|--------|-----------:|----------:|--------------|------------|
| MICHIGAN CARBIDE | 2892 | $2,573,178.12 | tooling-consumable | 01/03/2019–12/30/2020 |
| ROCKFORM CARBIDE MANUFACTURING, INC. | 1963 | $1,133,197.5 | tooling-consumable | 01/02/2018–12/29/2016 |
| CINCINNATI TOOL STEEL | 2050 | $827,363.13 | material | 01/01/2024–12/27/2024 |
| GRIGGS STEEL | 901 | $572,517.43 | material | 01/05/2022–12/31/2017 |
| SB SPECIALTY METALS | 860 | $565,665.41 | material | 01/05/2022–12/29/2021 |
| ALRO STEEL | 1474 | $519,368.31 | material | 01/02/2018–12/29/2016 |
| CREATIVE CARBIDE | 493 | $500,502.31 | tooling-consumable | 01/02/2026–12/31/2018 |
| WHITE DOG | 31 | $437,187.99 | overhead-utility | 01/15/2025–11/15/2025 |
| INNOVATE TECHNOLOGIES | 125 | $182,814.88 | misc | 01/03/2024–12/30/2024 |
| SUNNEN PRODUCTS COMPANY | 842 | $164,726.67 | misc | 01/04/2024–12/21/2018 |
| PTS-TOOLS | 461 | $145,887.34 | misc | 01/08/2026–12/30/2025 |
| AETNA LIFE INSURANCE | 6 | $141,651 | overhead-utility | 05/15/2014–10/15/2014 |
| TS TOOLING SUPPLY | 818 | $134,049.63 | tooling-consumable | 01/12/2026–12/29/2025 |
| ELECTRODES | 181 | $133,998.86 | misc | 01/08/2019–12/31/2024 |
| KENNAMETAL | 123 | $131,800.74 | tooling-consumable | 01/08/2015–12/21/2015 |
| ARMOR COATED TECHNOLOGY | 1077 | $126,310.18 | outside-process | 01/07/2022–12/29/2025 |
| STAR TOOLS | 241 | $118,400.5 | tooling-consumable | 01/03/2024–12/19/2025 |
| MORRIS MIDWEST | 96 | $108,842.64 | misc | 01/11/2023–12/29/2025 |
| MSC INDUSTRIAL SUPPLY | 593 | $98,738.05 | misc | 01/03/2020–12/29/2020 |
| SCIENTIFIC METAL TREATING | 1238 | $83,392.9 | outside-process | 01/02/2025–12/29/2025 |
| WORLD DIAMOND TOOL | 149 | $83,109 | tooling-consumable | 01/05/2021–12/14/2018 |
| GENERAL CARBIDE | 121 | $82,389.95 | tooling-consumable | 01/18/2019–12/29/2017 |
| STEINER ELECTRIC COMPANY | 81 | $60,626.9 | overhead-utility | 01/09/2026–11/30/2018 |
| MECH-ART | 45 | $59,980 | misc | 02/12/2026–12/19/2025 |
| OERLIKON BALZERS COATING | 92 | $59,272.56 | outside-process | 01/05/2022–12/28/2020 |

## How quoting consumes this
- **should_cost decomposition** — outside-process + material + tooling unit-cost priors feed the per-stage cost model (no more synth-only guesses).
- **`quoting_secondary_ops_price`** — outside-process category (weld/solder/braze/coat/heat-treat/grind/EDM) is the real secondary-ops price book.
- **`vendor_realtime_price` / `DocustrataAccountingBridgeEngine`** — per-vendor spend history + date range = the vendor-price prior.
- **`quoting_shop_utilities_cost` / `quoting_shop_electricity_cost`** — overhead-utility category sizes the real overhead burden.

> R12: unit_cost = QuickBooks per-unit "Cost"; line_amount = qty × unit_cost. Item-Receipt rows (received-not-billed, cost rendered "...") recorded with null cost + excluded from spend.