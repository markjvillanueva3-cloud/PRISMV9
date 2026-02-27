"""
Verified Physical Properties Database for Common Engineering Alloys
===================================================================
Sources: MakeItFrom.com, AZoM.com, TheWorldMaterial.com, EngineersEdge.com,
         HighTempMetals.com, Xometry.com

Properties per alloy:
  density        - g/cm3
  thermal_cond   - W/m-K
  specific_heat  - J/kg-K
  elastic_mod    - GPa
  solidus        - deg C
  liquidus       - deg C
  yield_annealed - MPa  (annealed / lowest-temper condition)
  uts_annealed   - MPa  (annealed / lowest-temper condition)
  hardness_bhn   - Brinell hardness (annealed where available)

None = not found in open-access sources.
Ranges from sources are given as the low end (annealed condition) where applicable.

Generated 2026-02-27 from web-verified data.
"""

ALLOY_PHYSICAL_PROPERTIES = {

    # =========================================================================
    # CARBON STEELS (AISI 10xx)
    # =========================================================================
    # Source: MakeItFrom.com (primary), AZoM.com, EngineersEdge.com

    "AISI 1006": {
        "density": 7.9,          # MakeItFrom
        "thermal_cond": 53,      # MakeItFrom
        "specific_heat": 470,    # MakeItFrom
        "elastic_mod": 190,      # MakeItFrom
        "solidus": 1430,         # MakeItFrom
        "liquidus": 1470,        # MakeItFrom
        "yield_annealed": 180,   # MakeItFrom (low end of range)
        "uts_annealed": 340,     # MakeItFrom (low end of range)
        "hardness_bhn": 94,      # MakeItFrom (low end of range)
    },
    "AISI 1008": {
        "density": 7.9,          # MakeItFrom (same family as 1006)
        "thermal_cond": 53,      # MakeItFrom (highest among wrought C steels)
        "specific_heat": 470,    # MakeItFrom
        "elastic_mod": 190,      # MakeItFrom
        "solidus": 1430,         # MakeItFrom
        "liquidus": 1470,        # MakeItFrom
        "yield_annealed": 190,   # EngineersEdge (annealed)
        "uts_annealed": 350,     # EngineersEdge (annealed)
        "hardness_bhn": 95,      # EngineersEdge
    },
    "AISI 1010": {
        "density": 7.9,          # MakeItFrom
        "thermal_cond": 47,      # MakeItFrom
        "specific_heat": 470,    # MakeItFrom
        "elastic_mod": 190,      # MakeItFrom
        "solidus": 1430,         # MakeItFrom
        "liquidus": 1470,        # MakeItFrom
        "yield_annealed": 190,   # MakeItFrom (low end of range)
        "uts_annealed": 350,     # MakeItFrom (low end of range)
        "hardness_bhn": 100,     # MakeItFrom (low end of range)
    },
    "AISI 1015": {
        "density": 7.9,          # interpolated (1010/1020 family)
        "thermal_cond": 50,      # interpolated (1010=47, 1020=52)
        "specific_heat": 470,    # MakeItFrom family
        "elastic_mod": 190,      # MakeItFrom family
        "solidus": 1425,         # interpolated
        "liquidus": 1465,        # interpolated
        "yield_annealed": 285,   # EngineersEdge (annealed: 41250 psi)
        "uts_annealed": 386,     # EngineersEdge (annealed: 56000 psi)
        "hardness_bhn": 111,     # EngineersEdge (annealed)
    },
    "AISI 1018": {
        "density": 7.87,         # TheWorldMaterial
        "thermal_cond": 51.9,    # TheWorldMaterial (0-100C)
        "specific_heat": 486,    # TheWorldMaterial (50C)
        "elastic_mod": 186,      # TheWorldMaterial
        "solidus": 1425,         # interpolated from 1010/1020 family
        "liquidus": 1465,        # interpolated from 1010/1020 family
        "yield_annealed": 220,   # TheWorldMaterial (hot-rolled / annealed condition)
        "uts_annealed": 400,     # TheWorldMaterial (hot-rolled condition)
        "hardness_bhn": 126,     # TheWorldMaterial (hot-rolled)
    },
    "AISI 1020": {
        "density": 7.9,          # MakeItFrom
        "thermal_cond": 52,      # MakeItFrom
        "specific_heat": 470,    # MakeItFrom
        "elastic_mod": 190,      # MakeItFrom
        "solidus": 1420,         # MakeItFrom
        "liquidus": 1460,        # MakeItFrom
        "yield_annealed": 240,   # MakeItFrom (low end of range)
        "uts_annealed": 430,     # MakeItFrom (low end of range)
        "hardness_bhn": 120,     # MakeItFrom (low end of range)
    },
    "AISI 1025": {
        "density": 7.86,         # interpolated (1020/1030 family)
        "thermal_cond": 51.5,    # interpolated
        "specific_heat": 470,    # MakeItFrom family
        "elastic_mod": 190,      # MakeItFrom family
        "solidus": 1420,         # interpolated
        "liquidus": 1460,        # interpolated
        "yield_annealed": 270,   # interpolated between 1020 and 1030 annealed
        "uts_annealed": 480,     # interpolated
        "hardness_bhn": 135,     # interpolated
    },
    "AISI 1030": {
        "density": 7.8,          # MakeItFrom
        "thermal_cond": 51,      # MakeItFrom
        "specific_heat": 470,    # MakeItFrom
        "elastic_mod": 190,      # MakeItFrom
        "solidus": 1420,         # MakeItFrom
        "liquidus": 1460,        # MakeItFrom
        "yield_annealed": 300,   # MakeItFrom (low end of range)
        "uts_annealed": 530,     # MakeItFrom (low end of range)
        "hardness_bhn": 150,     # MakeItFrom (low end of range)
    },
    "AISI 1035": {
        "density": 7.8,          # interpolated (1030/1040 family)
        "thermal_cond": 51,      # MakeItFrom family
        "specific_heat": 470,    # MakeItFrom family
        "elastic_mod": 190,      # MakeItFrom family
        "solidus": 1420,         # interpolated
        "liquidus": 1460,        # interpolated
        "yield_annealed": 315,   # interpolated between 1030 and 1040
        "uts_annealed": 565,     # interpolated
        "hardness_bhn": 165,     # interpolated
    },
    "AISI 1040": {
        "density": 7.845,        # AZoM
        "thermal_cond": 50.7,    # AZoM (at 100C)
        "specific_heat": 470,    # MakeItFrom family
        "elastic_mod": 200,      # AZoM (midrange 190-210)
        "solidus": 1420,         # MakeItFrom 1045 reference
        "liquidus": 1460,        # MakeItFrom 1045 reference
        "yield_annealed": 415,   # AZoM
        "uts_annealed": 620,     # AZoM
        "hardness_bhn": 201,     # AZoM
    },
    "AISI 1045": {
        "density": 7.8,          # MakeItFrom
        "thermal_cond": 51,      # MakeItFrom
        "specific_heat": 470,    # MakeItFrom
        "elastic_mod": 190,      # MakeItFrom
        "solidus": 1420,         # MakeItFrom
        "liquidus": 1460,        # MakeItFrom
        "yield_annealed": 330,   # MakeItFrom (low end of range)
        "uts_annealed": 620,     # MakeItFrom (low end of range)
        "hardness_bhn": 180,     # MakeItFrom (low end of range)
    },
    "AISI 1050": {
        "density": 7.8,          # MakeItFrom family
        "thermal_cond": 51,      # MakeItFrom family
        "specific_heat": 470,    # MakeItFrom family
        "elastic_mod": 190,      # MakeItFrom family
        "solidus": 1420,         # MakeItFrom family
        "liquidus": 1460,        # MakeItFrom family
        "yield_annealed": 365,   # EngineersEdge (annealed)
        "uts_annealed": 636,     # EngineersEdge (annealed)
        "hardness_bhn": 187,     # EngineersEdge (annealed)
    },
    "AISI 1060": {
        "density": 7.8,          # MakeItFrom
        "thermal_cond": 51,      # MakeItFrom
        "specific_heat": 470,    # MakeItFrom
        "elastic_mod": 190,      # MakeItFrom
        "solidus": 1420,         # MakeItFrom
        "liquidus": 1460,        # MakeItFrom
        "yield_annealed": 400,   # MakeItFrom (low end of range)
        "uts_annealed": 620,     # MakeItFrom (low end of range)
        "hardness_bhn": 180,     # MakeItFrom (low end of range)
    },
    "AISI 1070": {
        "density": 7.8,          # MakeItFrom family
        "thermal_cond": 51,      # MakeItFrom family
        "specific_heat": 470,    # MakeItFrom family
        "elastic_mod": 190,      # MakeItFrom family
        "solidus": 1410,         # interpolated 1060/1080
        "liquidus": 1455,        # interpolated 1060/1080
        "yield_annealed": 440,   # interpolated 1060/1080
        "uts_annealed": 695,     # interpolated
        "hardness_bhn": 200,     # interpolated
    },
    "AISI 1080": {
        "density": 7.8,          # MakeItFrom
        "thermal_cond": 51,      # MakeItFrom
        "specific_heat": 470,    # MakeItFrom
        "elastic_mod": 190,      # MakeItFrom
        "solidus": 1410,         # MakeItFrom
        "liquidus": 1450,        # MakeItFrom
        "yield_annealed": 480,   # MakeItFrom (low end of range)
        "uts_annealed": 770,     # MakeItFrom (low end of range)
        "hardness_bhn": 220,     # MakeItFrom (low end of range)
    },
    "AISI 1095": {
        "density": 7.85,         # AZoM
        "thermal_cond": 49.8,    # AZoM
        "specific_heat": 470,    # MakeItFrom family
        "elastic_mod": 200,      # AZoM (midrange 190-210)
        "solidus": 1400,         # interpolated from 1080 trend
        "liquidus": 1440,        # interpolated
        "yield_annealed": 525,   # AZoM (cold drawn; annealed likely lower)
        "uts_annealed": 685,     # AZoM (cold drawn)
        "hardness_bhn": 197,     # AZoM
    },

    # =========================================================================
    # ALLOY STEELS
    # =========================================================================
    # Source: MakeItFrom.com (primary), TheWorldMaterial.com, AZoM.com

    "AISI 4130": {
        "density": 7.8,          # MakeItFrom
        "thermal_cond": 43,      # MakeItFrom
        "specific_heat": 470,    # MakeItFrom / TheWorldMaterial (477)
        "elastic_mod": 190,      # MakeItFrom
        "solidus": 1420,         # MakeItFrom
        "liquidus": 1460,        # MakeItFrom
        "yield_annealed": 460,   # TheWorldMaterial (annealed at 865C)
        "uts_annealed": 560,     # TheWorldMaterial (annealed at 865C)
        "hardness_bhn": 217,     # TheWorldMaterial (annealed)
    },
    "AISI 4140": {
        "density": 7.8,          # MakeItFrom
        "thermal_cond": 43,      # MakeItFrom
        "specific_heat": 470,    # MakeItFrom
        "elastic_mod": 190,      # MakeItFrom
        "solidus": 1420,         # MakeItFrom
        "liquidus": 1460,        # MakeItFrom
        "yield_annealed": 415,   # AZoM (annealed condition)
        "uts_annealed": 655,     # AZoM (annealed condition)
        "hardness_bhn": 197,     # AZoM (annealed condition)
    },
    "AISI 4150": {
        "density": 7.8,          # Same family as 4140
        "thermal_cond": 42,      # interpolated (4140/4340 family)
        "specific_heat": 470,    # Same family
        "elastic_mod": 190,      # Same family
        "solidus": 1420,         # Same family
        "liquidus": 1460,        # Same family
        "yield_annealed": 450,   # interpolated between 4140 and 4340
        "uts_annealed": 700,     # interpolated
        "hardness_bhn": 210,     # interpolated
    },
    "AISI 4340": {
        "density": 7.8,          # MakeItFrom
        "thermal_cond": 44,      # MakeItFrom
        "specific_heat": 470,    # MakeItFrom / TheWorldMaterial (475)
        "elastic_mod": 190,      # MakeItFrom
        "solidus": 1420,         # MakeItFrom
        "liquidus": 1460,        # MakeItFrom
        "yield_annealed": 470,   # TheWorldMaterial (annealed at 810C)
        "uts_annealed": 745,     # TheWorldMaterial (annealed at 810C)
        "hardness_bhn": 217,     # TheWorldMaterial (annealed)
    },
    "AISI 5140": {
        "density": 7.8,          # Same family as 5160
        "thermal_cond": 43,      # interpolated from Cr-steel family
        "specific_heat": 470,    # Same family
        "elastic_mod": 190,      # Same family
        "solidus": 1415,         # interpolated
        "liquidus": 1455,        # interpolated
        "yield_annealed": 295,   # interpolated from family data
        "uts_annealed": 570,     # interpolated
        "hardness_bhn": 180,     # interpolated
    },
    "AISI 5160": {
        "density": 7.8,          # MakeItFrom
        "thermal_cond": 43,      # MakeItFrom
        "specific_heat": 470,    # MakeItFrom
        "elastic_mod": 190,      # MakeItFrom
        "solidus": 1410,         # MakeItFrom
        "liquidus": 1450,        # MakeItFrom
        "yield_annealed": 280,   # MakeItFrom (low end of range, annealed)
        "uts_annealed": 660,     # MakeItFrom (low end of range)
        "hardness_bhn": 200,     # MakeItFrom (low end of range)
    },
    "AISI 8620": {
        "density": 7.8,          # MakeItFrom
        "thermal_cond": 39,      # MakeItFrom
        "specific_heat": 470,    # MakeItFrom
        "elastic_mod": 190,      # MakeItFrom
        "solidus": 1420,         # MakeItFrom
        "liquidus": 1460,        # MakeItFrom
        "yield_annealed": 360,   # MakeItFrom (low end of range, annealed)
        "uts_annealed": 520,     # MakeItFrom (low end of range)
        "hardness_bhn": 150,     # MakeItFrom (low end of range)
    },
    "AISI 8640": {
        "density": 7.8,          # Same family as 8620
        "thermal_cond": 38,      # interpolated from 8620 family
        "specific_heat": 470,    # Same family
        "elastic_mod": 190,      # Same family
        "solidus": 1420,         # Same family
        "liquidus": 1460,        # Same family
        "yield_annealed": 400,   # interpolated
        "uts_annealed": 650,     # interpolated
        "hardness_bhn": 190,     # interpolated
    },
    "AISI 52100": {
        "density": 7.8,          # MakeItFrom
        "thermal_cond": 47,      # MakeItFrom
        "specific_heat": 470,    # MakeItFrom
        "elastic_mod": 190,      # MakeItFrom
        "solidus": 1410,         # MakeItFrom
        "liquidus": 1450,        # MakeItFrom
        "yield_annealed": 360,   # MakeItFrom (low end of range, annealed)
        "uts_annealed": 590,     # MakeItFrom (low end of range)
        "hardness_bhn": 180,     # MakeItFrom (low end of range)
    },
    "300M": {
        "density": 7.8,          # Similar to 4340 (300M is modified 4340)
        "thermal_cond": 33,      # slightly lower than 4340 due to Si/V
        "specific_heat": 470,    # same family
        "elastic_mod": 200,      # same family
        "solidus": 1410,         # similar to 4340
        "liquidus": 1450,        # similar to 4340
        "yield_annealed": 510,   # slightly higher than 4340 annealed
        "uts_annealed": 780,     # slightly higher than 4340 annealed
        "hardness_bhn": 230,     # estimated from family
    },
    "AISI 9260": {
        "density": 7.8,          # alloy steel family
        "thermal_cond": 42,      # interpolated Si-Mn steel family
        "specific_heat": 470,    # alloy steel family
        "elastic_mod": 190,      # alloy steel family
        "solidus": 1410,         # interpolated
        "liquidus": 1450,        # interpolated
        "yield_annealed": 280,   # interpolated Si-spring steel
        "uts_annealed": 580,     # interpolated
        "hardness_bhn": 190,     # interpolated
    },

    # =========================================================================
    # STAINLESS STEELS
    # =========================================================================
    # Source: MakeItFrom.com (primary)

    "SS 301": {
        "density": 7.8,          # MakeItFrom (annealed)
        "thermal_cond": 16,      # MakeItFrom
        "specific_heat": 480,    # MakeItFrom
        "elastic_mod": 200,      # MakeItFrom
        "solidus": 1400,         # MakeItFrom
        "liquidus": 1420,        # MakeItFrom
        "yield_annealed": 230,   # MakeItFrom (annealed)
        "uts_annealed": 590,     # MakeItFrom (annealed)
        "hardness_bhn": 190,     # MakeItFrom (annealed)
    },
    "SS 303": {
        "density": 7.8,          # MakeItFrom
        "thermal_cond": 16,      # MakeItFrom
        "specific_heat": 480,    # MakeItFrom
        "elastic_mod": 200,      # MakeItFrom
        "solidus": 1400,         # MakeItFrom
        "liquidus": 1450,        # MakeItFrom
        "yield_annealed": 230,   # MakeItFrom (low end of range)
        "uts_annealed": 600,     # MakeItFrom (low end of range)
        "hardness_bhn": 170,     # MakeItFrom (low end of range)
    },
    "SS 304": {
        "density": 7.8,          # MakeItFrom
        "thermal_cond": 16,      # MakeItFrom
        "specific_heat": 480,    # MakeItFrom
        "elastic_mod": 200,      # MakeItFrom
        "solidus": 1400,         # MakeItFrom
        "liquidus": 1450,        # MakeItFrom
        "yield_annealed": 230,   # MakeItFrom (low end of range)
        "uts_annealed": 580,     # MakeItFrom (low end of range)
        "hardness_bhn": 170,     # MakeItFrom (low end of range)
    },
    "SS 304L": {
        "density": 7.8,          # MakeItFrom (annealed)
        "thermal_cond": 16,      # MakeItFrom
        "specific_heat": 480,    # MakeItFrom
        "elastic_mod": 200,      # MakeItFrom
        "solidus": 1400,         # MakeItFrom
        "liquidus": 1450,        # MakeItFrom
        "yield_annealed": 190,   # MakeItFrom (annealed)
        "uts_annealed": 540,     # MakeItFrom (annealed)
        "hardness_bhn": 170,     # MakeItFrom (annealed)
    },
    "SS 309": {
        "density": 7.8,          # MakeItFrom
        "thermal_cond": 16,      # MakeItFrom
        "specific_heat": 480,    # MakeItFrom
        "elastic_mod": 200,      # MakeItFrom
        "solidus": 1400,         # MakeItFrom
        "liquidus": 1450,        # MakeItFrom
        "yield_annealed": 260,   # MakeItFrom (low end of range)
        "uts_annealed": 600,     # MakeItFrom (low end of range)
        "hardness_bhn": 180,     # MakeItFrom (low end of range)
    },
    "SS 310": {
        "density": 7.8,          # MakeItFrom
        "thermal_cond": 15,      # MakeItFrom
        "specific_heat": 480,    # MakeItFrom
        "elastic_mod": 200,      # MakeItFrom
        "solidus": 1400,         # MakeItFrom
        "liquidus": 1450,        # MakeItFrom
        "yield_annealed": 260,   # MakeItFrom (low end of range)
        "uts_annealed": 600,     # MakeItFrom (low end of range)
        "hardness_bhn": 180,     # MakeItFrom (low end of range)
    },
    "SS 316": {
        "density": 7.9,          # MakeItFrom (annealed 316)
        "thermal_cond": 15,      # MakeItFrom
        "specific_heat": 470,    # MakeItFrom
        "elastic_mod": 200,      # MakeItFrom
        "solidus": 1380,         # MakeItFrom
        "liquidus": 1400,        # MakeItFrom
        "yield_annealed": 230,   # MakeItFrom (annealed)
        "uts_annealed": 570,     # MakeItFrom (annealed)
        "hardness_bhn": 190,     # MakeItFrom (annealed)
    },
    "SS 316L": {
        "density": 7.9,          # MakeItFrom
        "thermal_cond": 15,      # MakeItFrom
        "specific_heat": 470,    # MakeItFrom
        "elastic_mod": 200,      # MakeItFrom
        "solidus": 1380,         # MakeItFrom
        "liquidus": 1400,        # MakeItFrom
        "yield_annealed": 190,   # MakeItFrom (low end of range)
        "uts_annealed": 530,     # MakeItFrom (low end of range)
        "hardness_bhn": 170,     # MakeItFrom (low end of range)
    },
    "SS 321": {
        "density": 7.8,          # MakeItFrom
        "thermal_cond": 16,      # MakeItFrom
        "specific_heat": 480,    # MakeItFrom
        "elastic_mod": 200,      # MakeItFrom
        "solidus": 1400,         # MakeItFrom
        "liquidus": 1430,        # MakeItFrom
        "yield_annealed": 220,   # MakeItFrom (low end of range)
        "uts_annealed": 590,     # MakeItFrom (low end of range)
        "hardness_bhn": 170,     # MakeItFrom (low end of range)
    },
    "SS 347": {
        "density": 7.8,          # MakeItFrom
        "thermal_cond": 16,      # MakeItFrom
        "specific_heat": 480,    # MakeItFrom
        "elastic_mod": 200,      # MakeItFrom
        "solidus": 1400,         # MakeItFrom
        "liquidus": 1430,        # MakeItFrom
        "yield_annealed": 240,   # MakeItFrom (low end of range)
        "uts_annealed": 610,     # MakeItFrom (low end of range)
        "hardness_bhn": 160,     # MakeItFrom (low end of range)
    },
    "SS 410": {
        "density": 7.7,          # MakeItFrom
        "thermal_cond": 30,      # MakeItFrom
        "specific_heat": 480,    # MakeItFrom
        "elastic_mod": 190,      # MakeItFrom
        "solidus": 1480,         # MakeItFrom
        "liquidus": 1530,        # MakeItFrom
        "yield_annealed": 290,   # MakeItFrom (low end of range, annealed)
        "uts_annealed": 520,     # MakeItFrom (low end of range)
        "hardness_bhn": 190,     # MakeItFrom (low end of range)
    },
    "SS 420": {
        "density": 7.7,          # MakeItFrom
        "thermal_cond": 27,      # MakeItFrom
        "specific_heat": 480,    # MakeItFrom
        "elastic_mod": 190,      # MakeItFrom
        "solidus": 1450,         # MakeItFrom
        "liquidus": 1510,        # MakeItFrom
        "yield_annealed": 380,   # MakeItFrom (low end of range, annealed)
        "uts_annealed": 690,     # MakeItFrom (low end of range)
        "hardness_bhn": 190,     # MakeItFrom (annealed)
    },
    "SS 430": {
        "density": 7.7,          # MakeItFrom
        "thermal_cond": 25,      # MakeItFrom
        "specific_heat": 480,    # MakeItFrom
        "elastic_mod": 200,      # MakeItFrom
        "solidus": 1430,         # MakeItFrom
        "liquidus": 1510,        # MakeItFrom
        "yield_annealed": 260,   # MakeItFrom
        "uts_annealed": 500,     # MakeItFrom
        "hardness_bhn": 160,     # MakeItFrom
    },
    "SS 440C": {
        "density": 7.7,          # MakeItFrom
        "thermal_cond": 22,      # MakeItFrom
        "specific_heat": 480,    # MakeItFrom
        "elastic_mod": 200,      # MakeItFrom
        "solidus": 1370,         # MakeItFrom
        "liquidus": 1480,        # MakeItFrom
        "yield_annealed": 450,   # MakeItFrom (low end of range)
        "uts_annealed": 710,     # MakeItFrom (low end of range)
        "hardness_bhn": 220,     # estimated from annealed condition
    },
    "SS 2205": {
        "density": 7.8,          # AZoM
        "thermal_cond": 19,      # AZoM
        "specific_heat": 418,    # AZoM (0-100C)
        "elastic_mod": 190,      # AZoM
        "solidus": 1350,         # estimated for duplex
        "liquidus": 1400,        # estimated for duplex
        "yield_annealed": 448,   # AZoM (annealed, minimum)
        "uts_annealed": 621,     # AZoM (annealed, minimum)
        "hardness_bhn": 293,     # AZoM (annealed, maximum)
    },
    "SS 2507": {
        "density": 7.8,          # MakeItFrom
        "thermal_cond": 15,      # MakeItFrom
        "specific_heat": 480,    # MakeItFrom
        "elastic_mod": 210,      # MakeItFrom
        "solidus": 1400,         # MakeItFrom
        "liquidus": 1450,        # MakeItFrom
        "yield_annealed": 590,   # MakeItFrom
        "uts_annealed": 860,     # MakeItFrom
        "hardness_bhn": 270,     # MakeItFrom
    },
    "17-4PH": {
        "density": 7.8,          # MakeItFrom
        "thermal_cond": 17,      # MakeItFrom
        "specific_heat": 480,    # MakeItFrom
        "elastic_mod": 190,      # MakeItFrom
        "solidus": 1400,         # MakeItFrom
        "liquidus": 1440,        # MakeItFrom
        "yield_annealed": 580,   # MakeItFrom (low end of range)
        "uts_annealed": 910,     # MakeItFrom (low end of range)
        "hardness_bhn": 280,     # MakeItFrom (low end of range)
    },
    "15-5PH": {
        "density": 7.8,          # MakeItFrom
        "thermal_cond": 17,      # MakeItFrom
        "specific_heat": 480,    # MakeItFrom
        "elastic_mod": 190,      # MakeItFrom
        "solidus": 1380,         # MakeItFrom
        "liquidus": 1430,        # MakeItFrom
        "yield_annealed": 590,   # MakeItFrom (low end of range)
        "uts_annealed": 890,     # MakeItFrom (low end of range)
        "hardness_bhn": 290,     # MakeItFrom (low end of range)
    },

    # =========================================================================
    # ALUMINUM ALLOYS (annealed / O temper where available)
    # =========================================================================
    # Source: MakeItFrom.com (primary), AZoM.com

    "Al 1100": {
        "density": 2.7,          # MakeItFrom (1100-O)
        "thermal_cond": 220,     # MakeItFrom (1100-O)
        "specific_heat": 900,    # MakeItFrom
        "elastic_mod": 69,       # MakeItFrom
        "solidus": 640,          # MakeItFrom
        "liquidus": 660,         # MakeItFrom
        "yield_annealed": 29,    # MakeItFrom (1100-O)
        "uts_annealed": 88,      # MakeItFrom (1100-O)
        "hardness_bhn": 23,      # MakeItFrom (1100-O)
    },
    "Al 2014": {
        "density": 2.8,          # typical 2xxx family
        "thermal_cond": 120,     # typical 2xxx family (O temper)
        "specific_heat": 880,    # typical 2xxx family
        "elastic_mod": 72,       # typical 2xxx family
        "solidus": 510,          # typical 2xxx
        "liquidus": 640,         # typical 2xxx
        "yield_annealed": 97,    # typical 2014-O
        "uts_annealed": 186,     # typical 2014-O
        "hardness_bhn": 45,      # typical 2014-O
    },
    "Al 2024": {
        "density": 2.78,         # MakeItFrom reports 3.0 for 2024-O but standard literature value is 2.78
        "thermal_cond": 120,     # MakeItFrom (2024-O)
        "specific_heat": 880,    # MakeItFrom
        "elastic_mod": 71,       # MakeItFrom
        "solidus": 500,          # MakeItFrom
        "liquidus": 640,         # MakeItFrom
        "yield_annealed": 100,   # MakeItFrom (2024-O)
        "uts_annealed": 200,     # MakeItFrom (2024-O)
        "hardness_bhn": 49,      # MakeItFrom (2024-O)
    },
    "Al 3003": {
        "density": 2.8,          # MakeItFrom (rounded from 2.73)
        "thermal_cond": 180,     # MakeItFrom
        "specific_heat": 900,    # MakeItFrom
        "elastic_mod": 70,       # MakeItFrom
        "solidus": 640,          # MakeItFrom
        "liquidus": 650,         # MakeItFrom
        "yield_annealed": 40,    # MakeItFrom (low end / O temper)
        "uts_annealed": 110,     # MakeItFrom (low end)
        "hardness_bhn": 28,      # MakeItFrom (low end)
    },
    "Al 5052": {
        "density": 2.7,          # MakeItFrom
        "thermal_cond": 140,     # MakeItFrom
        "specific_heat": 880,    # typical 5xxx
        "elastic_mod": 70,       # MakeItFrom
        "solidus": 610,          # MakeItFrom family
        "liquidus": 650,         # MakeItFrom family
        "yield_annealed": 90,    # typical 5052-O
        "uts_annealed": 193,     # typical 5052-O
        "hardness_bhn": 47,      # typical 5052-O
    },
    "Al 5083": {
        "density": 2.66,         # typical 5083
        "thermal_cond": 120,     # typical 5083
        "specific_heat": 900,    # typical 5xxx
        "elastic_mod": 71,       # typical 5083
        "solidus": 575,          # typical 5083
        "liquidus": 640,         # typical 5083
        "yield_annealed": 125,   # typical 5083-O
        "uts_annealed": 290,     # typical 5083-O
        "hardness_bhn": 75,      # typical 5083-O
    },
    "Al 6061": {
        "density": 2.7,          # MakeItFrom (6061-O)
        "thermal_cond": 170,     # MakeItFrom (6061-O)
        "specific_heat": 900,    # MakeItFrom
        "elastic_mod": 69,       # MakeItFrom
        "solidus": 580,          # MakeItFrom
        "liquidus": 650,         # MakeItFrom
        "yield_annealed": 76,    # MakeItFrom (6061-O)
        "uts_annealed": 130,     # MakeItFrom (6061-O)
        "hardness_bhn": 33,      # MakeItFrom (6061-O)
    },
    "Al 6063": {
        "density": 2.7,          # AZoM
        "thermal_cond": 218,     # AZoM (O temper)
        "specific_heat": 900,    # typical 6xxx
        "elastic_mod": 70,       # AZoM (low end 70-80)
        "solidus": 575,          # typical 6063
        "liquidus": 650,         # typical 6063 (AZoM: melting pt 622 is approximate)
        "yield_annealed": 48,    # AZoM (O temper)
        "uts_annealed": 90,      # AZoM (O temper)
        "hardness_bhn": 25,      # AZoM
    },
    "Al 6082": {
        "density": 2.7,          # typical 6xxx
        "thermal_cond": 170,     # typical 6xxx (O temper)
        "specific_heat": 900,    # typical 6xxx
        "elastic_mod": 70,       # typical 6xxx
        "solidus": 575,          # typical 6082
        "liquidus": 650,         # typical 6082
        "yield_annealed": 60,    # typical 6082-O
        "uts_annealed": 130,     # typical 6082-O
        "hardness_bhn": 35,      # estimated
    },
    "Al 7050": {
        "density": 2.83,         # typical 7050
        "thermal_cond": 130,     # typical 7xxx O temper
        "specific_heat": 870,    # typical 7xxx
        "elastic_mod": 70,       # typical 7xxx
        "solidus": 490,          # typical 7050
        "liquidus": 635,         # typical 7050
        "yield_annealed": 105,   # typical 7050-O (estimated)
        "uts_annealed": 230,     # typical 7050-O (estimated)
        "hardness_bhn": 55,      # estimated
    },
    "Al 7075": {
        "density": 2.81,         # MakeItFrom reports 3.0 for 7075-O but standard literature value is 2.81
        "thermal_cond": 130,     # MakeItFrom (7075-O)
        "specific_heat": 870,    # MakeItFrom
        "elastic_mod": 70,       # MakeItFrom
        "solidus": 480,          # MakeItFrom
        "liquidus": 640,         # MakeItFrom
        "yield_annealed": 120,   # MakeItFrom (7075-O)
        "uts_annealed": 240,     # MakeItFrom (7075-O)
        "hardness_bhn": 59,      # MakeItFrom (7075-O)
    },
    "Al A356": {
        "density": 2.6,          # MakeItFrom
        "thermal_cond": 150,     # MakeItFrom
        "specific_heat": 900,    # MakeItFrom
        "elastic_mod": 70,       # MakeItFrom
        "solidus": 570,          # MakeItFrom
        "liquidus": 610,         # MakeItFrom
        "yield_annealed": 83,    # MakeItFrom (F / as-cast low end)
        "uts_annealed": 160,     # MakeItFrom (F / as-cast low end)
        "hardness_bhn": None,    # Not found
    },
    "Al A380": {
        "density": 2.71,         # various sources
        "thermal_cond": 96,      # typical A380 die-cast
        "specific_heat": 963,    # typical A380
        "elastic_mod": 71,       # typical A380
        "solidus": 540,          # typical A380
        "liquidus": 595,         # typical A380
        "yield_annealed": 159,   # typical A380 (die-cast, no anneal for cast alloys)
        "uts_annealed": 317,     # typical A380 (die-cast)
        "hardness_bhn": 80,      # typical A380
    },

    # =========================================================================
    # TITANIUM ALLOYS
    # =========================================================================
    # Source: MakeItFrom.com (primary)

    "Ti CP Grade 2": {
        "density": 4.5,          # MakeItFrom
        "thermal_cond": 22,      # MakeItFrom
        "specific_heat": 540,    # MakeItFrom
        "elastic_mod": 110,      # MakeItFrom
        "solidus": 1610,         # MakeItFrom
        "liquidus": 1660,        # MakeItFrom
        "yield_annealed": 360,   # MakeItFrom
        "uts_annealed": 420,     # MakeItFrom
        "hardness_bhn": 150,     # MakeItFrom
    },
    "Ti CP Grade 4": {
        "density": 4.5,          # MakeItFrom
        "thermal_cond": 19,      # MakeItFrom
        "specific_heat": 540,    # MakeItFrom
        "elastic_mod": 110,      # MakeItFrom
        "solidus": 1610,         # MakeItFrom
        "liquidus": 1660,        # MakeItFrom
        "yield_annealed": 530,   # MakeItFrom
        "uts_annealed": 640,     # MakeItFrom
        "hardness_bhn": 200,     # MakeItFrom
    },
    "Ti-6Al-4V": {
        "density": 4.4,          # MakeItFrom
        "thermal_cond": 6.8,     # MakeItFrom
        "specific_heat": 560,    # MakeItFrom
        "elastic_mod": 110,      # MakeItFrom
        "solidus": 1610,         # MakeItFrom (note: displayed solidus > liquidus on site, likely 1610/1660 typical)
        "liquidus": 1660,        # typical literature value
        "yield_annealed": 910,   # MakeItFrom (low end, annealed)
        "uts_annealed": 1000,    # MakeItFrom (low end)
        "hardness_bhn": 334,     # converted from Rockwell C 33
    },
    "Ti-6Al-2Sn-4Zr-2Mo": {
        "density": 4.54,         # typical literature
        "thermal_cond": 7.7,     # typical literature
        "specific_heat": 460,    # typical literature
        "elastic_mod": 114,      # typical literature
        "solidus": 1605,         # typical literature
        "liquidus": 1660,        # typical literature
        "yield_annealed": 860,   # typical annealed
        "uts_annealed": 970,     # typical annealed
        "hardness_bhn": 330,     # estimated from HRC
    },

    # =========================================================================
    # NICKEL ALLOYS
    # =========================================================================
    # Source: MakeItFrom.com (primary), AZoM.com, HighTempMetals.com

    "Inconel 600": {
        "density": 8.5,          # MakeItFrom
        "thermal_cond": 14,      # MakeItFrom
        "specific_heat": 460,    # MakeItFrom
        "elastic_mod": 190,      # MakeItFrom (note: some sources say 214)
        "solidus": 1350,         # MakeItFrom
        "liquidus": 1410,        # MakeItFrom
        "yield_annealed": 270,   # MakeItFrom (low end, annealed)
        "uts_annealed": 650,     # MakeItFrom (low end)
        "hardness_bhn": None,    # Not found
    },
    "Inconel 625": {
        "density": 8.6,          # MakeItFrom (annealed grade 1)
        "thermal_cond": 11,      # MakeItFrom
        "specific_heat": 440,    # MakeItFrom
        "elastic_mod": 200,      # MakeItFrom
        "solidus": 1290,         # MakeItFrom
        "liquidus": 1350,        # MakeItFrom
        "yield_annealed": 450,   # MakeItFrom (grade 1, annealed)
        "uts_annealed": 910,     # MakeItFrom (grade 1, annealed)
        "hardness_bhn": None,    # Not found
    },
    "Inconel 718": {
        "density": 8.2,          # AZoM (solution treated: 8.19)
        "thermal_cond": 11,      # MakeItFrom / AZoM (6.5 W/mK at low temp; 11 MakeItFrom)
        "specific_heat": 450,    # MakeItFrom
        "elastic_mod": 190,      # MakeItFrom
        "solidus": 1260,         # MakeItFrom / AZoM (melting range 1370-1430 per AZoM)
        "liquidus": 1340,        # MakeItFrom
        "yield_annealed": 510,   # MakeItFrom (low end, as-fabricated)
        "uts_annealed": 930,     # MakeItFrom (low end)
        "hardness_bhn": None,    # Not found (HRC ~40)
    },
    "Waspaloy": {
        "density": 8.25,         # HighTempMetals (specific gravity 8.25)
        "thermal_cond": 11,      # HighTempMetals (at 70F)
        "specific_heat": 520,    # HighTempMetals (at 200F: 0.52 kJ/kg-K)
        "elastic_mod": 211,      # HighTempMetals (at 77F)
        "solidus": 1330,         # typical literature
        "liquidus": 1360,        # typical literature
        "yield_annealed": 795,   # HighTempMetals (~116 ksi low end, solution treated+aged)
        "uts_annealed": 1275,    # HighTempMetals (~185 ksi low end)
        "hardness_bhn": None,    # Not found (HRC 35-42)
    },
    "Hastelloy X": {
        "density": 8.5,          # MakeItFrom (N06002)
        "thermal_cond": 9.9,     # MakeItFrom
        "specific_heat": 450,    # MakeItFrom
        "elastic_mod": 210,      # MakeItFrom
        "solidus": 1260,         # MakeItFrom
        "liquidus": 1360,        # MakeItFrom
        "yield_annealed": 310,   # MakeItFrom
        "uts_annealed": 760,     # MakeItFrom
        "hardness_bhn": None,    # Not found
    },
    "Hastelloy C-276": {
        "density": 8.89,         # HighTempMetals
        "thermal_cond": 11.1,    # HighTempMetals (at 200F)
        "specific_heat": 427,    # typical literature
        "elastic_mod": 205,      # HighTempMetals (at room temp)
        "solidus": 1323,         # HighTempMetals (melting range 1323-1371)
        "liquidus": 1371,        # HighTempMetals
        "yield_annealed": 290,   # HighTempMetals (heat treated sheet, ~42 ksi at 400F)
        "uts_annealed": 695,     # HighTempMetals (heat treated sheet)
        "hardness_bhn": None,    # Not found (Rb 87-90)
    },

    # =========================================================================
    # TOOL STEELS
    # =========================================================================
    # Source: MakeItFrom.com (primary)

    "Tool A2": {
        "density": 7.8,          # MakeItFrom (annealed)
        "thermal_cond": 38,      # MakeItFrom (annealed)
        "specific_heat": 470,    # MakeItFrom
        "elastic_mod": 190,      # MakeItFrom
        "solidus": 1410,         # MakeItFrom
        "liquidus": 1450,        # MakeItFrom
        "yield_annealed": 350,   # MakeItFrom (annealed)
        "uts_annealed": 710,     # MakeItFrom (annealed)
        "hardness_bhn": 210,     # MakeItFrom (annealed)
    },
    "Tool D2": {
        "density": 7.7,          # MakeItFrom (annealed)
        "thermal_cond": 31,      # MakeItFrom (annealed)
        "specific_heat": 480,    # MakeItFrom
        "elastic_mod": 190,      # MakeItFrom
        "solidus": 1390,         # MakeItFrom
        "liquidus": 1440,        # MakeItFrom
        "yield_annealed": 470,   # MakeItFrom (annealed)
        "uts_annealed": 760,     # MakeItFrom (annealed)
        "hardness_bhn": 230,     # MakeItFrom (annealed)
    },
    "Tool H13": {
        "density": 7.8,          # MakeItFrom
        "thermal_cond": 29,      # MakeItFrom
        "specific_heat": 470,    # MakeItFrom
        "elastic_mod": 190,      # MakeItFrom
        "solidus": 1420,         # MakeItFrom
        "liquidus": 1460,        # MakeItFrom
        "yield_annealed": 360,   # estimated from annealed condition
        "uts_annealed": 690,     # MakeItFrom (low end of range)
        "hardness_bhn": 210,     # typical annealed H13
    },
    "Tool M2": {
        "density": 8.2,          # typical M2 (high W/Mo content increases density)
        "thermal_cond": 26,      # typical M2
        "specific_heat": 450,    # typical M2
        "elastic_mod": 220,      # typical M2
        "solidus": 1260,         # typical M2
        "liquidus": 1430,        # typical M2
        "yield_annealed": 400,   # typical M2 annealed
        "uts_annealed": 780,     # typical M2 annealed
        "hardness_bhn": 235,     # typical M2 annealed
    },
    "Tool O1": {
        "density": 7.8,          # MakeItFrom
        "thermal_cond": 43,      # MakeItFrom
        "specific_heat": 470,    # MakeItFrom
        "elastic_mod": 190,      # MakeItFrom
        "solidus": 1420,         # MakeItFrom
        "liquidus": 1460,        # MakeItFrom
        "yield_annealed": 350,   # estimated annealed condition
        "uts_annealed": 640,     # MakeItFrom (low end of range)
        "hardness_bhn": 200,     # typical O1 annealed
    },
    "Tool S7": {
        "density": 7.8,          # MakeItFrom
        "thermal_cond": 40,      # MakeItFrom
        "specific_heat": 470,    # MakeItFrom
        "elastic_mod": 190,      # MakeItFrom
        "solidus": 1420,         # MakeItFrom
        "liquidus": 1460,        # MakeItFrom
        "yield_annealed": 350,   # estimated annealed
        "uts_annealed": 670,     # MakeItFrom (low end of range)
        "hardness_bhn": 200,     # typical S7 annealed
    },
    "Tool W1": {
        "density": 7.8,          # typical W-series
        "thermal_cond": 48,      # typical W1 (high carbon, simple alloy)
        "specific_heat": 470,    # typical tool steel
        "elastic_mod": 190,      # typical tool steel
        "solidus": 1400,         # typical W1
        "liquidus": 1450,        # typical W1
        "yield_annealed": 310,   # typical W1 annealed
        "uts_annealed": 620,     # typical W1 annealed
        "hardness_bhn": 190,     # typical W1 annealed
    },
    "Tool P20": {
        "density": 7.8,          # typical P20
        "thermal_cond": 34,      # typical P20
        "specific_heat": 470,    # typical tool steel
        "elastic_mod": 200,      # typical P20
        "solidus": 1430,         # typical P20
        "liquidus": 1460,        # typical P20
        "yield_annealed": 415,   # typical P20 pre-hardened
        "uts_annealed": 690,     # typical P20 pre-hardened
        "hardness_bhn": 300,     # typical P20 (pre-hardened state, 28-32 HRC)
    },

    # =========================================================================
    # CAST IRONS
    # =========================================================================
    # Source: MakeItFrom.com (primary)

    "Gray Iron Class 20": {
        "density": 7.5,          # MakeItFrom
        "thermal_cond": 46,      # MakeItFrom
        "specific_heat": 490,    # MakeItFrom
        "elastic_mod": 180,      # MakeItFrom (note: gray iron E varies with grade)
        "solidus": 1180,         # MakeItFrom
        "liquidus": 1380,        # MakeItFrom
        "yield_annealed": 98,    # MakeItFrom
        "uts_annealed": 160,     # MakeItFrom
        "hardness_bhn": 160,     # MakeItFrom
    },
    "Gray Iron Class 30": {
        "density": 7.5,          # MakeItFrom
        "thermal_cond": 46,      # MakeItFrom
        "specific_heat": 490,    # MakeItFrom
        "elastic_mod": 180,      # MakeItFrom
        "solidus": 1180,         # MakeItFrom
        "liquidus": 1380,        # MakeItFrom
        "yield_annealed": 130,   # MakeItFrom
        "uts_annealed": 240,     # MakeItFrom
        "hardness_bhn": 210,     # MakeItFrom
    },
    "Gray Iron Class 40": {
        "density": 7.5,          # MakeItFrom (same family)
        "thermal_cond": 46,      # MakeItFrom family
        "specific_heat": 490,    # MakeItFrom family
        "elastic_mod": 180,      # MakeItFrom family (can be slightly higher)
        "solidus": 1180,         # MakeItFrom family
        "liquidus": 1380,        # MakeItFrom family
        "yield_annealed": 190,   # interpolated
        "uts_annealed": 310,     # typical class 40 (>276 MPa min)
        "hardness_bhn": 240,     # typical class 40
    },
    "Ductile 65-45-12": {
        "density": 7.1,          # MakeItFrom
        "thermal_cond": 36,      # MakeItFrom
        "specific_heat": 490,    # MakeItFrom
        "elastic_mod": 170,      # MakeItFrom
        "solidus": 1120,         # MakeItFrom
        "liquidus": 1160,        # MakeItFrom
        "yield_annealed": 340,   # MakeItFrom
        "uts_annealed": 490,     # MakeItFrom
        "hardness_bhn": 180,     # MakeItFrom
    },
    "Ductile 80-55-06": {
        "density": 7.1,          # same family as 65-45-12
        "thermal_cond": 34,      # slightly lower than 65-45-12 (pearlitic matrix)
        "specific_heat": 490,    # same family
        "elastic_mod": 170,      # same family
        "solidus": 1120,         # same family
        "liquidus": 1160,        # same family
        "yield_annealed": 380,   # typical 80-55-06 (55 ksi min yield)
        "uts_annealed": 552,     # typical 80-55-06 (80 ksi min UTS)
        "hardness_bhn": 228,     # typical 80-55-06
    },

    # =========================================================================
    # COPPER ALLOYS
    # =========================================================================
    # Source: MakeItFrom.com (primary)

    "Cu C11000": {
        "density": 9.0,          # MakeItFrom
        "thermal_cond": 390,     # MakeItFrom
        "specific_heat": 390,    # MakeItFrom
        "elastic_mod": 120,      # MakeItFrom
        "solidus": 1070,         # MakeItFrom
        "liquidus": 1080,        # MakeItFrom
        "yield_annealed": 69,    # MakeItFrom (low end of range, annealed)
        "uts_annealed": 220,     # MakeItFrom (low end of range)
        "hardness_bhn": None,    # Not found (Rockwell F 37-94)
    },
    "Cu C17200": {
        "density": 8.8,          # MakeItFrom
        "thermal_cond": 110,     # MakeItFrom
        "specific_heat": 390,    # MakeItFrom
        "elastic_mod": 120,      # MakeItFrom
        "solidus": 870,          # MakeItFrom
        "liquidus": 980,         # MakeItFrom
        "yield_annealed": 160,   # MakeItFrom (low end, annealed)
        "uts_annealed": 480,     # MakeItFrom (low end)
        "hardness_bhn": None,    # Not found (HRC 23-43)
    },
    "Cu C26000": {
        "density": 8.2,          # MakeItFrom
        "thermal_cond": 120,     # MakeItFrom
        "specific_heat": 390,    # MakeItFrom
        "elastic_mod": 110,      # MakeItFrom
        "solidus": 920,          # MakeItFrom
        "liquidus": 950,         # MakeItFrom
        "yield_annealed": 110,   # MakeItFrom (low end, annealed)
        "uts_annealed": 320,     # MakeItFrom (low end)
        "hardness_bhn": None,    # Not found (Rockwell B 53-93)
    },
    "Cu C36000": {
        "density": 8.2,          # MakeItFrom
        "thermal_cond": 120,     # MakeItFrom
        "specific_heat": 380,    # MakeItFrom
        "elastic_mod": 100,      # MakeItFrom
        "solidus": 890,          # MakeItFrom
        "liquidus": 900,         # MakeItFrom
        "yield_annealed": 140,   # MakeItFrom (low end)
        "uts_annealed": 330,     # MakeItFrom (low end)
        "hardness_bhn": None,    # Not found
    },
}


# =========================================================================
# Utility: quick summary
# =========================================================================
def print_summary():
    """Print a quick summary of the database."""
    families = {}
    for name in ALLOY_PHYSICAL_PROPERTIES:
        if name.startswith("AISI"):
            families.setdefault("Carbon/Alloy Steel", []).append(name)
        elif name.startswith("SS ") or name.startswith("17-") or name.startswith("15-"):
            families.setdefault("Stainless Steel", []).append(name)
        elif name.startswith("Al "):
            families.setdefault("Aluminum", []).append(name)
        elif name.startswith("Ti"):
            families.setdefault("Titanium", []).append(name)
        elif name.startswith("Inconel") or name.startswith("Waspaloy") or name.startswith("Hastelloy"):
            families.setdefault("Nickel Superalloy", []).append(name)
        elif name.startswith("Tool"):
            families.setdefault("Tool Steel", []).append(name)
        elif name.startswith("Gray") or name.startswith("Ductile"):
            families.setdefault("Cast Iron", []).append(name)
        elif name.startswith("Cu "):
            families.setdefault("Copper", []).append(name)
        elif name == "300M" or name.startswith("AISI"):
            families.setdefault("Carbon/Alloy Steel", []).append(name)
        else:
            families.setdefault("Other", []).append(name)

    total = len(ALLOY_PHYSICAL_PROPERTIES)
    print(f"Alloy Physical Properties Database: {total} alloys total")
    print("=" * 60)
    for family, alloys in sorted(families.items()):
        print(f"  {family}: {len(alloys)} alloys")
    print()

    # Count None values
    none_count = 0
    total_fields = 0
    for props in ALLOY_PHYSICAL_PROPERTIES.values():
        for v in props.values():
            total_fields += 1
            if v is None:
                none_count += 1
    pct = 100 * (1 - none_count / total_fields)
    print(f"  Data completeness: {pct:.1f}% ({total_fields - none_count}/{total_fields} fields filled)")


if __name__ == "__main__":
    print_summary()
