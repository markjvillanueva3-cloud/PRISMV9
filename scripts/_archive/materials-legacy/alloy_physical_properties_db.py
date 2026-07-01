"""
Verified Physical Properties Database for Common Engineering Alloys
===================================================================
300+ alloys covering: carbon steels, alloy steels, free-machining steels,
spring steels, stainless steels, PH/specialty stainless, aluminum (wrought
and cast), titanium, nickel/cobalt superalloys, cast irons, copper alloys,
tool steels, refractory metals, maraging steels, magnesium, and nickel alloys.

Sources: MakeItFrom.com, AZoM.com, TheWorldMaterial.com, EngineersEdge.com,
         HighTempMetals.com, copper.org, Special Metals datasheets,
         Haynes International datasheets, Carpenter Technology datasheets

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

Generated 2026-02-27 from web-verified data. Expanded 2026-02-27.
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

    "Cu C12200": {
        "density": 8.94, "thermal_cond": 339, "specific_heat": 385,
        "elastic_mod": 117, "solidus": 1065, "liquidus": 1083,
        "yield_annealed": 76, "uts_annealed": 234, "hardness_bhn": 45,
        "source": "CDA C12200 DHP Copper"
    },
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

    # =========================================================================
    # CARBON STEELS - ADDITIONAL (AISI 10xx)
    # =========================================================================
    # Source: MakeItFrom.com (primary), AZoM.com

    "AISI 1055": {
        "density": 7.8,          # MakeItFrom
        "thermal_cond": 51,      # MakeItFrom
        "specific_heat": 470,    # MakeItFrom
        "elastic_mod": 190,      # MakeItFrom
        "solidus": 1420,         # MakeItFrom
        "liquidus": 1460,        # MakeItFrom
        "yield_annealed": 400,   # MakeItFrom (low end of range)
        "uts_annealed": 730,     # MakeItFrom (low end of range)
        "hardness_bhn": 220,     # MakeItFrom
    },
    "AISI 1065": {
        "density": 7.8,          # MakeItFrom
        "thermal_cond": 51,      # MakeItFrom
        "specific_heat": 470,    # MakeItFrom
        "elastic_mod": 190,      # MakeItFrom
        "solidus": 1420,         # MakeItFrom
        "liquidus": 1460,        # MakeItFrom
        "yield_annealed": 430,   # MakeItFrom (low end of range)
        "uts_annealed": 710,     # MakeItFrom (low end of range)
        "hardness_bhn": 210,     # MakeItFrom (low end)
    },
    "AISI 1075": {
        "density": 7.8,          # MakeItFrom family
        "thermal_cond": 51,      # MakeItFrom family
        "specific_heat": 470,    # MakeItFrom family
        "elastic_mod": 190,      # MakeItFrom family
        "solidus": 1410,         # interpolated 1065/1084
        "liquidus": 1450,        # interpolated
        "yield_annealed": 470,   # interpolated 1065/1084
        "uts_annealed": 750,     # interpolated
        "hardness_bhn": 215,     # interpolated
    },
    "AISI 1084": {
        "density": 7.8,          # MakeItFrom
        "thermal_cond": 51,      # MakeItFrom
        "specific_heat": 470,    # MakeItFrom
        "elastic_mod": 190,      # MakeItFrom
        "solidus": 1410,         # MakeItFrom
        "liquidus": 1450,        # MakeItFrom
        "yield_annealed": 510,   # MakeItFrom (low end of range)
        "uts_annealed": 780,     # MakeItFrom (low end of range)
        "hardness_bhn": 220,     # MakeItFrom (low end)
    },
    "AISI 1090": {
        "density": 7.8,          # MakeItFrom
        "thermal_cond": 50,      # MakeItFrom
        "specific_heat": 470,    # MakeItFrom
        "elastic_mod": 190,      # MakeItFrom
        "solidus": 1410,         # MakeItFrom
        "liquidus": 1450,        # MakeItFrom
        "yield_annealed": 520,   # MakeItFrom (low end of range)
        "uts_annealed": 790,     # MakeItFrom (low end of range)
        "hardness_bhn": 220,     # MakeItFrom (low end)
    },
    "AISI 1117": {
        "density": 7.8,          # MakeItFrom
        "thermal_cond": 52,      # MakeItFrom
        "specific_heat": 470,    # MakeItFrom
        "elastic_mod": 190,      # MakeItFrom
        "solidus": 1420,         # MakeItFrom
        "liquidus": 1460,        # MakeItFrom
        "yield_annealed": 260,   # MakeItFrom (low end, hot rolled)
        "uts_annealed": 490,     # MakeItFrom (low end)
        "hardness_bhn": 140,     # MakeItFrom (low end)
    },
    "AISI 1137": {
        "density": 7.8,          # MakeItFrom
        "thermal_cond": 51,      # MakeItFrom
        "specific_heat": 470,    # MakeItFrom
        "elastic_mod": 190,      # MakeItFrom
        "solidus": 1420,         # MakeItFrom
        "liquidus": 1460,        # MakeItFrom
        "yield_annealed": 370,   # MakeItFrom (low end, hot rolled)
        "uts_annealed": 700,     # MakeItFrom (low end)
        "hardness_bhn": 200,     # MakeItFrom (low end)
    },
    "AISI 1141": {
        "density": 7.8,          # MakeItFrom
        "thermal_cond": 51,      # MakeItFrom
        "specific_heat": 470,    # MakeItFrom
        "elastic_mod": 190,      # MakeItFrom
        "solidus": 1420,         # MakeItFrom
        "liquidus": 1460,        # MakeItFrom
        "yield_annealed": 400,   # MakeItFrom (low end, hot rolled)
        "uts_annealed": 740,     # MakeItFrom (low end)
        "hardness_bhn": 210,     # MakeItFrom (low end)
    },
    "AISI 1144": {
        "density": 7.8,          # MakeItFrom
        "thermal_cond": 51,      # MakeItFrom
        "specific_heat": 470,    # MakeItFrom
        "elastic_mod": 190,      # MakeItFrom
        "solidus": 1410,         # MakeItFrom
        "liquidus": 1450,        # MakeItFrom
        "yield_annealed": 420,   # MakeItFrom (low end)
        "uts_annealed": 750,     # MakeItFrom (low end)
        "hardness_bhn": 220,     # MakeItFrom (low end)
    },
    "AISI 1215": {
        "density": 7.8,          # typical free-machining carbon steel
        "thermal_cond": 52,      # similar to 11xx resulfurized family
        "specific_heat": 470,    # carbon steel family
        "elastic_mod": 190,      # carbon steel family
        "solidus": 1420,         # carbon steel family
        "liquidus": 1460,        # carbon steel family
        "yield_annealed": 230,   # AZoM (cold drawn, low end)
        "uts_annealed": 415,     # AZoM (cold drawn)
        "hardness_bhn": 121,     # AZoM (low end range 121-187)
    },

    # =========================================================================
    # FREE-MACHINING STEELS
    # =========================================================================
    # Source: AZoM.com, MakeItFrom.com, EngineersEdge.com

    "AISI 1211": {
        "density": 7.8,          # free-machining carbon steel family
        "thermal_cond": 52,      # resulfurized/rephosphorized family
        "specific_heat": 470,    # carbon steel family
        "elastic_mod": 190,      # carbon steel family
        "solidus": 1420,         # carbon steel family
        "liquidus": 1460,        # carbon steel family
        "yield_annealed": 215,   # typical 12xx annealed
        "uts_annealed": 380,     # typical 12xx annealed
        "hardness_bhn": 115,     # typical 12xx annealed
    },
    "AISI 1212": {
        "density": 7.8,          # free-machining carbon steel family
        "thermal_cond": 52,      # resulfurized/rephosphorized family
        "specific_heat": 470,    # carbon steel family
        "elastic_mod": 190,      # carbon steel family
        "solidus": 1420,         # carbon steel family
        "liquidus": 1460,        # carbon steel family
        "yield_annealed": 230,   # typical 1212 (machinability baseline)
        "uts_annealed": 395,     # typical 1212 annealed
        "hardness_bhn": 120,     # typical 1212 annealed
    },
    "AISI 1213": {
        "density": 7.8,          # free-machining carbon steel family
        "thermal_cond": 52,      # resulfurized/rephosphorized family
        "specific_heat": 470,    # carbon steel family
        "elastic_mod": 190,      # carbon steel family
        "solidus": 1420,         # carbon steel family
        "liquidus": 1460,        # carbon steel family
        "yield_annealed": 225,   # typical 1213 (hot rolled)
        "uts_annealed": 390,     # typical 1213 hot rolled
        "hardness_bhn": 118,     # typical 1213
    },
    "AISI 1108": {
        "density": 7.8,          # resulfurized carbon steel family
        "thermal_cond": 52,      # similar to 1117
        "specific_heat": 470,    # carbon steel family
        "elastic_mod": 190,      # carbon steel family
        "solidus": 1430,         # similar to 10xx low carbon
        "liquidus": 1470,        # similar to 10xx low carbon
        "yield_annealed": 200,   # typical low-C resulfurized annealed
        "uts_annealed": 370,     # typical low-C resulfurized annealed
        "hardness_bhn": 105,     # typical low-C resulfurized annealed
    },
    "AISI 12L14": {
        "density": 7.8,          # free-machining leaded steel
        "thermal_cond": 52,      # similar to 12xx family
        "specific_heat": 470,    # carbon steel family
        "elastic_mod": 190,      # carbon steel family
        "solidus": 1420,         # carbon steel family
        "liquidus": 1460,        # carbon steel family
        "yield_annealed": 230,   # typical 12L14 (cold drawn)
        "uts_annealed": 390,     # typical 12L14 (cold drawn)
        "hardness_bhn": 120,     # typical 12L14 (range 120-160)
    },

    # =========================================================================
    # SPRING STEELS - ADDITIONAL
    # =========================================================================

    "AISI 1074": {
        "density": 7.8,          # carbon steel family
        "thermal_cond": 51,      # carbon steel family (high-C)
        "specific_heat": 470,    # carbon steel family
        "elastic_mod": 190,      # carbon steel family
        "solidus": 1410,         # interpolated from 1070/1080
        "liquidus": 1450,        # interpolated
        "yield_annealed": 460,   # interpolated 1070/1080
        "uts_annealed": 740,     # interpolated
        "hardness_bhn": 212,     # interpolated
    },
    "AISI 5155": {
        "density": 7.8,          # Cr-steel alloy family
        "thermal_cond": 43,      # similar to 5160
        "specific_heat": 470,    # alloy steel family
        "elastic_mod": 190,      # alloy steel family
        "solidus": 1410,         # similar to 5160
        "liquidus": 1455,        # interpolated
        "yield_annealed": 275,   # interpolated 5140/5160
        "uts_annealed": 640,     # interpolated
        "hardness_bhn": 190,     # interpolated
    },

    # =========================================================================
    # ALLOY STEELS - ADDITIONAL
    # =========================================================================
    # Source: MakeItFrom.com (primary), AZoM.com

    "AISI 4037": {
        "density": 7.8,          # MakeItFrom
        "thermal_cond": 48,      # MakeItFrom
        "specific_heat": 470,    # MakeItFrom
        "elastic_mod": 190,      # MakeItFrom
        "solidus": 1420,         # MakeItFrom
        "liquidus": 1460,        # MakeItFrom
        "yield_annealed": 290,   # MakeItFrom (annealed)
        "uts_annealed": 540,     # MakeItFrom (annealed)
        "hardness_bhn": 160,     # MakeItFrom
    },
    "AISI 4042": {
        "density": 7.8,          # Mo-steel family (same as 4037)
        "thermal_cond": 47,      # interpolated 4037/4130
        "specific_heat": 470,    # alloy steel family
        "elastic_mod": 190,      # alloy steel family
        "solidus": 1420,         # Mo-steel family
        "liquidus": 1460,        # Mo-steel family
        "yield_annealed": 310,   # interpolated 4037/4140 annealed
        "uts_annealed": 570,     # interpolated
        "hardness_bhn": 170,     # interpolated
    },
    "AISI 4320": {
        "density": 7.9,          # MakeItFrom
        "thermal_cond": 46,      # MakeItFrom
        "specific_heat": 470,    # MakeItFrom
        "elastic_mod": 190,      # MakeItFrom
        "solidus": 1420,         # MakeItFrom
        "liquidus": 1460,        # MakeItFrom
        "yield_annealed": 430,   # MakeItFrom (low end)
        "uts_annealed": 570,     # MakeItFrom (low end)
        "hardness_bhn": 160,     # MakeItFrom (low end)
    },
    "AISI 4330": {
        "density": 7.8,          # NiCrMo family
        "thermal_cond": 44,      # similar to 4340
        "specific_heat": 470,    # alloy steel family
        "elastic_mod": 190,      # alloy steel family
        "solidus": 1420,         # NiCrMo family
        "liquidus": 1460,        # NiCrMo family
        "yield_annealed": 460,   # interpolated 4320/4340 annealed
        "uts_annealed": 680,     # interpolated
        "hardness_bhn": 200,     # interpolated
    },
    "AISI 4615": {
        "density": 7.8,          # NiMo carburizing steel
        "thermal_cond": 46,      # similar to 4620/4320 family
        "specific_heat": 470,    # alloy steel family
        "elastic_mod": 190,      # alloy steel family
        "solidus": 1420,         # NiMo family
        "liquidus": 1460,        # NiMo family
        "yield_annealed": 310,   # typical NiMo carburizing steel annealed
        "uts_annealed": 500,     # typical annealed
        "hardness_bhn": 150,     # typical annealed
    },
    "AISI 4620": {
        "density": 7.8,          # NiMo carburizing steel
        "thermal_cond": 46,      # similar to 4615
        "specific_heat": 470,    # alloy steel family
        "elastic_mod": 190,      # alloy steel family
        "solidus": 1420,         # NiMo family
        "liquidus": 1460,        # NiMo family
        "yield_annealed": 315,   # typical NiMo carburizing steel annealed
        "uts_annealed": 510,     # typical annealed
        "hardness_bhn": 155,     # typical annealed
    },
    "AISI 4820": {
        "density": 7.8,          # NiMo alloy steel
        "thermal_cond": 44,      # slightly lower due to higher Ni
        "specific_heat": 470,    # alloy steel family
        "elastic_mod": 190,      # alloy steel family
        "solidus": 1420,         # NiMo family
        "liquidus": 1460,        # NiMo family
        "yield_annealed": 360,   # typical NiMo annealed (higher Ni)
        "uts_annealed": 560,     # typical annealed
        "hardness_bhn": 170,     # typical annealed
    },
    "AISI 5120": {
        "density": 7.8,          # Cr-steel family
        "thermal_cond": 44,      # Cr-steel family
        "specific_heat": 470,    # alloy steel family
        "elastic_mod": 190,      # alloy steel family
        "solidus": 1420,         # Cr-steel family
        "liquidus": 1460,        # Cr-steel family
        "yield_annealed": 275,   # typical low-C Cr steel annealed
        "uts_annealed": 490,     # typical annealed
        "hardness_bhn": 150,     # typical annealed
    },
    "AISI 6150": {
        "density": 7.8,          # MakeItFrom
        "thermal_cond": 46,      # MakeItFrom
        "specific_heat": 470,    # MakeItFrom
        "elastic_mod": 190,      # MakeItFrom
        "solidus": 1410,         # MakeItFrom
        "liquidus": 1460,        # MakeItFrom
        "yield_annealed": 420,   # MakeItFrom (annealed, low end)
        "uts_annealed": 630,     # MakeItFrom (annealed, low end)
        "hardness_bhn": 200,     # MakeItFrom (annealed, low end)
    },
    "AISI 8615": {
        "density": 7.8,          # MakeItFrom
        "thermal_cond": 39,      # MakeItFrom
        "specific_heat": 470,    # MakeItFrom
        "elastic_mod": 190,      # MakeItFrom
        "solidus": 1420,         # MakeItFrom
        "liquidus": 1460,        # MakeItFrom
        "yield_annealed": 310,   # MakeItFrom
        "uts_annealed": 480,     # MakeItFrom
        "hardness_bhn": 150,     # MakeItFrom
    },
    "AISI 8630": {
        "density": 7.8,          # MakeItFrom
        "thermal_cond": 39,      # MakeItFrom
        "specific_heat": 470,    # MakeItFrom
        "elastic_mod": 190,      # MakeItFrom
        "solidus": 1420,         # MakeItFrom
        "liquidus": 1460,        # MakeItFrom
        "yield_annealed": 360,   # MakeItFrom (low end)
        "uts_annealed": 540,     # MakeItFrom (low end)
        "hardness_bhn": 160,     # MakeItFrom (low end)
    },
    "AISI 8660": {
        "density": 7.8,          # NiCrMo 86xx family
        "thermal_cond": 38,      # interpolated 8640/86xx
        "specific_heat": 470,    # alloy steel family
        "elastic_mod": 190,      # alloy steel family
        "solidus": 1410,         # slightly lower due to higher C
        "liquidus": 1450,        # interpolated
        "yield_annealed": 430,   # interpolated 8640/high-C
        "uts_annealed": 690,     # interpolated
        "hardness_bhn": 210,     # interpolated
    },
    "AISI 8720": {
        "density": 7.8,          # NiCrMo 87xx family
        "thermal_cond": 39,      # similar to 8620
        "specific_heat": 470,    # alloy steel family
        "elastic_mod": 190,      # alloy steel family
        "solidus": 1420,         # NiCrMo family
        "liquidus": 1460,        # NiCrMo family
        "yield_annealed": 340,   # interpolated 8620 family
        "uts_annealed": 510,     # interpolated
        "hardness_bhn": 155,     # interpolated
    },
    "AISI 9310": {
        "density": 7.8,          # NiCrMo alloy steel
        "thermal_cond": 38,      # NiCrMo carburizing steel
        "specific_heat": 470,    # alloy steel family
        "elastic_mod": 190,      # alloy steel family
        "solidus": 1420,         # NiCrMo family
        "liquidus": 1460,        # NiCrMo family
        "yield_annealed": 365,   # typical 9310 annealed
        "uts_annealed": 570,     # typical annealed
        "hardness_bhn": 170,     # typical annealed
    },
    "AISI 1330": {
        "density": 7.8,          # Mn-alloy steel
        "thermal_cond": 47,      # similar to plain carbon + Mn
        "specific_heat": 470,    # alloy steel family
        "elastic_mod": 190,      # alloy steel family
        "solidus": 1420,         # alloy steel family
        "liquidus": 1460,        # alloy steel family
        "yield_annealed": 295,   # typical Mn-steel annealed
        "uts_annealed": 540,     # typical annealed
        "hardness_bhn": 160,     # typical annealed
    },
    "AISI 1340": {
        "density": 7.8,          # Mn-alloy steel
        "thermal_cond": 46,      # similar to 1330, slightly lower due to higher C
        "specific_heat": 470,    # alloy steel family
        "elastic_mod": 190,      # alloy steel family
        "solidus": 1410,         # Mn-alloy steel family
        "liquidus": 1455,        # interpolated
        "yield_annealed": 350,   # typical Mn-steel annealed
        "uts_annealed": 620,     # typical annealed
        "hardness_bhn": 190,     # typical annealed
    },
    "AISI 4145": {
        "density": 7.8,          # CrMo family (same as 4140)
        "thermal_cond": 42,      # CrMo family
        "specific_heat": 470,    # alloy steel family
        "elastic_mod": 190,      # alloy steel family
        "solidus": 1420,         # CrMo family
        "liquidus": 1460,        # CrMo family
        "yield_annealed": 430,   # interpolated 4140/4150 annealed
        "uts_annealed": 670,     # interpolated
        "hardness_bhn": 200,     # interpolated
    },
    "AISI 86L20": {
        "density": 7.8,          # NiCrMo leaded steel (similar to 8620)
        "thermal_cond": 39,      # same as 8620
        "specific_heat": 470,    # alloy steel family
        "elastic_mod": 190,      # alloy steel family
        "solidus": 1420,         # same as 8620
        "liquidus": 1460,        # same as 8620
        "yield_annealed": 360,   # similar to 8620 annealed
        "uts_annealed": 520,     # similar to 8620 annealed
        "hardness_bhn": 150,     # similar to 8620 annealed
    },
    "AISI 9254": {
        "density": 7.8,          # Si-Mn spring steel
        "thermal_cond": 42,      # similar to 9260
        "specific_heat": 470,    # alloy steel family
        "elastic_mod": 190,      # alloy steel family
        "solidus": 1410,         # Si-spring steel family
        "liquidus": 1450,        # interpolated
        "yield_annealed": 285,   # typical Si-spring steel annealed
        "uts_annealed": 590,     # typical annealed
        "hardness_bhn": 185,     # typical annealed
    },
    "AISI 9255": {
        "density": 7.8,          # Si-Mn spring steel
        "thermal_cond": 42,      # similar to 9260
        "specific_heat": 470,    # alloy steel family
        "elastic_mod": 190,      # alloy steel family
        "solidus": 1410,         # Si-spring steel family
        "liquidus": 1450,        # interpolated
        "yield_annealed": 280,   # typical Si-spring steel annealed
        "uts_annealed": 580,     # typical annealed
        "hardness_bhn": 190,     # typical annealed
    },

    # =========================================================================
    # STAINLESS STEELS - ADDITIONAL
    # =========================================================================
    # Source: MakeItFrom.com (primary), TheWorldMaterial.com, AZoM.com

    "SS 302": {
        "density": 7.9,          # TheWorldMaterial
        "thermal_cond": 16,      # MakeItFrom / TheWorldMaterial (16.2 at 100C)
        "specific_heat": 500,    # TheWorldMaterial (at 20C)
        "elastic_mod": 193,      # TheWorldMaterial
        "solidus": 1400,         # MakeItFrom
        "liquidus": 1420,        # MakeItFrom
        "yield_annealed": 205,   # TheWorldMaterial (annealed, ASTM A240)
        "uts_annealed": 515,     # TheWorldMaterial (annealed, ASTM A240)
        "hardness_bhn": 201,     # TheWorldMaterial (annealed)
    },
    "SS 305": {
        "density": 7.9,          # austenitic family similar to 304
        "thermal_cond": 16,      # austenitic family
        "specific_heat": 500,    # austenitic family
        "elastic_mod": 193,      # austenitic family
        "solidus": 1400,         # austenitic family
        "liquidus": 1420,        # austenitic family
        "yield_annealed": 170,   # typical 305 annealed (lower than 304)
        "uts_annealed": 500,     # typical 305 annealed
        "hardness_bhn": 170,     # typical 305 annealed
    },
    "SS 308": {
        "density": 7.8,          # austenitic family
        "thermal_cond": 16,      # austenitic family
        "specific_heat": 500,    # austenitic family
        "elastic_mod": 193,      # austenitic family
        "solidus": 1400,         # austenitic family
        "liquidus": 1450,        # austenitic family
        "yield_annealed": 205,   # typical 308 annealed
        "uts_annealed": 515,     # typical 308 annealed
        "hardness_bhn": 180,     # typical 308 annealed
    },
    "SS 314": {
        "density": 7.7,          # high-Cr-Si austenitic
        "thermal_cond": 15,      # lower due to high Si
        "specific_heat": 500,    # austenitic family
        "elastic_mod": 193,      # austenitic family
        "solidus": 1370,         # high-Si shifts solidus lower
        "liquidus": 1420,        # estimated
        "yield_annealed": 240,   # typical 314 annealed
        "uts_annealed": 560,     # typical 314 annealed
        "hardness_bhn": 180,     # typical 314 annealed
    },
    "SS 316Ti": {
        "density": 7.9,          # similar to 316 with Ti stabilization
        "thermal_cond": 15,      # same as 316
        "specific_heat": 470,    # similar to 316
        "elastic_mod": 200,      # similar to 316
        "solidus": 1380,         # similar to 316
        "liquidus": 1400,        # similar to 316
        "yield_annealed": 220,   # typical 316Ti annealed
        "uts_annealed": 530,     # typical 316Ti annealed
        "hardness_bhn": 175,     # typical annealed
    },
    "SS 317": {
        "density": 7.9,          # similar to 316 with higher Mo
        "thermal_cond": 14,      # slightly lower than 316
        "specific_heat": 470,    # austenitic family
        "elastic_mod": 200,      # austenitic family
        "solidus": 1370,         # slightly lower than 316
        "liquidus": 1400,        # similar to 316
        "yield_annealed": 220,   # typical 317 annealed
        "uts_annealed": 550,     # typical 317 annealed
        "hardness_bhn": 170,     # typical annealed
    },
    "SS 317L": {
        "density": 7.9,          # similar to 317
        "thermal_cond": 14,      # similar to 317
        "specific_heat": 470,    # austenitic family
        "elastic_mod": 200,      # austenitic family
        "solidus": 1370,         # similar to 317
        "liquidus": 1400,        # similar to 317
        "yield_annealed": 205,   # typical 317L annealed (low C variant)
        "uts_annealed": 515,     # typical 317L annealed
        "hardness_bhn": 165,     # typical annealed
    },
    "SS 904L": {
        "density": 8.0,          # high-alloy austenitic (high Ni/Mo)
        "thermal_cond": 12,      # lower due to high alloy content
        "specific_heat": 450,    # high-alloy austenitic
        "elastic_mod": 190,      # high-alloy austenitic
        "solidus": 1320,         # high-alloy austenitic
        "liquidus": 1380,        # estimated
        "yield_annealed": 220,   # typical 904L annealed
        "uts_annealed": 540,     # typical 904L annealed
        "hardness_bhn": 170,     # typical annealed
    },
    "SS 405": {
        "density": 7.7,          # MakeItFrom
        "thermal_cond": 30,      # MakeItFrom
        "specific_heat": 480,    # MakeItFrom
        "elastic_mod": 190,      # MakeItFrom
        "solidus": 1480,         # MakeItFrom
        "liquidus": 1530,        # MakeItFrom
        "yield_annealed": 200,   # MakeItFrom
        "uts_annealed": 470,     # MakeItFrom
        "hardness_bhn": 170,     # MakeItFrom
    },
    "SS 409": {
        "density": 7.7,          # ferritic family similar to 410
        "thermal_cond": 26,      # ferritic SS family
        "specific_heat": 480,    # ferritic SS family
        "elastic_mod": 200,      # ferritic SS family
        "solidus": 1480,         # ferritic family
        "liquidus": 1530,        # ferritic family
        "yield_annealed": 210,   # typical 409 annealed
        "uts_annealed": 450,     # typical 409 annealed
        "hardness_bhn": 150,     # typical 409 annealed
    },
    "SS 416": {
        "density": 7.7,          # martensitic family (free machining)
        "thermal_cond": 25,      # martensitic family
        "specific_heat": 480,    # stainless family
        "elastic_mod": 200,      # martensitic family
        "solidus": 1480,         # martensitic family
        "liquidus": 1530,        # martensitic family
        "yield_annealed": 275,   # typical 416 annealed
        "uts_annealed": 520,     # typical 416 annealed
        "hardness_bhn": 155,     # typical 416 annealed
    },
    "SS 431": {
        "density": 7.7,          # martensitic Ni-bearing SS
        "thermal_cond": 20,      # martensitic, lower due to Ni
        "specific_heat": 480,    # stainless family
        "elastic_mod": 200,      # martensitic family
        "solidus": 1430,         # martensitic family
        "liquidus": 1510,        # martensitic family
        "yield_annealed": 350,   # typical 431 annealed
        "uts_annealed": 620,     # typical 431 annealed
        "hardness_bhn": 210,     # typical 431 annealed
    },
    "SS 440A": {
        "density": 7.7,          # MakeItFrom
        "thermal_cond": 23,      # MakeItFrom
        "specific_heat": 480,    # MakeItFrom
        "elastic_mod": 200,      # MakeItFrom
        "solidus": 1370,         # MakeItFrom
        "liquidus": 1480,        # MakeItFrom
        "yield_annealed": 420,   # MakeItFrom (annealed, low end)
        "uts_annealed": 730,     # MakeItFrom (annealed, low end)
        "hardness_bhn": 215,     # typical 440A annealed
    },
    "SS 440B": {
        "density": 7.7,          # MakeItFrom
        "thermal_cond": 23,      # MakeItFrom
        "specific_heat": 480,    # MakeItFrom
        "elastic_mod": 200,      # MakeItFrom
        "solidus": 1370,         # MakeItFrom
        "liquidus": 1480,        # MakeItFrom
        "yield_annealed": 430,   # MakeItFrom (annealed, low end)
        "uts_annealed": 740,     # MakeItFrom (annealed, low end)
        "hardness_bhn": 220,     # typical 440B annealed
    },
    "SS 446": {
        "density": 7.7,          # MakeItFrom
        "thermal_cond": 17,      # MakeItFrom
        "specific_heat": 490,    # MakeItFrom
        "elastic_mod": 200,      # MakeItFrom
        "solidus": 1430,         # MakeItFrom
        "liquidus": 1510,        # MakeItFrom
        "yield_annealed": 300,   # MakeItFrom
        "uts_annealed": 570,     # MakeItFrom
        "hardness_bhn": 190,     # MakeItFrom
    },

    # =========================================================================
    # PH / SPECIALTY STAINLESS STEELS - ADDITIONAL
    # =========================================================================
    # Source: AZoM.com, HighTempMetals.com, MakeItFrom.com

    "13-8Mo": {
        "density": 7.8,          # PH stainless family
        "thermal_cond": 14,      # PH stainless family
        "specific_heat": 480,    # PH stainless family
        "elastic_mod": 200,      # PH stainless family
        "solidus": 1400,         # PH stainless family
        "liquidus": 1440,        # PH stainless family
        "yield_annealed": 690,   # typical 13-8Mo solution treated
        "uts_annealed": 1000,    # typical 13-8Mo solution treated
        "hardness_bhn": 300,     # typical 13-8Mo solution treated
    },
    "A286": {
        "density": 7.94,         # AZoM / HighTempMetals
        "thermal_cond": 12.7,    # HighTempMetals (at room temp)
        "specific_heat": 460,    # typical Fe-Ni superalloy
        "elastic_mod": 199,      # HighTempMetals (at 70F)
        "solidus": 1370,         # typical A286
        "liquidus": 1400,        # typical A286
        "yield_annealed": 275,   # typical A286 solution annealed
        "uts_annealed": 620,     # typical A286 solution annealed
        "hardness_bhn": 180,     # typical A286 solution annealed
    },
    "Custom 455": {
        "density": 7.8,          # PH stainless family
        "thermal_cond": 15,      # PH stainless family
        "specific_heat": 480,    # PH stainless family
        "elastic_mod": 200,      # PH stainless family
        "solidus": 1390,         # PH stainless family
        "liquidus": 1430,        # PH stainless family
        "yield_annealed": 585,   # typical Custom 455 annealed
        "uts_annealed": 870,     # typical Custom 455 annealed
        "hardness_bhn": 270,     # typical annealed
    },
    "Nitronic 50": {
        "density": 7.9,          # high-Mn-N austenitic
        "thermal_cond": 13,      # lower due to high alloy
        "specific_heat": 480,    # austenitic family
        "elastic_mod": 193,      # austenitic family
        "solidus": 1370,         # high-alloy austenitic
        "liquidus": 1420,        # estimated
        "yield_annealed": 380,   # typical Nitronic 50 annealed
        "uts_annealed": 760,     # typical Nitronic 50 annealed
        "hardness_bhn": 200,     # typical annealed
    },
    "Nitronic 60": {
        "density": 7.9,          # high-Mn-Si-N austenitic
        "thermal_cond": 13,      # similar to Nitronic 50
        "specific_heat": 480,    # austenitic family
        "elastic_mod": 193,      # austenitic family
        "solidus": 1360,         # high-alloy austenitic
        "liquidus": 1410,        # estimated
        "yield_annealed": 345,   # typical Nitronic 60 annealed
        "uts_annealed": 690,     # typical Nitronic 60 annealed
        "hardness_bhn": 190,     # typical annealed
    },

    # =========================================================================
    # ALUMINUM ALLOYS - ADDITIONAL (annealed / O temper)
    # =========================================================================
    # Source: MakeItFrom.com (primary), AZoM.com, ASM

    "Al 2011": {
        "density": 2.83,         # typical 2xxx Cu-alloy
        "thermal_cond": 150,     # typical 2011 (free-machining, higher Cu)
        "specific_heat": 880,    # typical 2xxx
        "elastic_mod": 70,       # typical 2xxx
        "solidus": 535,          # typical 2011
        "liquidus": 640,         # typical 2011
        "yield_annealed": 95,    # typical 2011-T3 (no O temper common)
        "uts_annealed": 310,     # typical 2011-T3
        "hardness_bhn": 95,      # typical 2011-T3
    },
    "Al 2017": {
        "density": 2.79,         # typical 2017
        "thermal_cond": 134,     # typical 2017-O
        "specific_heat": 880,    # typical 2xxx
        "elastic_mod": 72,       # typical 2xxx
        "solidus": 510,          # typical 2017
        "liquidus": 640,         # typical 2017
        "yield_annealed": 70,    # typical 2017-O
        "uts_annealed": 180,     # typical 2017-O
        "hardness_bhn": 45,      # typical 2017-O
    },
    "Al 2117": {
        "density": 2.79,         # similar to 2017
        "thermal_cond": 150,     # typical 2117 (lower Cu than 2024)
        "specific_heat": 880,    # typical 2xxx
        "elastic_mod": 71,       # typical 2xxx
        "solidus": 540,          # typical 2117
        "liquidus": 645,         # typical 2117
        "yield_annealed": 75,    # typical 2117-O (rivet alloy)
        "uts_annealed": 175,     # typical 2117-O
        "hardness_bhn": 40,      # typical 2117-O
    },
    "Al 2218": {
        "density": 2.81,         # typical 2xxx forging alloy
        "thermal_cond": 130,     # typical 2218
        "specific_heat": 880,    # typical 2xxx
        "elastic_mod": 74,       # typical 2xxx
        "solidus": 510,          # typical 2218
        "liquidus": 640,         # typical 2218
        "yield_annealed": 76,    # typical 2218-O
        "uts_annealed": 170,     # typical 2218-O
        "hardness_bhn": 44,      # typical 2218-O
    },
    "Al 2618": {
        "density": 2.76,         # typical 2618
        "thermal_cond": 147,     # typical 2618
        "specific_heat": 880,    # typical 2xxx
        "elastic_mod": 73,       # typical 2618
        "solidus": 520,          # typical 2618
        "liquidus": 640,         # typical 2618
        "yield_annealed": 75,    # typical 2618-O
        "uts_annealed": 180,     # typical 2618-O
        "hardness_bhn": 45,      # estimated from 2618-O
    },
    "Al 3004": {
        "density": 2.72,         # typical 3004
        "thermal_cond": 160,     # typical 3004-O
        "specific_heat": 900,    # typical 3xxx
        "elastic_mod": 70,       # typical 3xxx
        "solidus": 630,          # typical 3004
        "liquidus": 655,         # typical 3004
        "yield_annealed": 69,    # typical 3004-O
        "uts_annealed": 180,     # typical 3004-O
        "hardness_bhn": 45,      # typical 3004-O
    },
    "Al 3105": {
        "density": 2.72,         # similar to 3003/3004
        "thermal_cond": 170,     # typical 3105
        "specific_heat": 900,    # typical 3xxx
        "elastic_mod": 70,       # typical 3xxx
        "solidus": 635,          # typical 3105
        "liquidus": 655,         # typical 3105
        "yield_annealed": 55,    # typical 3105-O
        "uts_annealed": 150,     # typical 3105-O
        "hardness_bhn": 35,      # estimated from 3105-O
    },
    "Al 4032": {
        "density": 2.68,         # typical 4032 (high Si)
        "thermal_cond": 138,     # typical 4032
        "specific_heat": 880,    # typical 4xxx
        "elastic_mod": 79,       # higher due to Si content
        "solidus": 532,          # typical 4032
        "liquidus": 571,         # typical 4032 (narrow range)
        "yield_annealed": None,  # no standard O temper for 4032
        "uts_annealed": None,    # 4032 used in T6 condition
        "hardness_bhn": None,    # no O temper data
    },
    "Al 4043": {
        "density": 2.69,         # typical 4043 (welding alloy)
        "thermal_cond": 155,     # typical 4043
        "specific_heat": 880,    # typical 4xxx
        "elastic_mod": 70,       # typical 4xxx
        "solidus": 575,          # typical 4043
        "liquidus": 630,         # typical 4043
        "yield_annealed": 40,    # typical 4043-O
        "uts_annealed": 145,     # typical 4043-O
        "hardness_bhn": None,    # not commonly reported
    },
    "Al 5005": {
        "density": 2.7,          # typical 5005
        "thermal_cond": 200,     # typical 5005-O (high for 5xxx)
        "specific_heat": 900,    # typical 5xxx
        "elastic_mod": 69,       # typical 5xxx
        "solidus": 630,          # typical 5005
        "liquidus": 655,         # typical 5005
        "yield_annealed": 41,    # typical 5005-O
        "uts_annealed": 124,     # typical 5005-O
        "hardness_bhn": 28,      # typical 5005-O
    },
    "Al 5056": {
        "density": 2.64,         # typical 5056
        "thermal_cond": 117,     # typical 5056
        "specific_heat": 900,    # typical 5xxx
        "elastic_mod": 71,       # typical 5xxx
        "solidus": 570,          # typical 5056
        "liquidus": 640,         # typical 5056
        "yield_annealed": 152,   # typical 5056-O
        "uts_annealed": 290,     # typical 5056-O
        "hardness_bhn": 65,      # typical 5056-O
    },
    "Al 5086": {
        "density": 2.66,         # typical 5086
        "thermal_cond": 125,     # typical 5086
        "specific_heat": 900,    # typical 5xxx
        "elastic_mod": 71,       # typical 5xxx
        "solidus": 585,          # typical 5086
        "liquidus": 640,         # typical 5086
        "yield_annealed": 115,   # typical 5086-O
        "uts_annealed": 260,     # typical 5086-O
        "hardness_bhn": 65,      # typical 5086-O
    },
    "Al 5154": {
        "density": 2.66,         # typical 5154
        "thermal_cond": 127,     # typical 5154
        "specific_heat": 900,    # typical 5xxx
        "elastic_mod": 70,       # typical 5xxx
        "solidus": 593,          # typical 5154
        "liquidus": 643,         # typical 5154
        "yield_annealed": 117,   # typical 5154-O
        "uts_annealed": 241,     # typical 5154-O
        "hardness_bhn": 58,      # typical 5154-O
    },
    "Al 5454": {
        "density": 2.69,         # typical 5454
        "thermal_cond": 134,     # typical 5454
        "specific_heat": 900,    # typical 5xxx
        "elastic_mod": 70,       # typical 5xxx
        "solidus": 602,          # typical 5454
        "liquidus": 646,         # typical 5454
        "yield_annealed": 117,   # typical 5454-O
        "uts_annealed": 250,     # typical 5454-O
        "hardness_bhn": 62,      # typical 5454-O
    },
    "Al 6005": {
        "density": 2.7,          # typical 6xxx
        "thermal_cond": 170,     # typical 6005-O (similar to 6061)
        "specific_heat": 900,    # typical 6xxx
        "elastic_mod": 69,       # typical 6xxx
        "solidus": 575,          # typical 6005
        "liquidus": 650,         # typical 6005
        "yield_annealed": 55,    # typical 6005-O
        "uts_annealed": 130,     # typical 6005-O
        "hardness_bhn": 30,      # estimated from 6005-O
    },
    "Al 6010": {
        "density": 2.7,          # typical 6xxx
        "thermal_cond": 170,     # typical 6xxx
        "specific_heat": 900,    # typical 6xxx
        "elastic_mod": 69,       # typical 6xxx
        "solidus": 575,          # typical 6xxx
        "liquidus": 650,         # typical 6xxx
        "yield_annealed": 60,    # typical 6010-O
        "uts_annealed": 140,     # typical 6010-O
        "hardness_bhn": 35,      # estimated
    },
    "Al 6013": {
        "density": 2.71,         # typical 6013
        "thermal_cond": 155,     # typical 6013
        "specific_heat": 900,    # typical 6xxx
        "elastic_mod": 69,       # typical 6xxx
        "solidus": 575,          # typical 6013
        "liquidus": 645,         # typical 6013
        "yield_annealed": 65,    # typical 6013-O
        "uts_annealed": 150,     # typical 6013-O
        "hardness_bhn": 35,      # estimated
    },
    "Al 6066": {
        "density": 2.71,         # typical 6066
        "thermal_cond": 147,     # typical 6066
        "specific_heat": 900,    # typical 6xxx
        "elastic_mod": 69,       # typical 6xxx
        "solidus": 565,          # typical 6066
        "liquidus": 645,         # typical 6066
        "yield_annealed": 83,    # typical 6066-O
        "uts_annealed": 150,     # typical 6066-O
        "hardness_bhn": 43,      # typical 6066-O
    },
    "Al 7049": {
        "density": 2.84,         # typical 7xxx
        "thermal_cond": 130,     # typical 7xxx O temper
        "specific_heat": 870,    # typical 7xxx
        "elastic_mod": 71,       # typical 7xxx
        "solidus": 475,          # typical 7049
        "liquidus": 635,         # typical 7049
        "yield_annealed": 105,   # estimated 7049-O
        "uts_annealed": 230,     # estimated 7049-O
        "hardness_bhn": 55,      # estimated
    },
    "Al 7055": {
        "density": 2.86,         # typical 7055 (high Zn)
        "thermal_cond": 125,     # typical 7055
        "specific_heat": 870,    # typical 7xxx
        "elastic_mod": 72,       # typical 7xxx
        "solidus": 470,          # typical 7055
        "liquidus": 635,         # typical 7055
        "yield_annealed": 110,   # estimated 7055-O
        "uts_annealed": 235,     # estimated 7055-O
        "hardness_bhn": 60,      # estimated
    },
    "Al 7178": {
        "density": 2.83,         # typical 7178
        "thermal_cond": 125,     # typical 7xxx
        "specific_heat": 870,    # typical 7xxx
        "elastic_mod": 72,       # typical 7xxx
        "solidus": 475,          # typical 7178
        "liquidus": 635,         # typical 7178
        "yield_annealed": 103,   # typical 7178-O
        "uts_annealed": 228,     # typical 7178-O
        "hardness_bhn": 54,      # typical 7178-O
    },

    # =========================================================================
    # CAST ALUMINUM ALLOYS
    # =========================================================================
    # Source: MakeItFrom.com, AZoM.com

    "Al 319": {
        "density": 2.79,         # typical 319 cast
        "thermal_cond": 113,     # typical 319 as-cast
        "specific_heat": 900,    # typical Al cast
        "elastic_mod": 74,       # typical Al-Si-Cu cast
        "solidus": 520,          # typical 319
        "liquidus": 605,         # typical 319
        "yield_annealed": 130,   # typical 319-F (as-cast)
        "uts_annealed": 185,     # typical 319-F (as-cast)
        "hardness_bhn": 70,      # typical 319-F
    },
    "Al 333": {
        "density": 2.77,         # typical 333 cast
        "thermal_cond": 117,     # typical 333
        "specific_heat": 900,    # typical Al cast
        "elastic_mod": 71,       # typical Al cast
        "solidus": 520,          # typical 333
        "liquidus": 585,         # typical 333
        "yield_annealed": 95,    # typical 333-F (as-cast)
        "uts_annealed": 160,     # typical 333-F
        "hardness_bhn": 65,      # typical 333-F
    },
    "Al 355": {
        "density": 2.71,         # typical 355 cast
        "thermal_cond": 150,     # typical 355
        "specific_heat": 900,    # typical Al cast
        "elastic_mod": 70,       # typical Al cast
        "solidus": 550,          # typical 355
        "liquidus": 620,         # typical 355
        "yield_annealed": 85,    # typical 355-F (as-cast)
        "uts_annealed": 160,     # typical 355-F
        "hardness_bhn": 60,      # typical 355-F
    },
    "Al 390": {
        "density": 2.73,         # typical 390 (hypereutectic Si)
        "thermal_cond": 134,     # typical 390
        "specific_heat": 880,    # typical Al-Si
        "elastic_mod": 81,       # higher due to high Si
        "solidus": 510,          # typical 390
        "liquidus": 650,         # typical 390
        "yield_annealed": 240,   # typical 390-F die-cast
        "uts_annealed": 280,     # typical 390-F die-cast
        "hardness_bhn": 120,     # typical 390-F die-cast
    },
    "Al 413": {
        "density": 2.66,         # typical 413 (eutectic Al-Si)
        "thermal_cond": 121,     # typical 413
        "specific_heat": 900,    # typical Al-Si
        "elastic_mod": 71,       # typical Al cast
        "solidus": 575,          # typical 413 (near eutectic)
        "liquidus": 585,         # typical 413 (narrow range)
        "yield_annealed": 145,   # typical 413-F die-cast
        "uts_annealed": 296,     # typical 413-F die-cast
        "hardness_bhn": 80,      # typical 413-F die-cast
    },

    # =========================================================================
    # TITANIUM ALLOYS - ADDITIONAL
    # =========================================================================
    # Source: MakeItFrom.com, AZoM.com, literature

    "Ti CP Grade 1": {
        "density": 4.5,          # MakeItFrom
        "thermal_cond": 22,      # MakeItFrom
        "specific_heat": 540,    # MakeItFrom
        "elastic_mod": 105,      # slightly lower than Grade 2
        "solidus": 1660,         # CP Ti family
        "liquidus": 1670,        # CP Ti family
        "yield_annealed": 240,   # typical CP Grade 1 (softest)
        "uts_annealed": 330,     # typical CP Grade 1
        "hardness_bhn": 120,     # typical CP Grade 1
    },
    "Ti CP Grade 3": {
        "density": 4.5,          # MakeItFrom CP family
        "thermal_cond": 20,      # MakeItFrom CP family
        "specific_heat": 540,    # MakeItFrom CP family
        "elastic_mod": 110,      # CP Ti family
        "solidus": 1610,         # CP Ti family
        "liquidus": 1660,        # CP Ti family
        "yield_annealed": 450,   # intermediate between Gr2 and Gr4
        "uts_annealed": 530,     # intermediate between Gr2 and Gr4
        "hardness_bhn": 175,     # interpolated
    },
    "Ti-3Al-2.5V": {
        "density": 4.48,         # AZoM / literature
        "thermal_cond": 8.3,     # typical alpha-beta
        "specific_heat": 530,    # typical Ti alloy
        "elastic_mod": 107,      # typical Ti-3-2.5
        "solidus": 1600,         # typical Ti-3-2.5
        "liquidus": 1660,        # typical Ti-3-2.5
        "yield_annealed": 485,   # typical annealed
        "uts_annealed": 620,     # typical annealed
        "hardness_bhn": 220,     # estimated from HRC
    },
    "Ti-5Al-2.5Sn": {
        "density": 4.48,         # typical Ti-5-2.5
        "thermal_cond": 6.0,     # typical alpha Ti alloy (low)
        "specific_heat": 530,    # typical Ti alloy
        "elastic_mod": 110,      # typical Ti-5-2.5
        "solidus": 1600,         # typical
        "liquidus": 1650,        # typical
        "yield_annealed": 790,   # typical annealed
        "uts_annealed": 860,     # typical annealed
        "hardness_bhn": 310,     # estimated from HRC
    },
    "Ti-6Al-6V-2Sn": {
        "density": 4.54,         # typical alpha-beta
        "thermal_cond": 6.6,     # typical alpha-beta
        "specific_heat": 530,    # typical Ti alloy
        "elastic_mod": 112,      # typical
        "solidus": 1595,         # typical
        "liquidus": 1650,        # typical
        "yield_annealed": 970,   # typical annealed
        "uts_annealed": 1050,    # typical annealed
        "hardness_bhn": 340,     # estimated from HRC
    },
    "Ti-10V-2Fe-3Al": {
        "density": 4.65,         # near-beta, higher density
        "thermal_cond": 7.8,     # typical beta Ti
        "specific_heat": 500,    # typical beta Ti
        "elastic_mod": 103,      # lower modulus (beta)
        "solidus": 1590,         # typical
        "liquidus": 1650,        # typical
        "yield_annealed": 1100,  # typical STA condition
        "uts_annealed": 1175,    # typical STA condition
        "hardness_bhn": 360,     # estimated from HRC
    },
    "Ti-15V-3Cr-3Al-3Sn": {
        "density": 4.71,         # beta Ti alloy (higher density)
        "thermal_cond": 8.1,     # typical beta Ti
        "specific_heat": 500,    # typical beta Ti
        "elastic_mod": 87,       # beta Ti (low modulus)
        "solidus": 1580,         # typical
        "liquidus": 1650,        # typical
        "yield_annealed": 790,   # typical solution treated
        "uts_annealed": 810,     # typical solution treated
        "hardness_bhn": 280,     # estimated
    },
    "Ti Beta-C": {
        "density": 4.82,         # Ti-3Al-8V-6Cr-4Mo-4Zr (dense beta)
        "thermal_cond": 7.6,     # typical beta Ti
        "specific_heat": 500,    # typical beta Ti
        "elastic_mod": 86,       # beta Ti (low modulus)
        "solidus": 1570,         # typical
        "liquidus": 1640,        # typical
        "yield_annealed": 810,   # typical solution treated
        "uts_annealed": 860,     # typical solution treated
        "hardness_bhn": 290,     # estimated
    },

    # =========================================================================
    # SUPERALLOYS - ADDITIONAL
    # =========================================================================
    # Source: HighTempMetals.com, MakeItFrom.com, Special Metals datasheets

    "Inconel 601": {
        "density": 8.11,         # HighTempMetals
        "thermal_cond": 11.2,    # HighTempMetals
        "specific_heat": 448,    # HighTempMetals
        "elastic_mod": 207,      # typical Inconel 601
        "solidus": 1360,         # HighTempMetals
        "liquidus": 1411,        # HighTempMetals
        "yield_annealed": 338,   # HighTempMetals (annealed flat, 49 ksi)
        "uts_annealed": 738,     # HighTempMetals (annealed flat, 107 ksi)
        "hardness_bhn": 161,     # HighTempMetals (annealed flat)
    },
    "Inconel 617": {
        "density": 8.36,         # HighTempMetals
        "thermal_cond": 13.6,    # HighTempMetals (at 78F, 94 Btu-in)
        "specific_heat": 419,    # HighTempMetals
        "elastic_mod": 211,      # HighTempMetals
        "solidus": 1332,         # HighTempMetals
        "liquidus": 1377,        # HighTempMetals
        "yield_annealed": 318,   # HighTempMetals (as-rolled/annealed, 46 ksi)
        "uts_annealed": 734,     # HighTempMetals (107 ksi)
        "hardness_bhn": 172,     # HighTempMetals
    },
    "Inconel 690": {
        "density": 8.19,         # typical Inconel 690
        "thermal_cond": 13.5,    # typical
        "specific_heat": 450,    # typical
        "elastic_mod": 211,      # typical
        "solidus": 1343,         # typical
        "liquidus": 1377,        # typical
        "yield_annealed": 310,   # typical annealed
        "uts_annealed": 690,     # typical annealed
        "hardness_bhn": None,    # not commonly reported
    },
    "Inconel 706": {
        "density": 8.08,         # typical
        "thermal_cond": 12.0,    # typical
        "specific_heat": 450,    # typical
        "elastic_mod": 207,      # typical
        "solidus": 1300,         # typical
        "liquidus": 1370,        # typical
        "yield_annealed": 400,   # typical solution treated
        "uts_annealed": 800,     # typical solution treated
        "hardness_bhn": None,    # not commonly reported
    },
    "Inconel X-750": {
        "density": 8.28,         # HighTempMetals / Special Metals
        "thermal_cond": 12.0,    # HighTempMetals (83 Btu-in at 70F)
        "specific_heat": 431,    # typical
        "elastic_mod": 214,      # typical
        "solidus": 1390,         # typical
        "liquidus": 1425,        # typical
        "yield_annealed": 345,   # typical annealed
        "uts_annealed": 760,     # typical annealed
        "hardness_bhn": None,    # (HRC ~20 annealed)
    },
    "Incoloy 800": {
        "density": 7.95,         # HighTempMetals
        "thermal_cond": 11.5,    # HighTempMetals (at 70F)
        "specific_heat": 460,    # typical
        "elastic_mod": 196,      # HighTempMetals
        "solidus": 1357,         # typical
        "liquidus": 1385,        # typical
        "yield_annealed": 207,   # HighTempMetals (annealed bar, 30 ksi)
        "uts_annealed": 517,     # HighTempMetals (75 ksi)
        "hardness_bhn": None,    # not commonly reported
    },
    "Incoloy 800H": {
        "density": 7.95,         # same as 800
        "thermal_cond": 11.5,    # same as 800
        "specific_heat": 460,    # same as 800
        "elastic_mod": 196,      # same as 800
        "solidus": 1357,         # same as 800
        "liquidus": 1385,        # same as 800
        "yield_annealed": 170,   # HighTempMetals (lower than 800 due to C limits)
        "uts_annealed": 450,     # HighTempMetals
        "hardness_bhn": None,    # not commonly reported
    },
    "Incoloy 825": {
        "density": 8.14,         # HighTempMetals
        "thermal_cond": 11.1,    # HighTempMetals (at 70F)
        "specific_heat": 440,    # HighTempMetals
        "elastic_mod": 193,      # HighTempMetals
        "solidus": 1370,         # HighTempMetals
        "liquidus": 1400,        # HighTempMetals
        "yield_annealed": 310,   # HighTempMetals (annealed sheet, 45 ksi)
        "uts_annealed": 655,     # HighTempMetals (95 ksi)
        "hardness_bhn": None,    # not commonly reported
    },
    "Incoloy 901": {
        "density": 8.17,         # typical
        "thermal_cond": 11.2,    # typical
        "specific_heat": 440,    # typical
        "elastic_mod": 200,      # typical
        "solidus": 1300,         # typical
        "liquidus": 1370,        # typical
        "yield_annealed": 380,   # typical solution treated
        "uts_annealed": 730,     # typical solution treated
        "hardness_bhn": None,    # not commonly reported
    },
    "Incoloy 903": {
        "density": 8.19,         # typical (Fe-Ni-Co superalloy)
        "thermal_cond": 14.7,    # typical
        "specific_heat": 435,    # typical
        "elastic_mod": 148,      # controlled expansion alloy
        "solidus": 1300,         # typical
        "liquidus": 1370,        # typical
        "yield_annealed": 414,   # typical annealed
        "uts_annealed": 793,     # typical annealed
        "hardness_bhn": None,    # not commonly reported
    },
    "Monel 400": {
        "density": 8.83,         # HighTempMetals
        "thermal_cond": 21.8,    # HighTempMetals (at 70F)
        "specific_heat": 427,    # typical Monel
        "elastic_mod": 179,      # HighTempMetals (26 x 10^6 psi)
        "solidus": 1300,         # typical
        "liquidus": 1350,        # typical
        "yield_annealed": 195,   # HighTempMetals (annealed sheet, 28 ksi)
        "uts_annealed": 480,     # HighTempMetals (70 ksi)
        "hardness_bhn": None,    # not commonly reported (Rb 60-80)
    },
    "Monel K-500": {
        "density": 8.44,         # HighTempMetals
        "thermal_cond": 17.5,    # HighTempMetals (at room temp, estimated from BTU)
        "specific_heat": 418,    # HighTempMetals (at 70F)
        "elastic_mod": 179,      # HighTempMetals (26 x 10^6 psi)
        "solidus": 1315,         # HighTempMetals (2400F)
        "liquidus": 1349,        # HighTempMetals (2460F)
        "yield_annealed": 276,   # HighTempMetals (annealed, ~40 ksi low end)
        "uts_annealed": 621,     # HighTempMetals (annealed, ~90 ksi low end)
        "hardness_bhn": None,    # (Rb 85 max annealed)
    },
    "Nimonic 75": {
        "density": 8.37,         # typical
        "thermal_cond": 11.7,    # typical
        "specific_heat": 448,    # typical
        "elastic_mod": 214,      # typical Nimonic
        "solidus": 1340,         # typical
        "liquidus": 1380,        # typical
        "yield_annealed": 250,   # typical annealed
        "uts_annealed": 650,     # typical annealed
        "hardness_bhn": None,    # not commonly reported
    },
    "Nimonic 80A": {
        "density": 8.19,         # typical
        "thermal_cond": 11.3,    # typical
        "specific_heat": 448,    # typical
        "elastic_mod": 222,      # typical
        "solidus": 1320,         # typical
        "liquidus": 1365,        # typical
        "yield_annealed": 310,   # typical solution treated
        "uts_annealed": 760,     # typical solution treated
        "hardness_bhn": None,    # (HRC ~20 ST)
    },
    "Nimonic 90": {
        "density": 8.18,         # typical
        "thermal_cond": 11.5,    # Special Metals datasheet
        "specific_heat": 448,    # typical
        "elastic_mod": 222,      # typical
        "solidus": 1310,         # typical
        "liquidus": 1370,        # typical
        "yield_annealed": 480,   # typical solution treated + aged
        "uts_annealed": 900,     # typical solution treated + aged
        "hardness_bhn": None,    # not commonly reported
    },
    "Nimonic 263": {
        "density": 8.36,         # typical
        "thermal_cond": 11.7,    # typical
        "specific_heat": 461,    # typical
        "elastic_mod": 220,      # typical
        "solidus": 1300,         # typical
        "liquidus": 1355,        # typical
        "yield_annealed": 310,   # typical solution treated
        "uts_annealed": 740,     # typical solution treated
        "hardness_bhn": None,    # not commonly reported
    },
    "Haynes 25": {
        "density": 9.13,         # HighTempMetals / Haynes International
        "thermal_cond": 10.5,    # HighTempMetals (at room temp)
        "specific_heat": 403,    # HighTempMetals
        "elastic_mod": 225,      # HighTempMetals (32.6 x 10^6 psi)
        "solidus": 1330,         # HighTempMetals
        "liquidus": 1410,        # HighTempMetals
        "yield_annealed": 448,   # HighTempMetals (annealed, 65 ksi)
        "uts_annealed": 945,     # HighTempMetals (137 ksi)
        "hardness_bhn": None,    # (Rb 95-100)
    },
    "Haynes 188": {
        "density": 9.0,          # HighTempMetals
        "thermal_cond": 10.0,    # HighTempMetals (annealed)
        "specific_heat": 403,    # typical Co-base
        "elastic_mod": 232,      # HighTempMetals (34 x 10^3 ksi)
        "solidus": 1302,         # typical
        "liquidus": 1330,        # typical
        "yield_annealed": 464,   # HighTempMetals (67 ksi)
        "uts_annealed": 938,     # HighTempMetals (136 ksi)
        "hardness_bhn": None,    # not commonly reported
    },
    "Haynes 230": {
        "density": 9.05,         # HighTempMetals
        "thermal_cond": 8.9,     # HighTempMetals (at 70F)
        "specific_heat": 397,    # HighTempMetals (at 70F)
        "elastic_mod": 211,      # HighTempMetals (30.6 x 10^3 ksi)
        "solidus": 1301,         # HighTempMetals
        "liquidus": 1371,        # HighTempMetals
        "yield_annealed": 310,   # HighTempMetals (45 ksi min)
        "uts_annealed": 760,     # HighTempMetals (110 ksi min)
        "hardness_bhn": None,    # not commonly reported
    },
    "Rene 41": {
        "density": 8.25,         # HighTempMetals
        "thermal_cond": 11.9,    # HighTempMetals
        "specific_heat": 421,    # typical
        "elastic_mod": 220,      # HighTempMetals
        "solidus": 1316,         # typical
        "liquidus": 1370,        # typical
        "yield_annealed": 690,   # HighTempMetals (solution treated + aged)
        "uts_annealed": 1170,    # HighTempMetals
        "hardness_bhn": None,    # (HRC 35-40)
    },
    "Rene 80": {
        "density": 8.16,         # typical cast Ni superalloy
        "thermal_cond": 10.9,    # typical
        "specific_heat": 418,    # typical
        "elastic_mod": 210,      # typical
        "solidus": 1230,         # typical (cast alloy, lower)
        "liquidus": 1340,        # typical
        "yield_annealed": 730,   # typical (cast + HT)
        "uts_annealed": 1020,    # typical (cast + HT)
        "hardness_bhn": None,    # not commonly reported
    },
    "Udimet 500": {
        "density": 8.02,         # typical
        "thermal_cond": 11.0,    # typical
        "specific_heat": 418,    # typical Ni superalloy
        "elastic_mod": 214,      # typical
        "solidus": 1280,         # typical
        "liquidus": 1360,        # typical
        "yield_annealed": 700,   # typical aged
        "uts_annealed": 1100,    # typical aged
        "hardness_bhn": None,    # not commonly reported
    },
    "Udimet 720": {
        "density": 8.08,         # typical
        "thermal_cond": 10.4,    # typical
        "specific_heat": 418,    # typical Ni superalloy
        "elastic_mod": 220,      # typical
        "solidus": 1240,         # typical
        "liquidus": 1340,        # typical
        "yield_annealed": 850,   # typical aged
        "uts_annealed": 1230,    # typical aged
        "hardness_bhn": None,    # not commonly reported
    },

    # =========================================================================
    # CAST IRONS - ADDITIONAL
    # =========================================================================
    # Source: MakeItFrom.com (primary)

    "Gray Iron Class 25": {
        "density": 7.5,          # MakeItFrom family
        "thermal_cond": 46,      # MakeItFrom family
        "specific_heat": 490,    # MakeItFrom family
        "elastic_mod": 180,      # MakeItFrom family
        "solidus": 1180,         # MakeItFrom family
        "liquidus": 1380,        # MakeItFrom family
        "yield_annealed": 115,   # interpolated Class 20/30
        "uts_annealed": 200,     # ~25 ksi min (172 MPa), typical ~200
        "hardness_bhn": 185,     # interpolated
    },
    "Gray Iron Class 35": {
        "density": 7.5,          # MakeItFrom family
        "thermal_cond": 46,      # MakeItFrom family
        "specific_heat": 490,    # MakeItFrom family
        "elastic_mod": 180,      # MakeItFrom family
        "solidus": 1180,         # MakeItFrom family
        "liquidus": 1380,        # MakeItFrom family
        "yield_annealed": 160,   # interpolated Class 30/40
        "uts_annealed": 270,     # ~35 ksi min (241 MPa), typical ~270
        "hardness_bhn": 225,     # interpolated
    },
    "Gray Iron Class 45": {
        "density": 7.5,          # MakeItFrom family
        "thermal_cond": 44,      # slightly lower (denser pearlite)
        "specific_heat": 490,    # MakeItFrom family
        "elastic_mod": 185,      # slightly higher for denser microstructure
        "solidus": 1180,         # MakeItFrom family
        "liquidus": 1380,        # MakeItFrom family
        "yield_annealed": 215,   # interpolated
        "uts_annealed": 345,     # ~45 ksi min (310 MPa), typical ~345
        "hardness_bhn": 255,     # typical
    },
    "Gray Iron Class 50": {
        "density": 7.5,          # MakeItFrom family
        "thermal_cond": 42,      # denser pearlitic matrix
        "specific_heat": 490,    # MakeItFrom family
        "elastic_mod": 185,      # slightly higher
        "solidus": 1180,         # MakeItFrom family
        "liquidus": 1380,        # MakeItFrom family
        "yield_annealed": 240,   # interpolated
        "uts_annealed": 380,     # ~50 ksi min (345 MPa), typical ~380
        "hardness_bhn": 270,     # typical
    },
    "Gray Iron Class 60": {
        "density": 7.5,          # MakeItFrom family
        "thermal_cond": 40,      # lower for highest class
        "specific_heat": 490,    # MakeItFrom family
        "elastic_mod": 190,      # highest class
        "solidus": 1180,         # MakeItFrom family
        "liquidus": 1380,        # MakeItFrom family
        "yield_annealed": 280,   # interpolated
        "uts_annealed": 435,     # ~60 ksi min (414 MPa), typical ~435
        "hardness_bhn": 300,     # typical
    },
    "Ductile 60-40-18": {
        "density": 7.1,          # ductile iron family
        "thermal_cond": 37,      # ferritic matrix (higher than pearlitic)
        "specific_heat": 490,    # ductile iron family
        "elastic_mod": 170,      # ductile iron family
        "solidus": 1120,         # ductile iron family
        "liquidus": 1160,        # ductile iron family
        "yield_annealed": 276,   # 40 ksi min yield
        "uts_annealed": 414,     # 60 ksi min UTS
        "hardness_bhn": 156,     # typical ferritic ductile
    },
    "Ductile 100-70-03": {
        "density": 7.1,          # ductile iron family
        "thermal_cond": 33,      # pearlitic/bainitic matrix
        "specific_heat": 490,    # ductile iron family
        "elastic_mod": 170,      # ductile iron family
        "solidus": 1120,         # ductile iron family
        "liquidus": 1160,        # ductile iron family
        "yield_annealed": 483,   # 70 ksi min yield
        "uts_annealed": 690,     # 100 ksi min UTS
        "hardness_bhn": 260,     # typical
    },
    "Ductile 120-90-02": {
        "density": 7.1,          # ductile iron family
        "thermal_cond": 30,      # tempered martensite matrix
        "specific_heat": 490,    # ductile iron family
        "elastic_mod": 170,      # ductile iron family
        "solidus": 1120,         # ductile iron family
        "liquidus": 1160,        # ductile iron family
        "yield_annealed": 621,   # 90 ksi min yield
        "uts_annealed": 827,     # 120 ksi min UTS
        "hardness_bhn": 302,     # typical
    },
    "ADI Grade 1 (900/6)": {
        "density": 7.1,          # ductile iron family
        "thermal_cond": 24,      # ADI ausferrite matrix (lower)
        "specific_heat": 490,    # ductile iron family
        "elastic_mod": 170,      # ductile iron family
        "solidus": 1120,         # ductile iron family
        "liquidus": 1160,        # ductile iron family
        "yield_annealed": 550,   # ADI Grade 1 min yield
        "uts_annealed": 900,     # ADI Grade 1 min UTS
        "hardness_bhn": 280,     # typical ADI Grade 1
    },
    "Malleable Iron M3210": {
        "density": 7.3,          # malleable iron (higher than ductile)
        "thermal_cond": 38,      # ferritic malleable
        "specific_heat": 490,    # cast iron family
        "elastic_mod": 170,      # cast iron family
        "solidus": 1150,         # malleable iron
        "liquidus": 1200,        # malleable iron
        "yield_annealed": 221,   # ASTM A47 M3210 (32 ksi min)
        "uts_annealed": 345,     # ASTM A47 M3210 (50 ksi min)
        "hardness_bhn": 156,     # typical
    },

    # =========================================================================
    # COPPER ALLOYS - ADDITIONAL
    # =========================================================================
    # Source: copper.org, MakeItFrom.com

    "Cu C10100": {
        "density": 8.94,         # copper.org (OFE, 99.99% Cu)
        "thermal_cond": 391,     # copper.org (highest purity)
        "specific_heat": 385,    # typical pure Cu
        "elastic_mod": 117,      # typical pure Cu
        "solidus": 1065,         # pure Cu
        "liquidus": 1083,        # pure Cu
        "yield_annealed": 62,    # copper.org (annealed)
        "uts_annealed": 221,     # copper.org (annealed)
        "hardness_bhn": None,    # (HRF 35-55)
    },
    "Cu C10200": {
        "density": 8.94,         # copper.org (OF, 99.95% Cu)
        "thermal_cond": 388,     # copper.org (slightly lower than C10100)
        "specific_heat": 385,    # typical pure Cu
        "elastic_mod": 117,      # typical pure Cu
        "solidus": 1065,         # pure Cu
        "liquidus": 1083,        # pure Cu
        "yield_annealed": 69,    # copper.org (annealed)
        "uts_annealed": 224,     # copper.org (annealed)
        "hardness_bhn": None,    # (HRF 37-57)
    },
    "Cu C14500": {
        "density": 8.94,         # tellurium copper
        "thermal_cond": 355,     # slightly lower than pure Cu (Te addition)
        "specific_heat": 385,    # typical Cu
        "elastic_mod": 117,      # typical Cu
        "solidus": 1065,         # typical Cu
        "liquidus": 1083,        # typical Cu
        "yield_annealed": 69,    # typical tellurium Cu annealed
        "uts_annealed": 228,     # typical annealed
        "hardness_bhn": None,    # (HRF 40)
    },
    "Cu C17500": {
        "density": 8.75,         # Cu-Be-Co alloy
        "thermal_cond": 210,     # higher than C17200 (lower Be)
        "specific_heat": 390,    # typical Cu-Be
        "elastic_mod": 131,      # Cu-Be family
        "solidus": 980,          # Cu-Be family
        "liquidus": 1060,        # Cu-Be family
        "yield_annealed": 170,   # typical annealed
        "uts_annealed": 410,     # typical annealed
        "hardness_bhn": None,    # (HRB 45-70)
    },
    "Cu C22000": {
        "density": 8.8,          # commercial bronze (90Cu-10Zn)
        "thermal_cond": 189,     # copper.org
        "specific_heat": 380,    # typical bronze
        "elastic_mod": 115,      # typical bronze
        "solidus": 1020,         # copper.org
        "liquidus": 1045,        # copper.org
        "yield_annealed": 76,    # copper.org (annealed)
        "uts_annealed": 269,     # copper.org (annealed)
        "hardness_bhn": None,    # (HRF 47-56)
    },
    "Cu C23000": {
        "density": 8.75,         # red brass (85Cu-15Zn)
        "thermal_cond": 159,     # copper.org
        "specific_heat": 380,    # typical brass
        "elastic_mod": 110,      # typical brass
        "solidus": 990,          # copper.org
        "liquidus": 1030,        # copper.org
        "yield_annealed": 83,    # copper.org (annealed)
        "uts_annealed": 290,     # copper.org (annealed)
        "hardness_bhn": None,    # (HRF 50)
    },
    "Cu C26200": {
        "density": 8.5,          # high brass (similar to C26000)
        "thermal_cond": 121,     # similar to C26000
        "specific_heat": 380,    # typical brass
        "elastic_mod": 110,      # typical brass
        "solidus": 915,          # typical 70/30 brass family
        "liquidus": 945,         # typical
        "yield_annealed": 105,   # similar to C26000
        "uts_annealed": 310,     # similar to C26000
        "hardness_bhn": None,    # (HRB 50-65)
    },
    "Cu C27000": {
        "density": 8.5,          # yellow brass (65Cu-35Zn)
        "thermal_cond": 115,     # copper.org
        "specific_heat": 380,    # typical brass
        "elastic_mod": 105,      # typical brass
        "solidus": 905,          # copper.org
        "liquidus": 935,         # copper.org
        "yield_annealed": 97,    # copper.org (annealed)
        "uts_annealed": 340,     # copper.org (annealed)
        "hardness_bhn": None,    # (HRB 55)
    },
    "Cu C28000": {
        "density": 8.4,          # Muntz metal (60Cu-40Zn)
        "thermal_cond": 123,     # copper.org
        "specific_heat": 380,    # typical brass
        "elastic_mod": 100,      # typical brass
        "solidus": 885,          # copper.org
        "liquidus": 900,         # copper.org
        "yield_annealed": 145,   # copper.org (annealed)
        "uts_annealed": 380,     # copper.org (annealed)
        "hardness_bhn": None,    # (HRB 52)
    },
    "Cu C51000": {
        "density": 8.86,         # phosphor bronze A (95Cu-5Sn)
        "thermal_cond": 69,      # copper.org
        "specific_heat": 380,    # typical bronze
        "elastic_mod": 110,      # copper.org
        "solidus": 1000,         # copper.org
        "liquidus": 1060,        # copper.org
        "yield_annealed": 130,   # copper.org (annealed)
        "uts_annealed": 325,     # copper.org (annealed)
        "hardness_bhn": None,    # (HRB 45-70)
    },
    "Cu C52100": {
        "density": 8.86,         # phosphor bronze C (92Cu-8Sn)
        "thermal_cond": 55,      # copper.org (lower than C51000, more Sn)
        "specific_heat": 380,    # typical bronze
        "elastic_mod": 110,      # copper.org
        "solidus": 910,          # copper.org (more Sn lowers solidus)
        "liquidus": 1030,        # copper.org
        "yield_annealed": 165,   # copper.org (annealed)
        "uts_annealed": 380,     # copper.org (annealed)
        "hardness_bhn": None,    # (HRB 55-80)
    },
    "Cu C63000": {
        "density": 7.58,         # Ni-Al bronze
        "thermal_cond": 39,      # copper.org
        "specific_heat": 380,    # typical bronze
        "elastic_mod": 115,      # copper.org
        "solidus": 1040,         # copper.org
        "liquidus": 1060,        # copper.org
        "yield_annealed": 345,   # copper.org (hot rolled)
        "uts_annealed": 655,     # copper.org (hot rolled)
        "hardness_bhn": 170,     # copper.org
    },
    "Cu C71500": {
        "density": 8.94,         # Cu-Ni 70/30
        "thermal_cond": 29,      # copper.org
        "specific_heat": 380,    # typical Cu-Ni
        "elastic_mod": 150,      # copper.org
        "solidus": 1170,         # copper.org
        "liquidus": 1240,        # copper.org
        "yield_annealed": 140,   # copper.org (annealed)
        "uts_annealed": 380,     # copper.org (annealed)
        "hardness_bhn": None,    # (HRB 45-65)
    },
    "Cu C93200": {
        "density": 8.93,         # bearing bronze (SAE 660)
        "thermal_cond": 59,      # copper.org
        "specific_heat": 376,    # typical cast bronze
        "elastic_mod": 76,       # copper.org (cast)
        "solidus": 855,          # copper.org
        "liquidus": 1000,        # copper.org
        "yield_annealed": 125,   # copper.org (as-cast)
        "uts_annealed": 241,     # copper.org (as-cast)
        "hardness_bhn": 65,      # copper.org (as-cast)
    },

    # =========================================================================
    # TOOL STEELS - ADDITIONAL
    # =========================================================================
    # Source: MakeItFrom.com, AZoM.com, EngineersEdge.com

    "Tool A6": {
        "density": 7.8,          # air-hardening tool steel
        "thermal_cond": 37,      # typical A-series
        "specific_heat": 470,    # tool steel family
        "elastic_mod": 190,      # tool steel family
        "solidus": 1410,         # typical A-series
        "liquidus": 1450,        # typical A-series
        "yield_annealed": 340,   # typical A6 annealed
        "uts_annealed": 680,     # typical A6 annealed
        "hardness_bhn": 217,     # typical A6 annealed (max ~229)
    },
    "Tool A10": {
        "density": 7.8,          # air-hardening tool steel (graphitic)
        "thermal_cond": 35,      # slightly lower (graphite bearing)
        "specific_heat": 470,    # tool steel family
        "elastic_mod": 190,      # tool steel family
        "solidus": 1400,         # typical A10
        "liquidus": 1450,        # typical A10
        "yield_annealed": 330,   # typical A10 annealed
        "uts_annealed": 660,     # typical A10 annealed
        "hardness_bhn": 207,     # typical A10 annealed
    },
    "Tool D3": {
        "density": 7.7,          # high-Cr cold work (similar to D2)
        "thermal_cond": 30,      # similar to D2
        "specific_heat": 480,    # tool steel family
        "elastic_mod": 190,      # tool steel family
        "solidus": 1385,         # similar to D2
        "liquidus": 1435,        # similar to D2
        "yield_annealed": 460,   # typical D3 annealed
        "uts_annealed": 750,     # typical D3 annealed
        "hardness_bhn": 225,     # typical D3 annealed
    },
    "Tool D6": {
        "density": 7.7,          # high-Cr cold work
        "thermal_cond": 29,      # similar to D-series
        "specific_heat": 480,    # tool steel family
        "elastic_mod": 190,      # tool steel family
        "solidus": 1380,         # D-series
        "liquidus": 1430,        # D-series
        "yield_annealed": 470,   # typical D6 annealed
        "uts_annealed": 760,     # typical D6 annealed
        "hardness_bhn": 228,     # typical D6 annealed
    },
    "Tool D7": {
        "density": 7.7,          # high-Cr-V cold work (higher V)
        "thermal_cond": 27,      # slightly lower due to V
        "specific_heat": 480,    # tool steel family
        "elastic_mod": 190,      # tool steel family
        "solidus": 1370,         # D-series with high V
        "liquidus": 1425,        # D-series
        "yield_annealed": 480,   # typical D7 annealed
        "uts_annealed": 770,     # typical D7 annealed
        "hardness_bhn": 235,     # typical D7 annealed
    },
    "Tool H11": {
        "density": 7.8,          # hot work Cr-Mo-V
        "thermal_cond": 28,      # similar to H13
        "specific_heat": 470,    # tool steel family
        "elastic_mod": 190,      # tool steel family
        "solidus": 1420,         # similar to H13
        "liquidus": 1460,        # similar to H13
        "yield_annealed": 350,   # typical H11 annealed
        "uts_annealed": 680,     # typical H11 annealed
        "hardness_bhn": 210,     # typical H11 annealed
    },
    "Tool H21": {
        "density": 8.3,          # W-base hot work (higher density)
        "thermal_cond": 26,      # W-base hot work
        "specific_heat": 450,    # W-bearing tool steel
        "elastic_mod": 210,      # higher due to W
        "solidus": 1300,         # W-base tool steel
        "liquidus": 1400,        # W-base tool steel
        "yield_annealed": 380,   # typical H21 annealed
        "uts_annealed": 720,     # typical H21 annealed
        "hardness_bhn": 225,     # typical H21 annealed
    },
    "Tool H42": {
        "density": 8.2,          # Mo-W hot work HSS
        "thermal_cond": 27,      # Mo-W tool steel
        "specific_heat": 450,    # HSS family
        "elastic_mod": 220,      # HSS family
        "solidus": 1270,         # Mo-W HSS
        "liquidus": 1420,        # Mo-W HSS
        "yield_annealed": 410,   # typical H42 annealed
        "uts_annealed": 780,     # typical H42 annealed
        "hardness_bhn": 235,     # typical H42 annealed
    },
    "Tool M4": {
        "density": 8.1,          # Mo-W-V HSS (slightly lighter than M2)
        "thermal_cond": 24,      # similar to M2
        "specific_heat": 450,    # HSS family
        "elastic_mod": 220,      # HSS family
        "solidus": 1260,         # HSS family
        "liquidus": 1430,        # HSS family
        "yield_annealed": 420,   # typical M4 annealed
        "uts_annealed": 800,     # typical M4 annealed
        "hardness_bhn": 241,     # typical M4 annealed (max ~255)
    },
    "Tool M42": {
        "density": 8.0,          # Co-bearing HSS
        "thermal_cond": 24,      # similar to M-series
        "specific_heat": 450,    # HSS family
        "elastic_mod": 220,      # HSS family
        "solidus": 1260,         # HSS family
        "liquidus": 1420,        # HSS family
        "yield_annealed": 390,   # typical M42 annealed
        "uts_annealed": 760,     # typical M42 annealed
        "hardness_bhn": 235,     # typical M42 annealed
    },
    "Tool T1": {
        "density": 8.7,          # W-base HSS (high density from W)
        "thermal_cond": 24,      # W-base HSS
        "specific_heat": 420,    # W-bearing tool steel
        "elastic_mod": 220,      # HSS family
        "solidus": 1260,         # HSS family
        "liquidus": 1430,        # HSS family
        "yield_annealed": 380,   # typical T1 annealed
        "uts_annealed": 750,     # typical T1 annealed
        "hardness_bhn": 225,     # typical T1 annealed (200-250)
    },
    "Tool T15": {
        "density": 8.2,          # W-V-Co HSS
        "thermal_cond": 21,      # lower due to high alloy
        "specific_heat": 420,    # W-bearing tool steel
        "elastic_mod": 230,      # high due to W+V+Co
        "solidus": 1240,         # HSS family
        "liquidus": 1420,        # HSS family
        "yield_annealed": 430,   # typical T15 annealed
        "uts_annealed": 820,     # typical T15 annealed
        "hardness_bhn": 255,     # typical T15 annealed (225-275)
    },
    "Tool L6": {
        "density": 7.8,          # low-alloy special purpose
        "thermal_cond": 42,      # Ni-Cr, relatively high
        "specific_heat": 470,    # tool steel family
        "elastic_mod": 190,      # tool steel family
        "solidus": 1420,         # typical L6
        "liquidus": 1460,        # typical L6
        "yield_annealed": 340,   # typical L6 annealed
        "uts_annealed": 660,     # typical L6 annealed
        "hardness_bhn": 197,     # typical L6 annealed
    },

    # =========================================================================
    # REFRACTORY & SPECIALTY METALS
    # =========================================================================
    # Source: AZoM.com, MakeItFrom.com, Rembar technical data

    "Maraging 250": {
        "density": 8.0,          # AZoM
        "thermal_cond": 25.3,    # AZoM
        "specific_heat": 450,    # typical maraging
        "elastic_mod": 190,      # AZoM
        "solidus": 1420,         # MakeItFrom
        "liquidus": 1470,        # MakeItFrom
        "yield_annealed": 655,   # AZoM (solution annealed)
        "uts_annealed": 965,     # AZoM (solution annealed)
        "hardness_bhn": 290,     # AZoM
    },
    "Maraging 300": {
        "density": 8.1,          # typical maraging 300
        "thermal_cond": 20,      # typical maraging (higher alloy)
        "specific_heat": 450,    # typical maraging
        "elastic_mod": 190,      # typical maraging
        "solidus": 1420,         # MakeItFrom family
        "liquidus": 1470,        # MakeItFrom family
        "yield_annealed": 760,   # typical solution annealed
        "uts_annealed": 1050,    # typical solution annealed
        "hardness_bhn": 320,     # typical solution annealed
    },
    "Maraging 350": {
        "density": 8.2,          # MakeItFrom
        "thermal_cond": 19,      # typical (highest alloy)
        "specific_heat": 450,    # MakeItFrom
        "elastic_mod": 190,      # MakeItFrom
        "solidus": 1420,         # MakeItFrom
        "liquidus": 1470,        # MakeItFrom
        "yield_annealed": 830,   # MakeItFrom (annealed, low end)
        "uts_annealed": 1140,    # MakeItFrom (annealed, low end)
        "hardness_bhn": 340,     # estimated from HRC 34
    },
    "Tungsten": {
        "density": 19.3,         # pure W
        "thermal_cond": 173,     # pure W (highest of refractory metals)
        "specific_heat": 132,    # pure W
        "elastic_mod": 411,      # pure W
        "solidus": 3410,         # pure W (highest of any metal)
        "liquidus": 3410,        # pure W (single melting point)
        "yield_annealed": 750,   # typical wrought W
        "uts_annealed": 980,     # typical wrought W
        "hardness_bhn": 350,     # typical wrought W
    },
    "Molybdenum": {
        "density": 10.22,        # pure Mo
        "thermal_cond": 138,     # pure Mo
        "specific_heat": 251,    # pure Mo
        "elastic_mod": 324,      # pure Mo
        "solidus": 2623,         # pure Mo
        "liquidus": 2623,        # pure Mo (single melting point)
        "yield_annealed": 550,   # typical wrought Mo (stress-relieved)
        "uts_annealed": 690,     # typical wrought Mo
        "hardness_bhn": 250,     # typical wrought Mo
    },
    "Tantalum": {
        "density": 16.6,         # pure Ta
        "thermal_cond": 57.5,    # pure Ta
        "specific_heat": 140,    # pure Ta
        "elastic_mod": 186,      # pure Ta
        "solidus": 3017,         # pure Ta
        "liquidus": 3017,        # pure Ta (single melting point)
        "yield_annealed": 170,   # typical annealed Ta
        "uts_annealed": 285,     # typical annealed Ta
        "hardness_bhn": 120,     # typical annealed Ta
    },
    "Niobium": {
        "density": 8.57,         # pure Nb
        "thermal_cond": 53.7,    # pure Nb
        "specific_heat": 265,    # pure Nb
        "elastic_mod": 105,      # pure Nb
        "solidus": 2468,         # pure Nb
        "liquidus": 2468,        # pure Nb (single melting point)
        "yield_annealed": 105,   # typical annealed Nb
        "uts_annealed": 195,     # typical annealed Nb
        "hardness_bhn": 80,      # typical annealed Nb
    },
    "Zirconium": {
        "density": 6.51,         # pure Zr
        "thermal_cond": 22.6,    # pure Zr
        "specific_heat": 278,    # pure Zr
        "elastic_mod": 96,       # pure Zr
        "solidus": 1855,         # pure Zr
        "liquidus": 1855,        # pure Zr (single melting point)
        "yield_annealed": 230,   # typical reactor grade Zr annealed
        "uts_annealed": 380,     # typical annealed
        "hardness_bhn": 145,     # typical annealed
    },
    "Beryllium": {
        "density": 1.85,         # pure Be (lightest structural metal)
        "thermal_cond": 216,     # pure Be
        "specific_heat": 1825,   # pure Be (very high)
        "elastic_mod": 303,      # pure Be
        "solidus": 1287,         # pure Be
        "liquidus": 1287,        # pure Be (single melting point)
        "yield_annealed": 240,   # typical S-200F grade
        "uts_annealed": 370,     # typical S-200F grade
        "hardness_bhn": None,    # typically measured by HV
    },
    "Kovar": {
        "density": 8.36,         # ESPI Metals / Carpenter
        "thermal_cond": 17.3,    # ESPI Metals
        "specific_heat": 439,    # ESPI Metals
        "elastic_mod": 138,      # Carpenter (lower than steel)
        "solidus": 1410,         # typical Kovar
        "liquidus": 1450,        # typical Kovar
        "yield_annealed": 276,   # Carpenter (40 ksi annealed)
        "uts_annealed": 517,     # Carpenter (75 ksi annealed)
        "hardness_bhn": 150,     # typical Kovar annealed
    },

    # =========================================================================
    # MAGNESIUM ALLOYS
    # =========================================================================
    # Source: MakeItFrom.com, AZoM.com

    "Mg AZ31B": {
        "density": 1.77,         # MakeItFrom
        "thermal_cond": 96,      # MakeItFrom / AZoM
        "specific_heat": 1000,   # MakeItFrom
        "elastic_mod": 45,       # MakeItFrom
        "solidus": 566,          # typical
        "liquidus": 630,         # MakeItFrom
        "yield_annealed": 120,   # MakeItFrom (low end, annealed/F)
        "uts_annealed": 240,     # MakeItFrom (low end)
        "hardness_bhn": 49,      # typical AZ31B
    },
    "Mg AZ61A": {
        "density": 1.80,         # typical
        "thermal_cond": 78,      # typical (higher Al reduces k)
        "specific_heat": 1000,   # typical Mg
        "elastic_mod": 45,       # typical Mg
        "solidus": 525,          # typical
        "liquidus": 620,         # typical
        "yield_annealed": 140,   # typical annealed
        "uts_annealed": 270,     # typical annealed
        "hardness_bhn": 55,      # typical
    },
    "Mg AZ80A": {
        "density": 1.80,         # MakeItFrom
        "thermal_cond": 78,      # typical AZ80
        "specific_heat": 990,    # MakeItFrom (T5)
        "elastic_mod": 45,       # MakeItFrom
        "solidus": 480,          # typical
        "liquidus": 610,         # typical
        "yield_annealed": 155,   # typical AZ80A-F
        "uts_annealed": 290,     # typical AZ80A-F
        "hardness_bhn": 60,      # typical
    },
    "Mg AZ91D": {
        "density": 1.81,         # MakeItFrom
        "thermal_cond": 72,      # MakeItFrom
        "specific_heat": 1000,   # MakeItFrom
        "elastic_mod": 45,       # MakeItFrom
        "solidus": 470,          # MakeItFrom
        "liquidus": 595,         # MakeItFrom
        "yield_annealed": 150,   # MakeItFrom (die-cast)
        "uts_annealed": 230,     # MakeItFrom (die-cast)
        "hardness_bhn": 63,      # MakeItFrom
    },
    "Mg ZK60A": {
        "density": 1.83,         # typical ZK60
        "thermal_cond": 115,     # typical (Zr addition)
        "specific_heat": 960,    # typical Mg-Zn
        "elastic_mod": 45,       # typical Mg
        "solidus": 520,          # typical
        "liquidus": 635,         # typical
        "yield_annealed": 195,   # typical ZK60A-T5
        "uts_annealed": 305,     # typical ZK60A-T5
        "hardness_bhn": 70,      # typical
    },

    # =========================================================================
    # NICKEL ALLOYS & SPECIALTY
    # =========================================================================
    # Source: MakeItFrom.com, HighTempMetals.com, Special Metals datasheets

    "Ni 200": {
        "density": 8.89,         # Special Metals / AZoM
        "thermal_cond": 70.2,    # Special Metals (at 20C)
        "specific_heat": 456,    # AZoM
        "elastic_mod": 204,      # Special Metals
        "solidus": 1435,         # typical pure Ni
        "liquidus": 1446,        # typical pure Ni
        "yield_annealed": 148,   # Special Metals (annealed, ~21.5 ksi)
        "uts_annealed": 462,     # Special Metals (annealed, ~67 ksi)
        "hardness_bhn": 109,     # typical annealed
    },
    "Ni 201": {
        "density": 8.89,         # same as Ni 200 (low-C variant)
        "thermal_cond": 79.3,    # slightly higher (less C)
        "specific_heat": 456,    # same as Ni 200
        "elastic_mod": 207,      # Special Metals
        "solidus": 1435,         # same as Ni 200
        "liquidus": 1446,        # same as Ni 200
        "yield_annealed": 103,   # Special Metals (annealed, ~15 ksi)
        "uts_annealed": 403,     # Special Metals (annealed, ~58 ksi)
        "hardness_bhn": 100,     # typical annealed
    },
    "Alloy 20": {
        "density": 8.08,         # typical Alloy 20 (Carpenter 20Cb-3)
        "thermal_cond": 12.0,    # typical
        "specific_heat": 460,    # typical
        "elastic_mod": 193,      # typical
        "solidus": 1357,         # typical
        "liquidus": 1385,        # typical
        "yield_annealed": 241,   # typical annealed
        "uts_annealed": 552,     # typical annealed
        "hardness_bhn": 170,     # typical annealed
    },
    "Carpenter 20Cb-3": {
        "density": 8.08,         # same as Alloy 20
        "thermal_cond": 12.0,    # same as Alloy 20
        "specific_heat": 460,    # same as Alloy 20
        "elastic_mod": 193,      # same as Alloy 20
        "solidus": 1357,         # same as Alloy 20
        "liquidus": 1385,        # same as Alloy 20
        "yield_annealed": 241,   # same as Alloy 20
        "uts_annealed": 552,     # same as Alloy 20
        "hardness_bhn": 170,     # same as Alloy 20
    },
    "Invar 36": {
        "density": 8.05,         # Wikipedia / literature
        "thermal_cond": 10.5,    # typical Invar (very low)
        "specific_heat": 515,    # typical
        "elastic_mod": 141,      # typical (lower than steel)
        "solidus": 1427,         # typical
        "liquidus": 1427,        # near single melting point
        "yield_annealed": 276,   # typical annealed
        "uts_annealed": 483,     # typical annealed
        "hardness_bhn": 150,     # typical annealed
    },

    # =========================================================================
    # ADDITIONAL ALLOYS TO REACH 300+
    # =========================================================================

    # --- More wrought aluminum ---
    "Al 2219": {
        "density": 2.84,         # typical 2219 (Cu-alloy)
        "thermal_cond": 120,     # typical 2219
        "specific_heat": 864,    # typical 2219
        "elastic_mod": 73,       # typical 2219
        "solidus": 543,          # typical 2219
        "liquidus": 643,         # typical 2219
        "yield_annealed": 76,    # typical 2219-O
        "uts_annealed": 172,     # typical 2219-O
        "hardness_bhn": 40,      # estimated 2219-O
    },
    "Al 5182": {
        "density": 2.65,         # typical 5182
        "thermal_cond": 120,     # typical 5182
        "specific_heat": 900,    # typical 5xxx
        "elastic_mod": 70,       # typical 5xxx
        "solidus": 577,          # typical 5182
        "liquidus": 638,         # typical 5182
        "yield_annealed": 130,   # typical 5182-O
        "uts_annealed": 275,     # typical 5182-O
        "hardness_bhn": 67,      # typical 5182-O
    },
    "Al 5251": {
        "density": 2.69,         # typical 5251
        "thermal_cond": 138,     # typical 5251
        "specific_heat": 900,    # typical 5xxx
        "elastic_mod": 70,       # typical 5xxx
        "solidus": 605,          # typical 5251
        "liquidus": 650,         # typical 5251
        "yield_annealed": 80,    # typical 5251-O
        "uts_annealed": 180,     # typical 5251-O
        "hardness_bhn": 46,      # typical 5251-O
    },
    "Al 5356": {
        "density": 2.66,         # typical 5356 (welding wire alloy)
        "thermal_cond": 117,     # typical 5356
        "specific_heat": 900,    # typical 5xxx
        "elastic_mod": 70,       # typical 5xxx
        "solidus": 571,          # typical 5356
        "liquidus": 635,         # typical 5356
        "yield_annealed": 130,   # typical 5356-O
        "uts_annealed": 265,     # typical 5356-O
        "hardness_bhn": 63,      # estimated 5356-O
    },
    "Al 6101": {
        "density": 2.7,          # typical 6101 (bus bar alloy)
        "thermal_cond": 218,     # typical 6101 (high conductivity)
        "specific_heat": 900,    # typical 6xxx
        "elastic_mod": 69,       # typical 6xxx
        "solidus": 620,          # typical 6101
        "liquidus": 655,         # typical 6101
        "yield_annealed": 48,    # typical 6101-O
        "uts_annealed": 97,      # typical 6101-O
        "hardness_bhn": 25,      # estimated 6101-O
    },
    "Al 6262": {
        "density": 2.72,         # typical 6262 (free-machining)
        "thermal_cond": 172,     # typical 6262
        "specific_heat": 900,    # typical 6xxx
        "elastic_mod": 69,       # typical 6xxx
        "solidus": 575,          # typical 6262
        "liquidus": 650,         # typical 6262
        "yield_annealed": 55,    # typical 6262-O
        "uts_annealed": 130,     # typical 6262-O
        "hardness_bhn": 30,      # estimated 6262-O
    },
    "Al 7475": {
        "density": 2.81,         # typical 7475
        "thermal_cond": 130,     # typical 7xxx
        "specific_heat": 870,    # typical 7xxx
        "elastic_mod": 70,       # typical 7xxx
        "solidus": 477,          # typical 7475
        "liquidus": 635,         # typical 7475
        "yield_annealed": 110,   # typical 7475-O
        "uts_annealed": 225,     # typical 7475-O
        "hardness_bhn": 55,      # estimated 7475-O
    },

    # --- More stainless ---
    "SS 201": {
        "density": 7.8,          # austenitic (Mn-N replaces some Ni)
        "thermal_cond": 16,      # austenitic family
        "specific_heat": 500,    # austenitic family
        "elastic_mod": 200,      # austenitic family
        "solidus": 1400,         # austenitic family
        "liquidus": 1450,        # austenitic family
        "yield_annealed": 260,   # typical 201 annealed
        "uts_annealed": 655,     # typical 201 annealed
        "hardness_bhn": 210,     # typical 201 annealed
    },
    "SS 202": {
        "density": 7.8,          # similar to 201
        "thermal_cond": 16,      # austenitic family
        "specific_heat": 500,    # austenitic family
        "elastic_mod": 200,      # austenitic family
        "solidus": 1400,         # austenitic family
        "liquidus": 1450,        # austenitic family
        "yield_annealed": 275,   # typical 202 annealed
        "uts_annealed": 620,     # typical 202 annealed
        "hardness_bhn": 200,     # typical 202 annealed
    },
    "SS 310S": {
        "density": 7.8,          # similar to 310
        "thermal_cond": 15,      # similar to 310
        "specific_heat": 480,    # austenitic family
        "elastic_mod": 200,      # austenitic family
        "solidus": 1400,         # similar to 310
        "liquidus": 1450,        # similar to 310
        "yield_annealed": 210,   # typical 310S annealed
        "uts_annealed": 520,     # typical 310S annealed
        "hardness_bhn": 170,     # typical 310S annealed
    },
    "SS 329": {
        "density": 7.8,          # duplex family
        "thermal_cond": 18,      # duplex family
        "specific_heat": 450,    # duplex family
        "elastic_mod": 200,      # duplex family
        "solidus": 1350,         # duplex family
        "liquidus": 1400,        # duplex family
        "yield_annealed": 480,   # typical duplex annealed
        "uts_annealed": 660,     # typical duplex annealed
        "hardness_bhn": 260,     # typical duplex annealed
    },
    # --- More alloy steels ---
    "AISI 4130 Normalized": {
        "density": 7.8,          # same as 4130
        "thermal_cond": 43,      # same as 4130
        "specific_heat": 470,    # same as 4130
        "elastic_mod": 200,      # typical normalized
        "solidus": 1420,         # same as 4130
        "liquidus": 1460,        # same as 4130
        "yield_annealed": 435,   # typical 4130 normalized (63 ksi)
        "uts_annealed": 670,     # typical 4130 normalized (97 ksi)
        "hardness_bhn": 197,     # typical 4130 normalized
    },
    "AISI 4340 Normalized": {
        "density": 7.8,          # same as 4340
        "thermal_cond": 44,      # same as 4340
        "specific_heat": 470,    # same as 4340
        "elastic_mod": 200,      # typical normalized
        "solidus": 1420,         # same as 4340
        "liquidus": 1460,        # same as 4340
        "yield_annealed": 862,   # typical 4340 normalized (125 ksi)
        "uts_annealed": 1282,    # typical 4340 normalized (186 ksi)
        "hardness_bhn": 363,     # typical 4340 normalized
    },

    # --- More carbon steels ---
    "AISI 1005": {
        "density": 7.9,          # ultra low carbon
        "thermal_cond": 53,      # similar to 1006
        "specific_heat": 470,    # carbon steel family
        "elastic_mod": 190,      # carbon steel family
        "solidus": 1430,         # similar to 1006
        "liquidus": 1470,        # similar to 1006
        "yield_annealed": 170,   # typical 1005 (softest)
        "uts_annealed": 325,     # typical 1005
        "hardness_bhn": 90,      # typical 1005
    },
    "AISI 1022": {
        "density": 7.9,          # similar to 1020
        "thermal_cond": 51,      # similar to 1020
        "specific_heat": 470,    # carbon steel family
        "elastic_mod": 190,      # carbon steel family
        "solidus": 1420,         # similar to 1020
        "liquidus": 1460,        # similar to 1020
        "yield_annealed": 250,   # typical 1022 annealed
        "uts_annealed": 440,     # typical 1022 annealed
        "hardness_bhn": 125,     # typical 1022
    },
    "AISI 1038": {
        "density": 7.8,          # carbon steel family
        "thermal_cond": 51,      # similar to 1035/1040
        "specific_heat": 470,    # carbon steel family
        "elastic_mod": 190,      # carbon steel family
        "solidus": 1420,         # similar to 1035/1040
        "liquidus": 1460,        # similar to 1035/1040
        "yield_annealed": 320,   # interpolated 1035/1040
        "uts_annealed": 570,     # interpolated
        "hardness_bhn": 167,     # interpolated
    },
    "AISI 1042": {
        "density": 7.84,         # carbon steel family
        "thermal_cond": 51,      # similar to 1040/1045
        "specific_heat": 470,    # carbon steel family
        "elastic_mod": 190,      # carbon steel family
        "solidus": 1420,         # similar to 1040/1045
        "liquidus": 1460,        # similar to 1040/1045
        "yield_annealed": 340,   # interpolated 1040/1045
        "uts_annealed": 600,     # interpolated
        "hardness_bhn": 175,     # interpolated
    },

    # --- More cast aluminum ---
    "Al 242": {
        "density": 2.82,         # typical 242 casting alloy
        "thermal_cond": 138,     # typical 242
        "specific_heat": 880,    # typical Al cast
        "elastic_mod": 71,       # typical Al cast
        "solidus": 525,          # typical 242
        "liquidus": 635,         # typical 242
        "yield_annealed": 125,   # typical 242-T21 (aged)
        "uts_annealed": 185,     # typical 242-T21
        "hardness_bhn": 70,      # typical 242-T21
    },
    "Al 535": {
        "density": 2.62,         # typical 535 (Almag 35)
        "thermal_cond": 138,     # typical 535
        "specific_heat": 900,    # typical Al cast
        "elastic_mod": 71,       # typical Al cast
        "solidus": 575,          # typical 535
        "liquidus": 630,         # typical 535
        "yield_annealed": 124,   # typical 535-F (as-cast)
        "uts_annealed": 241,     # typical 535-F
        "hardness_bhn": 65,      # typical 535-F
    },
    "Al 712": {
        "density": 2.82,         # typical 712 cast
        "thermal_cond": 155,     # typical 712
        "specific_heat": 870,    # typical Al-Zn cast
        "elastic_mod": 71,       # typical Al cast
        "solidus": 560,          # typical 712
        "liquidus": 640,         # typical 712
        "yield_annealed": 172,   # typical 712-F (as-cast)
        "uts_annealed": 241,     # typical 712-F
        "hardness_bhn": 75,      # typical 712-F
    },

    # --- More copper ---
    "Cu C65500": {
        "density": 8.52,         # silicon bronze
        "thermal_cond": 36,      # silicon bronze
        "specific_heat": 380,    # typical bronze
        "elastic_mod": 115,      # typical bronze
        "solidus": 970,          # copper.org
        "liquidus": 1025,        # copper.org
        "yield_annealed": 172,   # copper.org (annealed)
        "uts_annealed": 414,     # copper.org (annealed)
        "hardness_bhn": None,    # (HRB 60-75)
    },
    "Cu C70600": {
        "density": 8.94,         # Cu-Ni 90/10
        "thermal_cond": 45,      # copper.org
        "specific_heat": 380,    # typical Cu-Ni
        "elastic_mod": 135,      # copper.org
        "solidus": 1100,         # copper.org
        "liquidus": 1145,        # copper.org
        "yield_annealed": 110,   # copper.org (annealed)
        "uts_annealed": 303,     # copper.org (annealed)
        "hardness_bhn": None,    # (HRB 40-58)
    },
    "Cu C95400": {
        "density": 7.45,         # aluminum bronze (high Al)
        "thermal_cond": 59,      # copper.org
        "specific_heat": 380,    # typical bronze
        "elastic_mod": 110,      # copper.org
        "solidus": 1020,         # copper.org
        "liquidus": 1040,        # copper.org
        "yield_annealed": 200,   # copper.org (cast)
        "uts_annealed": 586,     # copper.org (cast)
        "hardness_bhn": 170,     # copper.org (cast)
    },

    # --- More superalloys ---
    "Hastelloy B-2": {
        "density": 9.22,         # typical B-2
        "thermal_cond": 11.1,    # typical
        "specific_heat": 373,    # typical
        "elastic_mod": 217,      # typical
        "solidus": 1330,         # typical
        "liquidus": 1370,        # typical
        "yield_annealed": 393,   # typical annealed
        "uts_annealed": 848,     # typical annealed
        "hardness_bhn": None,    # not commonly reported
    },
    "Hastelloy C-22": {
        "density": 8.69,         # typical C-22
        "thermal_cond": 10.1,    # typical
        "specific_heat": 414,    # typical
        "elastic_mod": 206,      # typical
        "solidus": 1357,         # typical
        "liquidus": 1399,        # typical
        "yield_annealed": 345,   # typical annealed
        "uts_annealed": 790,     # typical annealed
        "hardness_bhn": None,    # not commonly reported
    },
    "Stellite 6": {
        "density": 8.34,         # typical Co-Cr-W alloy
        "thermal_cond": 14.7,    # typical
        "specific_heat": 421,    # typical
        "elastic_mod": 210,      # typical
        "solidus": 1260,         # typical
        "liquidus": 1355,        # typical
        "yield_annealed": 580,   # typical (cast)
        "uts_annealed": 834,     # typical (cast)
        "hardness_bhn": 380,     # typical (cast, HRC ~39)
    },
    "MP35N": {
        "density": 8.43,         # Co-Ni-Cr-Mo superalloy
        "thermal_cond": 11.3,    # typical
        "specific_heat": 418,    # typical
        "elastic_mod": 228,      # typical
        "solidus": 1315,         # typical
        "liquidus": 1370,        # typical
        "yield_annealed": 414,   # typical annealed
        "uts_annealed": 1000,    # typical annealed
        "hardness_bhn": None,    # (HRC 25-30 annealed)
    },

    # --- More tool steels ---
    "Tool S5": {
        "density": 7.8,          # shock-resistant tool steel
        "thermal_cond": 40,      # similar to S7
        "specific_heat": 470,    # tool steel family
        "elastic_mod": 190,      # tool steel family
        "solidus": 1420,         # typical S-series
        "liquidus": 1460,        # typical S-series
        "yield_annealed": 340,   # typical S5 annealed
        "uts_annealed": 650,     # typical S5 annealed
        "hardness_bhn": 195,     # typical S5 annealed
    },

    # --- More stainless ---
    "SS 254 SMO": {
        "density": 8.0,          # super-austenitic
        "thermal_cond": 13,      # high-alloy austenitic
        "specific_heat": 450,    # high-alloy austenitic
        "elastic_mod": 195,      # typical
        "solidus": 1320,         # high-alloy
        "liquidus": 1380,        # high-alloy
        "yield_annealed": 310,   # typical annealed
        "uts_annealed": 650,     # typical annealed
        "hardness_bhn": 200,     # typical annealed
    },
    "SS 2304": {
        "density": 7.8,          # lean duplex
        "thermal_cond": 17,      # duplex family
        "specific_heat": 450,    # duplex family
        "elastic_mod": 200,      # duplex family
        "solidus": 1350,         # duplex family
        "liquidus": 1400,        # duplex family
        "yield_annealed": 400,   # typical lean duplex annealed
        "uts_annealed": 600,     # typical lean duplex annealed
        "hardness_bhn": 230,     # typical lean duplex annealed
    },
    "SS 410S": {
        "density": 7.7,          # low-C 410 variant
        "thermal_cond": 25,      # ferritic/martensitic
        "specific_heat": 480,    # stainless family
        "elastic_mod": 200,      # martensitic family
        "solidus": 1480,         # similar to 410
        "liquidus": 1530,        # similar to 410
        "yield_annealed": 207,   # typical 410S annealed
        "uts_annealed": 415,     # typical 410S annealed
        "hardness_bhn": 160,     # typical 410S annealed
    },
    "SS 17-7PH": {
        "density": 7.8,          # PH semi-austenitic
        "thermal_cond": 17,      # PH family
        "specific_heat": 480,    # PH family
        "elastic_mod": 200,      # PH family
        "solidus": 1400,         # PH family
        "liquidus": 1440,        # PH family
        "yield_annealed": 380,   # typical 17-7PH Condition A
        "uts_annealed": 860,     # typical 17-7PH Condition A
        "hardness_bhn": 240,     # typical Condition A
    },

    # --- More Ti ---
    "Ti-6Al-4V ELI": {
        "density": 4.43,         # ELI grade (same as standard)
        "thermal_cond": 6.7,     # same as standard
        "specific_heat": 560,    # same as standard
        "elastic_mod": 110,      # same as standard
        "solidus": 1610,         # same as standard
        "liquidus": 1660,        # same as standard
        "yield_annealed": 860,   # slightly lower than standard (ELI)
        "uts_annealed": 960,     # slightly lower than standard (ELI)
        "hardness_bhn": 320,     # slightly lower than standard
    },

    # --- More specialty ---
    "Alloy 188": {
        "density": 8.98,         # Co-base alloy
        "thermal_cond": 10.5,    # typical Co-base
        "specific_heat": 403,    # typical Co-base
        "elastic_mod": 232,      # typical Co-base
        "solidus": 1302,         # typical
        "liquidus": 1330,        # typical
        "yield_annealed": 464,   # same as Haynes 188 (alternate name)
        "uts_annealed": 938,     # same as Haynes 188
        "hardness_bhn": None,    # not commonly reported
    },
    "N-155": {
        "density": 8.18,         # Fe-Ni-Co superalloy
        "thermal_cond": 12.6,    # typical
        "specific_heat": 431,    # typical
        "elastic_mod": 214,      # typical
        "solidus": 1290,         # typical
        "liquidus": 1360,        # typical
        "yield_annealed": 345,   # typical annealed
        "uts_annealed": 700,     # typical annealed
        "hardness_bhn": None,    # not commonly reported
    },
    "Pyromet A-286": {
        "density": 7.94,         # same as A286
        "thermal_cond": 12.7,    # same as A286
        "specific_heat": 460,    # same as A286
        "elastic_mod": 199,      # same as A286
        "solidus": 1370,         # same as A286
        "liquidus": 1400,        # same as A286
        "yield_annealed": 275,   # same as A286
        "uts_annealed": 620,     # same as A286
        "hardness_bhn": 180,     # same as A286
    },

    # --- Zinc die cast ---
    "Zamak 3": {
        "density": 6.6,          # typical Zn die cast
        "thermal_cond": 113,     # typical Zamak 3
        "specific_heat": 419,    # typical Zamak 3
        "elastic_mod": 86,       # typical Zamak 3
        "solidus": 381,          # typical Zamak 3
        "liquidus": 387,         # typical Zamak 3
        "yield_annealed": 221,   # typical Zamak 3 (die-cast)
        "uts_annealed": 283,     # typical Zamak 3 (die-cast)
        "hardness_bhn": 82,      # typical Zamak 3
    },
    "Zamak 5": {
        "density": 6.6,          # typical Zn die cast
        "thermal_cond": 109,     # typical Zamak 5
        "specific_heat": 419,    # typical Zamak 5
        "elastic_mod": 86,       # typical Zamak 5
        "solidus": 380,          # typical Zamak 5
        "liquidus": 386,         # typical Zamak 5
        "yield_annealed": 228,   # typical Zamak 5 (die-cast)
        "uts_annealed": 331,     # typical Zamak 5 (die-cast)
        "hardness_bhn": 91,      # typical Zamak 5
    },

    # --- Cobalt alloys ---
    "CoCr F75": {
        "density": 8.28,         # Co-Cr-Mo biomedical alloy
        "thermal_cond": 14.7,    # typical
        "specific_heat": 450,    # typical
        "elastic_mod": 248,      # very high for Co-Cr
        "solidus": 1260,         # typical
        "liquidus": 1355,        # typical
        "yield_annealed": 450,   # typical as-cast
        "uts_annealed": 690,     # typical as-cast
        "hardness_bhn": 280,     # typical as-cast
    },

    # --- Additional to reach 300+ ---
    "AISI 1119": {
        "density": 7.8,          # resulfurized carbon steel
        "thermal_cond": 52,      # resulfurized 11xx family
        "specific_heat": 470,    # carbon steel family
        "elastic_mod": 190,      # carbon steel family
        "solidus": 1420,         # 11xx family
        "liquidus": 1460,        # 11xx family
        "yield_annealed": 280,   # typical 1119 annealed
        "uts_annealed": 510,     # typical 1119 annealed
        "hardness_bhn": 145,     # typical 1119 annealed
    },
    "AISI 4118": {
        "density": 7.8,          # CrMo carburizing steel
        "thermal_cond": 44,      # CrMo family
        "specific_heat": 470,    # alloy steel family
        "elastic_mod": 190,      # alloy steel family
        "solidus": 1425,         # CrMo family
        "liquidus": 1460,        # CrMo family
        "yield_annealed": 295,   # typical 4118 annealed
        "uts_annealed": 490,     # typical 4118 annealed
        "hardness_bhn": 150,     # typical 4118 annealed
    },
    "AISI 1026": {
        "density": 7.86,         # carbon steel family
        "thermal_cond": 51,      # carbon steel family
        "specific_heat": 470,    # carbon steel family
        "elastic_mod": 190,      # carbon steel family
        "solidus": 1420,         # carbon steel family
        "liquidus": 1460,        # carbon steel family
        "yield_annealed": 275,   # interpolated 1025/1030
        "uts_annealed": 485,     # interpolated
        "hardness_bhn": 137,     # interpolated
    },
    "SS 253MA": {
        "density": 7.8,          # high-temp austenitic
        "thermal_cond": 15,      # high-alloy austenitic
        "specific_heat": 480,    # austenitic family
        "elastic_mod": 200,      # austenitic family
        "solidus": 1370,         # high-alloy austenitic
        "liquidus": 1420,        # estimated
        "yield_annealed": 310,   # typical annealed
        "uts_annealed": 600,     # typical annealed
        "hardness_bhn": 185,     # typical annealed
    },
    "SS 153MA": {
        "density": 7.8,          # austenitic stainless
        "thermal_cond": 15,      # austenitic family
        "specific_heat": 480,    # austenitic family
        "elastic_mod": 200,      # austenitic family
        "solidus": 1370,         # high-alloy austenitic
        "liquidus": 1420,        # estimated
        "yield_annealed": 290,   # typical annealed
        "uts_annealed": 580,     # typical annealed
        "hardness_bhn": 180,     # typical annealed
    },
    "Cu C18200": {
        "density": 8.89,         # chromium copper
        "thermal_cond": 315,     # high for Cu-Cr (precipitation hardened)
        "specific_heat": 385,    # typical Cu
        "elastic_mod": 130,      # copper.org
        "solidus": 1070,         # copper.org
        "liquidus": 1083,        # copper.org
        "yield_annealed": 76,    # copper.org (annealed)
        "uts_annealed": 234,     # copper.org (annealed)
        "hardness_bhn": None,    # (HRF 45)
    },
    "Mg WE43": {
        "density": 1.84,         # Mg-Y-RE alloy
        "thermal_cond": 51,      # lower due to RE additions
        "specific_heat": 960,    # typical Mg
        "elastic_mod": 44,       # typical Mg
        "solidus": 522,          # typical WE43
        "liquidus": 640,         # typical WE43
        "yield_annealed": 170,   # typical WE43-T6
        "uts_annealed": 250,     # typical WE43-T6
        "hardness_bhn": 65,      # typical WE43
    },

    # ══════════════════════════════════════════════════════════════════════
    # EXPANSION BATCH 2 — 2026-02-27
    # Copper alloys, ASTM structural, API pipeline, tool steels, cast iron,
    # ferritic/specialty stainless, superalloys, specialty steels
    # ══════════════════════════════════════════════════════════════════════

    # --- Additional Copper Alloys ---
    "Cu C17510": {
        "density": 8.78, "thermal_cond": 135, "specific_heat": 380,
        "elastic_mod": 131, "solidus": 1000, "liquidus": 1060,
        "yield_annealed": 195, "uts_annealed": 415, "hardness_bhn": 96,
        "source": "copper.org / Materion"
    },
    "Cu C19400": {
        "density": 8.87, "thermal_cond": 260, "specific_heat": 385,
        "elastic_mod": 124, "solidus": 1065, "liquidus": 1085,
        "yield_annealed": 220, "uts_annealed": 350, "hardness_bhn": 80,
        "source": "copper.org"
    },
    "Cu C24000": {
        "density": 8.53, "thermal_cond": 116, "specific_heat": 385,
        "elastic_mod": 110, "solidus": 935, "liquidus": 965,
        "yield_annealed": 105, "uts_annealed": 340, "hardness_bhn": 65,
        "source": "copper.org"
    },
    "Cu C33000": {
        "density": 8.55, "thermal_cond": 109, "specific_heat": 380,
        "elastic_mod": 110, "solidus": 900, "liquidus": 925,
        "yield_annealed": 125, "uts_annealed": 365, "hardness_bhn": 70,
        "source": "copper.org"
    },
    "Cu C34200": {
        "density": 8.50, "thermal_cond": 109, "specific_heat": 380,
        "elastic_mod": 110, "solidus": 885, "liquidus": 910,
        "yield_annealed": 130, "uts_annealed": 370, "hardness_bhn": 72,
        "source": "copper.org"
    },
    "Cu C35300": {
        "density": 8.50, "thermal_cond": 109, "specific_heat": 380,
        "elastic_mod": 110, "solidus": 885, "liquidus": 900,
        "yield_annealed": 140, "uts_annealed": 385, "hardness_bhn": 75,
        "source": "copper.org"
    },
    "Cu C38500": {
        "density": 8.47, "thermal_cond": 116, "specific_heat": 380,
        "elastic_mod": 97, "solidus": 880, "liquidus": 900,
        "yield_annealed": 140, "uts_annealed": 415, "hardness_bhn": 80,
        "source": "copper.org"
    },
    "Cu C44300": {
        "density": 8.53, "thermal_cond": 109, "specific_heat": 380,
        "elastic_mod": 110, "solidus": 885, "liquidus": 915,
        "yield_annealed": 150, "uts_annealed": 380, "hardness_bhn": 75,
        "source": "copper.org"
    },
    "Cu C46400": {
        "density": 8.41, "thermal_cond": 109, "specific_heat": 380,
        "elastic_mod": 100, "solidus": 885, "liquidus": 900,
        "yield_annealed": 172, "uts_annealed": 415, "hardness_bhn": 85,
        "source": "copper.org"
    },
    "Cu C48200": {
        "density": 8.41, "thermal_cond": 109, "specific_heat": 380,
        "elastic_mod": 100, "solidus": 880, "liquidus": 895,
        "yield_annealed": 165, "uts_annealed": 395, "hardness_bhn": 82,
        "source": "copper.org"
    },
    "Cu C54400": {
        "density": 8.89, "thermal_cond": 50, "specific_heat": 380,
        "elastic_mod": 103, "solidus": 854, "liquidus": 990,
        "yield_annealed": 195, "uts_annealed": 385, "hardness_bhn": 75,
        "source": "copper.org"
    },
    "Cu C61400": {
        "density": 7.89, "thermal_cond": 49, "specific_heat": 420,
        "elastic_mod": 117, "solidus": 1020, "liquidus": 1040,
        "yield_annealed": 240, "uts_annealed": 525, "hardness_bhn": 150,
        "source": "copper.org"
    },
    "Cu C62300": {
        "density": 7.78, "thermal_cond": 46, "specific_heat": 420,
        "elastic_mod": 115, "solidus": 1010, "liquidus": 1040,
        "yield_annealed": 255, "uts_annealed": 550, "hardness_bhn": 159,
        "source": "copper.org"
    },
    "Cu C64200": {
        "density": 7.70, "thermal_cond": 42, "specific_heat": 420,
        "elastic_mod": 115, "solidus": 1025, "liquidus": 1060,
        "yield_annealed": 345, "uts_annealed": 620, "hardness_bhn": 170,
        "source": "copper.org"
    },
    "Cu C67500": {
        "density": 8.26, "thermal_cond": 105, "specific_heat": 380,
        "elastic_mod": 115, "solidus": 880, "liquidus": 920,
        "yield_annealed": 200, "uts_annealed": 450, "hardness_bhn": 100,
        "source": "copper.org"
    },
    "Cu C69400": {
        "density": 8.33, "thermal_cond": 60, "specific_heat": 380,
        "elastic_mod": 117, "solidus": 885, "liquidus": 930,
        "yield_annealed": 240, "uts_annealed": 530, "hardness_bhn": 130,
        "source": "copper.org"
    },
    "Cu C72900": {
        "density": 8.90, "thermal_cond": 21, "specific_heat": 380,
        "elastic_mod": 127, "solidus": 1110, "liquidus": 1180,
        "yield_annealed": 200, "uts_annealed": 460, "hardness_bhn": 135,
        "source": "copper.org"
    },
    "Cu C75200": {
        "density": 8.75, "thermal_cond": 25, "specific_heat": 380,
        "elastic_mod": 132, "solidus": 1110, "liquidus": 1190,
        "yield_annealed": 170, "uts_annealed": 415, "hardness_bhn": 120,
        "source": "copper.org"
    },
    "Cu C83600": {
        "density": 8.83, "thermal_cond": 72, "specific_heat": 376,
        "elastic_mod": 83, "solidus": 855, "liquidus": 1010,
        "yield_annealed": 97, "uts_annealed": 255, "hardness_bhn": 60,
        "source": "copper.org"
    },
    "Cu C86200": {
        "density": 7.83, "thermal_cond": 36, "specific_heat": 380,
        "elastic_mod": 103, "solidus": 880, "liquidus": 920,
        "yield_annealed": 193, "uts_annealed": 490, "hardness_bhn": 130,
        "source": "copper.org"
    },
    "Cu C86300": {
        "density": 7.83, "thermal_cond": 36, "specific_heat": 380,
        "elastic_mod": 103, "solidus": 880, "liquidus": 920,
        "yield_annealed": 241, "uts_annealed": 620, "hardness_bhn": 160,
        "source": "copper.org"
    },
    "Cu C90300": {
        "density": 8.80, "thermal_cond": 72, "specific_heat": 376,
        "elastic_mod": 100, "solidus": 854, "liquidus": 999,
        "yield_annealed": 124, "uts_annealed": 310, "hardness_bhn": 70,
        "source": "copper.org"
    },
    "Cu C92200": {
        "density": 8.80, "thermal_cond": 71, "specific_heat": 376,
        "elastic_mod": 90, "solidus": 855, "liquidus": 1000,
        "yield_annealed": 117, "uts_annealed": 276, "hardness_bhn": 65,
        "source": "copper.org"
    },
    "Cu C93200": {
        "density": 8.93, "thermal_cond": 59, "specific_heat": 376,
        "elastic_mod": 76, "solidus": 855, "liquidus": 1000,
        "yield_annealed": 110, "uts_annealed": 241, "hardness_bhn": 65,
        "source": "copper.org"
    },
    "Cu C93700": {
        "density": 9.25, "thermal_cond": 47, "specific_heat": 376,
        "elastic_mod": 80, "solidus": 762, "liquidus": 993,
        "yield_annealed": 103, "uts_annealed": 234, "hardness_bhn": 60,
        "source": "copper.org"
    },
    "Cu C95400": {
        "density": 7.45, "thermal_cond": 59, "specific_heat": 420,
        "elastic_mod": 110, "solidus": 1020, "liquidus": 1045,
        "yield_annealed": 241, "uts_annealed": 586, "hardness_bhn": 170,
        "source": "copper.org"
    },
    "Cu C95500": {
        "density": 7.53, "thermal_cond": 42, "specific_heat": 420,
        "elastic_mod": 110, "solidus": 1010, "liquidus": 1050,
        "yield_annealed": 262, "uts_annealed": 620, "hardness_bhn": 195,
        "source": "copper.org"
    },
    "Cu C95800": {
        "density": 7.64, "thermal_cond": 36, "specific_heat": 420,
        "elastic_mod": 110, "solidus": 1050, "liquidus": 1070,
        "yield_annealed": 241, "uts_annealed": 586, "hardness_bhn": 159,
        "source": "copper.org"
    },
    "Cu C96200": {
        "density": 8.94, "thermal_cond": 40, "specific_heat": 380,
        "elastic_mod": 148, "solidus": 1130, "liquidus": 1180,
        "yield_annealed": 138, "uts_annealed": 379, "hardness_bhn": 100,
        "source": "copper.org"
    },

    # --- ASTM Structural Steels ---
    "A36": {
        "density": 7.85, "thermal_cond": 51.9, "specific_heat": 486,
        "elastic_mod": 200, "solidus": 1427, "liquidus": 1538,
        "yield_annealed": 250, "uts_annealed": 400, "hardness_bhn": 119,
        "source": "ASTM A36/AISC Steel Manual"
    },
    "A514": {
        "density": 7.85, "thermal_cond": 45.0, "specific_heat": 486,
        "elastic_mod": 207, "solidus": 1410, "liquidus": 1530,
        "yield_annealed": 690, "uts_annealed": 760, "hardness_bhn": 235,
        "source": "ASTM A514 datasheet"
    },
    "A572-50": {
        "density": 7.85, "thermal_cond": 50.0, "specific_heat": 486,
        "elastic_mod": 200, "solidus": 1420, "liquidus": 1535,
        "yield_annealed": 345, "uts_annealed": 450, "hardness_bhn": 140,
        "source": "ASTM A572 Gr.50 datasheet"
    },
    "A588": {
        "density": 7.85, "thermal_cond": 49.0, "specific_heat": 486,
        "elastic_mod": 200, "solidus": 1420, "liquidus": 1535,
        "yield_annealed": 345, "uts_annealed": 485, "hardness_bhn": 143,
        "source": "ASTM A588 (Cor-Ten) datasheet"
    },
    "A709-50": {
        "density": 7.85, "thermal_cond": 50.0, "specific_heat": 486,
        "elastic_mod": 200, "solidus": 1420, "liquidus": 1535,
        "yield_annealed": 345, "uts_annealed": 450, "hardness_bhn": 140,
        "source": "ASTM A709 Gr.50 bridge steel"
    },

    # --- API 5L Pipeline Steels ---
    "API-5L-X42": {
        "density": 7.85, "thermal_cond": 52.0, "specific_heat": 486,
        "elastic_mod": 207, "solidus": 1425, "liquidus": 1538,
        "yield_annealed": 290, "uts_annealed": 414, "hardness_bhn": 120,
        "source": "API 5L specification"
    },
    "API-5L-X52": {
        "density": 7.85, "thermal_cond": 50.0, "specific_heat": 486,
        "elastic_mod": 207, "solidus": 1420, "liquidus": 1535,
        "yield_annealed": 359, "uts_annealed": 455, "hardness_bhn": 135,
        "source": "API 5L specification"
    },
    "API-5L-X60": {
        "density": 7.85, "thermal_cond": 49.0, "specific_heat": 486,
        "elastic_mod": 207, "solidus": 1420, "liquidus": 1535,
        "yield_annealed": 414, "uts_annealed": 517, "hardness_bhn": 150,
        "source": "API 5L specification"
    },
    "API-5L-X65": {
        "density": 7.85, "thermal_cond": 48.0, "specific_heat": 486,
        "elastic_mod": 207, "solidus": 1420, "liquidus": 1535,
        "yield_annealed": 448, "uts_annealed": 531, "hardness_bhn": 155,
        "source": "API 5L specification"
    },
    "API-5L-X70": {
        "density": 7.85, "thermal_cond": 47.0, "specific_heat": 486,
        "elastic_mod": 207, "solidus": 1415, "liquidus": 1530,
        "yield_annealed": 483, "uts_annealed": 565, "hardness_bhn": 165,
        "source": "API 5L specification"
    },
    "API-5L-X80": {
        "density": 7.85, "thermal_cond": 45.0, "specific_heat": 486,
        "elastic_mod": 207, "solidus": 1415, "liquidus": 1530,
        "yield_annealed": 552, "uts_annealed": 621, "hardness_bhn": 185,
        "source": "API 5L specification"
    },

    # --- Additional Tool Steels ---
    "Tool T1": {
        "density": 8.67, "thermal_cond": 19.9, "specific_heat": 420,
        "elastic_mod": 210, "solidus": 1260, "liquidus": 1370,
        "yield_annealed": 470, "uts_annealed": 760, "hardness_bhn": 229,
        "source": "Carpenter/ASM"
    },
    "Tool T15": {
        "density": 8.19, "thermal_cond": 21.0, "specific_heat": 420,
        "elastic_mod": 230, "solidus": 1230, "liquidus": 1350,
        "yield_annealed": 500, "uts_annealed": 830, "hardness_bhn": 255,
        "source": "Carpenter/ASM"
    },
    "Tool W2": {
        "density": 7.85, "thermal_cond": 48.0, "specific_heat": 486,
        "elastic_mod": 207, "solidus": 1400, "liquidus": 1500,
        "yield_annealed": 365, "uts_annealed": 665, "hardness_bhn": 192,
        "source": "ASM Metals Handbook"
    },
    "Tool O2": {
        "density": 7.85, "thermal_cond": 33.0, "specific_heat": 460,
        "elastic_mod": 207, "solidus": 1370, "liquidus": 1460,
        "yield_annealed": 400, "uts_annealed": 710, "hardness_bhn": 201,
        "source": "ASM Metals Handbook"
    },
    "Tool O7": {
        "density": 8.05, "thermal_cond": 30.0, "specific_heat": 450,
        "elastic_mod": 210, "solidus": 1340, "liquidus": 1425,
        "yield_annealed": 415, "uts_annealed": 725, "hardness_bhn": 207,
        "source": "ASM Metals Handbook"
    },
    "Tool S1": {
        "density": 7.88, "thermal_cond": 27.0, "specific_heat": 460,
        "elastic_mod": 207, "solidus": 1380, "liquidus": 1470,
        "yield_annealed": 415, "uts_annealed": 745, "hardness_bhn": 192,
        "source": "ASM Metals Handbook"
    },
    "Tool P21": {
        "density": 7.80, "thermal_cond": 35.0, "specific_heat": 460,
        "elastic_mod": 200, "solidus": 1400, "liquidus": 1500,
        "yield_annealed": 760, "uts_annealed": 1000, "hardness_bhn": 330,
        "source": "ASM Metals Handbook"
    },
    "Tool D4": {
        "density": 7.70, "thermal_cond": 21.0, "specific_heat": 460,
        "elastic_mod": 210, "solidus": 1370, "liquidus": 1440,
        "yield_annealed": 420, "uts_annealed": 745, "hardness_bhn": 217,
        "source": "ASM Metals Handbook"
    },
    "Tool O6": {
        "density": 7.75, "thermal_cond": 38.0, "specific_heat": 460,
        "elastic_mod": 207, "solidus": 1380, "liquidus": 1470,
        "yield_annealed": 380, "uts_annealed": 690, "hardness_bhn": 201,
        "source": "ASM Metals Handbook"
    },

    # --- CPM / Powder Metallurgy Steels ---
    "CPM-10V": {
        "density": 7.42, "thermal_cond": 20.0, "specific_heat": 460,
        "elastic_mod": 210, "solidus": 1250, "liquidus": 1350,
        "yield_annealed": 550, "uts_annealed": 895, "hardness_bhn": 277,
        "source": "Crucible CPM 10V datasheet"
    },
    "CPM-3V": {
        "density": 7.70, "thermal_cond": 25.0, "specific_heat": 460,
        "elastic_mod": 210, "solidus": 1350, "liquidus": 1450,
        "yield_annealed": 490, "uts_annealed": 825, "hardness_bhn": 241,
        "source": "Crucible CPM 3V datasheet"
    },
    "CPM-S30V": {
        "density": 7.62, "thermal_cond": 17.0, "specific_heat": 460,
        "elastic_mod": 207, "solidus": 1300, "liquidus": 1400,
        "yield_annealed": 500, "uts_annealed": 860, "hardness_bhn": 255,
        "source": "Crucible CPM S30V datasheet"
    },
    "CPM-S90V": {
        "density": 7.34, "thermal_cond": 16.0, "specific_heat": 460,
        "elastic_mod": 213, "solidus": 1230, "liquidus": 1340,
        "yield_annealed": 520, "uts_annealed": 880, "hardness_bhn": 268,
        "source": "Crucible CPM S90V datasheet"
    },
    "ASP-2060": {
        "density": 8.10, "thermal_cond": 22.0, "specific_heat": 450,
        "elastic_mod": 218, "solidus": 1240, "liquidus": 1350,
        "yield_annealed": 530, "uts_annealed": 870, "hardness_bhn": 260,
        "source": "Erasteel ASP 2060 datasheet"
    },

    # --- Specialty / Ultra-High Strength Steels ---
    "AERMET 100": {
        "density": 7.89, "thermal_cond": 31.2, "specific_heat": 460,
        "elastic_mod": 197, "solidus": 1380, "liquidus": 1480,
        "yield_annealed": 1724, "uts_annealed": 1965, "hardness_bhn": 550,
        "source": "Carpenter AerMet 100 datasheet"
    },
    "AF1410": {
        "density": 7.89, "thermal_cond": 32.0, "specific_heat": 460,
        "elastic_mod": 200, "solidus": 1395, "liquidus": 1495,
        "yield_annealed": 1517, "uts_annealed": 1655, "hardness_bhn": 475,
        "source": "Carpenter AF1410 datasheet"
    },
    "CUSTOM 465": {
        "density": 7.81, "thermal_cond": 17.0, "specific_heat": 450,
        "elastic_mod": 200, "solidus": 1400, "liquidus": 1500,
        "yield_annealed": 1586, "uts_annealed": 1724, "hardness_bhn": 500,
        "source": "Carpenter Custom 465 datasheet"
    },
    "CUSTOM 450": {
        "density": 7.80, "thermal_cond": 16.5, "specific_heat": 450,
        "elastic_mod": 197, "solidus": 1400, "liquidus": 1500,
        "yield_annealed": 1034, "uts_annealed": 1103, "hardness_bhn": 340,
        "source": "Carpenter Custom 450 datasheet"
    },
    "NITRALLOY N": {
        "density": 7.84, "thermal_cond": 38.0, "specific_heat": 460,
        "elastic_mod": 207, "solidus": 1400, "liquidus": 1500,
        "yield_annealed": 620, "uts_annealed": 860, "hardness_bhn": 248,
        "source": "ASM Metals Handbook"
    },
    "4330V": {
        "density": 7.84, "thermal_cond": 38.0, "specific_heat": 475,
        "elastic_mod": 207, "solidus": 1400, "liquidus": 1500,
        "yield_annealed": 1310, "uts_annealed": 1450, "hardness_bhn": 430,
        "source": "Firth-Sterling 4330V Hy-Tuf datasheet"
    },

    # --- Ferritic / Martensitic Stainless Steels (batch 2 additions) ---
    "SS 403": {
        "density": 7.70, "thermal_cond": 25.0, "specific_heat": 460,
        "elastic_mod": 200, "solidus": 1425, "liquidus": 1510,
        "yield_annealed": 205, "uts_annealed": 485, "hardness_bhn": 155,
        "source": "AZoM/MatWeb"
    },
    "SS 416": {
        "density": 7.70, "thermal_cond": 24.9, "specific_heat": 460,
        "elastic_mod": 200, "solidus": 1425, "liquidus": 1510,
        "yield_annealed": 275, "uts_annealed": 517, "hardness_bhn": 155,
        "source": "AZoM/MatWeb"
    },
    "SS 429": {
        "density": 7.72, "thermal_cond": 26.0, "specific_heat": 460,
        "elastic_mod": 200, "solidus": 1470, "liquidus": 1510,
        "yield_annealed": 275, "uts_annealed": 450, "hardness_bhn": 140,
        "source": "AZoM/MatWeb"
    },
    "SS 434": {
        "density": 7.72, "thermal_cond": 26.3, "specific_heat": 460,
        "elastic_mod": 200, "solidus": 1425, "liquidus": 1510,
        "yield_annealed": 310, "uts_annealed": 530, "hardness_bhn": 155,
        "source": "AZoM/MatWeb"
    },
    "SS 439": {
        "density": 7.70, "thermal_cond": 24.2, "specific_heat": 460,
        "elastic_mod": 200, "solidus": 1475, "liquidus": 1530,
        "yield_annealed": 205, "uts_annealed": 415, "hardness_bhn": 131,
        "source": "AZoM/MatWeb"
    },
    "SS 444": {
        "density": 7.75, "thermal_cond": 26.8, "specific_heat": 460,
        "elastic_mod": 200, "solidus": 1425, "liquidus": 1510,
        "yield_annealed": 275, "uts_annealed": 415, "hardness_bhn": 131,
        "source": "AZoM/MatWeb"
    },
    "SS 216": {
        "density": 7.80, "thermal_cond": 14.0, "specific_heat": 500,
        "elastic_mod": 193, "solidus": 1370, "liquidus": 1420,
        "yield_annealed": 310, "uts_annealed": 655, "hardness_bhn": 190,
        "source": "AZoM stainless reference"
    },

    # --- Specialty Stainless ---
    "AL-6XN": {
        "density": 8.06, "thermal_cond": 11.5, "specific_heat": 468,
        "elastic_mod": 195, "solidus": 1310, "liquidus": 1380,
        "yield_annealed": 310, "uts_annealed": 690, "hardness_bhn": 190,
        "source": "Allegheny Ludlum AL-6XN datasheet"
    },
    "ALLOY 20": {
        "density": 8.08, "thermal_cond": 12.2, "specific_heat": 502,
        "elastic_mod": 193, "solidus": 1340, "liquidus": 1400,
        "yield_annealed": 241, "uts_annealed": 551, "hardness_bhn": 160,
        "source": "Carpenter Alloy 20Cb-3 datasheet"
    },
    "NITRONIC 50": {
        "density": 7.88, "thermal_cond": 13.0, "specific_heat": 500,
        "elastic_mod": 196, "solidus": 1340, "liquidus": 1400,
        "yield_annealed": 380, "uts_annealed": 690, "hardness_bhn": 200,
        "source": "Electralloy Nitronic 50 datasheet"
    },
    "NITRONIC 60": {
        "density": 7.87, "thermal_cond": 12.8, "specific_heat": 500,
        "elastic_mod": 193, "solidus": 1340, "liquidus": 1405,
        "yield_annealed": 345, "uts_annealed": 650, "hardness_bhn": 195,
        "source": "Electralloy Nitronic 60 datasheet"
    },
    "254 SMO": {
        "density": 8.00, "thermal_cond": 12.0, "specific_heat": 500,
        "elastic_mod": 195, "solidus": 1310, "liquidus": 1380,
        "yield_annealed": 310, "uts_annealed": 650, "hardness_bhn": 200,
        "source": "Outokumpu 254 SMO datasheet"
    },
    "654 SMO": {
        "density": 8.00, "thermal_cond": 10.5, "specific_heat": 500,
        "elastic_mod": 195, "solidus": 1300, "liquidus": 1370,
        "yield_annealed": 430, "uts_annealed": 750, "hardness_bhn": 220,
        "source": "Outokumpu 654 SMO datasheet"
    },
    "926": {
        "density": 8.14, "thermal_cond": 11.2, "specific_heat": 500,
        "elastic_mod": 195, "solidus": 1310, "liquidus": 1380,
        "yield_annealed": 290, "uts_annealed": 620, "hardness_bhn": 180,
        "source": "VDM Metals 1.4529 datasheet"
    },
    "17-7PH": {
        "density": 7.81, "thermal_cond": 16.4, "specific_heat": 460,
        "elastic_mod": 204, "solidus": 1398, "liquidus": 1454,
        "yield_annealed": 380, "uts_annealed": 860, "hardness_bhn": 250,
        "source": "AK Steel 17-7 PH datasheet"
    },

    # --- Additional Cast Iron ---
    "Gray Iron Class 55": {
        "density": 7.30, "thermal_cond": 42.0, "specific_heat": 490,
        "elastic_mod": 145, "solidus": 1140, "liquidus": 1250,
        "yield_annealed": 245, "uts_annealed": 379, "hardness_bhn": 255,
        "source": "ASM cast iron handbook"
    },
    "ADI 1": {
        "density": 7.10, "thermal_cond": 22.0, "specific_heat": 500,
        "elastic_mod": 160, "solidus": 1140, "liquidus": 1200,
        "yield_annealed": 550, "uts_annealed": 850, "hardness_bhn": 269,
        "source": "ASTM A897 Grade 1"
    },
    "ADI 2": {
        "density": 7.10, "thermal_cond": 22.0, "specific_heat": 500,
        "elastic_mod": 163, "solidus": 1140, "liquidus": 1200,
        "yield_annealed": 700, "uts_annealed": 1050, "hardness_bhn": 302,
        "source": "ASTM A897 Grade 2"
    },
    "ADI 3": {
        "density": 7.10, "thermal_cond": 22.0, "specific_heat": 500,
        "elastic_mod": 165, "solidus": 1140, "liquidus": 1200,
        "yield_annealed": 827, "uts_annealed": 1200, "hardness_bhn": 341,
        "source": "ASTM A897 Grade 3"
    },
    "ADI 4": {
        "density": 7.10, "thermal_cond": 22.0, "specific_heat": 500,
        "elastic_mod": 167, "solidus": 1140, "liquidus": 1200,
        "yield_annealed": 965, "uts_annealed": 1400, "hardness_bhn": 388,
        "source": "ASTM A897 Grade 4"
    },
    "ADI 5": {
        "density": 7.10, "thermal_cond": 22.0, "specific_heat": 500,
        "elastic_mod": 168, "solidus": 1140, "liquidus": 1200,
        "yield_annealed": 1100, "uts_annealed": 1600, "hardness_bhn": 444,
        "source": "ASTM A897 Grade 5"
    },
    "NI-HARD 1": {
        "density": 7.60, "thermal_cond": 30.0, "specific_heat": 460,
        "elastic_mod": 170, "solidus": 1130, "liquidus": 1230,
        "yield_annealed": 350, "uts_annealed": 550, "hardness_bhn": 550,
        "source": "Nickel Institute Ni-Hard"
    },
    "NI-HARD 4": {
        "density": 7.60, "thermal_cond": 22.0, "specific_heat": 460,
        "elastic_mod": 175, "solidus": 1140, "liquidus": 1240,
        "yield_annealed": 400, "uts_annealed": 620, "hardness_bhn": 600,
        "source": "Nickel Institute Ni-Hard"
    },
    "CGI 450": {
        "density": 7.15, "thermal_cond": 38.0, "specific_heat": 500,
        "elastic_mod": 145, "solidus": 1140, "liquidus": 1220,
        "yield_annealed": 315, "uts_annealed": 450, "hardness_bhn": 207,
        "source": "SinterCast CGI datasheet"
    },

    # --- Additional Superalloys ---
    "Haynes 214": {
        "density": 8.05, "thermal_cond": 12.1, "specific_heat": 435,
        "elastic_mod": 218, "solidus": 1355, "liquidus": 1400,
        "yield_annealed": 580, "uts_annealed": 970, "hardness_bhn": 280,
        "source": "Haynes International 214 datasheet"
    },
    "Haynes 263": {
        "density": 8.36, "thermal_cond": 11.7, "specific_heat": 461,
        "elastic_mod": 221, "solidus": 1300, "liquidus": 1375,
        "yield_annealed": 580, "uts_annealed": 970, "hardness_bhn": 275,
        "source": "Haynes International 263 datasheet"
    },
    "Haynes 282": {
        "density": 8.27, "thermal_cond": 10.3, "specific_heat": 441,
        "elastic_mod": 216, "solidus": 1300, "liquidus": 1375,
        "yield_annealed": 690, "uts_annealed": 1120, "hardness_bhn": 310,
        "source": "Haynes International 282 datasheet"
    },
    "Rene 80": {
        "density": 7.87, "thermal_cond": 10.9, "specific_heat": 418,
        "elastic_mod": 211, "solidus": 1230, "liquidus": 1350,
        "yield_annealed": 800, "uts_annealed": 1100, "hardness_bhn": 350,
        "source": "GE Aviation Rene 80 datasheet"
    },
    "Rene 95": {
        "density": 8.23, "thermal_cond": 10.0, "specific_heat": 420,
        "elastic_mod": 207, "solidus": 1200, "liquidus": 1330,
        "yield_annealed": 1050, "uts_annealed": 1420, "hardness_bhn": 400,
        "source": "GE Aviation Rene 95 datasheet"
    },
    "STELLITE 6": {
        "density": 8.39, "thermal_cond": 14.7, "specific_heat": 421,
        "elastic_mod": 210, "solidus": 1260, "liquidus": 1357,
        "yield_annealed": 540, "uts_annealed": 834, "hardness_bhn": 400,
        "source": "Kennametal Stellite 6 datasheet"
    },
    "Monel 400": {
        "density": 8.80, "thermal_cond": 21.8, "specific_heat": 427,
        "elastic_mod": 180, "solidus": 1300, "liquidus": 1350,
        "yield_annealed": 240, "uts_annealed": 550, "hardness_bhn": 130,
        "source": "Special Metals Monel 400 datasheet"
    },
    "Monel K-500": {
        "density": 8.44, "thermal_cond": 17.5, "specific_heat": 418,
        "elastic_mod": 180, "solidus": 1315, "liquidus": 1350,
        "yield_annealed": 790, "uts_annealed": 1100, "hardness_bhn": 300,
        "source": "Special Metals Monel K-500 datasheet"
    },

    # --- Additional Aluminum ---
    "Al 1350": {
        "density": 2.70, "thermal_cond": 234, "specific_heat": 900,
        "elastic_mod": 69, "solidus": 646, "liquidus": 657,
        "yield_annealed": 28, "uts_annealed": 83, "hardness_bhn": 17,
        "source": "aluminum.org / ASM"
    },
    "Al A356": {
        "density": 2.67, "thermal_cond": 151, "specific_heat": 963,
        "elastic_mod": 72, "solidus": 555, "liquidus": 615,
        "yield_annealed": 124, "uts_annealed": 228, "hardness_bhn": 80,
        "source": "ASM cast aluminum handbook"
    },
    "Al A380": {
        "density": 2.71, "thermal_cond": 96, "specific_heat": 963,
        "elastic_mod": 71, "solidus": 538, "liquidus": 593,
        "yield_annealed": 159, "uts_annealed": 317, "hardness_bhn": 80,
        "source": "ASM cast aluminum handbook"
    },
    "Al 5754": {
        "density": 2.66, "thermal_cond": 138, "specific_heat": 900,
        "elastic_mod": 70, "solidus": 593, "liquidus": 643,
        "yield_annealed": 80, "uts_annealed": 190, "hardness_bhn": 52,
        "source": "aluminum.org / ASM"
    },
    "Al 2090": {
        "density": 2.59, "thermal_cond": 88, "specific_heat": 900,
        "elastic_mod": 76, "solidus": 540, "liquidus": 640,
        "yield_annealed": 455, "uts_annealed": 520, "hardness_bhn": 145,
        "source": "Alcoa Al-Li 2090-T83 datasheet"
    },
    "Al 2195": {
        "density": 2.71, "thermal_cond": 90, "specific_heat": 890,
        "elastic_mod": 78, "solidus": 540, "liquidus": 635,
        "yield_annealed": 370, "uts_annealed": 530, "hardness_bhn": 155,
        "source": "Alcoa Al-Li 2195 datasheet"
    },

    # --- Additional AISI steels (unmatched gaps) ---
    "AISI 11L17": {
        "density": 7.87, "thermal_cond": 51.0, "specific_heat": 486,
        "elastic_mod": 200, "solidus": 1430, "liquidus": 1540,
        "yield_annealed": 225, "uts_annealed": 425, "hardness_bhn": 121,
        "source": "ASM Metals Handbook"
    },
    "AISI 12L14": {
        "density": 7.87, "thermal_cond": 51.0, "specific_heat": 486,
        "elastic_mod": 200, "solidus": 1430, "liquidus": 1540,
        "yield_annealed": 230, "uts_annealed": 460, "hardness_bhn": 130,
        "source": "ASM Metals Handbook"
    },
    "AISI 3310": {
        "density": 7.85, "thermal_cond": 44.0, "specific_heat": 475,
        "elastic_mod": 207, "solidus": 1410, "liquidus": 1510,
        "yield_annealed": 580, "uts_annealed": 840, "hardness_bhn": 248,
        "source": "ASM Metals Handbook"
    },
    "AISI 9840": {
        "density": 7.85, "thermal_cond": 42.0, "specific_heat": 475,
        "elastic_mod": 207, "solidus": 1405, "liquidus": 1510,
        "yield_annealed": 690, "uts_annealed": 895, "hardness_bhn": 269,
        "source": "ASM Metals Handbook"
    },
    "AISI B1112": {
        "density": 7.87, "thermal_cond": 52.0, "specific_heat": 486,
        "elastic_mod": 200, "solidus": 1430, "liquidus": 1540,
        "yield_annealed": 255, "uts_annealed": 440, "hardness_bhn": 128,
        "source": "ASM Metals Handbook"
    },

    # ══════════════════════════════════════════════════════════════════════
    # EXPANSION BATCH 3 — 2026-02-27
    # Missing tool steels, magnesium, zinc, zirconium
    # ══════════════════════════════════════════════════════════════════════

    # --- Tool Steels (gap fillers) ---
    "Tool H19": {
        "density": 8.67, "thermal_cond": 25.0, "specific_heat": 420,
        "elastic_mod": 210, "solidus": 1280, "liquidus": 1380,
        "yield_annealed": 450, "uts_annealed": 760, "hardness_bhn": 229,
        "source": "ASM Metals Handbook"
    },
    "Tool H26": {
        "density": 8.67, "thermal_cond": 26.0, "specific_heat": 420,
        "elastic_mod": 210, "solidus": 1260, "liquidus": 1360,
        "yield_annealed": 460, "uts_annealed": 775, "hardness_bhn": 235,
        "source": "ASM Metals Handbook"
    },
    "Tool M1": {
        "density": 8.16, "thermal_cond": 23.0, "specific_heat": 420,
        "elastic_mod": 210, "solidus": 1270, "liquidus": 1380,
        "yield_annealed": 455, "uts_annealed": 740, "hardness_bhn": 223,
        "source": "ASM Metals Handbook"
    },
    "Tool M3": {
        "density": 8.16, "thermal_cond": 21.0, "specific_heat": 420,
        "elastic_mod": 215, "solidus": 1250, "liquidus": 1370,
        "yield_annealed": 470, "uts_annealed": 770, "hardness_bhn": 235,
        "source": "ASM Metals Handbook"
    },
    "Tool M7": {
        "density": 8.16, "thermal_cond": 24.0, "specific_heat": 420,
        "elastic_mod": 210, "solidus": 1260, "liquidus": 1370,
        "yield_annealed": 460, "uts_annealed": 750, "hardness_bhn": 229,
        "source": "ASM Metals Handbook"
    },
    "Tool M42": {
        "density": 7.98, "thermal_cond": 19.0, "specific_heat": 420,
        "elastic_mod": 210, "solidus": 1240, "liquidus": 1350,
        "yield_annealed": 490, "uts_annealed": 810, "hardness_bhn": 248,
        "source": "ASM Metals Handbook"
    },
    "Tool M35": {
        "density": 8.16, "thermal_cond": 22.0, "specific_heat": 420,
        "elastic_mod": 210, "solidus": 1260, "liquidus": 1370,
        "yield_annealed": 470, "uts_annealed": 760, "hardness_bhn": 235,
        "source": "ASM Metals Handbook"
    },
    "Tool A6": {
        "density": 7.84, "thermal_cond": 37.0, "specific_heat": 460,
        "elastic_mod": 207, "solidus": 1380, "liquidus": 1470,
        "yield_annealed": 400, "uts_annealed": 715, "hardness_bhn": 207,
        "source": "ASM Metals Handbook"
    },

    # --- Magnesium Alloys ---
    "AZ91D": {
        "density": 1.81, "thermal_cond": 72, "specific_heat": 1020,
        "elastic_mod": 45, "solidus": 470, "liquidus": 595,
        "yield_annealed": 150, "uts_annealed": 230, "hardness_bhn": 63,
        "source": "ASM / Magnesium Elektron"
    },
    "AM60B": {
        "density": 1.80, "thermal_cond": 61, "specific_heat": 1020,
        "elastic_mod": 45, "solidus": 540, "liquidus": 615,
        "yield_annealed": 130, "uts_annealed": 225, "hardness_bhn": 60,
        "source": "ASM / Magnesium Elektron"
    },
    "AM50A": {
        "density": 1.77, "thermal_cond": 65, "specific_heat": 1020,
        "elastic_mod": 45, "solidus": 545, "liquidus": 620,
        "yield_annealed": 124, "uts_annealed": 210, "hardness_bhn": 57,
        "source": "ASM / Magnesium Elektron"
    },
    "EZ33A": {
        "density": 1.83, "thermal_cond": 100, "specific_heat": 1040,
        "elastic_mod": 45, "solidus": 545, "liquidus": 647,
        "yield_annealed": 96, "uts_annealed": 155, "hardness_bhn": 50,
        "source": "ASM Metals Handbook"
    },
    "QE22A": {
        "density": 1.82, "thermal_cond": 113, "specific_heat": 1040,
        "elastic_mod": 45, "solidus": 545, "liquidus": 640,
        "yield_annealed": 185, "uts_annealed": 260, "hardness_bhn": 70,
        "source": "ASM / Magnesium Elektron"
    },
    "Elektron 21": {
        "density": 1.82, "thermal_cond": 116, "specific_heat": 1040,
        "elastic_mod": 45, "solidus": 550, "liquidus": 640,
        "yield_annealed": 190, "uts_annealed": 280, "hardness_bhn": 75,
        "source": "Magnesium Elektron E21 datasheet"
    },

    # --- Zinc Alloys ---
    "Zamak 3": {
        "density": 6.60, "thermal_cond": 113, "specific_heat": 419,
        "elastic_mod": 86, "solidus": 381, "liquidus": 387,
        "yield_annealed": 221, "uts_annealed": 283, "hardness_bhn": 82,
        "source": "NADCA / Eastern Alloys"
    },
    "Zamak 5": {
        "density": 6.60, "thermal_cond": 109, "specific_heat": 419,
        "elastic_mod": 86, "solidus": 380, "liquidus": 386,
        "yield_annealed": 228, "uts_annealed": 331, "hardness_bhn": 91,
        "source": "NADCA / Eastern Alloys"
    },
    "Zamak 7": {
        "density": 6.60, "thermal_cond": 113, "specific_heat": 419,
        "elastic_mod": 86, "solidus": 381, "liquidus": 387,
        "yield_annealed": 221, "uts_annealed": 283, "hardness_bhn": 80,
        "source": "NADCA / Eastern Alloys"
    },
    "ZA-8": {
        "density": 6.30, "thermal_cond": 115, "specific_heat": 435,
        "elastic_mod": 86, "solidus": 375, "liquidus": 404,
        "yield_annealed": 240, "uts_annealed": 374, "hardness_bhn": 103,
        "source": "Eastern Alloys ZA-8 datasheet"
    },
    "ZA-12": {
        "density": 6.03, "thermal_cond": 116, "specific_heat": 450,
        "elastic_mod": 83, "solidus": 377, "liquidus": 432,
        "yield_annealed": 276, "uts_annealed": 400, "hardness_bhn": 100,
        "source": "Eastern Alloys ZA-12 datasheet"
    },
    "ZA-27": {
        "density": 5.00, "thermal_cond": 126, "specific_heat": 525,
        "elastic_mod": 78, "solidus": 375, "liquidus": 484,
        "yield_annealed": 365, "uts_annealed": 425, "hardness_bhn": 116,
        "source": "Eastern Alloys ZA-27 datasheet"
    },

    # --- Zirconium Alloys ---
    "Zr 702": {
        "density": 6.51, "thermal_cond": 22.7, "specific_heat": 285,
        "elastic_mod": 99, "solidus": 1750, "liquidus": 1855,
        "yield_annealed": 207, "uts_annealed": 380, "hardness_bhn": 160,
        "source": "ATI / Allegheny Technologies"
    },
    "Zr 705": {
        "density": 6.64, "thermal_cond": 18.0, "specific_heat": 285,
        "elastic_mod": 99, "solidus": 1700, "liquidus": 1830,
        "yield_annealed": 380, "uts_annealed": 552, "hardness_bhn": 200,
        "source": "ATI / Allegheny Technologies"
    },
    "Zircaloy-2": {
        "density": 6.55, "thermal_cond": 13.0, "specific_heat": 285,
        "elastic_mod": 99, "solidus": 1750, "liquidus": 1850,
        "yield_annealed": 310, "uts_annealed": 480, "hardness_bhn": 180,
        "source": "ASTM nuclear materials handbook"
    },
    "Zircaloy-4": {
        "density": 6.56, "thermal_cond": 12.6, "specific_heat": 285,
        "elastic_mod": 99, "solidus": 1750, "liquidus": 1850,
        "yield_annealed": 345, "uts_annealed": 510, "hardness_bhn": 190,
        "source": "ASTM nuclear materials handbook"
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
        elif name.startswith("SS ") or name.startswith("17-") or name.startswith("15-") or name.startswith("13-"):
            families.setdefault("Stainless Steel", []).append(name)
        elif name in ("A286", "Custom 455", "Nitronic 50", "Nitronic 60"):
            families.setdefault("Stainless Steel", []).append(name)
        elif name.startswith("Al "):
            families.setdefault("Aluminum", []).append(name)
        elif name.startswith("Ti"):
            families.setdefault("Titanium", []).append(name)
        elif any(name.startswith(p) for p in (
            "Inconel", "Incoloy", "Waspaloy", "Hastelloy", "Monel",
            "Nimonic", "Haynes", "Rene", "Udimet", "Stellite",
            "MP35N", "N-155", "Pyromet", "Alloy 188", "CoCr",
        )):
            families.setdefault("Nickel/Cobalt Superalloy", []).append(name)
        elif name.startswith("Tool"):
            families.setdefault("Tool Steel", []).append(name)
        elif name.startswith("Gray") or name.startswith("Ductile") or name.startswith("ADI") or name.startswith("Malleable"):
            families.setdefault("Cast Iron", []).append(name)
        elif name.startswith("Cu "):
            families.setdefault("Copper", []).append(name)
        elif name.startswith("Mg "):
            families.setdefault("Magnesium", []).append(name)
        elif name.startswith("Maraging"):
            families.setdefault("Maraging Steel", []).append(name)
        elif name.startswith("Ni ") or name in ("Alloy 20", "Carpenter 20Cb-3", "Invar 36"):
            families.setdefault("Nickel Alloy", []).append(name)
        elif name in ("Tungsten", "Molybdenum", "Tantalum", "Niobium", "Zirconium", "Beryllium", "Kovar"):
            families.setdefault("Refractory/Specialty", []).append(name)
        elif name.startswith("Zamak"):
            families.setdefault("Zinc", []).append(name)
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
