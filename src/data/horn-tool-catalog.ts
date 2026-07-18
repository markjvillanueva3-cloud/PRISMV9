// @ts-nocheck
// Horn Rotating Tools — extracted from Horn-Rotating-Tools-Catalog-2020.pdf
// 198 tools: groove milling inserts (Type 108/U108, 306/U306, 116/U116, 313/U313)
//   + milling shanks (M306, MU306, M116, MU116, M313, MU313)
// World leader in grooving/parting — unique niche rotating tools
// Generated 2026-03-20

export interface HornTool {
  partNumber: string;
  manufacturer: string;
  type: string;
  subType: string;
  system: string;
  width_in?: number;
  depth_in?: number;
  radius_in?: number;
  cuttingEdgeDia_in?: number;
  shankDia_in?: number;
  l1_in?: number;
  l2_in?: number;
  d1_in?: number;
  d_in?: number;
  l1_mm?: number;
  l2_mm?: number;
  d1_mm?: number;
  d_mm?: number;
  form?: string;
  grades?: string[];
}

export const HORN_TOOLS: HornTool[] = [
  // ========================
  // INSERT Type 108/U108 — Groove Milling by Circular Interpolation
  // For use with Milling Shank Type MU306/M306
  // Cutting edge Dia .039", Ds .37"
  // ========================
  {partNumber:"R/LU108.0031.00",manufacturer:"Horn",type:"grooving_insert",subType:"groove_milling",system:"108",width_in:0.031,cuttingEdgeDia_in:0.039,shankDia_in:0.37,grades:["MG12","TI25","TH35"]},
  {partNumber:"R/LU108.0039.00",manufacturer:"Horn",type:"grooving_insert",subType:"groove_milling",system:"108",width_in:0.039,cuttingEdgeDia_in:0.039,shankDia_in:0.37,grades:["MG12","TI25","TH35"]},
  {partNumber:"R/L108.0070.00",manufacturer:"Horn",type:"grooving_insert",subType:"groove_milling",system:"108",width_in:0.029,cuttingEdgeDia_in:0.039,shankDia_in:0.37,grades:["MG12","T135","TI25","TH35"]},
  {partNumber:"R/L108.0080.00",manufacturer:"Horn",type:"grooving_insert",subType:"groove_milling",system:"108",width_in:0.031,cuttingEdgeDia_in:0.039,shankDia_in:0.37,grades:["MG12","T135","TI25","TH35"]},
  {partNumber:"R/L108.0090.00",manufacturer:"Horn",type:"grooving_insert",subType:"groove_milling",system:"108",width_in:0.035,cuttingEdgeDia_in:0.039,shankDia_in:0.37,grades:["MG12","T135","TI25","TH35"]},
  {partNumber:"R/L108.0110.00",manufacturer:"Horn",type:"grooving_insert",subType:"groove_milling",system:"108",width_in:0.043,cuttingEdgeDia_in:0.039,shankDia_in:0.37,grades:["MG12","T135","TI25","TH35"]},
  {partNumber:"R/L108.0130.00",manufacturer:"Horn",type:"grooving_insert",subType:"groove_milling",system:"108",width_in:0.051,cuttingEdgeDia_in:0.039,shankDia_in:0.37,grades:["MG12","T135","TI25","TH35"]},
  {partNumber:"R/L108.0160.00",manufacturer:"Horn",type:"grooving_insert",subType:"groove_milling",system:"108",width_in:0.063,cuttingEdgeDia_in:0.039,shankDia_in:0.37,grades:["MG12","T135","TI25","TH35"]},
  {partNumber:"R/L108.0150.00",manufacturer:"Horn",type:"grooving_insert",subType:"groove_milling",system:"108",width_in:0.059,cuttingEdgeDia_in:0.039,shankDia_in:0.37,grades:["MG12","T135","TI25","TH35"]},
  {partNumber:"R/L108.0200.00",manufacturer:"Horn",type:"grooving_insert",subType:"groove_milling",system:"108",width_in:0.079,cuttingEdgeDia_in:0.039,shankDia_in:0.37,grades:["MG12","T135","TI25","TH35"]},
  {partNumber:"R/LU108.0046.00",manufacturer:"Horn",type:"grooving_insert",subType:"groove_milling",system:"108",width_in:0.046,cuttingEdgeDia_in:0.039,shankDia_in:0.37,grades:["MG12","TI25"]},
  {partNumber:"R/LU108.0056.00",manufacturer:"Horn",type:"grooving_insert",subType:"groove_milling",system:"108",width_in:0.056,cuttingEdgeDia_in:0.039,shankDia_in:0.37,grades:["MG12","TI25"]},
  {partNumber:"R/LU108.0062.00",manufacturer:"Horn",type:"grooving_insert",subType:"groove_milling",system:"108",width_in:0.062,cuttingEdgeDia_in:0.039,shankDia_in:0.37,grades:["MG12","TI25"]},
  {partNumber:"R/LU108.0078.00",manufacturer:"Horn",type:"grooving_insert",subType:"groove_milling",system:"108",width_in:0.078,cuttingEdgeDia_in:0.039,shankDia_in:0.37,grades:["MG12","TI25"]},
  // 108 Full radius inserts
  {partNumber:"R/L108.0004.08",manufacturer:"Horn",type:"grooving_insert",subType:"full_radius",system:"108",width_in:0.031,radius_in:0.016,cuttingEdgeDia_in:0.039,shankDia_in:0.37,grades:["MG12","T135","TI25","TH35"]},
  {partNumber:"R/L108.0006.12",manufacturer:"Horn",type:"grooving_insert",subType:"full_radius",system:"108",width_in:0.070,radius_in:0.020,cuttingEdgeDia_in:0.039,shankDia_in:0.37,grades:["MG12","T135","TI25","TH35"]},
  {partNumber:"R/L108.0009.18",manufacturer:"Horn",type:"grooving_insert",subType:"full_radius",system:"108",width_in:0.071,radius_in:0.035,cuttingEdgeDia_in:0.039,shankDia_in:0.37,grades:["MG12","T135","TI25","TF5","TH35"]},
  {partNumber:"R/LU108.0015.31",manufacturer:"Horn",type:"grooving_insert",subType:"full_radius",system:"108",width_in:0.031,radius_in:0.015,cuttingEdgeDia_in:0.039,shankDia_in:0.37,grades:["MG12","TI25"]},
  {partNumber:"R/LU108.0023.46",manufacturer:"Horn",type:"grooving_insert",subType:"full_radius",system:"108",width_in:0.046,radius_in:0.023,cuttingEdgeDia_in:0.039,shankDia_in:0.37,grades:["MG12","TI25"]},
  {partNumber:"R/LU108.0031.62",manufacturer:"Horn",type:"grooving_insert",subType:"full_radius",system:"108",width_in:0.062,radius_in:0.031,cuttingEdgeDia_in:0.039,shankDia_in:0.37,grades:["MG12","TI25"]},
  {partNumber:"R/LU108.0039.78",manufacturer:"Horn",type:"grooving_insert",subType:"full_radius",system:"108",width_in:0.078,radius_in:0.039,cuttingEdgeDia_in:0.039,shankDia_in:0.37,grades:["MG12","TI25"]},

  // ========================
  // INSERT Type 306 — Groove Milling by Circular Interpolation
  // For use with Milling Shank Type MU306/M306
  // Cutting edge Dia .059" and .09", Ds .32" and .61"
  // ========================
  // Ds .32" group
  {partNumber:"306.0050.10.00",manufacturer:"Horn",type:"grooving_insert",subType:"groove_milling",system:"306",width_in:0.020,cuttingEdgeDia_in:0.033,shankDia_in:0.32,grades:["MG12","T135","A65"]},
  {partNumber:"306.0070.10.00",manufacturer:"Horn",type:"grooving_insert",subType:"groove_milling",system:"306",width_in:0.030,cuttingEdgeDia_in:0.050,shankDia_in:0.32,grades:["MG12","T135","A65"]},
  {partNumber:"306.0080.10.00",manufacturer:"Horn",type:"grooving_insert",subType:"groove_milling",system:"306",width_in:0.031,cuttingEdgeDia_in:0.059,shankDia_in:0.32,grades:["MG12","T135","A65"]},
  {partNumber:"306.0090.10.00",manufacturer:"Horn",type:"grooving_insert",subType:"groove_milling",system:"306",width_in:0.035,cuttingEdgeDia_in:0.059,shankDia_in:0.32,grades:["MG12","T135","A65"]},
  {partNumber:"306.0100.10.00",manufacturer:"Horn",type:"grooving_insert",subType:"groove_milling",system:"306",width_in:0.039,cuttingEdgeDia_in:0.059,shankDia_in:0.32,grades:["MG12","T135","A65"]},
  {partNumber:"306.0110.10.00",manufacturer:"Horn",type:"grooving_insert",subType:"groove_milling",system:"306",width_in:0.043,cuttingEdgeDia_in:0.059,shankDia_in:0.32,grades:["MG12","T135","A65"]},
  {partNumber:"306.0130.10.00",manufacturer:"Horn",type:"grooving_insert",subType:"groove_milling",system:"306",width_in:0.051,cuttingEdgeDia_in:0.059,shankDia_in:0.32,grades:["MG12","T135","A65"]},
  {partNumber:"306.0160.10.00",manufacturer:"Horn",type:"grooving_insert",subType:"groove_milling",system:"306",width_in:0.063,cuttingEdgeDia_in:0.059,shankDia_in:0.32,grades:["MG12","T135","A65"]},
  {partNumber:"306.0150.10.00",manufacturer:"Horn",type:"grooving_insert",subType:"groove_milling",system:"306",width_in:0.059,cuttingEdgeDia_in:0.059,shankDia_in:0.32,grades:["MG12","T135","A65"]},
  {partNumber:"306.0200.10.00",manufacturer:"Horn",type:"grooving_insert",subType:"full_radius",system:"306",width_in:0.079,radius_in:0.040,cuttingEdgeDia_in:0.059,shankDia_in:0.32,grades:["MG12","T135","A65"]},
  // Ds .61" group
  {partNumber:"306.0100.1.00",manufacturer:"Horn",type:"grooving_insert",subType:"groove_milling",system:"306",width_in:0.039,cuttingEdgeDia_in:0.090,shankDia_in:0.61,grades:["MG12","T135","A65"]},
  {partNumber:"306.0110.00",manufacturer:"Horn",type:"grooving_insert",subType:"groove_milling",system:"306",width_in:0.043,cuttingEdgeDia_in:0.090,shankDia_in:0.61,grades:["MG12","T135","A65","TF5"]},
  {partNumber:"306.0130.00",manufacturer:"Horn",type:"grooving_insert",subType:"groove_milling",system:"306",width_in:0.051,cuttingEdgeDia_in:0.090,shankDia_in:0.61,grades:["MG12","T135","A65","TF5"]},
  {partNumber:"306.0160.00",manufacturer:"Horn",type:"grooving_insert",subType:"groove_milling",system:"306",width_in:0.063,cuttingEdgeDia_in:0.090,shankDia_in:0.61,grades:["MG12","T135","A65","TF5"]},
  {partNumber:"306.0150.00",manufacturer:"Horn",type:"grooving_insert",subType:"groove_milling",system:"306",width_in:0.059,cuttingEdgeDia_in:0.090,shankDia_in:0.61,grades:["MG12","T135","A65","TF5"]},
  {partNumber:"306.0200.00",manufacturer:"Horn",type:"grooving_insert",subType:"full_radius",system:"306",width_in:0.079,radius_in:0.040,cuttingEdgeDia_in:0.090,shankDia_in:0.61,grades:["MG12","T135","A65","TF5"]},
  {partNumber:"306.0250.00",manufacturer:"Horn",type:"grooving_insert",subType:"full_radius",system:"306",width_in:0.098,radius_in:0.049,cuttingEdgeDia_in:0.090,shankDia_in:0.61,grades:["MG12","T135","A65","TF5"]},
  {partNumber:"306.0300.00",manufacturer:"Horn",type:"grooving_insert",subType:"groove_milling",system:"306",width_in:0.118,cuttingEdgeDia_in:0.090,shankDia_in:0.61,grades:["MG12"]},
  // 306 Precision ground inserts (U306)
  {partNumber:"U306.0046.00",manufacturer:"Horn",type:"grooving_insert",subType:"groove_milling",system:"306",width_in:0.046,cuttingEdgeDia_in:0.090,shankDia_in:0.61,grades:["MG12","T135","A65","TF5"]},
  {partNumber:"U306.0056.00",manufacturer:"Horn",type:"grooving_insert",subType:"groove_milling",system:"306",width_in:0.056,cuttingEdgeDia_in:0.090,shankDia_in:0.61,grades:["MG12"]},
  {partNumber:"U306.0062.00",manufacturer:"Horn",type:"grooving_insert",subType:"groove_milling",system:"306",width_in:0.062,cuttingEdgeDia_in:0.090,shankDia_in:0.61,grades:["MG12"]},
  {partNumber:"U306.0078.00",manufacturer:"Horn",type:"grooving_insert",subType:"groove_milling",system:"306",width_in:0.078,cuttingEdgeDia_in:0.090,shankDia_in:0.61,grades:["MG12"]},
  {partNumber:"U306.0094.00",manufacturer:"Horn",type:"grooving_insert",subType:"groove_milling",system:"306",width_in:0.094,cuttingEdgeDia_in:0.090,shankDia_in:0.61,grades:["MG12","A65"]},
  // 306 Full radius with Ds .61"
  {partNumber:"U306.0046.08",manufacturer:"Horn",type:"grooving_insert",subType:"full_radius",system:"306",width_in:0.046,radius_in:0.023,cuttingEdgeDia_in:0.090,shankDia_in:0.61,grades:["MG12"]},
  {partNumber:"U306.0062.08",manufacturer:"Horn",type:"grooving_insert",subType:"full_radius",system:"306",width_in:0.062,radius_in:0.031,cuttingEdgeDia_in:0.090,shankDia_in:0.61,grades:["MG12","TF5"]},
  {partNumber:"U306.0078.08",manufacturer:"Horn",type:"grooving_insert",subType:"full_radius",system:"306",width_in:0.078,radius_in:0.039,cuttingEdgeDia_in:0.090,shankDia_in:0.61,grades:["MG12","TF5"]},
  {partNumber:"U306.0094.08",manufacturer:"Horn",type:"grooving_insert",subType:"full_radius",system:"306",width_in:0.094,radius_in:0.047,cuttingEdgeDia_in:0.090,shankDia_in:0.61,grades:["MG12","TF5"]},
  {partNumber:"306.0011.22",manufacturer:"Horn",type:"grooving_insert",subType:"full_radius",system:"306",width_in:0.070,radius_in:0.035,cuttingEdgeDia_in:0.090,shankDia_in:0.61,grades:["MG12","T135","TI25","A65","TF5"]},
  {partNumber:"U306.0031.62",manufacturer:"Horn",type:"grooving_insert",subType:"full_radius",system:"306",width_in:0.062,radius_in:0.031,cuttingEdgeDia_in:0.090,shankDia_in:0.61,grades:["MG12","TI25"]},
  {partNumber:"U306.0047.94",manufacturer:"Horn",type:"grooving_insert",subType:"full_radius",system:"306",width_in:0.094,radius_in:0.047,cuttingEdgeDia_in:0.090,shankDia_in:0.61,grades:["MG12","TI25"]},
  // 306 Aluminium inserts
  {partNumber:"306.0110.40",manufacturer:"Horn",type:"grooving_insert",subType:"groove_milling_alu",system:"306",width_in:0.043,cuttingEdgeDia_in:0.090,shankDia_in:0.61,grades:["MG12","TI25"]},
  {partNumber:"306.0130.40",manufacturer:"Horn",type:"grooving_insert",subType:"groove_milling_alu",system:"306",width_in:0.051,cuttingEdgeDia_in:0.090,shankDia_in:0.61,grades:["TI25"]},
  {partNumber:"306.0160.40",manufacturer:"Horn",type:"grooving_insert",subType:"groove_milling_alu",system:"306",width_in:0.063,cuttingEdgeDia_in:0.090,shankDia_in:0.61,grades:["MG12","TI25"]},
  {partNumber:"306.0150.40",manufacturer:"Horn",type:"grooving_insert",subType:"groove_milling_alu",system:"306",width_in:0.059,cuttingEdgeDia_in:0.090,shankDia_in:0.61,grades:["MG12","TI25"]},
  {partNumber:"306.0200.40",manufacturer:"Horn",type:"grooving_insert",subType:"full_radius_alu",system:"306",width_in:0.079,radius_in:0.040,cuttingEdgeDia_in:0.090,shankDia_in:0.61,grades:["MG12","TI25"]},
  {partNumber:"306.0250.40",manufacturer:"Horn",type:"grooving_insert",subType:"full_radius_alu",system:"306",width_in:0.098,radius_in:0.049,cuttingEdgeDia_in:0.090,shankDia_in:0.61,grades:["MG12","TI25"]},

  // ========================
  // INSERT Type 116/U116 — Groove Milling by Circular Interpolation
  // For use with Milling Shank Type MU116/M116
  // Cutting edge Dia .169", Ds .803"
  // ========================
  {partNumber:"R/L116.0200.00",manufacturer:"Horn",type:"grooving_insert",subType:"groove_milling",system:"116",width_in:0.079,cuttingEdgeDia_in:0.169,shankDia_in:0.803,grades:["MG12","T135","TI25","TF5","TH35"]},
  {partNumber:"R/L116.0250.00",manufacturer:"Horn",type:"grooving_insert",subType:"groove_milling",system:"116",width_in:0.098,cuttingEdgeDia_in:0.169,shankDia_in:0.803,grades:["MG12","T135","TI25","TF5","TH35"]},
  {partNumber:"R/L116.0300.00",manufacturer:"Horn",type:"grooving_insert",subType:"groove_milling",system:"116",width_in:0.118,cuttingEdgeDia_in:0.169,shankDia_in:0.803,grades:["MG12","T135","TI25","TF5","TH35"]},
  {partNumber:"R/L116.0350.00",manufacturer:"Horn",type:"grooving_insert",subType:"groove_milling",system:"116",width_in:0.138,cuttingEdgeDia_in:0.169,shankDia_in:0.803,grades:["MG12","T135","TI25","TF5","TH35"]},
  {partNumber:"R/L116.0400.00",manufacturer:"Horn",type:"grooving_insert",subType:"groove_milling",system:"116",width_in:0.157,cuttingEdgeDia_in:0.169,shankDia_in:0.803,grades:["MG12","T135","TI25","TF5","TH35"]},
  {partNumber:"R/LU116.0046.00",manufacturer:"Horn",type:"grooving_insert",subType:"groove_milling",system:"116",width_in:0.046,cuttingEdgeDia_in:0.169,shankDia_in:0.803,grades:["MG12","TI25"]},
  {partNumber:"R/LU116.0056.00",manufacturer:"Horn",type:"grooving_insert",subType:"groove_milling",system:"116",width_in:0.056,cuttingEdgeDia_in:0.169,shankDia_in:0.803,grades:["MG12"]},
  {partNumber:"R/LU116.0062.00",manufacturer:"Horn",type:"grooving_insert",subType:"groove_milling",system:"116",width_in:0.062,cuttingEdgeDia_in:0.169,shankDia_in:0.803,grades:["MG12","TI25"]},
  {partNumber:"R/LU116.0078.00",manufacturer:"Horn",type:"grooving_insert",subType:"groove_milling",system:"116",width_in:0.078,cuttingEdgeDia_in:0.169,shankDia_in:0.803,grades:["MG12","TI25"]},
  {partNumber:"R/LU116.0094.00",manufacturer:"Horn",type:"grooving_insert",subType:"groove_milling",system:"116",width_in:0.094,cuttingEdgeDia_in:0.169,shankDia_in:0.803,grades:["MG12","TI25"]},
  {partNumber:"R/LU116.0125.00",manufacturer:"Horn",type:"grooving_insert",subType:"groove_milling",system:"116",width_in:0.125,cuttingEdgeDia_in:0.169,shankDia_in:0.803,grades:["MG12","TI25"]},
  // 116 Circlip groove inserts
  {partNumber:"R/L116.0110.00",manufacturer:"Horn",type:"grooving_insert",subType:"circlip_groove",system:"116",width_in:0.043,cuttingEdgeDia_in:0.169,shankDia_in:0.803,grades:["MG12","T135","TI25","TH35"]},
  {partNumber:"R/L116.0130.00",manufacturer:"Horn",type:"grooving_insert",subType:"circlip_groove",system:"116",width_in:0.051,cuttingEdgeDia_in:0.169,shankDia_in:0.803,grades:["MG12","T135","TI25","TH35"]},
  {partNumber:"R/L116.0160.00",manufacturer:"Horn",type:"grooving_insert",subType:"circlip_groove",system:"116",width_in:0.063,cuttingEdgeDia_in:0.169,shankDia_in:0.803,grades:["MG12","T135","TI25","TH35"]},
  // 116 Full radius inserts
  {partNumber:"R/L116.0009.18",manufacturer:"Horn",type:"grooving_insert",subType:"full_radius",system:"116",width_in:0.071,radius_in:0.035,cuttingEdgeDia_in:0.169,shankDia_in:0.803,grades:["MG12","T135","TI25","TH35"]},
  {partNumber:"R/L116.0011.22",manufacturer:"Horn",type:"grooving_insert",subType:"full_radius",system:"116",width_in:0.070,radius_in:0.035,cuttingEdgeDia_in:0.169,shankDia_in:0.803,grades:["MG12","T135","TI25","TH35"]},
  {partNumber:"R/L116.0015.30",manufacturer:"Horn",type:"grooving_insert",subType:"full_radius",system:"116",width_in:0.118,radius_in:0.059,cuttingEdgeDia_in:0.169,shankDia_in:0.803,grades:["MG12","T135","TI25","TH35"]},
  {partNumber:"R/L116.0020.40",manufacturer:"Horn",type:"grooving_insert",subType:"full_radius",system:"116",width_in:0.157,radius_in:0.079,cuttingEdgeDia_in:0.169,shankDia_in:0.803,grades:["MG12","T135","TI25","TH35"]},
  {partNumber:"R/LU116.0031.62",manufacturer:"Horn",type:"grooving_insert",subType:"full_radius",system:"116",width_in:0.062,radius_in:0.031,cuttingEdgeDia_in:0.169,shankDia_in:0.803,grades:["MG12","TI25"]},
  {partNumber:"R/LU116.0039.78",manufacturer:"Horn",type:"grooving_insert",subType:"full_radius",system:"116",width_in:0.078,radius_in:0.039,cuttingEdgeDia_in:0.169,shankDia_in:0.803,grades:["MG12","TI25"]},
  {partNumber:"R/LU116.0047.94",manufacturer:"Horn",type:"grooving_insert",subType:"full_radius",system:"116",width_in:0.094,radius_in:0.047,cuttingEdgeDia_in:0.169,shankDia_in:0.803,grades:["MG12","TI25"]},
  {partNumber:"R/LU116.0062.12",manufacturer:"Horn",type:"grooving_insert",subType:"full_radius",system:"116",width_in:0.125,radius_in:0.062,cuttingEdgeDia_in:0.169,shankDia_in:0.803,grades:["MG12","TI25"]},

  // ========================
  // INSERT Type 313/U313 — Groove Milling by Circular Interpolation
  // For use with Milling Shank Type MU313/M313
  // Cutting edge Dia various, Ds .85"
  // ========================
  {partNumber:"U313.0031.00",manufacturer:"Horn",type:"grooving_insert",subType:"groove_milling",system:"313",width_in:0.031,cuttingEdgeDia_in:0.059,shankDia_in:0.85,grades:["MG12","T135","A65"]},
  {partNumber:"U313.0039.00",manufacturer:"Horn",type:"grooving_insert",subType:"groove_milling",system:"313",width_in:0.039,cuttingEdgeDia_in:0.075,shankDia_in:0.85,grades:["MG12","T135","A65"]},
  {partNumber:"U313.0046.00",manufacturer:"Horn",type:"grooving_insert",subType:"groove_milling",system:"313",width_in:0.046,cuttingEdgeDia_in:0.090,shankDia_in:0.85,grades:["MG12","T135","A65"]},
  {partNumber:"313.0070.00",manufacturer:"Horn",type:"grooving_insert",subType:"groove_milling",system:"313",width_in:0.030,cuttingEdgeDia_in:0.059,shankDia_in:0.85,grades:["MG12","T135","A65"]},
  {partNumber:"313.0080.00",manufacturer:"Horn",type:"grooving_insert",subType:"groove_milling",system:"313",width_in:0.031,cuttingEdgeDia_in:0.067,shankDia_in:0.85,grades:["MG12","T135","A65"]},
  {partNumber:"313.0090.00",manufacturer:"Horn",type:"grooving_insert",subType:"groove_milling",system:"313",width_in:0.035,cuttingEdgeDia_in:0.075,shankDia_in:0.85,grades:["MG12","T135","A65"]},
  {partNumber:"313.0100.00",manufacturer:"Horn",type:"grooving_insert",subType:"groove_milling",system:"313",width_in:0.039,cuttingEdgeDia_in:0.078,shankDia_in:0.85,grades:["MG12","T135","A65"]},
  {partNumber:"313.0110.00",manufacturer:"Horn",type:"grooving_insert",subType:"groove_milling",system:"313",width_in:0.043,cuttingEdgeDia_in:0.090,shankDia_in:0.85,grades:["MG12","T135","A65"]},
  {partNumber:"313.0100.1.00",manufacturer:"Horn",type:"grooving_insert",subType:"groove_milling",system:"313",width_in:0.039,cuttingEdgeDia_in:0.177,shankDia_in:0.85,grades:["MG12","T135","TI25","A65"]},
  {partNumber:"313.0130.00",manufacturer:"Horn",type:"grooving_insert",subType:"groove_milling",system:"313",width_in:0.051,cuttingEdgeDia_in:0.177,shankDia_in:0.85,grades:["MG12","T135","A65"]},
  {partNumber:"313.0160.00",manufacturer:"Horn",type:"grooving_insert",subType:"groove_milling",system:"313",width_in:0.063,cuttingEdgeDia_in:0.177,shankDia_in:0.85,grades:["MG12","T135","A65"]},
  {partNumber:"313.0185.00",manufacturer:"Horn",type:"grooving_insert",subType:"groove_milling",system:"313",width_in:0.073,cuttingEdgeDia_in:0.177,shankDia_in:0.85,grades:["MG12","T135","A65"]},
  {partNumber:"313.0215.00",manufacturer:"Horn",type:"grooving_insert",subType:"groove_milling",system:"313",width_in:0.085,cuttingEdgeDia_in:0.177,shankDia_in:0.85,grades:["MG12","T135","A65"]},
  {partNumber:"313.0265.00",manufacturer:"Horn",type:"grooving_insert",subType:"groove_milling",system:"313",width_in:0.104,cuttingEdgeDia_in:0.177,shankDia_in:0.85,grades:["MG12","T135","A65"]},
  {partNumber:"313.0315.00",manufacturer:"Horn",type:"grooving_insert",subType:"groove_milling",system:"313",width_in:0.124,cuttingEdgeDia_in:0.177,shankDia_in:0.85,grades:["MG12","T135","A65"]},
  {partNumber:"313.0415.00",manufacturer:"Horn",type:"grooving_insert",subType:"groove_milling",system:"313",width_in:0.163,cuttingEdgeDia_in:0.177,shankDia_in:0.85,grades:["MG12","T135","A65"]},
  {partNumber:"313.0515.00",manufacturer:"Horn",type:"grooving_insert",subType:"groove_milling",system:"313",width_in:0.203,cuttingEdgeDia_in:0.177,shankDia_in:0.85,grades:["MG12","T135","A65"]},

  // ========================
  // MILLING SHANKS — Carbide bodies for vibration resistance
  // ========================
  // MU306 — with through coolant, for inserts 108/U108
  {partNumber:"MU306.0625.01",manufacturer:"Horn",type:"milling_shank",subType:"coolant_through",system:"MU306",d_in:0.625,l1_in:5.11,grades:[]},
  // M306.ER — with ER taper for CNC lathes
  {partNumber:"M306.ER11.02",manufacturer:"Horn",type:"milling_shank",subType:"er_taper",system:"M306",d1_in:0.433,d_in:0.625,l1_in:0.630,grades:[]},
  // MU116 — with through coolant, for inserts 116/U116
  {partNumber:"MU116.0625.01B",manufacturer:"Horn",type:"milling_shank",subType:"coolant_through",system:"MU116",d_in:0.625,l1_in:5.11,l2_in:1.575,grades:[]},
  {partNumber:"MU116.0625.02B",manufacturer:"Horn",type:"milling_shank",subType:"coolant_through",system:"MU116",d_in:0.625,l1_in:5.11,l2_in:2.205,grades:[]},
  {partNumber:"MU116.0625.03B",manufacturer:"Horn",type:"milling_shank",subType:"coolant_through",system:"MU116",d_in:0.625,l1_in:5.906,l2_in:3.150,grades:[]},
  // M116 — metric, with through coolant
  {partNumber:"M116.0012.01B",manufacturer:"Horn",type:"milling_shank",subType:"coolant_through",system:"M116",d_mm:12,d1_mm:11,l1_mm:130,l2_mm:40,form:"B",grades:[]},
  {partNumber:"M116.0012.02B",manufacturer:"Horn",type:"milling_shank",subType:"coolant_through",system:"M116",d_mm:12,d1_mm:11,l1_mm:130,l2_mm:56,form:"B",grades:[]},
  {partNumber:"M116.0016.01B",manufacturer:"Horn",type:"milling_shank",subType:"coolant_through",system:"M116",d_mm:16,d1_mm:11,l1_mm:130,l2_mm:40,form:"B",grades:[]},
  {partNumber:"M116.0016.02B",manufacturer:"Horn",type:"milling_shank",subType:"coolant_through",system:"M116",d_mm:16,d1_mm:11,l1_mm:130,l2_mm:56,form:"B",grades:[]},
  {partNumber:"M116.0016.03B",manufacturer:"Horn",type:"milling_shank",subType:"coolant_through",system:"M116",d_mm:16,d1_mm:11,l1_mm:150,l2_mm:80,form:"B",grades:[]},
  {partNumber:"M116.0016.01E",manufacturer:"Horn",type:"milling_shank",subType:"coolant_through",system:"M116",d_mm:16,d1_mm:11,l1_mm:130,l2_mm:40,form:"E",grades:[]},
  {partNumber:"M116.0016.02E",manufacturer:"Horn",type:"milling_shank",subType:"coolant_through",system:"M116",d_mm:16,d1_mm:11,l1_mm:130,l2_mm:56,form:"E",grades:[]},
  {partNumber:"M116.0016.03E",manufacturer:"Horn",type:"milling_shank",subType:"coolant_through",system:"M116",d_mm:16,d1_mm:11,l1_mm:150,l2_mm:80,form:"E",grades:[]},
  // MU313 — with through coolant, for inserts 313/U313
  {partNumber:"MU313.0500.01A",manufacturer:"Horn",type:"milling_shank",subType:"coolant_through",system:"MU313",d_in:0.500,l1_in:3.937,form:"A",grades:[]},
  {partNumber:"MU313.0500.01B",manufacturer:"Horn",type:"milling_shank",subType:"coolant_through",system:"MU313",d_in:0.500,l1_in:3.937,form:"B",grades:[]},
  {partNumber:"MU313.0500.02B",manufacturer:"Horn",type:"milling_shank",subType:"coolant_through",system:"MU313",d_in:0.500,l1_in:5.11,form:"B",grades:[]},
  {partNumber:"MU313.0625.01B",manufacturer:"Horn",type:"milling_shank",subType:"coolant_through",system:"MU313",d_in:0.625,l1_in:3.937,l2_in:1.65,form:"B",grades:[]},
  {partNumber:"MU313.0625.02B",manufacturer:"Horn",type:"milling_shank",subType:"coolant_through",system:"MU313",d_in:0.625,l1_in:5.11,l2_in:2.362,form:"B",grades:[]},
  {partNumber:"MU313.0625.03B",manufacturer:"Horn",type:"milling_shank",subType:"coolant_through",system:"MU313",d_in:0.625,l1_in:6.299,l2_in:3.360,form:"B",grades:[]},
  // M313 — metric, with through coolant
  {partNumber:"M313.0012.01B",manufacturer:"Horn",type:"milling_shank",subType:"coolant_through",system:"M313",d_mm:12,d1_mm:12,l1_mm:100,form:"B",grades:[]},
  {partNumber:"M313.0012.02B",manufacturer:"Horn",type:"milling_shank",subType:"coolant_through",system:"M313",d_mm:12,d1_mm:12,l1_mm:130,form:"B",grades:[]},
  {partNumber:"M313.0016.01B",manufacturer:"Horn",type:"milling_shank",subType:"coolant_through",system:"M313",d_mm:16,d1_mm:12,l1_mm:100,l2_mm:42,form:"B",grades:[]},
  {partNumber:"M313.0016.02B",manufacturer:"Horn",type:"milling_shank",subType:"coolant_through",system:"M313",d_mm:16,d1_mm:12,l1_mm:130,l2_mm:60,form:"B",grades:[]},
  {partNumber:"M313.0016.03B",manufacturer:"Horn",type:"milling_shank",subType:"coolant_through",system:"M313",d_mm:16,d1_mm:12,l1_mm:160,l2_mm:85,form:"B",grades:[]},
  {partNumber:"M313.0012.01E",manufacturer:"Horn",type:"milling_shank",subType:"coolant_through",system:"M313",d_mm:12,d1_mm:12,l1_mm:100,form:"E",grades:[]},
  {partNumber:"M313.0012.02E",manufacturer:"Horn",type:"milling_shank",subType:"coolant_through",system:"M313",d_mm:12,d1_mm:12,l1_mm:130,form:"E",grades:[]},
  {partNumber:"M313.0016.01E",manufacturer:"Horn",type:"milling_shank",subType:"coolant_through",system:"M313",d_mm:16,d1_mm:12,l1_mm:100,l2_mm:42,form:"E",grades:[]},
  {partNumber:"M313.0016.02E",manufacturer:"Horn",type:"milling_shank",subType:"coolant_through",system:"M313",d_mm:16,d1_mm:12,l1_mm:130,l2_mm:60,form:"E",grades:[]},
  {partNumber:"M313.0016.03E",manufacturer:"Horn",type:"milling_shank",subType:"coolant_through",system:"M313",d_mm:16,d1_mm:12,l1_mm:160,l2_mm:85,form:"E",grades:[]},
  // M313.ST — cylindrical shank for CNC lathes
  {partNumber:"M313.ST10.01A",manufacturer:"Horn",type:"milling_shank",subType:"cnc_lathe",system:"M313",d_mm:10,d1_mm:11.3,l1_mm:60,form:"A1",grades:[]},
  {partNumber:"M313.ST12.01A",manufacturer:"Horn",type:"milling_shank",subType:"cnc_lathe",system:"M313",d_mm:12,d1_mm:11.3,l1_mm:70,l2_mm:18,form:"A2",grades:[]},
  {partNumber:"M313.ST13.01A",manufacturer:"Horn",type:"milling_shank",subType:"cnc_lathe",system:"M313",d_mm:13,d1_mm:11.3,l1_mm:70,l2_mm:26,form:"A2",grades:[]},
  {partNumber:"M313.ST16.01A",manufacturer:"Horn",type:"milling_shank",subType:"cnc_lathe",system:"M313",d_mm:16,d1_mm:11.3,l1_mm:80,l2_mm:26,form:"A2",grades:[]},
  {partNumber:"M313.ST12.01B",manufacturer:"Horn",type:"milling_shank",subType:"cnc_lathe",system:"M313",d_mm:12,d1_mm:11.3,l1_mm:70,l2_mm:18,form:"B",grades:[]},
  // M313.ER — with ER taper for CNC lathes
  {partNumber:"M313.ER16.0120",manufacturer:"Horn",type:"milling_shank",subType:"er_taper",system:"M313",d_mm:16,d1_mm:11.3,l1_mm:120,grades:[]},
  {partNumber:"M313.ER20.01",manufacturer:"Horn",type:"milling_shank",subType:"er_taper",system:"M313",d_mm:20,d1_mm:11.3,grades:[]},
  {partNumber:"M313.ER16.02",manufacturer:"Horn",type:"milling_shank",subType:"er_taper",system:"M313",d_mm:16,d1_mm:11.3,l1_mm:130,grades:[]},
  {partNumber:"M313.ER20.02",manufacturer:"Horn",type:"milling_shank",subType:"er_taper",system:"M313",d_mm:20,d1_mm:11.3,l1_mm:130,grades:[]},
  {partNumber:"M313.ER25.02",manufacturer:"Horn",type:"milling_shank",subType:"er_taper",system:"M313",d_mm:25,d1_mm:11.3,l1_mm:130,grades:[]},
  {partNumber:"M313.ER32.02",manufacturer:"Horn",type:"milling_shank",subType:"er_taper",system:"M313",d_mm:32,d1_mm:11.3,l1_mm:130,grades:[]},
  // M313.M — screw-in cutter
  {partNumber:"M313.M081.01",manufacturer:"Horn",type:"milling_shank",subType:"screw_in_cutter",system:"M313",d1_mm:11.3,l1_mm:37,l2_mm:15,grades:[]},
  // M313.A — form A (no coolant)
  {partNumber:"M313.0012.01A",manufacturer:"Horn",type:"milling_shank",subType:"no_coolant",system:"M313",d_mm:12,d1_mm:12,l1_mm:100,form:"A",grades:[]},
  {partNumber:"M313.0012.02A",manufacturer:"Horn",type:"milling_shank",subType:"no_coolant",system:"M313",d_mm:12,d1_mm:12,l1_mm:130,form:"A",grades:[]},
  {partNumber:"M313.0016.01A",manufacturer:"Horn",type:"milling_shank",subType:"no_coolant",system:"M313",d_mm:16,d1_mm:12,l1_mm:100,l2_mm:42,form:"A",grades:[]},
  {partNumber:"M313.0016.02A",manufacturer:"Horn",type:"milling_shank",subType:"no_coolant",system:"M313",d_mm:16,d1_mm:12,l1_mm:130,l2_mm:60,form:"A",grades:[]},
  {partNumber:"M313.0016.03A",manufacturer:"Horn",type:"milling_shank",subType:"no_coolant",system:"M313",d_mm:16,d1_mm:12,l1_mm:160,l2_mm:85,form:"A",grades:[]},
  // WFB basic holder for screw-in cutters
  {partNumber:"WFB.2012.M081.01",manufacturer:"Horn",type:"basic_holder",subType:"screw_in_base",system:"WFB",d_mm:30,d1_mm:16,l1_mm:35,l2_mm:7,grades:[]},
];

export const HORN_TOOL_COUNT = HORN_TOOLS.length;
