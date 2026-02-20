const PRISM_COATINGS_COMPLETE = {
  "UNCOATED": {
    "category": "uncoated",
    "hardness_hv": 0,
    "max_temp_c": 500,
    "friction_coef": 0.5,
    "color": "silver",
    "cost_factor": 1.0
  },
  "TiN": {
    "category": "pvd",
    "hardness_hv": 2300,
    "max_temp_c": 550,
    "friction_coef": 0.45,
    "color": "gold",
    "cost_factor": 1.25,
    "thickness_um": [
      1,
      5
    ]
  },
  "TiCN": {
    "category": "pvd",
    "hardness_hv": 3000,
    "max_temp_c": 400,
    "friction_coef": 0.4,
    "color": "gray_violet",
    "cost_factor": 1.35,
    "thickness_um": [
      1,
      4
    ]
  },
  "TiAlN": {
    "category": "pvd",
    "hardness_hv": 3300,
    "max_temp_c": 800,
    "friction_coef": 0.35,
    "color": "violet_gray",
    "cost_factor": 1.5,
    "thickness_um": [
      1,
      5
    ]
  },
  "TiAlCN": {
    "category": "pvd",
    "hardness_hv": 3200,
    "max_temp_c": 750,
    "friction_coef": 0.38,
    "color": "gray",
    "cost_factor": 1.45
  },
  "TiAlCrN": {
    "category": "pvd",
    "hardness_hv": 3200,
    "max_temp_c": 850,
    "friction_coef": 0.35,
    "color": "silver_gray",
    "cost_factor": 1.55
  },
  "TiSiN": {
    "category": "pvd",
    "hardness_hv": 3500,
    "max_temp_c": 1100,
    "friction_coef": 0.3,
    "color": "copper_red",
    "cost_factor": 1.65
  },
  "TiB2": {
    "category": "pvd",
    "hardness_hv": 5000,
    "max_temp_c": 900,
    "friction_coef": 0.25,
    "color": "gray",
    "cost_factor": 1.8
  },
  "TiZrN": {
    "category": "pvd",
    "hardness_hv": 2800,
    "max_temp_c": 600,
    "friction_coef": 0.42,
    "color": "bronze",
    "cost_factor": 1.4
  },
  "TiCrN": {
    "category": "pvd",
    "hardness_hv": 2900,
    "max_temp_c": 650,
    "friction_coef": 0.4,
    "color": "gray",
    "cost_factor": 1.42
  },
  "AlTiN": {
    "category": "pvd",
    "hardness_hv": 3500,
    "max_temp_c": 900,
    "friction_coef": 0.32,
    "color": "black_violet",
    "cost_factor": 1.6,
    "thickness_um": [
      1,
      5
    ]
  },
  "AlTiCrN": {
    "category": "pvd",
    "hardness_hv": 3400,
    "max_temp_c": 950,
    "friction_coef": 0.3,
    "color": "dark_gray",
    "cost_factor": 1.7
  },
  "AlTiSiN": {
    "category": "pvd",
    "hardness_hv": 3700,
    "max_temp_c": 1200,
    "friction_coef": 0.28,
    "color": "bronze_black",
    "cost_factor": 1.85
  },
  "AlTiVN": {
    "category": "pvd",
    "hardness_hv": 3600,
    "max_temp_c": 1000,
    "friction_coef": 0.29,
    "color": "dark_violet",
    "cost_factor": 1.75
  },
  "AlCrN": {
    "category": "pvd",
    "hardness_hv": 3200,
    "max_temp_c": 1000,
    "friction_coef": 0.35,
    "color": "gray_silver",
    "cost_factor": 1.55
  },
  "AlCrTiN": {
    "category": "pvd",
    "hardness_hv": 3300,
    "max_temp_c": 1050,
    "friction_coef": 0.33,
    "color": "dark_gray",
    "cost_factor": 1.65
  },
  "AlCrSiN": {
    "category": "pvd",
    "hardness_hv": 3600,
    "max_temp_c": 1150,
    "friction_coef": 0.28,
    "color": "anthracite",
    "cost_factor": 1.8
  },
  "CrN": {
    "category": "pvd",
    "hardness_hv": 1800,
    "max_temp_c": 700,
    "friction_coef": 0.5,
    "color": "silver",
    "cost_factor": 1.2
  },
  "CrAlN": {
    "category": "pvd",
    "hardness_hv": 3000,
    "max_temp_c": 900,
    "friction_coef": 0.38,
    "color": "gray",
    "cost_factor": 1.5
  },
  "ZrN": {
    "category": "pvd",
    "hardness_hv": 2500,
    "max_temp_c": 600,
    "friction_coef": 0.48,
    "color": "light_gold",
    "cost_factor": 1.3
  },
  "ZrCN": {
    "category": "pvd",
    "hardness_hv": 2700,
    "max_temp_c": 650,
    "friction_coef": 0.44,
    "color": "dark_gold",
    "cost_factor": 1.38
  },
  "nACo": {
    "category": "pvd_nano",
    "hardness_hv": 4500,
    "max_temp_c": 1200,
    "friction_coef": 0.25,
    "color": "blue_gray",
    "cost_factor": 2.0,
    "nanolayer": true
  },
  "nACRo": {
    "category": "pvd_nano",
    "hardness_hv": 4200,
    "max_temp_c": 1100,
    "friction_coef": 0.28,
    "color": "violet_gray",
    "cost_factor": 1.95,
    "nanolayer": true
  },
  "DLC": {
    "category": "dlc",
    "hardness_hv": 3500,
    "max_temp_c": 350,
    "friction_coef": 0.1,
    "color": "dark_gray",
    "cost_factor": 1.75,
    "sp3_content": 0.4
  },
  "ta-C_DLC": {
    "category": "dlc",
    "hardness_hv": 8000,
    "max_temp_c": 400,
    "friction_coef": 0.08,
    "color": "black",
    "cost_factor": 2.5,
    "sp3_content": 0.8
  },
  "a-C_H_DLC": {
    "category": "dlc",
    "hardness_hv": 2500,
    "max_temp_c": 300,
    "friction_coef": 0.12,
    "color": "gray",
    "cost_factor": 1.6,
    "hydrogen": true
  },
  "CVD_TiCN": {
    "category": "cvd",
    "hardness_hv": 3200,
    "max_temp_c": 500,
    "friction_coef": 0.35,
    "color": "gray_bronze",
    "cost_factor": 1.45,
    "thickness_um": [
      4,
      12
    ]
  },
  "CVD_Al2O3": {
    "category": "cvd",
    "hardness_hv": 2100,
    "max_temp_c": 1200,
    "friction_coef": 0.45,
    "color": "black",
    "cost_factor": 1.55,
    "thickness_um": [
      2,
      8
    ]
  },
  "CVD_TiN_Al2O3_TiCN": {
    "category": "cvd_multi",
    "hardness_hv": 2800,
    "max_temp_c": 1000,
    "friction_coef": 0.38,
    "color": "gold_black",
    "cost_factor": 1.8
  },
  "CVD_MTCVD_TiCN": {
    "category": "mtcvd",
    "hardness_hv": 3100,
    "max_temp_c": 550,
    "friction_coef": 0.36,
    "color": "gray",
    "cost_factor": 1.5
  },
  "CVD_Diamond": {
    "category": "diamond",
    "hardness_hv": 10000,
    "max_temp_c": 600,
    "friction_coef": 0.05,
    "color": "clear",
    "cost_factor": 4.0,
    "thickness_um": [
      5,
      30
    ]
  },
  "Polycrystalline_Diamond": {
    "category": "diamond",
    "hardness_hv": 8000,
    "max_temp_c": 700,
    "friction_coef": 0.08,
    "color": "gray",
    "cost_factor": 3.5
  },
  "Nanocrystalline_Diamond": {
    "category": "diamond",
    "hardness_hv": 9000,
    "max_temp_c": 650,
    "friction_coef": 0.06,
    "color": "gray_clear",
    "cost_factor": 4.5
  },
  "CBN": {
    "category": "superabrasive",
    "hardness_hv": 4500,
    "max_temp_c": 1500,
    "friction_coef": 0.25,
    "color": "bronze",
    "cost_factor": 5.0
  },
  "PCBN": {
    "category": "superabrasive",
    "hardness_hv": 4000,
    "max_temp_c": 1300,
    "friction_coef": 0.28,
    "color": "bronze_gray",
    "cost_factor": 4.5
  },
  "PCD": {
    "category": "superabrasive",
    "hardness_hv": 8000,
    "max_temp_c": 700,
    "friction_coef": 0.08,
    "color": "gray_silver",
    "cost_factor": 6.0
  },
  "Al2O3": {
    "category": "oxide",
    "hardness_hv": 2100,
    "max_temp_c": 1200,
    "friction_coef": 0.48,
    "color": "black",
    "cost_factor": 1.4
  },
  "Al2O3_ZrO2": {
    "category": "oxide",
    "hardness_hv": 2300,
    "max_temp_c": 1100,
    "friction_coef": 0.45,
    "color": "white_gray",
    "cost_factor": 1.55
  },
  "SiAlON": {
    "category": "ceramic",
    "hardness_hv": 1550,
    "max_temp_c": 1300,
    "friction_coef": 0.52,
    "color": "black",
    "cost_factor": 2.0
  },
  "Si3N4": {
    "category": "ceramic",
    "hardness_hv": 1400,
    "max_temp_c": 1200,
    "friction_coef": 0.5,
    "color": "gray",
    "cost_factor": 1.8
  },
  "MULTILAYER_TiAlN_TiN": {
    "category": "multilayer",
    "hardness_hv": 3100,
    "max_temp_c": 700,
    "friction_coef": 0.38,
    "color": "gold_violet",
    "cost_factor": 1.7,
    "layers": 50
  },
  "GRADIENT_TiAlN": {
    "category": "gradient",
    "hardness_hv": 3400,
    "max_temp_c": 850,
    "friction_coef": 0.33,
    "color": "violet",
    "cost_factor": 1.75
  },
  "NANOLAYER_AlTiN": {
    "category": "nanolayer",
    "hardness_hv": 3800,
    "max_temp_c": 1100,
    "friction_coef": 0.28,
    "color": "black",
    "cost_factor": 2.1,
    "layers": 2000
  },
  "BALINIT_FUTURA": {
    "category": "commercial",
    "hardness_hv": 3300,
    "max_temp_c": 850,
    "friction_coef": 0.35,
    "color": "violet",
    "cost_factor": 1.8,
    "base": "TiAlN"
  },
  "BALINIT_ALCRONA": {
    "category": "commercial",
    "hardness_hv": 3200,
    "max_temp_c": 1100,
    "friction_coef": 0.33,
    "color": "gray",
    "cost_factor": 1.85,
    "base": "AlCrN"
  },
  "BALINIT_HELICA": {
    "category": "commercial",
    "hardness_hv": 3500,
    "max_temp_c": 900,
    "friction_coef": 0.3,
    "color": "copper",
    "cost_factor": 1.9,
    "base": "AlCrN"
  },
  "BALINIT_ALNOVA": {
    "category": "commercial",
    "hardness_hv": 3400,
    "max_temp_c": 1000,
    "friction_coef": 0.32,
    "color": "silver_gray",
    "cost_factor": 1.88
  },
  "TiVN": {
    "category": "pvd",
    "hardness_hv": 2800,
    "max_temp_c": 700,
    "friction_coef": 0.40,
    "color": "bronze",
    "cost_factor": 1.40,
    "thickness_um": [1, 4]
  },
  "CrAlSiN": {
    "category": "pvd",
    "hardness_hv": 3400,
    "max_temp_c": 1100,
    "friction_coef": 0.30,
    "color": "silver_gray",
    "cost_factor": 1.75,
    "thickness_um": [1, 4]
  },
  "TiAlSiN": {
    "category": "pvd_nanocomposite",
    "hardness_hv": 3800,
    "max_temp_c": 1200,
    "friction_coef": 0.28,
    "color": "copper_violet",
    "cost_factor": 1.90,
    "thickness_um": [1, 3]
  },
  "AlCrVN": {
    "category": "pvd",
    "hardness_hv": 3200,
    "max_temp_c": 950,
    "friction_coef": 0.32,
    "color": "dark_gray",
    "cost_factor": 1.60,
    "thickness_um": [1, 5]
  }
}