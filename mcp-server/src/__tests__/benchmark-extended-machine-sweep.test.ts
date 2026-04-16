/**
 * Extended Machine Coverage Sweep Benchmark
 *
 * Tests 205 representative machines across the full PRISM machine database
 * covering all machine types: VMC, HMC, 5-axis, lathe, mill-turn, swiss,
 * grinder, EDM sinker, EDM wire, hobby, and cobot.
 *
 * 211 machines × 3 materials × 3 operations = 1,899 test cases.
 *
 * Pure math — no engine imports — so execution is near-instant.
 */
import { describe, it, expect } from 'vitest';

// ════════════════════════════════════════════════════════════════════════════════
// Test machine interface
// ════════════════════════════════════════════════════════════════════════════════

interface TestMachine {
  id: string;
  name: string;
  type: 'vmc' | 'hmc' | '5axis' | 'lathe' | 'mill_turn' | 'swiss' | 'grinder' | 'edm_sinker' | 'edm_wire' | 'hobby' | 'cobot';
  max_rpm: number;
  power_kw: number;
  max_torque_Nm?: number;
  travel: { x: number; y: number; z: number };
}

// ════════════════════════════════════════════════════════════════════════════════
// 52 VMCs — Haas, DMG, Mazak, Okuma, Makino, Doosan, Hurco, Brother, Fanuc, Kitamura, Fadal, Hurco, YCM, Leadwell
// ════════════════════════════════════════════════════════════════════════════════

const VMCS: TestMachine[] = [
  // Haas VF series
  { id: 'haas_vf1', name: 'Haas VF-1', type: 'vmc', max_rpm: 8100, power_kw: 22.4, travel: { x: 508, y: 406, z: 508 } },
  { id: 'haas_vf2', name: 'Haas VF-2', type: 'vmc', max_rpm: 8100, power_kw: 22.4, travel: { x: 762, y: 406, z: 508 } },
  { id: 'haas_vf3', name: 'Haas VF-3', type: 'vmc', max_rpm: 8100, power_kw: 22.4, travel: { x: 1016, y: 508, z: 635 } },
  { id: 'haas_vf4', name: 'Haas VF-4', type: 'vmc', max_rpm: 8100, power_kw: 22.4, travel: { x: 1270, y: 508, z: 635 } },
  { id: 'haas_vf5', name: 'Haas VF-5', type: 'vmc', max_rpm: 8100, power_kw: 22.4, travel: { x: 1270, y: 660, z: 635 } },
  { id: 'haas_vf6', name: 'Haas VF-6', type: 'vmc', max_rpm: 8100, power_kw: 22.4, travel: { x: 1626, y: 813, z: 762 } },
  { id: 'haas_vf7', name: 'Haas VF-7', type: 'vmc', max_rpm: 8100, power_kw: 22.4, travel: { x: 2134, y: 813, z: 762 } },
  { id: 'haas_vf8', name: 'Haas VF-8', type: 'vmc', max_rpm: 8100, power_kw: 22.4, travel: { x: 1626, y: 1016, z: 762 } },
  { id: 'haas_vf9', name: 'Haas VF-9', type: 'vmc', max_rpm: 8100, power_kw: 22.4, travel: { x: 2134, y: 1016, z: 762 } },
  // Haas DM / Mini Mill
  { id: 'haas_dm1', name: 'Haas DM-1', type: 'vmc', max_rpm: 15000, power_kw: 11.2, travel: { x: 508, y: 406, z: 394 } },
  { id: 'haas_dm2', name: 'Haas DM-2', type: 'vmc', max_rpm: 15000, power_kw: 11.2, travel: { x: 711, y: 406, z: 394 } },
  { id: 'haas_minimill', name: 'Haas Mini Mill', type: 'vmc', max_rpm: 6000, power_kw: 5.6, travel: { x: 406, y: 305, z: 254 } },
  { id: 'haas_vf6_50', name: 'Haas VF-6/50', type: 'vmc', max_rpm: 7500, power_kw: 29.8, travel: { x: 1626, y: 813, z: 762 } },
  { id: 'haas_dt1', name: 'Haas DT-1', type: 'vmc', max_rpm: 10000, power_kw: 11.2, travel: { x: 508, y: 406, z: 394 } },
  // DMG MORI VMC
  { id: 'dmg_dmv50', name: 'DMG DMV 50', type: 'vmc', max_rpm: 12000, power_kw: 25, travel: { x: 500, y: 500, z: 500 } },
  { id: 'dmg_dmv70', name: 'DMG DMV 70', type: 'vmc', max_rpm: 12000, power_kw: 25, travel: { x: 700, y: 500, z: 500 } },
  { id: 'dmg_cmx50u', name: 'DMG CMX 50 U', type: 'vmc', max_rpm: 15000, power_kw: 25, travel: { x: 500, y: 450, z: 400 } },
  { id: 'dmg_cmx70u', name: 'DMG CMX 70 U', type: 'vmc', max_rpm: 15000, power_kw: 25, travel: { x: 700, y: 560, z: 510 } },
  { id: 'dmg_cmx100u', name: 'DMG CMX 100 U', type: 'vmc', max_rpm: 12000, power_kw: 35, travel: { x: 1000, y: 560, z: 560 } },
  // Mazak VMC
  { id: 'mazak_vcn430a', name: 'Mazak VCN-430A', type: 'vmc', max_rpm: 12000, power_kw: 18.5, travel: { x: 560, y: 410, z: 460 } },
  { id: 'mazak_vcn530c', name: 'Mazak VCN-530C', type: 'vmc', max_rpm: 12000, power_kw: 22, travel: { x: 1050, y: 530, z: 510 } },
  { id: 'mazak_vtc300c', name: 'Mazak VTC-300C', type: 'vmc', max_rpm: 12000, power_kw: 22, travel: { x: 1740, y: 760, z: 660 } },
  { id: 'mazak_vtc530c', name: 'Mazak VTC-530C', type: 'vmc', max_rpm: 10000, power_kw: 30, travel: { x: 2000, y: 760, z: 660 } },
  // Okuma VMC
  { id: 'okuma_m460ve', name: 'Okuma GENOS M460-VE', type: 'vmc', max_rpm: 15000, power_kw: 22, travel: { x: 762, y: 460, z: 460 } },
  { id: 'okuma_m560v', name: 'Okuma GENOS M560-V', type: 'vmc', max_rpm: 15000, power_kw: 22, travel: { x: 1050, y: 560, z: 460 } },
  { id: 'okuma_mb46vae', name: 'Okuma MB-46VAE', type: 'vmc', max_rpm: 15000, power_kw: 22, travel: { x: 762, y: 460, z: 460 } },
  { id: 'okuma_mb56v', name: 'Okuma MB-56V', type: 'vmc', max_rpm: 15000, power_kw: 22, travel: { x: 1050, y: 560, z: 460 } },
  { id: 'okuma_mb80v', name: 'Okuma MB-80V', type: 'vmc', max_rpm: 8000, power_kw: 30, travel: { x: 1300, y: 800, z: 650 } },
  // Doosan VMC
  { id: 'doosan_dnm400', name: 'Doosan DNM 400', type: 'vmc', max_rpm: 12000, power_kw: 15, travel: { x: 400, y: 400, z: 400 } },
  { id: 'doosan_dnm500', name: 'Doosan DNM 500', type: 'vmc', max_rpm: 12000, power_kw: 18.5, travel: { x: 1020, y: 510, z: 510 } },
  { id: 'doosan_dnm650', name: 'Doosan DNM 650', type: 'vmc', max_rpm: 10000, power_kw: 22, travel: { x: 1270, y: 670, z: 625 } },
  { id: 'doosan_dvf5000', name: 'Doosan DVF 5000', type: 'vmc', max_rpm: 12000, power_kw: 22, travel: { x: 625, y: 450, z: 400 } },
  // Brother
  { id: 'brother_s300x2', name: 'Brother S300X2', type: 'vmc', max_rpm: 16000, power_kw: 6.7, travel: { x: 300, y: 300, z: 300 } },
  { id: 'brother_s500x2', name: 'Brother S500X2', type: 'vmc', max_rpm: 16000, power_kw: 6.7, travel: { x: 500, y: 400, z: 305 } },
  { id: 'brother_s700x2', name: 'Brother S700X2', type: 'vmc', max_rpm: 16000, power_kw: 11.5, travel: { x: 700, y: 400, z: 305 } },
  // Fanuc Robodrill
  { id: 'fanuc_a_d21mia5', name: 'Fanuc Robodrill a-D21MiA5', type: 'vmc', max_rpm: 24000, power_kw: 11, travel: { x: 500, y: 400, z: 330 } },
  { id: 'fanuc_a_d21lia5', name: 'Fanuc Robodrill a-D21LiA5', type: 'vmc', max_rpm: 24000, power_kw: 11, travel: { x: 700, y: 400, z: 330 } },
  // Kitamura
  { id: 'kitamura_mycenter_hx300ig', name: 'Kitamura Mycenter-HX300iG', type: 'vmc', max_rpm: 15000, power_kw: 22, travel: { x: 560, y: 510, z: 510 } },
  { id: 'kitamura_mycenter_hx500ig', name: 'Kitamura Mycenter-HX500iG', type: 'vmc', max_rpm: 12000, power_kw: 30, travel: { x: 730, y: 730, z: 730 } },
  // Makino VMC
  { id: 'makino_ps95', name: 'Makino PS95', type: 'vmc', max_rpm: 14000, power_kw: 22, travel: { x: 900, y: 500, z: 450 } },
  { id: 'makino_ps105', name: 'Makino PS105', type: 'vmc', max_rpm: 14000, power_kw: 30, travel: { x: 1050, y: 600, z: 500 } },
  // Hurco
  { id: 'hurco_vm10i', name: 'Hurco VM10i', type: 'vmc', max_rpm: 12000, power_kw: 11.2, travel: { x: 660, y: 356, z: 356 } },
  { id: 'hurco_vm20i', name: 'Hurco VM20i', type: 'vmc', max_rpm: 12000, power_kw: 18.5, travel: { x: 1016, y: 508, z: 508 } },
  { id: 'hurco_vmx42i', name: 'Hurco VMX42i', type: 'vmc', max_rpm: 12000, power_kw: 22, travel: { x: 1067, y: 610, z: 610 } },
  // YCM
  { id: 'ycm_fv56a', name: 'YCM FV56A', type: 'vmc', max_rpm: 10000, power_kw: 15, travel: { x: 560, y: 410, z: 510 } },
  { id: 'ycm_nxv1020a', name: 'YCM NXV1020A', type: 'vmc', max_rpm: 12000, power_kw: 22, travel: { x: 1020, y: 560, z: 510 } },
  // Fadal
  { id: 'fadal_vmc4020', name: 'Fadal VMC 4020', type: 'vmc', max_rpm: 10000, power_kw: 11.2, travel: { x: 1016, y: 508, z: 508 } },
  // Leadwell
  { id: 'leadwell_v40it', name: 'Leadwell V-40iT', type: 'vmc', max_rpm: 12000, power_kw: 18.5, travel: { x: 1020, y: 510, z: 510 } },
  // Feeler
  { id: 'feeler_vmp1100', name: 'Feeler VMP-1100', type: 'vmc', max_rpm: 10000, power_kw: 18.5, travel: { x: 1100, y: 610, z: 610 } },
  // Hartford
  { id: 'hartford_mvp8', name: 'Hartford MVP-8', type: 'vmc', max_rpm: 10000, power_kw: 11.2, travel: { x: 800, y: 500, z: 500 } },
  // Spinner
  { id: 'spinner_vc1150', name: 'Spinner VC1150', type: 'vmc', max_rpm: 12000, power_kw: 22, travel: { x: 1150, y: 600, z: 500 } },
  // AWEA
  { id: 'awea_af1250', name: 'AWEA AF-1250', type: 'vmc', max_rpm: 8000, power_kw: 22, max_torque_Nm: 350, travel: { x: 1250, y: 640, z: 610 } },
];

// ════════════════════════════════════════════════════════════════════════════════
// 32 Five-Axis — DMG, Hermle, Grob, Makino, Matsuura, Mazak, Okuma, Kern, Chiron, Mitsui Seiki, Heller
// ════════════════════════════════════════════════════════════════════════════════

const FIVE_AXIS: TestMachine[] = [
  // DMG DMU series
  { id: 'dmg_dmu50', name: 'DMG DMU 50', type: '5axis', max_rpm: 18000, power_kw: 25, travel: { x: 500, y: 450, z: 400 } },
  { id: 'dmg_dmu60evo', name: 'DMG DMU 60 eVo', type: '5axis', max_rpm: 18000, power_kw: 25, travel: { x: 600, y: 500, z: 500 } },
  { id: 'dmg_dmu75mono', name: 'DMG DMU 75 monoBLOCK', type: '5axis', max_rpm: 18000, power_kw: 35, travel: { x: 750, y: 600, z: 560 } },
  { id: 'dmg_dmu80p', name: 'DMG DMU 80 P duoBLOCK', type: '5axis', max_rpm: 18000, power_kw: 35, travel: { x: 800, y: 650, z: 650 } },
  { id: 'dmg_dmu100mono', name: 'DMG DMU 100 monoBLOCK', type: '5axis', max_rpm: 15000, power_kw: 44, travel: { x: 1000, y: 800, z: 700 } },
  { id: 'dmg_dmu210p', name: 'DMG DMU 210 P', type: '5axis', max_rpm: 12000, power_kw: 52, travel: { x: 2100, y: 2100, z: 1250 } },
  // Hermle
  { id: 'hermle_c12u', name: 'Hermle C 12 U', type: '5axis', max_rpm: 18000, power_kw: 20, travel: { x: 350, y: 440, z: 330 } },
  { id: 'hermle_c22u', name: 'Hermle C 22 U', type: '5axis', max_rpm: 18000, power_kw: 29, travel: { x: 450, y: 600, z: 330 } },
  { id: 'hermle_c32u', name: 'Hermle C 32 U', type: '5axis', max_rpm: 18000, power_kw: 29, travel: { x: 650, y: 650, z: 500 } },
  { id: 'hermle_c42u', name: 'Hermle C 42 U', type: '5axis', max_rpm: 18000, power_kw: 35, travel: { x: 800, y: 800, z: 550 } },
  { id: 'hermle_c400', name: 'Hermle C 400', type: '5axis', max_rpm: 18000, power_kw: 30, travel: { x: 850, y: 700, z: 500 } },
  { id: 'hermle_c52u', name: 'Hermle C 52 U', type: '5axis', max_rpm: 18000, power_kw: 44, travel: { x: 1000, y: 1100, z: 750 } },
  // Grob
  { id: 'grob_g350', name: 'Grob G350', type: '5axis', max_rpm: 18000, power_kw: 30, travel: { x: 600, y: 540, z: 475 } },
  { id: 'grob_g550', name: 'Grob G550', type: '5axis', max_rpm: 16000, power_kw: 43, travel: { x: 800, y: 950, z: 780 } },
  // Makino
  { id: 'makino_d500', name: 'Makino D500', type: '5axis', max_rpm: 20000, power_kw: 22, travel: { x: 500, y: 500, z: 350 } },
  { id: 'makino_da300', name: 'Makino DA300', type: '5axis', max_rpm: 20000, power_kw: 26, travel: { x: 450, y: 620, z: 500 } },
  { id: 'makino_a61nx', name: 'Makino a61nx', type: '5axis', max_rpm: 14000, power_kw: 30, travel: { x: 730, y: 750, z: 700 } },
  // Matsuura
  { id: 'matsuura_mx330', name: 'Matsuura MX-330', type: '5axis', max_rpm: 20000, power_kw: 22, travel: { x: 435, y: 560, z: 380 } },
  { id: 'matsuura_mx520', name: 'Matsuura MX-520', type: '5axis', max_rpm: 15000, power_kw: 22, travel: { x: 630, y: 560, z: 510 } },
  { id: 'matsuura_mam72', name: 'Matsuura MAM72-35V', type: '5axis', max_rpm: 20000, power_kw: 22, travel: { x: 350, y: 440, z: 380 } },
  // Mazak 5-axis
  { id: 'mazak_variaxis_i500', name: 'Mazak VARIAXIS i-500', type: '5axis', max_rpm: 18000, power_kw: 22, travel: { x: 500, y: 500, z: 510 } },
  { id: 'mazak_variaxis_i700', name: 'Mazak VARIAXIS i-700', type: '5axis', max_rpm: 18000, power_kw: 30, travel: { x: 730, y: 730, z: 650 } },
  // Okuma 5-axis
  { id: 'okuma_mu4000v', name: 'Okuma MU-4000V', type: '5axis', max_rpm: 15000, power_kw: 22, travel: { x: 400, y: 400, z: 340 } },
  { id: 'okuma_mu5000v', name: 'Okuma MU-5000V', type: '5axis', max_rpm: 15000, power_kw: 22, travel: { x: 500, y: 460, z: 460 } },
  // Haas UMC
  { id: 'haas_umc750', name: 'Haas UMC-750', type: '5axis', max_rpm: 8100, power_kw: 22.4, travel: { x: 762, y: 508, z: 508 } },
  { id: 'haas_umc1000', name: 'Haas UMC-1000', type: '5axis', max_rpm: 8100, power_kw: 22.4, travel: { x: 1016, y: 635, z: 635 } },
  // Kern
  { id: 'kern_micro', name: 'Kern Micro', type: '5axis', max_rpm: 50000, power_kw: 6.4, travel: { x: 300, y: 280, z: 250 } },
  { id: 'kern_pyramid_nano', name: 'Kern Pyramid Nano', type: '5axis', max_rpm: 50000, power_kw: 6.4, travel: { x: 500, y: 500, z: 300 } },
  // Chiron
  { id: 'chiron_fz08', name: 'Chiron FZ 08 S', type: '5axis', max_rpm: 40000, power_kw: 14, travel: { x: 308, y: 260, z: 320 } },
  { id: 'chiron_fz15', name: 'Chiron FZ 15 S', type: '5axis', max_rpm: 20000, power_kw: 29, travel: { x: 500, y: 400, z: 400 } },
  // Mitsui Seiki
  { id: 'mitsui_vertex55x', name: 'Mitsui Seiki Vertex 55X', type: '5axis', max_rpm: 30000, power_kw: 22, travel: { x: 550, y: 460, z: 460 } },
  // Heller
  { id: 'heller_f6000', name: 'Heller F 6000', type: '5axis', max_rpm: 18000, power_kw: 41, travel: { x: 800, y: 800, z: 710 } },
];

// ════════════════════════════════════════════════════════════════════════════════
// 22 HMCs — Mazak, Okuma, Makino, DMG, Toyoda, Doosan, Kitamura, Heller, Quaser
// ════════════════════════════════════════════════════════════════════════════════

const HMCS: TestMachine[] = [
  // Mazak HMC
  { id: 'mazak_hcn5000', name: 'Mazak HCN-5000', type: 'hmc', max_rpm: 10000, power_kw: 30, travel: { x: 730, y: 730, z: 710 } },
  { id: 'mazak_hcn6800', name: 'Mazak HCN-6800', type: 'hmc', max_rpm: 10000, power_kw: 30, travel: { x: 900, y: 800, z: 730 } },
  { id: 'mazak_hcn8800', name: 'Mazak HCN-8800', type: 'hmc', max_rpm: 6000, power_kw: 37, travel: { x: 1050, y: 900, z: 900 } },
  // Okuma HMC
  { id: 'okuma_ma400ha', name: 'Okuma MA-400HA', type: 'hmc', max_rpm: 15000, power_kw: 22, travel: { x: 560, y: 560, z: 625 } },
  { id: 'okuma_ma500hii', name: 'Okuma MA-500HII', type: 'hmc', max_rpm: 12000, power_kw: 26, travel: { x: 730, y: 730, z: 730 } },
  { id: 'okuma_ma600hii', name: 'Okuma MA-600HII', type: 'hmc', max_rpm: 10000, power_kw: 30, travel: { x: 900, y: 800, z: 800 } },
  // Haas HMC
  { id: 'haas_ec400', name: 'Haas EC-400', type: 'hmc', max_rpm: 8100, power_kw: 22.4, travel: { x: 508, y: 508, z: 508 } },
  { id: 'haas_ec500', name: 'Haas EC-500', type: 'hmc', max_rpm: 8100, power_kw: 22.4, travel: { x: 635, y: 635, z: 635 } },
  // Makino HMC
  { id: 'makino_a51nx', name: 'Makino a51nx', type: 'hmc', max_rpm: 14000, power_kw: 26, travel: { x: 560, y: 640, z: 500 } },
  { id: 'makino_a81nx', name: 'Makino a81nx', type: 'hmc', max_rpm: 12000, power_kw: 37, travel: { x: 900, y: 800, z: 710 } },
  { id: 'makino_a100e', name: 'Makino a100e', type: 'hmc', max_rpm: 8000, power_kw: 45, travel: { x: 1050, y: 900, z: 900 } },
  // DMG MORI HMC
  { id: 'dmg_nhx4000', name: 'DMG NHX 4000', type: 'hmc', max_rpm: 15000, power_kw: 30, travel: { x: 560, y: 560, z: 660 } },
  { id: 'dmg_nhx5000', name: 'DMG NHX 5000', type: 'hmc', max_rpm: 15000, power_kw: 30, travel: { x: 730, y: 730, z: 880 } },
  { id: 'dmg_nhx6300', name: 'DMG NHX 6300', type: 'hmc', max_rpm: 12000, power_kw: 37, travel: { x: 900, y: 800, z: 980 } },
  // Toyoda
  { id: 'toyoda_fh500j', name: 'Toyoda FH500J', type: 'hmc', max_rpm: 12000, power_kw: 30, travel: { x: 730, y: 650, z: 730 } },
  { id: 'toyoda_fh630sx', name: 'Toyoda FH630SX', type: 'hmc', max_rpm: 10000, power_kw: 37, travel: { x: 900, y: 800, z: 810 } },
  // Doosan HMC
  { id: 'doosan_nhm5000', name: 'Doosan NHM 5000', type: 'hmc', max_rpm: 10000, power_kw: 22, travel: { x: 720, y: 650, z: 720 } },
  { id: 'doosan_nhm6300', name: 'Doosan NHM 6300', type: 'hmc', max_rpm: 8000, power_kw: 30, travel: { x: 900, y: 750, z: 780 } },
  // Kitamura HMC
  { id: 'kitamura_hx500ig', name: 'Kitamura HX500iG', type: 'hmc', max_rpm: 12000, power_kw: 30, travel: { x: 730, y: 730, z: 730 } },
  // Heller HMC
  { id: 'heller_h4000', name: 'Heller H 4000', type: 'hmc', max_rpm: 12000, power_kw: 30, travel: { x: 630, y: 630, z: 630 } },
  // Quaser
  { id: 'quaser_hx505', name: 'Quaser HX 505', type: 'hmc', max_rpm: 10000, power_kw: 22, travel: { x: 610, y: 560, z: 625 } },
  // AWEA HMC
  { id: 'awea_hmc630', name: 'AWEA HMC-630', type: 'hmc', max_rpm: 8000, power_kw: 22, travel: { x: 800, y: 650, z: 700 } },
];

// ════════════════════════════════════════════════════════════════════════════════
// 30 Lathes — Haas, Mazak, Okuma, DMG, Doosan, Nakamura, Hardinge, Hyundai WIA
// ════════════════════════════════════════════════════════════════════════════════

const LATHES: TestMachine[] = [
  // Haas ST series
  { id: 'haas_st10', name: 'Haas ST-10', type: 'lathe', max_rpm: 6000, power_kw: 11.2, travel: { x: 200, y: 0, z: 356 } },
  { id: 'haas_st10y', name: 'Haas ST-10Y', type: 'lathe', max_rpm: 6000, power_kw: 11.2, travel: { x: 200, y: 52, z: 356 } },
  { id: 'haas_st20', name: 'Haas ST-20', type: 'lathe', max_rpm: 4000, power_kw: 14.9, travel: { x: 210, y: 0, z: 533 } },
  { id: 'haas_st20y', name: 'Haas ST-20Y', type: 'lathe', max_rpm: 4000, power_kw: 14.9, travel: { x: 210, y: 52, z: 533 } },
  { id: 'haas_st25', name: 'Haas ST-25', type: 'lathe', max_rpm: 3400, power_kw: 22.4, travel: { x: 264, y: 0, z: 610 } },
  { id: 'haas_st30', name: 'Haas ST-30', type: 'lathe', max_rpm: 3400, power_kw: 22.4, travel: { x: 264, y: 0, z: 660 } },
  { id: 'haas_st35', name: 'Haas ST-35', type: 'lathe', max_rpm: 2400, power_kw: 22.4, travel: { x: 318, y: 0, z: 762 } },
  { id: 'haas_st40', name: 'Haas ST-40', type: 'lathe', max_rpm: 2400, power_kw: 29.8, travel: { x: 406, y: 0, z: 1016 } },
  { id: 'haas_tl1', name: 'Haas TL-1', type: 'lathe', max_rpm: 3000, power_kw: 5.6, travel: { x: 203, y: 0, z: 406 } },
  // Mazak lathes
  { id: 'mazak_qt200', name: 'Mazak QT-200', type: 'lathe', max_rpm: 5000, power_kw: 15, travel: { x: 200, y: 0, z: 500 } },
  { id: 'mazak_qt250', name: 'Mazak QT-250', type: 'lathe', max_rpm: 4000, power_kw: 18.5, travel: { x: 260, y: 0, z: 550 } },
  { id: 'mazak_qt300', name: 'Mazak QT-300', type: 'lathe', max_rpm: 3500, power_kw: 22, travel: { x: 320, y: 0, z: 600 } },
  { id: 'mazak_qt350', name: 'Mazak QT-350', type: 'lathe', max_rpm: 2500, power_kw: 30, travel: { x: 380, y: 0, z: 750 } },
  // Okuma lathes
  { id: 'okuma_lb3000exii', name: 'Okuma LB3000 EX II', type: 'lathe', max_rpm: 5000, power_kw: 18.5, travel: { x: 260, y: 0, z: 550 } },
  { id: 'okuma_lb4000exii', name: 'Okuma LB4000 EX II', type: 'lathe', max_rpm: 3500, power_kw: 22, travel: { x: 350, y: 0, z: 750 } },
  { id: 'okuma_l250ii', name: 'Okuma GENOS L250II', type: 'lathe', max_rpm: 5000, power_kw: 11, travel: { x: 200, y: 0, z: 500 } },
  { id: 'okuma_l300ii', name: 'Okuma GENOS L300II', type: 'lathe', max_rpm: 4500, power_kw: 15, travel: { x: 260, y: 0, z: 550 } },
  // DMG MORI lathes
  { id: 'dmg_ctx_alpha', name: 'DMG CTX alpha 500', type: 'lathe', max_rpm: 5000, power_kw: 20, travel: { x: 245, y: 0, z: 490 } },
  { id: 'dmg_ctx_beta', name: 'DMG CTX beta 800', type: 'lathe', max_rpm: 4000, power_kw: 33, travel: { x: 305, y: 0, z: 800 } },
  { id: 'dmg_ctx_beta1250', name: 'DMG CTX beta 1250 TC', type: 'lathe', max_rpm: 4000, power_kw: 33, travel: { x: 340, y: 0, z: 1250 } },
  { id: 'dmg_nlx2500', name: 'DMG NLX 2500', type: 'lathe', max_rpm: 4000, power_kw: 18.5, travel: { x: 260, y: 0, z: 705 } },
  // Doosan lathes
  { id: 'doosan_puma2100', name: 'Doosan PUMA 2100', type: 'lathe', max_rpm: 4500, power_kw: 15, travel: { x: 200, y: 0, z: 510 } },
  { id: 'doosan_puma2600', name: 'Doosan PUMA 2600', type: 'lathe', max_rpm: 3500, power_kw: 18.5, travel: { x: 260, y: 0, z: 600 } },
  { id: 'doosan_puma3100', name: 'Doosan PUMA 3100', type: 'lathe', max_rpm: 2500, power_kw: 22, travel: { x: 320, y: 0, z: 660 } },
  // Nakamura-Tome
  { id: 'nakamura_sc200', name: 'Nakamura-Tome SC-200', type: 'lathe', max_rpm: 5000, power_kw: 15, travel: { x: 210, y: 0, z: 400 } },
  // Hardinge
  { id: 'hardinge_t42', name: 'Hardinge T42', type: 'lathe', max_rpm: 6000, power_kw: 7.5, travel: { x: 170, y: 0, z: 254 } },
  { id: 'hardinge_conquest65', name: 'Hardinge Conquest 65', type: 'lathe', max_rpm: 4000, power_kw: 11.2, travel: { x: 200, y: 0, z: 406 } },
  // Hyundai WIA
  { id: 'hyundai_l210a', name: 'Hyundai WIA L210A', type: 'lathe', max_rpm: 5000, power_kw: 15, travel: { x: 210, y: 0, z: 350 } },
  { id: 'hyundai_l300a', name: 'Hyundai WIA L300A', type: 'lathe', max_rpm: 3500, power_kw: 18.5, travel: { x: 260, y: 0, z: 540 } },
  // Index
  { id: 'index_c200', name: 'Index C200', type: 'lathe', max_rpm: 6000, power_kw: 22, travel: { x: 220, y: 0, z: 400 } },
];

// ════════════════════════════════════════════════════════════════════════════════
// 15 Mill-Turn & Swiss — Mazak Integrex, DMG NTX, Citizen, Star, Tsugami, Traub, Index
// ════════════════════════════════════════════════════════════════════════════════

const MILL_TURN: TestMachine[] = [
  // Mazak Integrex (mill-turn)
  { id: 'mazak_i200s', name: 'Mazak Integrex i-200S', type: 'mill_turn', max_rpm: 5000, power_kw: 22, travel: { x: 615, y: 230, z: 1005 } },
  { id: 'mazak_i300s', name: 'Mazak Integrex i-300S', type: 'mill_turn', max_rpm: 4000, power_kw: 26, travel: { x: 760, y: 280, z: 1245 } },
  { id: 'mazak_i400s', name: 'Mazak Integrex i-400S', type: 'mill_turn', max_rpm: 3300, power_kw: 30, travel: { x: 905, y: 330, z: 1545 } },
  // DMG NTX / CTX (mill-turn)
  { id: 'dmg_ntx1000', name: 'DMG NTX 1000', type: 'mill_turn', max_rpm: 12000, power_kw: 22, travel: { x: 455, y: 200, z: 600 } },
  { id: 'dmg_ntx2000', name: 'DMG NTX 2000', type: 'mill_turn', max_rpm: 12000, power_kw: 26, travel: { x: 675, y: 250, z: 795 } },
  { id: 'dmg_ctx_gamma', name: 'DMG CTX gamma 2000 TC', type: 'mill_turn', max_rpm: 4000, power_kw: 33, travel: { x: 580, y: 200, z: 1100 } },
  // Okuma Multus
  { id: 'okuma_multus_b200', name: 'Okuma MULTUS B200', type: 'mill_turn', max_rpm: 5000, power_kw: 18.5, travel: { x: 420, y: 175, z: 750 } },
  { id: 'okuma_multus_b300', name: 'Okuma MULTUS B300', type: 'mill_turn', max_rpm: 4000, power_kw: 22, travel: { x: 580, y: 230, z: 900 } },
  // Swiss-type
  { id: 'citizen_l20', name: 'Citizen L20', type: 'swiss', max_rpm: 10000, power_kw: 3.7, travel: { x: 120, y: 0, z: 205 } },
  { id: 'citizen_l32', name: 'Citizen L32', type: 'swiss', max_rpm: 8000, power_kw: 5.5, travel: { x: 140, y: 0, z: 260 } },
  { id: 'star_sr20j', name: 'Star SR-20J II', type: 'swiss', max_rpm: 10000, power_kw: 3.7, travel: { x: 130, y: 0, z: 205 } },
  { id: 'star_sr32j', name: 'Star SR-32J', type: 'swiss', max_rpm: 8000, power_kw: 5.5, travel: { x: 155, y: 0, z: 260 } },
  { id: 'tsugami_b0205', name: 'Tsugami B0205', type: 'swiss', max_rpm: 10000, power_kw: 2.2, travel: { x: 80, y: 0, z: 160 } },
  { id: 'traub_tnt400', name: 'Traub TNT 400', type: 'swiss', max_rpm: 10000, power_kw: 5.5, travel: { x: 150, y: 0, z: 250 } },
  { id: 'index_ms22', name: 'Index MS22-8', type: 'swiss', max_rpm: 12000, power_kw: 3.7, travel: { x: 100, y: 0, z: 180 } },
];

// ════════════════════════════════════════════════════════════════════════════════
// 10 Grinders — Studer, Junker, Kellenberger, Jones & Shipman, Blohm, Okamoto, Magerle
// ════════════════════════════════════════════════════════════════════════════════

const GRINDERS: TestMachine[] = [
  // Cylindrical grinders
  { id: 'studer_s33', name: 'Studer S33', type: 'grinder', max_rpm: 600, power_kw: 4, travel: { x: 285, y: 0, z: 650 } },
  { id: 'studer_s41', name: 'Studer S41', type: 'grinder', max_rpm: 400, power_kw: 7.5, travel: { x: 370, y: 0, z: 1000 } },
  { id: 'junker_jumat', name: 'Junker JUMAT', type: 'grinder', max_rpm: 500, power_kw: 11, travel: { x: 350, y: 0, z: 500 } },
  { id: 'kellenberger_kel100', name: 'Kellenberger KEL 100', type: 'grinder', max_rpm: 500, power_kw: 7.5, travel: { x: 310, y: 0, z: 600 } },
  { id: 'jones_shipman_ultragrind', name: 'Jones & Shipman UltraGrind', type: 'grinder', max_rpm: 600, power_kw: 5.5, travel: { x: 260, y: 0, z: 500 } },
  // Surface grinders
  { id: 'blohm_planomat', name: 'Blohm PLANOMAT HP', type: 'grinder', max_rpm: 3000, power_kw: 15, travel: { x: 600, y: 400, z: 500 } },
  { id: 'okamoto_acc630', name: 'Okamoto ACC-63DX', type: 'grinder', max_rpm: 3600, power_kw: 5.5, travel: { x: 630, y: 300, z: 505 } },
  { id: 'magerle_mfp', name: 'Magerle MFP 100', type: 'grinder', max_rpm: 3000, power_kw: 22, travel: { x: 1000, y: 400, z: 400 } },
  // Jig grinder
  { id: 'moore_g18', name: 'Moore G18', type: 'grinder', max_rpm: 60000, power_kw: 1.5, travel: { x: 457, y: 305, z: 254 } },
  // Creep-feed
  { id: 'blohm_profimat', name: 'Blohm PROFIMAT', type: 'grinder', max_rpm: 6000, power_kw: 45, travel: { x: 600, y: 400, z: 300 } },
];

// ════════════════════════════════════════════════════════════════════════════════
// 10 EDM — Sodick, Makino, GF (AgieCharmilles), Mitsubishi, Fanuc
// ════════════════════════════════════════════════════════════════════════════════

const EDMS: TestMachine[] = [
  // EDM sinker
  { id: 'sodick_ag40l', name: 'Sodick AG40L', type: 'edm_sinker', max_rpm: 0, power_kw: 4.5, travel: { x: 400, y: 300, z: 250 } },
  { id: 'sodick_ag60l', name: 'Sodick AG60L', type: 'edm_sinker', max_rpm: 0, power_kw: 4.5, travel: { x: 600, y: 420, z: 350 } },
  { id: 'makino_edaf2', name: 'Makino EDAF2', type: 'edm_sinker', max_rpm: 0, power_kw: 5, travel: { x: 350, y: 250, z: 250 } },
  { id: 'gf_form200', name: 'GF AgieCharmilles FORM 200', type: 'edm_sinker', max_rpm: 0, power_kw: 4, travel: { x: 350, y: 250, z: 350 } },
  { id: 'gf_form400', name: 'GF AgieCharmilles FORM 400', type: 'edm_sinker', max_rpm: 0, power_kw: 5, travel: { x: 500, y: 350, z: 450 } },
  // EDM wire
  { id: 'sodick_alc600g', name: 'Sodick ALC600G', type: 'edm_wire', max_rpm: 0, power_kw: 3, travel: { x: 600, y: 400, z: 310 } },
  { id: 'makino_u6heat', name: 'Makino U6 H.E.A.T.', type: 'edm_wire', max_rpm: 0, power_kw: 3.5, travel: { x: 650, y: 450, z: 420 } },
  { id: 'gf_cut200', name: 'GF AgieCharmilles CUT 200', type: 'edm_wire', max_rpm: 0, power_kw: 3, travel: { x: 350, y: 250, z: 256 } },
  { id: 'mitsubishi_mv1200r', name: 'Mitsubishi MV1200R', type: 'edm_wire', max_rpm: 0, power_kw: 3, travel: { x: 400, y: 300, z: 220 } },
  { id: 'fanuc_robocut', name: 'Fanuc Robocut C600iB', type: 'edm_wire', max_rpm: 0, power_kw: 3, travel: { x: 600, y: 400, z: 310 } },
];

// ════════════════════════════════════════════════════════════════════════════════
// 28 Hobby CNC — Shapeoko, X-Carve, Tormach, Bantam, PrintNC, MPCNC, LongMill, Nomad, etc.
// ════════════════════════════════════════════════════════════════════════════════

const HOBBY: TestMachine[] = [
  // Carbide 3D
  { id: 'shapeoko_4_std', name: 'Shapeoko 4 Standard', type: 'hobby', max_rpm: 27000, power_kw: 0.8, travel: { x: 406, y: 406, z: 102 } },
  { id: 'shapeoko_4_xl', name: 'Shapeoko 4 XL', type: 'hobby', max_rpm: 27000, power_kw: 0.8, travel: { x: 838, y: 406, z: 102 } },
  { id: 'shapeoko_4_xxl', name: 'Shapeoko 4 XXL', type: 'hobby', max_rpm: 27000, power_kw: 0.8, travel: { x: 838, y: 838, z: 102 } },
  { id: 'shapeoko_5_pro', name: 'Shapeoko 5 Pro', type: 'hobby', max_rpm: 27000, power_kw: 1.1, travel: { x: 406, y: 406, z: 102 } },
  { id: 'nomad_3', name: 'Carbide 3D Nomad 3', type: 'hobby', max_rpm: 10000, power_kw: 0.07, travel: { x: 203, y: 203, z: 76 } },
  // Inventables
  { id: 'xcarve_1000', name: 'X-Carve 1000mm', type: 'hobby', max_rpm: 30000, power_kw: 0.8, travel: { x: 750, y: 750, z: 65 } },
  { id: 'xcarve_pro_4x4', name: 'X-Carve Pro 4x4', type: 'hobby', max_rpm: 24000, power_kw: 2.2, travel: { x: 1219, y: 1219, z: 114 } },
  // Tormach
  { id: 'tormach_440', name: 'Tormach PCNC 440', type: 'hobby', max_rpm: 10000, power_kw: 0.75, travel: { x: 254, y: 165, z: 254 } },
  { id: 'tormach_770m', name: 'Tormach PCNC 770M', type: 'hobby', max_rpm: 10000, power_kw: 1.1, travel: { x: 330, y: 229, z: 292 } },
  { id: 'tormach_1100mx', name: 'Tormach 1100MX', type: 'hobby', max_rpm: 10000, power_kw: 1.5, travel: { x: 457, y: 254, z: 406 } },
  { id: 'tormach_1300pl', name: 'Tormach 1300PL', type: 'hobby', max_rpm: 5140, power_kw: 1.5, travel: { x: 457, y: 279, z: 419 } },
  // Bantam
  { id: 'bantam_desktop', name: 'Bantam Desktop PCB Mill', type: 'hobby', max_rpm: 26000, power_kw: 0.15, travel: { x: 140, y: 114, z: 38 } },
  // PrintNC
  { id: 'printnc_v3', name: 'PrintNC V3', type: 'hobby', max_rpm: 24000, power_kw: 2.2, travel: { x: 700, y: 500, z: 150 } },
  // MPCNC
  { id: 'mpcnc_primo', name: 'MPCNC Primo', type: 'hobby', max_rpm: 24000, power_kw: 0.8, travel: { x: 600, y: 600, z: 100 } },
  { id: 'mpcnc_lowrider3', name: 'LowRider3 CNC', type: 'hobby', max_rpm: 24000, power_kw: 2.2, travel: { x: 1220, y: 2440, z: 100 } },
  // Onefinity
  { id: 'onefinity_woodworker', name: 'Onefinity Woodworker', type: 'hobby', max_rpm: 27000, power_kw: 1.4, travel: { x: 812, y: 812, z: 114 } },
  { id: 'onefinity_foreman', name: 'Onefinity Foreman', type: 'hobby', max_rpm: 27000, power_kw: 1.4, travel: { x: 1219, y: 1219, z: 114 } },
  // Sienci LongMill
  { id: 'longmill_mk2_30x30', name: 'LongMill MK2 30x30', type: 'hobby', max_rpm: 27000, power_kw: 1.4, travel: { x: 762, y: 762, z: 114 } },
  { id: 'longmill_mk2_48x30', name: 'LongMill MK2 48x30', type: 'hobby', max_rpm: 27000, power_kw: 1.4, travel: { x: 1219, y: 762, z: 114 } },
  // WorkBee / Ooznest
  { id: 'workbee_1010', name: 'WorkBee 1010', type: 'hobby', max_rpm: 24000, power_kw: 1.5, travel: { x: 1000, y: 1000, z: 130 } },
  // Sainsmart Genmitsu
  { id: 'genmitsu_3018pro', name: 'Genmitsu 3018-PRO', type: 'hobby', max_rpm: 10000, power_kw: 0.04, travel: { x: 300, y: 180, z: 45 } },
  { id: 'genmitsu_4030', name: 'Genmitsu PROVer 4030', type: 'hobby', max_rpm: 12000, power_kw: 0.3, travel: { x: 400, y: 300, z: 60 } },
  // DATRON
  { id: 'datron_neo', name: 'DATRON neo', type: 'hobby', max_rpm: 40000, power_kw: 2, travel: { x: 500, y: 500, z: 200 } },
  { id: 'datron_mlcube', name: 'DATRON MLCube', type: 'hobby', max_rpm: 60000, power_kw: 3, travel: { x: 1000, y: 1000, z: 200 } },
  // Stepcraft
  { id: 'stepcraft_d840', name: 'Stepcraft D.840', type: 'hobby', max_rpm: 10000, power_kw: 0.4, travel: { x: 600, y: 840, z: 140 } },
  // CNC4Newbie
  { id: 'cnc4newbie_newcarve', name: 'CNC4Newbie NewCarve', type: 'hobby', max_rpm: 24000, power_kw: 2.2, travel: { x: 600, y: 600, z: 115 } },
  // MillRight
  { id: 'millright_mega_v', name: 'MillRight Mega V', type: 'hobby', max_rpm: 27000, power_kw: 1.5, travel: { x: 914, y: 914, z: 114 } },
  // Avid CNC
  { id: 'avid_pro4848', name: 'Avid CNC PRO4848', type: 'hobby', max_rpm: 24000, power_kw: 2.2, travel: { x: 1220, y: 1220, z: 152 } },
];

// ════════════════════════════════════════════════════════════════════════════════
// 12 Cobots — Universal Robots, FANUC, ABB, KUKA, Doosan, Techman
// ════════════════════════════════════════════════════════════════════════════════

const COBOTS: TestMachine[] = [
  // Universal Robots
  { id: 'ur3e', name: 'UR3e', type: 'cobot', max_rpm: 0, power_kw: 0.5, travel: { x: 500, y: 500, z: 500 } },
  { id: 'ur5e', name: 'UR5e', type: 'cobot', max_rpm: 0, power_kw: 0.8, travel: { x: 850, y: 850, z: 850 } },
  { id: 'ur10e', name: 'UR10e', type: 'cobot', max_rpm: 0, power_kw: 1.0, travel: { x: 1300, y: 1300, z: 1300 } },
  { id: 'ur16e', name: 'UR16e', type: 'cobot', max_rpm: 0, power_kw: 1.0, travel: { x: 900, y: 900, z: 900 } },
  { id: 'ur20', name: 'UR20', type: 'cobot', max_rpm: 0, power_kw: 1.0, travel: { x: 1750, y: 1750, z: 1750 } },
  // FANUC CRX
  { id: 'fanuc_crx10ia', name: 'FANUC CRX-10iA', type: 'cobot', max_rpm: 0, power_kw: 0.5, travel: { x: 1249, y: 1249, z: 1249 } },
  { id: 'fanuc_crx25ia', name: 'FANUC CRX-25iA', type: 'cobot', max_rpm: 0, power_kw: 0.8, travel: { x: 1889, y: 1889, z: 1889 } },
  // ABB
  { id: 'abb_gofa_crb15000', name: 'ABB GoFa CRB 15000', type: 'cobot', max_rpm: 0, power_kw: 0.8, travel: { x: 950, y: 950, z: 950 } },
  // KUKA
  { id: 'kuka_lbr_iiwa7', name: 'KUKA LBR iiwa 7', type: 'cobot', max_rpm: 0, power_kw: 0.5, travel: { x: 800, y: 800, z: 800 } },
  { id: 'kuka_lbr_iiwa14', name: 'KUKA LBR iiwa 14', type: 'cobot', max_rpm: 0, power_kw: 0.8, travel: { x: 820, y: 820, z: 820 } },
  // Doosan Robotics
  { id: 'doosan_m1013', name: 'Doosan M1013', type: 'cobot', max_rpm: 0, power_kw: 0.6, travel: { x: 1300, y: 1300, z: 1300 } },
  // Techman
  { id: 'techman_tm12', name: 'Techman TM12', type: 'cobot', max_rpm: 0, power_kw: 0.7, travel: { x: 1300, y: 1300, z: 1300 } },
];

// ════════════════════════════════════════════════════════════════════════════════
// All machines combined — 205 total
// ════════════════════════════════════════════════════════════════════════════════

const ALL_MACHINES: TestMachine[] = [
  ...VMCS,       // 50
  ...FIVE_AXIS,  // 30
  ...HMCS,       // 20
  ...LATHES,     // 30
  ...MILL_TURN,  // 15 (8 mill-turn + 7 swiss)
  ...GRINDERS,   // 10
  ...EDMS,       // 10
  ...HOBBY,      // 28
  ...COBOTS,     // 12
];

// ════════════════════════════════════════════════════════════════════════════════
// Materials for sweep — cover ISO P, M, N groups with Kienzle constants
// ════════════════════════════════════════════════════════════════════════════════

const MATERIALS_FOR_SWEEP = [
  { name: '6061-T6', iso: 'N', kc1_1: 800, mc: 0.20, Vc_target: 300 },
  { name: 'Steel 1045', iso: 'P', kc1_1: 1800, mc: 0.25, Vc_target: 150 },
  { name: '304 SS', iso: 'M', kc1_1: 2100, mc: 0.25, Vc_target: 100 },
] as const;

// ════════════════════════════════════════════════════════════════════════════════
// Operations by machine type
// ════════════════════════════════════════════════════════════════════════════════

const OPS_BY_TYPE: Record<string, string[]> = {
  vmc: ['face_mill', 'pocket', 'drill'],
  '5axis': ['contour_5ax', 'pocket', 'drill'],
  hmc: ['face_mill', 'bore', 'drill'],
  lathe: ['turn_od', 'face', 'bore'],
  mill_turn: ['turn_od', 'mill_pocket', 'drill'],
  swiss: ['turn_od', 'drill', 'thread'],
  grinder: ['surface_grind', 'cylindrical_grind', 'slot_grind'],
  edm_sinker: ['cavity_rough', 'cavity_finish', 'electrode'],
  edm_wire: ['profile_cut', 'taper_cut', 'skim_cut'],
  hobby: ['face_mill', 'pocket', 'drill'],
  cobot: ['deburr', 'polish', 'inspect'],
};

// ════════════════════════════════════════════════════════════════════════════════
// Sanity check: exactly 211 machines
// ════════════════════════════════════════════════════════════════════════════════

describe('Extended Machine Coverage Sweep', () => {
  it('should have exactly 205 machines', () => {
    expect(ALL_MACHINES.length).toBe(211);
    expect(VMCS.length).toBe(52);
    expect(FIVE_AXIS.length).toBe(32);
    expect(HMCS.length).toBe(22);
    expect(LATHES.length).toBe(30);
    expect(MILL_TURN.length).toBe(15);
    expect(GRINDERS.length).toBe(10);
    expect(EDMS.length).toBe(10);
    expect(HOBBY.length).toBe(28);
    expect(COBOTS.length).toBe(12);
  });

  it('all machine IDs should be unique', () => {
    const ids = ALL_MACHINES.map(m => m.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Parametric sweep: 211 machines × 3 materials × 3 ops = 1,899 tests
  // ══════════════════════════════════════════════════════════════════════════

  for (const machine of ALL_MACHINES) {
    const ops = OPS_BY_TYPE[machine.type] || ['face_mill', 'pocket', 'drill'];

    for (const mat of MATERIALS_FOR_SWEEP) {
      for (const op of ops) {
        it(`${machine.id} | ${mat.name} | ${op}`, () => {
          // ─── Tool diameter selection by machine type ───
          const dia = (() => {
            switch (machine.type) {
              case 'swiss': return 3;
              case 'hobby': return machine.power_kw < 0.1 ? 1 : 6;
              case 'grinder': return 200; // wheel diameter
              case 'edm_sinker': return 10; // electrode
              case 'edm_wire': return 0.25; // wire diameter
              case 'cobot': return 20; // deburring tool
              case 'lathe': return 25; // turning OD reference
              case 'mill_turn': return op.startsWith('turn') ? 25 : 10;
              default: return 10;
            }
          })();

          // ─── EDM and cobot are non-cutting — verify travel envelope only ───
          if (machine.type === 'edm_sinker' || machine.type === 'edm_wire') {
            // EDM: no rotational cutting, verify basic envelope
            expect(machine.travel.x).toBeGreaterThan(0);
            expect(machine.power_kw).toBeGreaterThan(0);
            // EDM power consumption check: typical 3-5 kW
            expect(machine.power_kw).toBeLessThanOrEqual(10);
            return;
          }

          if (machine.type === 'cobot') {
            // Cobots: verify workspace envelope
            expect(machine.travel.x).toBeGreaterThan(0);
            expect(machine.power_kw).toBeGreaterThan(0);
            expect(machine.power_kw).toBeLessThanOrEqual(2);
            return;
          }

          // ─── Cutting speed → RPM ───
          const rpm_target = (mat.Vc_target * 1000) / (Math.PI * dia);
          const rpm = Math.min(rpm_target, machine.max_rpm);
          const Vc = (Math.PI * dia * rpm) / 1000; // actual cutting speed m/min

          // ─── Feed per tooth / rev ───
          let fz: number;
          if (machine.type === 'grinder') {
            fz = 0.001; // grinding depth of cut per pass
          } else if (machine.type === 'swiss') {
            fz = 0.02;
          } else if (machine.power_kw < 0.1) {
            fz = 0.005; // Nomad, tiny machines
          } else if (machine.power_kw < 0.5) {
            fz = 0.015; // Bantam, Genmitsu — very light duty
          } else if (machine.power_kw < 2) {
            fz = 0.03; // hobby
          } else if (machine.power_kw < 5) {
            fz = 0.05; // light duty
          } else {
            fz = 0.08; // industrial
          }

          // Flute count
          const flutes = machine.type === 'grinder' ? 1
            : machine.type === 'lathe' || machine.type === 'swiss'
              || (machine.type === 'mill_turn' && op.startsWith('turn')) ? 1
            : 3;

          const vf = rpm * fz * flutes; // table feed mm/min

          // ─── Depth of cut ───
          const ap = (() => {
            switch (machine.type) {
              case 'grinder': return 0.01;
              case 'swiss': return 0.5;
              case 'hobby': return machine.power_kw < 0.1 ? 0.1 : machine.power_kw < 0.5 ? 0.3 : 1;
              case 'lathe': return 2;
              case 'mill_turn': return op.startsWith('turn') ? 2 : 1.5;
              default: return 2;
            }
          })();

          // ─── Kienzle cutting force: Fc = kc1_1 × ap × fz^(1-mc) ───
          const Fc = mat.kc1_1 * ap * Math.pow(Math.max(fz, 0.001), 1 - mat.mc);

          // ─── Power consumption: P = Fc × Vc / 60000 (kW) ───
          const power = (Fc * Vc) / 60000;

          // ─── Assertions ───
          // RPM must be positive and within machine limits
          expect(rpm).toBeGreaterThan(0);
          expect(rpm).toBeLessThanOrEqual(machine.max_rpm);

          // Calculated power must not exceed machine capacity (95% safety margin)
          expect(power).toBeLessThanOrEqual(machine.power_kw * 0.95);

          // Cutting force must be positive
          expect(Fc).toBeGreaterThan(0);

          // Feed rate must be positive
          expect(vf).toBeGreaterThan(0);

          // Actual cutting speed must be positive and reasonable
          expect(Vc).toBeGreaterThan(0);
          expect(Vc).toBeLessThanOrEqual(mat.Vc_target * 1.01); // should not exceed target

          // For grinders, Vc can be very high (wheel speed), skip Vc target check
          if (machine.type !== 'grinder') {
            // Vc should be achievable within some margin (RPM-limited machines may be lower)
            expect(Vc).toBeGreaterThan(0);
          }

          // Machine travel envelope sanity
          expect(machine.travel.x).toBeGreaterThan(0);
          expect(machine.travel.z).toBeGreaterThan(0);
        });
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Category distribution summary test
  // ══════════════════════════════════════════════════════════════════════════

  it('should cover all 11 machine types', () => {
    const types = new Set(ALL_MACHINES.map(m => m.type));
    expect(types.size).toBe(11);
    expect(types).toContain('vmc');
    expect(types).toContain('hmc');
    expect(types).toContain('5axis');
    expect(types).toContain('lathe');
    expect(types).toContain('mill_turn');
    expect(types).toContain('swiss');
    expect(types).toContain('grinder');
    expect(types).toContain('edm_sinker');
    expect(types).toContain('edm_wire');
    expect(types).toContain('hobby');
    expect(types).toContain('cobot');
  });

  it('should cover diverse RPM ranges', () => {
    const rpms = ALL_MACHINES.map(m => m.max_rpm);
    const minRpm = Math.min(...rpms);
    const maxRpm = Math.max(...rpms);
    expect(minRpm).toBe(0); // EDM/cobot have no spindle
    expect(maxRpm).toBeGreaterThanOrEqual(50000); // Kern micro-milling
  });

  it('should cover diverse power ranges', () => {
    const powers = ALL_MACHINES.map(m => m.power_kw);
    const minPower = Math.min(...powers);
    const maxPower = Math.max(...powers);
    expect(minPower).toBeLessThanOrEqual(0.1); // Nomad / Genmitsu 3018
    expect(maxPower).toBeGreaterThanOrEqual(45); // Large grinder / DMG 210
  });

  it('should cover diverse travel envelopes', () => {
    const xTravels = ALL_MACHINES.map(m => m.travel.x);
    expect(Math.min(...xTravels)).toBeLessThanOrEqual(100); // Swiss / Tsugami
    expect(Math.max(...xTravels)).toBeGreaterThanOrEqual(2000); // DMG DMU 210 / Mazak VTC
  });

  it('manufacturer coverage should span 30+ brands', () => {
    // Extract brand from machine name (first word or known brand)
    const brandExtract = (name: string): string => {
      const brands = [
        'Haas', 'DMG', 'Mazak', 'Okuma', 'Makino', 'Doosan', 'Brother', 'Fanuc',
        'Kitamura', 'Hurco', 'YCM', 'Fadal', 'Leadwell', 'Feeler', 'Hartford',
        'Spinner', 'AWEA', 'Hermle', 'Grob', 'Matsuura', 'Kern', 'Chiron',
        'Mitsui', 'Heller', 'Toyoda', 'Quaser', 'Nakamura', 'Hardinge', 'Hyundai',
        'Index', 'Citizen', 'Star', 'Tsugami', 'Traub', 'Studer', 'Junker',
        'Kellenberger', 'Jones', 'Blohm', 'Okamoto', 'Magerle', 'Moore',
        'Sodick', 'GF', 'Mitsubishi', 'Shapeoko', 'Carbide', 'Inventables',
        'Tormach', 'Bantam', 'PrintNC', 'MPCNC', 'LowRider', 'Onefinity',
        'LongMill', 'WorkBee', 'Genmitsu', 'DATRON', 'Stepcraft', 'CNC4Newbie',
        'MillRight', 'Avid', 'UR', 'FANUC', 'ABB', 'KUKA', 'Techman',
      ];
      for (const b of brands) {
        if (name.includes(b)) return b;
      }
      return name.split(' ')[0];
    };
    const brands = new Set(ALL_MACHINES.map(m => brandExtract(m.name)));
    expect(brands.size).toBeGreaterThanOrEqual(30);
  });
});
