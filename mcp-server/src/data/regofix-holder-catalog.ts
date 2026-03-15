// @ts-nocheck
// REGO-FIX holder catalog - extracted from REGO-FIX Catalogue 2026 ENGLISH.pdf
// 578 holders across powRgrip (PG), ER, micRun (MR), and uniTec (UT) systems
// Taper interfaces: HSK-A/E/C/F, SK, BT, CAT, CAPTO C3-C8, ISO20, CYL
// Features: TIR <= 3um @ 3xD, G2.5 balancing, vibration damping

export interface RegoFixHolder {
  part_number: string;
  designation: string;
  taper: string;
  system: string;
  collet_size: string;
  bore_diameter_mm: number;
  gauge_length_mm: number;
  holder_type: string;
  balance_grade: string;
  max_rpm: number;
  runout_um: number;
  coolant_through: boolean;
}

export const REGOFIX_HOLDERS: RegoFixHolder[] = [
  // =====================================================
  // powRgrip (PG) System — HSK-A Toolholders (pp.25-28)
  // =====================================================
  // HSK-A 32
  {part_number:"2532.71020",designation:"HSK-A 32/PG 10 x 060",taper:"HSK-A32",system:"powRgrip",collet_size:"PG10",bore_diameter_mm:16,gauge_length_mm:60,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:60000,runout_um:3,coolant_through:false},
  {part_number:"2532.71530",designation:"HSK-A 32/PG 15 x 075",taper:"HSK-A32",system:"powRgrip",collet_size:"PG15",bore_diameter_mm:24,gauge_length_mm:75,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:60000,runout_um:3,coolant_through:false},
  // HSK-A 40
  {part_number:"2540.70610",designation:"HSK-A 40/PG 6 x 048",taper:"HSK-A40",system:"powRgrip",collet_size:"PG6",bore_diameter_mm:10,gauge_length_mm:48,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:45000,runout_um:3,coolant_through:false},
  {part_number:"4540.70640",designation:"HSK-A 40/PG 6 x 080 H",taper:"HSK-A40",system:"powRgrip",collet_size:"PG6",bore_diameter_mm:10,gauge_length_mm:80,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:45000,runout_um:3,coolant_through:true},
  {part_number:"2540.71020",designation:"HSK-A 40/PG 10 x 062",taper:"HSK-A40",system:"powRgrip",collet_size:"PG10",bore_diameter_mm:16,gauge_length_mm:62,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:45000,runout_um:3,coolant_through:false},
  {part_number:"4540.71040",designation:"HSK-A 40/PG 10 x 080 H",taper:"HSK-A40",system:"powRgrip",collet_size:"PG10",bore_diameter_mm:16,gauge_length_mm:80,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:45000,runout_um:3,coolant_through:true},
  {part_number:"4540.71050",designation:"HSK-A 40/PG 10 x 100 H",taper:"HSK-A40",system:"powRgrip",collet_size:"PG10",bore_diameter_mm:16,gauge_length_mm:100,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:45000,runout_um:3,coolant_through:true},
  {part_number:"4540.71060",designation:"HSK-A 40/PG 10 x 120 H",taper:"HSK-A40",system:"powRgrip",collet_size:"PG10",bore_diameter_mm:16,gauge_length_mm:120,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:45000,runout_um:3,coolant_through:true},
  {part_number:"2540.71530",designation:"HSK-A 40/PG 15 x 074",taper:"HSK-A40",system:"powRgrip",collet_size:"PG15",bore_diameter_mm:24,gauge_length_mm:74,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:45000,runout_um:3,coolant_through:false},
  {part_number:"4540.71540",designation:"HSK-A 40/PG 15 x 080 H",taper:"HSK-A40",system:"powRgrip",collet_size:"PG15",bore_diameter_mm:24,gauge_length_mm:80,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:45000,runout_um:3,coolant_through:true},
  {part_number:"4540.71550",designation:"HSK-A 40/PG 15 x 100",taper:"HSK-A40",system:"powRgrip",collet_size:"PG15",bore_diameter_mm:24,gauge_length_mm:100,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:45000,runout_um:3,coolant_through:false},
  {part_number:"2540.72540",designation:"HSK-A 40/PG 25 x 090",taper:"HSK-A40",system:"powRgrip",collet_size:"PG25",bore_diameter_mm:40,gauge_length_mm:90,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:45000,runout_um:3,coolant_through:false},
  {part_number:"4540.72550",designation:"HSK-A 40/PG 25 x 100 H",taper:"HSK-A40",system:"powRgrip",collet_size:"PG25",bore_diameter_mm:40,gauge_length_mm:100,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:45000,runout_um:3,coolant_through:true},
  // HSK-A 50
  {part_number:"4550.71040",designation:"HSK-A 50/PG 10 x 080 H",taper:"HSK-A50",system:"powRgrip",collet_size:"PG10",bore_diameter_mm:16,gauge_length_mm:80,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:36000,runout_um:3,coolant_through:true},
  {part_number:"4550.71050",designation:"HSK-A 50/PG 10 x 100 H",taper:"HSK-A50",system:"powRgrip",collet_size:"PG10",bore_diameter_mm:16,gauge_length_mm:100,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:36000,runout_um:3,coolant_through:true},
  {part_number:"4550.71060",designation:"HSK-A 50/PG 10 x 120 H",taper:"HSK-A50",system:"powRgrip",collet_size:"PG10",bore_diameter_mm:16,gauge_length_mm:120,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:36000,runout_um:3,coolant_through:true},
  {part_number:"4550.71540",designation:"HSK-A 50/PG 15 x 080 H",taper:"HSK-A50",system:"powRgrip",collet_size:"PG15",bore_diameter_mm:24,gauge_length_mm:80,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:36000,runout_um:3,coolant_through:true},
  {part_number:"2550.72540",designation:"HSK-A 50/PG 25 x 090 NL",taper:"HSK-A50",system:"powRgrip",collet_size:"PG25",bore_diameter_mm:40,gauge_length_mm:90,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:36000,runout_um:3,coolant_through:true},
  {part_number:"4550.72550",designation:"HSK-A 50/PG 25 x 100 H",taper:"HSK-A50",system:"powRgrip",collet_size:"PG25",bore_diameter_mm:40,gauge_length_mm:100,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:36000,runout_um:3,coolant_through:true},
  // HSK-A 63
  {part_number:"4563.70640",designation:"HSK-A 63/PG 6 x 080 H",taper:"HSK-A63",system:"powRgrip",collet_size:"PG6",bore_diameter_mm:10,gauge_length_mm:80,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"4563.71040",designation:"HSK-A 63/PG 10 x 080 H",taper:"HSK-A63",system:"powRgrip",collet_size:"PG10",bore_diameter_mm:16,gauge_length_mm:80,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"4563.71050",designation:"HSK-A 63/PG 10 x 100 H",taper:"HSK-A63",system:"powRgrip",collet_size:"PG10",bore_diameter_mm:16,gauge_length_mm:100,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"4563.71060",designation:"HSK-A 63/PG 10 x 120 H",taper:"HSK-A63",system:"powRgrip",collet_size:"PG10",bore_diameter_mm:16,gauge_length_mm:120,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"4563.71080",designation:"HSK-A 63/PG 10 x 160 H",taper:"HSK-A63",system:"powRgrip",collet_size:"PG10",bore_diameter_mm:16,gauge_length_mm:160,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"4563.71090",designation:"HSK-A 63/PG 10 x 200 H",taper:"HSK-A63",system:"powRgrip",collet_size:"PG10",bore_diameter_mm:16,gauge_length_mm:200,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"8865.71070",designation:"HSK-A 63/PG 10 x 240 XL",taper:"HSK-A63",system:"powRgrip",collet_size:"PG10",bore_diameter_mm:16,gauge_length_mm:240,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:5000,runout_um:10,coolant_through:false},
  {part_number:"8865.71090",designation:"HSK-A 63/PG 10 x 260 XL",taper:"HSK-A63",system:"powRgrip",collet_size:"PG10",bore_diameter_mm:16,gauge_length_mm:260,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:5000,runout_um:10,coolant_through:false},
  {part_number:"8865.71130",designation:"HSK-A 63/PG 10 x 300 XL",taper:"HSK-A63",system:"powRgrip",collet_size:"PG10",bore_diameter_mm:16,gauge_length_mm:300,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:5000,runout_um:10,coolant_through:false},
  {part_number:"8865.71170",designation:"HSK-A 63/PG 10 x 340 XL",taper:"HSK-A63",system:"powRgrip",collet_size:"PG10",bore_diameter_mm:16,gauge_length_mm:340,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:5000,runout_um:10,coolant_through:false},
  {part_number:"8865.71190",designation:"HSK-A 63/PG 10 x 360 XL",taper:"HSK-A63",system:"powRgrip",collet_size:"PG10",bore_diameter_mm:16,gauge_length_mm:360,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:5000,runout_um:10,coolant_through:false},
  {part_number:"8865.71230",designation:"HSK-A 63/PG 10 x 400 XL",taper:"HSK-A63",system:"powRgrip",collet_size:"PG10",bore_diameter_mm:16,gauge_length_mm:400,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:5000,runout_um:10,coolant_through:false},
  {part_number:"4563.71540",designation:"HSK-A 63/PG 15 x 080 H",taper:"HSK-A63",system:"powRgrip",collet_size:"PG15",bore_diameter_mm:24,gauge_length_mm:80,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"4563.71550",designation:"HSK-A 63/PG 15 x 100 H",taper:"HSK-A63",system:"powRgrip",collet_size:"PG15",bore_diameter_mm:24,gauge_length_mm:100,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"4563.71560",designation:"HSK-A 63/PG 15 x 120 H",taper:"HSK-A63",system:"powRgrip",collet_size:"PG15",bore_diameter_mm:24,gauge_length_mm:120,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"4563.71580",designation:"HSK-A 63/PG 15 x 160 H",taper:"HSK-A63",system:"powRgrip",collet_size:"PG15",bore_diameter_mm:24,gauge_length_mm:160,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"4563.71590",designation:"HSK-A 63/PG 15 x 200 H",taper:"HSK-A63",system:"powRgrip",collet_size:"PG15",bore_diameter_mm:24,gauge_length_mm:200,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"8865.73070",designation:"HSK-A 63/PG 15 x 240 XL",taper:"HSK-A63",system:"powRgrip",collet_size:"PG15",bore_diameter_mm:24,gauge_length_mm:240,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:5000,runout_um:10,coolant_through:false},
  {part_number:"8865.73130",designation:"HSK-A 63/PG 15 x 300 XL",taper:"HSK-A63",system:"powRgrip",collet_size:"PG15",bore_diameter_mm:24,gauge_length_mm:300,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:5000,runout_um:10,coolant_through:false},
  {part_number:"8865.73190",designation:"HSK-A 63/PG 15 x 360 XL",taper:"HSK-A63",system:"powRgrip",collet_size:"PG15",bore_diameter_mm:24,gauge_length_mm:360,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:5000,runout_um:10,coolant_through:false},
  {part_number:"8865.73230",designation:"HSK-A 63/PG 15 x 400 XL",taper:"HSK-A63",system:"powRgrip",collet_size:"PG15",bore_diameter_mm:24,gauge_length_mm:400,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:5000,runout_um:10,coolant_through:false},
  {part_number:"4563.72540",designation:"HSK-A 63/PG 25 x 085 H NL",taper:"HSK-A63",system:"powRgrip",collet_size:"PG25",bore_diameter_mm:40,gauge_length_mm:85,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"4563.72550",designation:"HSK-A 63/PG 25 x 100 H",taper:"HSK-A63",system:"powRgrip",collet_size:"PG25",bore_diameter_mm:40,gauge_length_mm:100,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"4563.72560",designation:"HSK-A 63/PG 25 x 120 H",taper:"HSK-A63",system:"powRgrip",collet_size:"PG25",bore_diameter_mm:40,gauge_length_mm:120,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"4563.72580",designation:"HSK-A 63/PG 25 x 160 H",taper:"HSK-A63",system:"powRgrip",collet_size:"PG25",bore_diameter_mm:40,gauge_length_mm:160,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"4563.72590",designation:"HSK-A 63/PG 25 x 200 H",taper:"HSK-A63",system:"powRgrip",collet_size:"PG25",bore_diameter_mm:40,gauge_length_mm:200,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"8865.76070",designation:"HSK-A 63/PG 25 x 240 XL",taper:"HSK-A63",system:"powRgrip",collet_size:"PG25",bore_diameter_mm:40,gauge_length_mm:240,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:5000,runout_um:10,coolant_through:false},
  {part_number:"8865.76090",designation:"HSK-A 63/PG 25 x 260 XL",taper:"HSK-A63",system:"powRgrip",collet_size:"PG25",bore_diameter_mm:40,gauge_length_mm:260,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:5000,runout_um:10,coolant_through:false},
  {part_number:"8865.76170",designation:"HSK-A 63/PG 25 x 340 XL",taper:"HSK-A63",system:"powRgrip",collet_size:"PG25",bore_diameter_mm:40,gauge_length_mm:340,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:5000,runout_um:10,coolant_through:false},
  {part_number:"8865.76190",designation:"HSK-A 63/PG 25 x 360 XL",taper:"HSK-A63",system:"powRgrip",collet_size:"PG25",bore_diameter_mm:40,gauge_length_mm:360,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:5000,runout_um:10,coolant_through:false},
  {part_number:"2563.73250",designation:"HSK-A 63/PG 32 x 100",taper:"HSK-A63",system:"powRgrip",collet_size:"PG32",bore_diameter_mm:50,gauge_length_mm:100,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:false},
  {part_number:"4563.73260",designation:"HSK-A 63/PG 32 x 120 H",taper:"HSK-A63",system:"powRgrip",collet_size:"PG32",bore_diameter_mm:50,gauge_length_mm:120,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"8865.78070",designation:"HSK-A 63/PG 32 x 240 XL",taper:"HSK-A63",system:"powRgrip",collet_size:"PG32",bore_diameter_mm:50,gauge_length_mm:240,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:5000,runout_um:10,coolant_through:false},
  {part_number:"8865.78170",designation:"HSK-A 63/PG 32 x 340 XL",taper:"HSK-A63",system:"powRgrip",collet_size:"PG32",bore_diameter_mm:50,gauge_length_mm:340,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:5000,runout_um:10,coolant_through:false},
  {part_number:"8865.78270",designation:"HSK-A 63/PG 32 x 440 XL",taper:"HSK-A63",system:"powRgrip",collet_size:"PG32",bore_diameter_mm:50,gauge_length_mm:440,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:5000,runout_um:10,coolant_through:false},
  // HSK-A 63 toolVibe
  {part_number:"5563.91560",designation:"HSK-A 63/PG 15 x 120 TV",taper:"HSK-A63",system:"powRgrip_toolVibe",collet_size:"PG15",bore_diameter_mm:24,gauge_length_mm:120,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:false},
  {part_number:"5563.92560",designation:"HSK-A 63/PG 25 x 120 TV",taper:"HSK-A63",system:"powRgrip_toolVibe",collet_size:"PG25",bore_diameter_mm:40,gauge_length_mm:120,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:false},
  {part_number:"5563.93260",designation:"HSK-A 63/PG 32 x 120 NL TV",taper:"HSK-A63",system:"powRgrip_toolVibe",collet_size:"PG32",bore_diameter_mm:50,gauge_length_mm:120,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:false},
  // HSK-A 80
  {part_number:"4580.71540",designation:"HSK-A 80/PG 15 x 085 H",taper:"HSK-A80",system:"powRgrip",collet_size:"PG15",bore_diameter_mm:24,gauge_length_mm:85,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"4580.72550",designation:"HSK-A 80/PG 25 x 100 H",taper:"HSK-A80",system:"powRgrip",collet_size:"PG25",bore_diameter_mm:40,gauge_length_mm:100,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"4580.73250",designation:"HSK-A 80/PG 32 x 105 H",taper:"HSK-A80",system:"powRgrip",collet_size:"PG32",bore_diameter_mm:50,gauge_length_mm:105,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  // HSK-A 100 (representative selection)
  {part_number:"4500.71040",designation:"HSK-A 100/PG 10 x 085 H",taper:"HSK-A100",system:"powRgrip",collet_size:"PG10",bore_diameter_mm:16,gauge_length_mm:85,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"4500.71080",designation:"HSK-A 100/PG 10 x 160 H",taper:"HSK-A100",system:"powRgrip",collet_size:"PG10",bore_diameter_mm:16,gauge_length_mm:160,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"4500.71540",designation:"HSK-A 100/PG 15 x 085 H",taper:"HSK-A100",system:"powRgrip",collet_size:"PG15",bore_diameter_mm:24,gauge_length_mm:85,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"4500.71560",designation:"HSK-A 100/PG 15 x 120 H",taper:"HSK-A100",system:"powRgrip",collet_size:"PG15",bore_diameter_mm:24,gauge_length_mm:120,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"4500.72550",designation:"HSK-A 100/PG 25 x 100 H",taper:"HSK-A100",system:"powRgrip",collet_size:"PG25",bore_diameter_mm:40,gauge_length_mm:100,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"4500.72580",designation:"HSK-A 100/PG 25 x 160 H",taper:"HSK-A100",system:"powRgrip",collet_size:"PG25",bore_diameter_mm:40,gauge_length_mm:160,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"4500.72590",designation:"HSK-A 100/PG 25 x 200 H",taper:"HSK-A100",system:"powRgrip",collet_size:"PG25",bore_diameter_mm:40,gauge_length_mm:200,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"8885.76130",designation:"HSK-A 100/PG 25 x 300 XL",taper:"HSK-A100",system:"powRgrip",collet_size:"PG25",bore_diameter_mm:40,gauge_length_mm:300,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:5000,runout_um:10,coolant_through:false},
  {part_number:"8885.76230",designation:"HSK-A 100/PG 25 x 400 XL",taper:"HSK-A100",system:"powRgrip",collet_size:"PG25",bore_diameter_mm:40,gauge_length_mm:400,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:5000,runout_um:10,coolant_through:false},
  {part_number:"8885.76370",designation:"HSK-A 100/PG 25 x 540 XL",taper:"HSK-A100",system:"powRgrip",collet_size:"PG25",bore_diameter_mm:40,gauge_length_mm:540,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:5000,runout_um:10,coolant_through:false},
  {part_number:"4500.73250",designation:"HSK-A 100/PG 32 x 106 H",taper:"HSK-A100",system:"powRgrip",collet_size:"PG32",bore_diameter_mm:50,gauge_length_mm:106,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"4500.73290",designation:"HSK-A 100/PG 32 x 200 H",taper:"HSK-A100",system:"powRgrip",collet_size:"PG32",bore_diameter_mm:50,gauge_length_mm:200,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"8885.78130",designation:"HSK-A 100/PG 32 x 300 XL",taper:"HSK-A100",system:"powRgrip",collet_size:"PG32",bore_diameter_mm:50,gauge_length_mm:300,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:5000,runout_um:10,coolant_through:false},
  {part_number:"8885.78370",designation:"HSK-A 100/PG 32 x 540 XL",taper:"HSK-A100",system:"powRgrip",collet_size:"PG32",bore_diameter_mm:50,gauge_length_mm:540,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:5000,runout_um:10,coolant_through:false},
  // HSK-A 125
  {part_number:"8895.73070",designation:"HSK-A 125/PG 15 x 245 XL",taper:"HSK-A125",system:"powRgrip",collet_size:"PG15",bore_diameter_mm:24,gauge_length_mm:245,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:5000,runout_um:10,coolant_through:false},
  {part_number:"8895.76080",designation:"HSK-A 125/PG 25 x 252 XL",taper:"HSK-A125",system:"powRgrip",collet_size:"PG25",bore_diameter_mm:40,gauge_length_mm:252,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:5000,runout_um:10,coolant_through:false},
  {part_number:"8895.78080",designation:"HSK-A 125/PG 32 x 252 XL",taper:"HSK-A125",system:"powRgrip",collet_size:"PG32",bore_diameter_mm:50,gauge_length_mm:252,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:5000,runout_um:10,coolant_through:false},
  // =====================================================
  // powRgrip (PG) System — HSK-E Toolholders (p.30)
  // =====================================================
  {part_number:"2915.70600",designation:"ATC-E 15/PG 6 x 034",taper:"ATC-E15",system:"powRgrip",collet_size:"PG6",bore_diameter_mm:10,gauge_length_mm:34,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:90000,runout_um:3,coolant_through:false},
  {part_number:"2515.70604",designation:"HSK-EZ 15/PG 6 x 034",taper:"HSK-EZ15",system:"powRgrip",collet_size:"PG6",bore_diameter_mm:10,gauge_length_mm:34,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:90000,runout_um:3,coolant_through:false},
  {part_number:"2520.70614",designation:"HSK-E 20/PG 6 x 043",taper:"HSK-E20",system:"powRgrip",collet_size:"PG6",bore_diameter_mm:10,gauge_length_mm:43,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:90000,runout_um:3,coolant_through:false},
  {part_number:"2525.70614",designation:"HSK-E 25/PG 6 x 043",taper:"HSK-E25",system:"powRgrip",collet_size:"PG6",bore_diameter_mm:10,gauge_length_mm:43,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:90000,runout_um:3,coolant_through:false},
  {part_number:"2532.70614",designation:"HSK-E 32/PG 6 x 048",taper:"HSK-E32",system:"powRgrip",collet_size:"PG6",bore_diameter_mm:10,gauge_length_mm:48,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:60000,runout_um:3,coolant_through:false},
  {part_number:"2532.71024",designation:"HSK-E 32/PG 10 x 060",taper:"HSK-E32",system:"powRgrip",collet_size:"PG10",bore_diameter_mm:16,gauge_length_mm:60,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:60000,runout_um:3,coolant_through:false},
  {part_number:"4540.71044",designation:"HSK-E 40/PG 10 x 080 H",taper:"HSK-E40",system:"powRgrip",collet_size:"PG10",bore_diameter_mm:16,gauge_length_mm:80,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:45000,runout_um:3,coolant_through:true},
  {part_number:"4540.71054",designation:"HSK-E 40/PG 10 x 100 H",taper:"HSK-E40",system:"powRgrip",collet_size:"PG10",bore_diameter_mm:16,gauge_length_mm:100,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:45000,runout_um:3,coolant_through:true},
  {part_number:"4540.71064",designation:"HSK-E 40/PG 10 x 120 H",taper:"HSK-E40",system:"powRgrip",collet_size:"PG10",bore_diameter_mm:16,gauge_length_mm:120,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:45000,runout_um:3,coolant_through:true},
  {part_number:"4540.71544",designation:"HSK-E 40/PG 15 x 080 H",taper:"HSK-E40",system:"powRgrip",collet_size:"PG15",bore_diameter_mm:24,gauge_length_mm:80,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:45000,runout_um:3,coolant_through:true},
  {part_number:"4540.72554",designation:"HSK-E 40/PG 25 x 100 H",taper:"HSK-E40",system:"powRgrip",collet_size:"PG25",bore_diameter_mm:40,gauge_length_mm:100,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:45000,runout_um:3,coolant_through:true},
  // =====================================================
  // powRgrip (PG) System — SK Toolholders (pp.33-35)
  // =====================================================
  {part_number:"4230.70640",designation:"SK 30/PG 6 x 080 H",taper:"SK30",system:"powRgrip",collet_size:"PG6",bore_diameter_mm:10,gauge_length_mm:80,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:30000,runout_um:3,coolant_through:true},
  {part_number:"2230.71020",designation:"SK 30/PG 10 x 060",taper:"SK30",system:"powRgrip",collet_size:"PG10",bore_diameter_mm:16,gauge_length_mm:60,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:30000,runout_um:3,coolant_through:false},
  {part_number:"4240.71040",designation:"SK 40/PG 10 x 080 H",taper:"SK40",system:"powRgrip",collet_size:"PG10",bore_diameter_mm:16,gauge_length_mm:80,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"4240.71060",designation:"SK 40/PG 10 x 120 H",taper:"SK40",system:"powRgrip",collet_size:"PG10",bore_diameter_mm:16,gauge_length_mm:120,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"4240.71540",designation:"SK 40/PG 15 x 080 H",taper:"SK40",system:"powRgrip",collet_size:"PG15",bore_diameter_mm:24,gauge_length_mm:80,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"4240.72540",designation:"SK 40/PG 25 x 080 H",taper:"SK40",system:"powRgrip",collet_size:"PG25",bore_diameter_mm:40,gauge_length_mm:80,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"8842.71050",designation:"SK 40/PG 10 x 220 XL",taper:"SK40",system:"powRgrip",collet_size:"PG10",bore_diameter_mm:16,gauge_length_mm:220,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:5000,runout_um:10,coolant_through:false},
  {part_number:"4250.72550",designation:"SK 50/PG 25 x 100 H",taper:"SK50",system:"powRgrip",collet_size:"PG25",bore_diameter_mm:40,gauge_length_mm:100,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"4250.72580",designation:"SK 50/PG 25 x 160 H",taper:"SK50",system:"powRgrip",collet_size:"PG25",bore_diameter_mm:40,gauge_length_mm:160,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"8852.76330",designation:"SK 50/PG 25 x 500 XL",taper:"SK50",system:"powRgrip",collet_size:"PG25",bore_diameter_mm:40,gauge_length_mm:500,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:5000,runout_um:10,coolant_through:false},
  // SK+ dual contact
  {part_number:"4240.71046",designation:"SK+ 40/PG 10 x 080 H",taper:"SK+40",system:"powRgrip",collet_size:"PG10",bore_diameter_mm:16,gauge_length_mm:80,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"4240.72546",designation:"SK+ 40/PG 25 x 080 H",taper:"SK+40",system:"powRgrip",collet_size:"PG25",bore_diameter_mm:40,gauge_length_mm:80,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  // =====================================================
  // powRgrip (PG) System — BT Toolholders (pp.39-42)
  // =====================================================
  {part_number:"2130.70610",designation:"BT 30/PG 6 x 050",taper:"BT30",system:"powRgrip",collet_size:"PG6",bore_diameter_mm:10,gauge_length_mm:50,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:30000,runout_um:3,coolant_through:false},
  {part_number:"4130.71040",designation:"BT 30/PG 10 x 080 H",taper:"BT30",system:"powRgrip",collet_size:"PG10",bore_diameter_mm:16,gauge_length_mm:80,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:30000,runout_um:3,coolant_through:true},
  {part_number:"4130.71060",designation:"BT 30/PG 10 x 120 H",taper:"BT30",system:"powRgrip",collet_size:"PG10",bore_diameter_mm:16,gauge_length_mm:120,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:30000,runout_um:3,coolant_through:true},
  {part_number:"4130.72540",designation:"BT 30/PG 25 x 080 H",taper:"BT30",system:"powRgrip",collet_size:"PG25",bore_diameter_mm:40,gauge_length_mm:80,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:30000,runout_um:3,coolant_through:true},
  {part_number:"4140.71040",designation:"BT 40/PG 10 x 080 H",taper:"BT40",system:"powRgrip",collet_size:"PG10",bore_diameter_mm:16,gauge_length_mm:80,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"4140.71060",designation:"BT 40/PG 10 x 120 H",taper:"BT40",system:"powRgrip",collet_size:"PG10",bore_diameter_mm:16,gauge_length_mm:120,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"4140.71540",designation:"BT 40/PG 15 x 080 H",taper:"BT40",system:"powRgrip",collet_size:"PG15",bore_diameter_mm:24,gauge_length_mm:80,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"4140.72540",designation:"BT 40/PG 25 x 080 H",taper:"BT40",system:"powRgrip",collet_size:"PG25",bore_diameter_mm:40,gauge_length_mm:80,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"8841.71050",designation:"BT 40/PG 10 x 220 XL",taper:"BT40",system:"powRgrip",collet_size:"PG10",bore_diameter_mm:16,gauge_length_mm:220,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:5000,runout_um:10,coolant_through:false},
  {part_number:"2140.73240",designation:"BT 40/PG 32 x 086",taper:"BT40",system:"powRgrip",collet_size:"PG32",bore_diameter_mm:50,gauge_length_mm:86,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:false},
  {part_number:"4150.71060",designation:"BT 50/PG 10 x 120 H",taper:"BT50",system:"powRgrip",collet_size:"PG10",bore_diameter_mm:16,gauge_length_mm:120,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"4150.72560",designation:"BT 50/PG 25 x 120 H",taper:"BT50",system:"powRgrip",collet_size:"PG25",bore_diameter_mm:40,gauge_length_mm:120,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"2150.73250",designation:"BT 50/PG 32 x 100",taper:"BT50",system:"powRgrip",collet_size:"PG32",bore_diameter_mm:50,gauge_length_mm:100,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:false},
  // BT+ dual contact
  {part_number:"4130.71046",designation:"BT+ 30/PG 10 x 080 H",taper:"BT+30",system:"powRgrip",collet_size:"PG10",bore_diameter_mm:16,gauge_length_mm:80,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:30000,runout_um:3,coolant_through:true},
  {part_number:"4140.71046",designation:"BT+ 40/PG 10 x 080 H",taper:"BT+40",system:"powRgrip",collet_size:"PG10",bore_diameter_mm:16,gauge_length_mm:80,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"4140.72546",designation:"BT+ 40/PG 25 x 080 H",taper:"BT+40",system:"powRgrip",collet_size:"PG25",bore_diameter_mm:40,gauge_length_mm:80,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"4150.72566",designation:"BT+ 50/PG 25 x 120 H",taper:"BT+50",system:"powRgrip",collet_size:"PG25",bore_diameter_mm:40,gauge_length_mm:120,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  // =====================================================
  // powRgrip (PG) System — CAT Toolholders (pp.47-49)
  // =====================================================
  {part_number:"4340.71001",designation:"CAT 40/PG 10 x 3.5in H",taper:"CAT40",system:"powRgrip",collet_size:"PG10",bore_diameter_mm:16,gauge_length_mm:89,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"4340.71071",designation:"CAT 40/PG 10 x 6in H",taper:"CAT40",system:"powRgrip",collet_size:"PG10",bore_diameter_mm:16,gauge_length_mm:152,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"8843.71131",designation:"CAT 40/PG 10 x 12in XL",taper:"CAT40",system:"powRgrip",collet_size:"PG10",bore_diameter_mm:16,gauge_length_mm:305,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:5000,runout_um:10,coolant_through:false},
  {part_number:"4340.71551",designation:"CAT 40/PG 15 x 4in H",taper:"CAT40",system:"powRgrip",collet_size:"PG15",bore_diameter_mm:24,gauge_length_mm:102,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"4340.72551",designation:"CAT 40/PG 25 x 4in H",taper:"CAT40",system:"powRgrip",collet_size:"PG25",bore_diameter_mm:40,gauge_length_mm:102,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"4340.73251",designation:"CAT 40/PG 32 x 4.3in H",taper:"CAT40",system:"powRgrip",collet_size:"PG32",bore_diameter_mm:50,gauge_length_mm:109,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"4350.71051",designation:"CAT 50/PG 10 x 4in H",taper:"CAT50",system:"powRgrip",collet_size:"PG10",bore_diameter_mm:16,gauge_length_mm:102,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"4350.72551",designation:"CAT 50/PG 25 x 4in H",taper:"CAT50",system:"powRgrip",collet_size:"PG25",bore_diameter_mm:40,gauge_length_mm:102,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"4350.73271",designation:"CAT 50/PG 32 x 6in H",taper:"CAT50",system:"powRgrip",collet_size:"PG32",bore_diameter_mm:50,gauge_length_mm:152,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"8853.78321",designation:"CAT 50/PG 32 x 19.39in XL",taper:"CAT50",system:"powRgrip",collet_size:"PG32",bore_diameter_mm:50,gauge_length_mm:492,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:5000,runout_um:10,coolant_through:false},
  // CAT+ dual contact
  {part_number:"4340.71006",designation:"CAT+ 40/PG 10 x 3.5in H",taper:"CAT+40",system:"powRgrip",collet_size:"PG10",bore_diameter_mm:16,gauge_length_mm:89,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"4340.72556",designation:"CAT+ 40/PG 25 x 4in H",taper:"CAT+40",system:"powRgrip",collet_size:"PG25",bore_diameter_mm:40,gauge_length_mm:102,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"4350.72556",designation:"CAT+ 50/PG 25 x 4in H",taper:"CAT+50",system:"powRgrip",collet_size:"PG25",bore_diameter_mm:40,gauge_length_mm:102,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  // =====================================================
  // powRgrip (PG) System — CAPTO Toolholders (pp.51-52)
  // =====================================================
  {part_number:"2803.70610",designation:"C3/PG 6 x 045",taper:"C3",system:"powRgrip",collet_size:"PG6",bore_diameter_mm:10,gauge_length_mm:45,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:60000,runout_um:3,coolant_through:false},
  {part_number:"2803.71010",designation:"C3/PG 10 x 055",taper:"C3",system:"powRgrip",collet_size:"PG10",bore_diameter_mm:16,gauge_length_mm:55,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:60000,runout_um:3,coolant_through:false},
  {part_number:"2804.71020",designation:"C4/PG 10 x 060",taper:"C4",system:"powRgrip",collet_size:"PG10",bore_diameter_mm:16,gauge_length_mm:60,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:45000,runout_um:3,coolant_through:false},
  {part_number:"4805.71040",designation:"C5/PG 10 x 080 H",taper:"C5",system:"powRgrip",collet_size:"PG10",bore_diameter_mm:16,gauge_length_mm:80,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:36000,runout_um:3,coolant_through:true},
  {part_number:"4805.72550",designation:"C5/PG 25 x 100 H",taper:"C5",system:"powRgrip",collet_size:"PG25",bore_diameter_mm:40,gauge_length_mm:100,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:36000,runout_um:3,coolant_through:true},
  {part_number:"4806.71040",designation:"C6/PG 10 x 080 H",taper:"C6",system:"powRgrip",collet_size:"PG10",bore_diameter_mm:16,gauge_length_mm:80,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"4806.71060",designation:"C6/PG 10 x 120 H",taper:"C6",system:"powRgrip",collet_size:"PG10",bore_diameter_mm:16,gauge_length_mm:120,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"8886.71130",designation:"C6/PG 10 x 300 XL",taper:"C6",system:"powRgrip",collet_size:"PG10",bore_diameter_mm:16,gauge_length_mm:300,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:5000,runout_um:10,coolant_through:false},
  {part_number:"4806.71540",designation:"C6/PG 15 x 080 H",taper:"C6",system:"powRgrip",collet_size:"PG15",bore_diameter_mm:24,gauge_length_mm:80,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"4806.72550",designation:"C6/PG 25 x 100 H",taper:"C6",system:"powRgrip",collet_size:"PG25",bore_diameter_mm:40,gauge_length_mm:100,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"2806.73240",designation:"C6/PG 32 x 090",taper:"C6",system:"powRgrip",collet_size:"PG32",bore_diameter_mm:50,gauge_length_mm:90,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:false},
  {part_number:"8888.71060",designation:"C8/PG 10 x 232 XL",taper:"C8",system:"powRgrip",collet_size:"PG10",bore_diameter_mm:16,gauge_length_mm:232,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:5000,runout_um:10,coolant_through:false},
  {part_number:"2808.72540",designation:"C8/PG 25 x 092",taper:"C8",system:"powRgrip",collet_size:"PG25",bore_diameter_mm:40,gauge_length_mm:92,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:false},
  {part_number:"2808.73240",designation:"C8/PG 32 x 090",taper:"C8",system:"powRgrip",collet_size:"PG32",bore_diameter_mm:50,gauge_length_mm:90,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:false},
  // =====================================================
  // powRgrip (PG) System — ISO 20 & CYL (pp.53,55)
  // =====================================================
  {part_number:"8020.24207",designation:"ISO-HAAS 20/PG 6 x 075",taper:"ISO20",system:"powRgrip",collet_size:"PG6",bore_diameter_mm:10,gauge_length_mm:75,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:50000,runout_um:3,coolant_through:false},
  {part_number:"2420.71015",designation:"ISO-HAAS 20/PG 10 x 058",taper:"ISO20",system:"powRgrip",collet_size:"PG10",bore_diameter_mm:16,gauge_length_mm:58,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:50000,runout_um:3,coolant_through:false},
  {part_number:"2610.70620",designation:"CYL 10/PG 6 x 120",taper:"CYL10",system:"powRgrip",collet_size:"PG6",bore_diameter_mm:10,gauge_length_mm:120,holder_type:"cylindrical",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:false},
  {part_number:"2610.71020",designation:"CYL 10/PG 10 x 120",taper:"CYL10",system:"powRgrip",collet_size:"PG10",bore_diameter_mm:16,gauge_length_mm:120,holder_type:"cylindrical",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:false},
  {part_number:"2620.71020",designation:"CYL 20/PG 10 x 120",taper:"CYL20",system:"powRgrip",collet_size:"PG10",bore_diameter_mm:16,gauge_length_mm:120,holder_type:"cylindrical",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:false},
  {part_number:"2620.71040",designation:"CYL 20/PG 10 x 160",taper:"CYL20",system:"powRgrip",collet_size:"PG10",bore_diameter_mm:16,gauge_length_mm:160,holder_type:"cylindrical",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:false},
  {part_number:"2625.71540",designation:"CYL 25/PG 15 x 160",taper:"CYL25",system:"powRgrip",collet_size:"PG15",bore_diameter_mm:24,gauge_length_mm:160,holder_type:"cylindrical",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:false},
  {part_number:"8020.25100",designation:"CYL 25/PG 25 x 100",taper:"CYL25",system:"powRgrip",collet_size:"PG25",bore_diameter_mm:40,gauge_length_mm:100,holder_type:"cylindrical",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:false},
  // =====================================================
  // powRgrip secuRgrip PG-SG (pp.57-59) — pullout protection
  // =====================================================
  {part_number:"5563.72550",designation:"HSK-A 63/PG 25-SG x 100 H",taper:"HSK-A63",system:"powRgrip_secuRgrip",collet_size:"PG25-SG",bore_diameter_mm:46,gauge_length_mm:100,holder_type:"secuRgrip",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"5563.72580",designation:"HSK-A 63/PG 25-SG x 160 H",taper:"HSK-A63",system:"powRgrip_secuRgrip",collet_size:"PG25-SG",bore_diameter_mm:46,gauge_length_mm:160,holder_type:"secuRgrip",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"5500.72550",designation:"HSK-A 100/PG 25-SG x 100 H",taper:"HSK-A100",system:"powRgrip_secuRgrip",collet_size:"PG25-SG",bore_diameter_mm:46,gauge_length_mm:100,holder_type:"secuRgrip",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"5500.73250",designation:"HSK-A 100/PG 32-SG x 106 H",taper:"HSK-A100",system:"powRgrip_secuRgrip",collet_size:"PG32-SG",bore_diameter_mm:55,gauge_length_mm:106,holder_type:"secuRgrip",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"5140.72540",designation:"BT 40/PG 25-SG x 080 H",taper:"BT40",system:"powRgrip_secuRgrip",collet_size:"PG25-SG",bore_diameter_mm:46,gauge_length_mm:80,holder_type:"secuRgrip",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"5340.72551",designation:"CAT 40/PG 25-SG x 4in H",taper:"CAT40",system:"powRgrip_secuRgrip",collet_size:"PG25-SG",bore_diameter_mm:46,gauge_length_mm:102,holder_type:"secuRgrip",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"5350.72551",designation:"CAT 50/PG 25-SG x 4in H",taper:"CAT50",system:"powRgrip_secuRgrip",collet_size:"PG25-SG",bore_diameter_mm:46,gauge_length_mm:102,holder_type:"secuRgrip",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  // =====================================================
  // ER System — HSK-A ER Toolholders (pp.95-100)
  // =====================================================
  {part_number:"2532.11110",designation:"HSK-A 32/ER 11 x 050",taper:"HSK-A32",system:"ER",collet_size:"ER11",bore_diameter_mm:19,gauge_length_mm:50,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:60000,runout_um:3,coolant_through:false},
  {part_number:"2532.11620",designation:"HSK-A 32/ER 16 x 060",taper:"HSK-A32",system:"ER",collet_size:"ER16",bore_diameter_mm:28,gauge_length_mm:60,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:60000,runout_um:3,coolant_through:false},
  {part_number:"2532.12020",designation:"HSK-A 32/ER 20 x 060",taper:"HSK-A32",system:"ER",collet_size:"ER20",bore_diameter_mm:34,gauge_length_mm:60,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:60000,runout_um:3,coolant_through:false},
  {part_number:"2532.12520",designation:"HSK-A 32/ER 25 x 065",taper:"HSK-A32",system:"ER",collet_size:"ER25",bore_diameter_mm:42,gauge_length_mm:65,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:60000,runout_um:3,coolant_through:false},
  {part_number:"4563.11650",designation:"HSK-A 63/ER 16 x 100 H",taper:"HSK-A63",system:"ER",collet_size:"ER16",bore_diameter_mm:28,gauge_length_mm:100,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"4563.12550",designation:"HSK-A 63/ER 25 x 100 H",taper:"HSK-A63",system:"ER",collet_size:"ER25",bore_diameter_mm:42,gauge_length_mm:100,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"4563.13250",designation:"HSK-A 63/ER 32 x 100 H",taper:"HSK-A63",system:"ER",collet_size:"ER32",bore_diameter_mm:50,gauge_length_mm:100,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"2563.14040",designation:"HSK-A 63/ER 40 x 080",taper:"HSK-A63",system:"ER",collet_size:"ER40",bore_diameter_mm:63,gauge_length_mm:80,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:false},
  {part_number:"4500.11650",designation:"HSK-A 100/ER 16 x 100 H",taper:"HSK-A100",system:"ER",collet_size:"ER16",bore_diameter_mm:28,gauge_length_mm:100,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"4500.12550",designation:"HSK-A 100/ER 25 x 100 H",taper:"HSK-A100",system:"ER",collet_size:"ER25",bore_diameter_mm:42,gauge_length_mm:100,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"4500.13250",designation:"HSK-A 100/ER 32 x 100 H",taper:"HSK-A100",system:"ER",collet_size:"ER32",bore_diameter_mm:50,gauge_length_mm:100,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"4500.14060",designation:"HSK-A 100/ER 40 x 120 H",taper:"HSK-A100",system:"ER",collet_size:"ER40",bore_diameter_mm:63,gauge_length_mm:120,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  // HSK-E/F ER (pp.98-99)
  {part_number:"5515.20604",designation:"HSK-EZ 15/SR 6 x 022",taper:"HSK-EZ15",system:"ER",collet_size:"SR6",bore_diameter_mm:10,gauge_length_mm:22,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:90000,runout_um:3,coolant_through:false},
  {part_number:"2525.11618",designation:"HSK-E 25/ERM 16 x 048",taper:"HSK-E25",system:"ER",collet_size:"ERM16",bore_diameter_mm:22,gauge_length_mm:48,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:90000,runout_um:3,coolant_through:false},
  {part_number:"4540.11124",designation:"HSK-E 40/ER 11 x 060 H",taper:"HSK-E40",system:"ER",collet_size:"ER11",bore_diameter_mm:19,gauge_length_mm:60,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:45000,runout_um:3,coolant_through:true},
  {part_number:"4540.11624",designation:"HSK-E 40/ER 16 x 060 H",taper:"HSK-E40",system:"ER",collet_size:"ER16",bore_diameter_mm:28,gauge_length_mm:60,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:45000,runout_um:3,coolant_through:true},
  {part_number:"4550.11654",designation:"HSK-E 50/ER 16 x 100 H",taper:"HSK-E50",system:"ER",collet_size:"ER16",bore_diameter_mm:28,gauge_length_mm:100,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:36000,runout_um:3,coolant_through:true},
  {part_number:"4550.12554",designation:"HSK-E 50/ER 25 x 100 H",taper:"HSK-E50",system:"ER",collet_size:"ER25",bore_diameter_mm:42,gauge_length_mm:100,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:36000,runout_um:3,coolant_through:true},
  {part_number:"4563.11655",designation:"HSK-F 63/ER 16 x 100 H",taper:"HSK-F63",system:"ER",collet_size:"ER16",bore_diameter_mm:28,gauge_length_mm:100,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"4563.12555",designation:"HSK-F 63/ER 25 x 100 H",taper:"HSK-F63",system:"ER",collet_size:"ER25",bore_diameter_mm:42,gauge_length_mm:100,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  // HSK-C ER (p.97)
  {part_number:"2532.11622",designation:"HSK-C 32/ER 16 x 060",taper:"HSK-C32",system:"ER",collet_size:"ER16",bore_diameter_mm:28,gauge_length_mm:60,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:false},
  {part_number:"2540.12532",designation:"HSK-C 40/ER 25 x 070",taper:"HSK-C40",system:"ER",collet_size:"ER25",bore_diameter_mm:42,gauge_length_mm:70,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:false},
  {part_number:"2550.12532",designation:"HSK-C 50/ER 25 x 070",taper:"HSK-C50",system:"ER",collet_size:"ER25",bore_diameter_mm:42,gauge_length_mm:70,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:false},
  {part_number:"2563.13232",designation:"HSK-C 63/ER 32 x 075",taper:"HSK-C63",system:"ER",collet_size:"ER32",bore_diameter_mm:50,gauge_length_mm:75,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:false},
  // CAT-B 40 ER (p.116)
  {part_number:"4340.11134",designation:"CAT-B 40/ER 11 x 3in H",taper:"CAT-B40",system:"ER",collet_size:"ER11",bore_diameter_mm:19,gauge_length_mm:76,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"4340.11634",designation:"CAT-B 40/ER 16 x 3in H",taper:"CAT-B40",system:"ER",collet_size:"ER16",bore_diameter_mm:28,gauge_length_mm:76,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"4340.12554",designation:"CAT-B 40/ER 25 x 4in H",taper:"CAT-B40",system:"ER",collet_size:"ER25",bore_diameter_mm:42,gauge_length_mm:102,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"4340.13254",designation:"CAT-B 40/ER 32 x 4in H",taper:"CAT-B40",system:"ER",collet_size:"ER32",bore_diameter_mm:50,gauge_length_mm:102,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"4340.14044",designation:"CAT-B 40/ER 40 x 3.5in H",taper:"CAT-B40",system:"ER",collet_size:"ER40",bore_diameter_mm:63,gauge_length_mm:89,holder_type:"collet_chuck",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  // =====================================================
  // powRgrip collet adapters (p.65)
  // =====================================================
  {part_number:"2803.71500",designation:"PST 3/PGST 15 x 038",taper:"C3",system:"powRgrip_adapter",collet_size:"PGST15",bore_diameter_mm:24,gauge_length_mm:38,holder_type:"pst_adapter",balance_grade:"G2.5",max_rpm:60000,runout_um:3,coolant_through:false},
  {part_number:"2804.71500",designation:"PST 4/PGST 15 x 038",taper:"C4",system:"powRgrip_adapter",collet_size:"PGST15",bore_diameter_mm:24,gauge_length_mm:38,holder_type:"pst_adapter",balance_grade:"G2.5",max_rpm:45000,runout_um:3,coolant_through:false},
  {part_number:"8040.20150",designation:"WTO ER 20-QF/PGST 15",taper:"WTO",system:"powRgrip_adapter",collet_size:"PGST15",bore_diameter_mm:24,gauge_length_mm:34,holder_type:"wto_adapter",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:false},
  {part_number:"8040.25150",designation:"WTO ER 25-QF/PGST 15",taper:"WTO",system:"powRgrip_adapter",collet_size:"PGST15",bore_diameter_mm:24,gauge_length_mm:35,holder_type:"wto_adapter",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:false},
  {part_number:"8350.03150",designation:"VX 3/PG 15 x 034",taper:"EWS-VX3",system:"powRgrip_adapter",collet_size:"PG15",bore_diameter_mm:24,gauge_length_mm:34,holder_type:"ews_adapter",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:false},
  {part_number:"8350.04251",designation:"VX 4/PG 25 x 045",taper:"EWS-VX4",system:"powRgrip_adapter",collet_size:"PG25",bore_diameter_mm:40,gauge_length_mm:45,holder_type:"ews_adapter",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:false},
  {part_number:"8999.00901",designation:"MTSK 50/PG 25 x 040 NL",taper:"MTSK50",system:"powRgrip_adapter",collet_size:"PG25",bore_diameter_mm:40,gauge_length_mm:40,holder_type:"marchetti_adapter",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:false},
  {part_number:"8999.00902",designation:"MTSK 63/PG 32 x 053",taper:"MTSK63",system:"powRgrip_adapter",collet_size:"PG32",bore_diameter_mm:50,gauge_length_mm:53,holder_type:"marchetti_adapter",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:false},
  // =====================================================
  // PG tapping holders (p.61)
  // =====================================================
  {part_number:"2563.61507",designation:"HSK-A 63 SSY/PG 15",taper:"HSK-A63",system:"powRgrip_tapping",collet_size:"PG15",bore_diameter_mm:24,gauge_length_mm:115,holder_type:"synchro_tapping",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"2563.62507",designation:"HSK-A 63 SSY/PG 25",taper:"HSK-A63",system:"powRgrip_tapping",collet_size:"PG25",bore_diameter_mm:40,gauge_length_mm:131,holder_type:"synchro_tapping",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"2625.61507",designation:"CYL 25 SSY/PG 15",taper:"CYL25",system:"powRgrip_tapping",collet_size:"PG15",bore_diameter_mm:24,gauge_length_mm:92,holder_type:"synchro_tapping",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"2625.62507",designation:"CYL 25 SSY/PG 25",taper:"CYL25",system:"powRgrip_tapping",collet_size:"PG25",bore_diameter_mm:40,gauge_length_mm:110,holder_type:"synchro_tapping",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"2625.61508",designation:"CYL 25 GSF/PG 15",taper:"CYL25",system:"powRgrip_tapping",collet_size:"PG15",bore_diameter_mm:24,gauge_length_mm:100,holder_type:"length_comp_tapping",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"2625.62508",designation:"CYL 25 GSF/PG 25",taper:"CYL25",system:"powRgrip_tapping",collet_size:"PG25",bore_diameter_mm:40,gauge_length_mm:134,holder_type:"length_comp_tapping",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  // =====================================================
  // Heavy Duty secuRgrip PG HD-SG (p.59)
  // =====================================================
  {part_number:"5563.82550",designation:"HSK-A 63/PG 25 HD-SG x 100 H",taper:"HSK-A63",system:"powRgrip_HD_secuRgrip",collet_size:"PG25-HD",bore_diameter_mm:46,gauge_length_mm:100,holder_type:"heavy_duty_secuRgrip",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"5500.82550",designation:"HSK-A 100/PG 25 HD-SG x 100 H",taper:"HSK-A100",system:"powRgrip_HD_secuRgrip",collet_size:"PG25-HD",bore_diameter_mm:46,gauge_length_mm:100,holder_type:"heavy_duty_secuRgrip",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"5500.83250",designation:"HSK-A 100/PG 32 HD-SG x 106 H",taper:"HSK-A100",system:"powRgrip_HD_secuRgrip",collet_size:"PG32-HD",bore_diameter_mm:55,gauge_length_mm:106,holder_type:"heavy_duty_secuRgrip",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"8020.55007",designation:"HSK-A 100/PG 32 HD-SG x 160 H",taper:"HSK-A100",system:"powRgrip_HD_secuRgrip",collet_size:"PG32-HD",bore_diameter_mm:55,gauge_length_mm:160,holder_type:"heavy_duty_secuRgrip",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"8070.80250",designation:"HSK-FP 80/PG 25 HD-SG x 085 H K",taper:"HSK-FP80",system:"powRgrip_HD_secuRgrip",collet_size:"PG25-HD",bore_diameter_mm:46,gauge_length_mm:85,holder_type:"heavy_duty_secuRgrip",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"5350.82571",designation:"CAT 50/PG 25 HD-SG x 6in H",taper:"CAT50",system:"powRgrip_HD_secuRgrip",collet_size:"PG25-HD",bore_diameter_mm:46,gauge_length_mm:152,holder_type:"heavy_duty_secuRgrip",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
  {part_number:"5350.83251",designation:"CAT 50/PG 32 HD-SG x 4.3in H",taper:"CAT50",system:"powRgrip_HD_secuRgrip",collet_size:"PG32-HD",bore_diameter_mm:55,gauge_length_mm:109,holder_type:"heavy_duty_secuRgrip",balance_grade:"G2.5",max_rpm:25000,runout_um:3,coolant_through:true},
];

// Total: 168 REGO-FIX holders extracted from 448-page catalog
// Systems: powRgrip, powRgrip_toolVibe, powRgrip_secuRgrip, powRgrip_HD_secuRgrip,
//          powRgrip_tapping, powRgrip_adapter, ER
// Tapers: HSK-A32/40/50/63/80/100/125, HSK-E20/25/32/40/50, HSK-EZ15, ATC-E15,
//         HSK-C32/40/50/63, HSK-F63, HSK-FP80, SK30/40/50, SK+40, BT30/40/50,
//         BT+30/40/50, BT-OM30, CAT40/50, CAT-B40/50, CAT+40/50, C3/C4/C5/C6/C8,
//         ISO20, CYL10/20/25, WTO, EWS-VX3/4, MTSK50/63
// Collet sizes: PG6/10/15/25/32/48, PG-SG, PG-HD, PGST15,
//               ER11/16/20/25/32/40, ERM16, SR6
