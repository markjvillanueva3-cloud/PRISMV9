%
O0666 (PRISM KNOWN-BAD OVER-TRAVEL TEST -- DELIBERATE LIMIT VIOLATION)
(Purpose: CIMCO Machine-Sim collision/limit-row proof for U-CIMCO-BASELINE-SIM.)
(Machine: VMC-03 Haas VF-2 -> sim-map cimcoMatch "Haas VF-6_40.mcfg".)
(The Haas VF-6/40 envelope is ~1626 x 813 x 762 mm. The two moves below command)
(motion FAR beyond every axis limit, so a CORRECT sim MUST report over-travel/limit)
(rows -- the verdict MUST be FAIL. A clean/header-only report here means the sim is)
(running the DEFAULT machine, not the loaded Haas .mcfg kinematics -- the fidelity wire.)
(Dialect: Fanuc/Haas NGC. Units: G21 metric.)
G21 G90 G54 G17 G94
G0 X0 Y0 Z50.
M3 S1000
(--- DELIBERATE Z OVER-TRAVEL: commands Z-2000mm vs ~762mm travel ---)
G1 Z-2000. F100.
(--- DELIBERATE X OVER-TRAVEL: commands X+9999mm vs ~1626mm travel ---)
G1 X9999. F500.
(--- DELIBERATE Y OVER-TRAVEL: commands Y+9999mm vs ~813mm travel ---)
G1 Y9999. F500.
G0 Z50.
M5
G91 G28 Z0.
G28 X0. Y0.
M30
%
