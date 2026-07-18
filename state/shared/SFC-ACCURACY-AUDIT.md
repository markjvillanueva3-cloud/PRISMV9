# SFC Accuracy Audit -- PASS

> Generated: 2026-06-23T13:12:09.342Z - schema 1.0.0
> Streams the SFC-ACCURACY-MS1 variability corpus and checks every computed
> row against closed-form SFC identities + physical-validity invariants.

## Headline
- **Grade: PASS** (0 critical check(s) tripped)
- Rows audited: **11,213,600**  (err rows: 0)
- Violations: **0 critical** - 0 warn - 9,114,043 info

## Accuracy margin (worst-case deviation from closed-form identity)
- Max feed-rate deviation (vf vs rpm*fz*flutes): **2.691%** @ lathe #4339001
- Max vc deviation, mill (vc vs pi*D*rpm/1000): **0.509%** @ mill #4537261

## By domain
| domain | rows | critical | warn | info |
|---|---:|---:|---:|---:|
| mill | 6,472,400 | 0 | 0 | 5,175,784 |
| lathe | 4,741,200 | 0 | 0 | 3,938,259 |

## Checks (severity-ranked)
| check | severity | count |
|---|---|---:|
| life_sentinel | info | 9,114,043 |

## Sample violations