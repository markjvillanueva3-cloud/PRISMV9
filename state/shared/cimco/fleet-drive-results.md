# CIMCO fleet closed-loop drive -- 0/12 loop-ran (+ 3 EDM-routed)

- loop-ran: 0 | sim-engaged-no-report: 3 | drive-failed: 9 | EDM-routed: 3

| machine | type | readiness | report | rows | source | note |
|---|---|---|---|---|---|---|
| LTH-01 | lathe | drive-failed-read | found=false | 0 | no-read |  |
| LTH-02 | lathe | sim-engaged-no-report | found=true | 0 | report-header-only | sim ran (see invokeState) but report grid had 0 data rows -- |
| LTH-03 | lathe | sim-engaged-no-report | found=true | 0 | report-header-only | sim ran (see invokeState) but report grid had 0 data rows -- |
| LTH-04 | lathe | sim-engaged-no-report | found=true | 0 | report-header-only | sim ran (see invokeState) but report grid had 0 data rows -- |
| LTH-05 | lathe | drive-failed-read | found=false | 0 | no-read |  |
| LTH-06 | lathe | drive-failed-read | found=false | 0 | no-read |  |
| LTH-07 | lathe | drive-failed-read | found=false | 0 | no-read |  |
| VMC-01 | mill | drive-failed-read | found=false | 0 | no-read |  |
| VMC-02 | mill | drive-failed-read | found=false | 0 | no-read |  |
| VMC-03 | mill | drive-failed-read | found=false | 0 | no-read |  |
| VMC-04 | mill | drive-failed-read | found=false | 0 | no-read |  |
| VMC-05 | mill | drive-failed-read | found=false | 0 | no-read |  |
| EDM-01 | sinker_edm | edm-discharge-physics | found=- | - | - | CIMCO models mill/lathe kinematics only -- EDM verdict is PR |
| EDM-02 | sinker_edm | edm-discharge-physics | found=- | - | - | CIMCO models mill/lathe kinematics only -- EDM verdict is PR |
| WEDM-01 | wire_edm | edm-discharge-physics | found=- | - | - | CIMCO models mill/lathe kinematics only -- EDM verdict is PR |