/**
 * PRISM_MATERIALS_MASTER
 * Extracted: Session 1.A.1 - January 22, 2026
 * Source: PRISM v8.89.002 (Line info in extraction-index)
 * Lines: 425
 * 
 * Part of PRISM Materials Database Category
 */


const PRISM_MATERIALS_MASTER = {
    name: 'PRISM Materials Master Database v3.0 - Merged',
    version: '3.0.0', totalMaterials: 0,
    sources: ['MIT 3.22', 'MIT 3.016', 'VDI 3323', 'Callister', 'MachiningDoctor'],
    GROUP_P_STEEL: { name: 'Steel (ISO P)', color: 'Blue', grades: {} },
    GROUP_M_STAINLESS: { name: 'Stainless Steel (ISO M)', color: 'Yellow', grades: {} },
    GROUP_K_CAST_IRON: { name: 'Cast Iron (ISO K)', color: 'Red', grades: {} },
    GROUP_N_NONFERROUS: { name: 'Non-Ferrous (ISO N)', color: 'Green', grades: {} },
    GROUP_S_SUPERALLOYS: { name: 'Superalloys (ISO S)', color: 'Orange', grades: {} },
    GROUP_H_HARDENED: { name: 'Hardened Steel (ISO H)', color: 'Gray', grades: {} }
    ,
    // Flat lookup for fast ID-based access
    byId: {}
};
(typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM] Part 1 loaded: Material factory ready');
// PRISM LAYER 1 & 2 - PART 2: MATERIAL DATA GENERATION
// 810+ materials batch generated

(typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM] Loading Part 2: Generating 810+ materials...');

(function generateAllMaterials() {
    const F = PRISM_MATERIALS_FACTORY;
    const DB = PRISM_MATERIALS_MASTER;

    // GROUP P - LOW CARBON STEELS (30)
    const lowCarbon = [
        ['1005','AISI 1005',310,260,80,78],['1006','AISI 1006',320,270,82,76],['1008','AISI 1008',340,285,85,75],
        ['1010','AISI 1010',365,305,95,72],['1012','AISI 1012',380,315,98,70],['1015','AISI 1015',390,325,111,68],
        ['1016','AISI 1016',410,340,116,66],['1017','AISI 1017',420,350,119,65],['1018','AISI 1018',440,370,126,70],
        ['1019','AISI 1019',450,375,128,68],['1020','AISI 1020',420,350,121,65],['1021','AISI 1021',430,360,124,64],
        ['1022','AISI 1022',440,370,127,63],['1023','AISI 1023',450,375,129,62],['1025','AISI 1025',470,390,137,60],
        ['1026','AISI 1026',480,400,140,58],['1029','AISI 1029',510,420,149,55],['1030','AISI 1030',525,435,156,52],
        ['A36','ASTM A36',400,250,119,60],['A572_50','ASTM A572-50',450,345,130,58],['A516_70','ASTM A516-70',485,260,137,55],
        ['12L14','AISI 12L14 Free-Cut',540,415,163,170],['1117','AISI 1117',480,380,143,90],['1118','AISI 1118',490,390,146,85],
        ['1119','AISI 1119',495,395,148,82],['1137','AISI 1137',620,490,179,70],['1139','AISI 1139',625,495,181,68],
        ['1140','AISI 1140',630,500,183,66],['1141','AISI 1141',640,510,186,65],['1144','AISI 1144 Stressproof',670,530,197,60]
    ];
    lowCarbon.forEach(([id,name,ts,ys,hd,mc]) => { DB.GROUP_P_STEEL.grades[id] = F.generateMaterial(id,name,'steel_low_carbon',ts,ys,hd,mc); });

    // GROUP P - MEDIUM CARBON STEELS (40)
    const mediumCarbon = [
        ['1035','AISI 1035',550,430,163,55],['1038','AISI 1038',570,450,167,53],['1040','AISI 1040',590,470,170,52],
        ['1042','AISI 1042',605,480,175,50],['1043','AISI 1043',615,490,178,48],['1044','AISI 1044',620,495,180,47],
        ['1045','AISI 1045',585,450,179,57],['1046','AISI 1046',600,470,183,55],['1049','AISI 1049',630,500,190,50],
        ['1050','AISI 1050',690,580,197,45],['1055','AISI 1055',725,610,212,42],['1059','AISI 1059',745,630,217,40],
        ['1060','AISI 1060',760,650,223,38],['1065','AISI 1065',785,670,229,36],['1070','AISI 1070',800,685,235,34],
        ['1074','AISI 1074',815,700,241,32],['1075','AISI 1075',825,710,244,31],['1078','AISI 1078',835,720,248,30],
        ['1080','AISI 1080',850,735,255,28],['1084','AISI 1084',870,755,262,26],['1085','AISI 1085',880,765,265,25],
        ['1086','AISI 1086',890,775,269,24],['1090','AISI 1090',910,795,277,22],['1095','AISI 1095',930,815,285,20],
        ['1340','AISI 1340',690,515,200,55],['1345','AISI 1345',725,545,217,50],['1522','AISI 1522',515,385,156,68],
        ['1524','AISI 1524',530,400,163,65],['1525','AISI 1525',540,410,167,63],['1526','AISI 1526',550,420,170,61],
        ['1541','AISI 1541',640,485,190,55],['1548','AISI 1548',690,525,210,50],['1551','AISI 1551',720,555,220,48],
        ['1552','AISI 1552',740,575,225,46],['1561','AISI 1561',780,610,235,42],['1566','AISI 1566',825,655,250,38],
        ['1572','AISI 1572',870,700,265,34],['E52100','SAE E52100',1160,1060,302,40],['5160','AISI 5160 Spring',940,810,277,35],
        ['9260','AISI 9260 Spring',980,850,285,32]
    ];
    mediumCarbon.forEach(([id,name,ts,ys,hd,mc]) => { DB.GROUP_P_STEEL.grades[id] = F.generateMaterial(id,name,'steel_medium_carbon',ts,ys,hd,mc); });

    // GROUP P - ALLOY STEELS (80)
    const alloySteel = [
        ['4118','AISI 4118',480,360,143,70],['4120','AISI 4120',500,380,149,68],['4130','AISI 4130',560,460,156,70],
        ['4135','AISI 4135',620,520,175,65],['4137','AISI 4137',650,550,183,62],['4140','AISI 4140',655,415,197,66],
        ['4142','AISI 4142',680,440,207,63],['4145','AISI 4145',720,480,217,58],['4147','AISI 4147',750,510,225,55],
        ['4150','AISI 4150',780,540,235,50],['4161','AISI 4161',870,640,265,42],['4320','AISI 4320',620,460,183,60],
        ['4330','AISI 4330',980,880,285,45],['4340','AISI 4340',745,470,217,57],['E4340','SAE E4340',745,470,217,55],
        ['4350','AISI 4350',820,560,241,48],['4615','AISI 4615',520,390,156,65],['4617','AISI 4617',540,410,163,62],
        ['4620','AISI 4620',555,425,167,60],['4626','AISI 4626',600,465,179,55],['4815','AISI 4815',580,445,175,58],
        ['4817','AISI 4817',595,460,179,55],['4820','AISI 4820',620,485,186,52],['5015','AISI 5015',485,370,143,68],
        ['5046','AISI 5046',620,485,183,55],['5115','AISI 5115',500,385,149,65],['5120','AISI 5120',530,410,159,62],
        ['5130','AISI 5130',580,455,171,58],['5132','AISI 5132',600,475,179,55],['5135','AISI 5135',630,500,186,52],
        ['5140','AISI 5140',660,530,197,48],['5145','AISI 5145',710,580,212,44],['5150','AISI 5150',750,620,223,40],
        ['5155','AISI 5155',810,680,241,36],['51100','AISI 51100',1100,1000,290,35],['52100','AISI 52100',1160,1060,302,40],
        ['8615','AISI 8615',520,395,156,65],['8617','AISI 8617',535,410,159,63],['8620','AISI 8620',530,385,149,66],
        ['8622','AISI 8622',565,425,167,62],['8625','AISI 8625',590,450,175,58],['8627','AISI 8627',620,480,183,55],
        ['8630','AISI 8630',650,510,193,52],['8637','AISI 8637',700,555,207,48],['8640','AISI 8640',750,605,223,45],
        ['8642','AISI 8642',780,635,232,42],['8645','AISI 8645',820,675,244,40],['8650','AISI 8650',870,725,259,36],
        ['8655','AISI 8655',920,780,273,32],['8660','AISI 8660',970,835,285,28],['8720','AISI 8720',550,420,163,63],
        ['8740','AISI 8740',760,610,227,45],['8750','AISI 8750',870,730,259,38],['9310','AISI 9310',910,675,269,50],
        ['9315','AISI 9315',950,720,280,45],['300M','AMS 6417 300M',2000,1620,560,38],['D6AC','AMS 6431 D6AC',1930,1520,540,40],
        ['9437','AISI 9437',720,570,212,50],['9440','AISI 9440',780,630,232,45],['9442','AISI 9442',820,675,244,42],
        ['Maraging_200','Maraging 200',1400,1350,480,40],['Maraging_250','Maraging 250',1800,1700,500,38],
        ['Maraging_300','Maraging 300',2000,1900,540,35],['Maraging_350','Maraging 350',2400,2300,580,30],
        ['HSLA_50','HSLA Grade 50',450,345,130,62],['HSLA_60','HSLA Grade 60',520,415,149,58],
        ['HSLA_70','HSLA Grade 70',590,485,171,54],['HSLA_80','HSLA Grade 80',660,550,193,50],
        ['HSLA_100','HSLA Grade 100',760,690,227,42],['A588','ASTM A588',485,345,143,60],
        ['A242','ASTM A242',480,340,140,62],['A847','ASTM A847',450,315,131,65],['1330','AISI 1330',660,530,186,52],
        ['1335','AISI 1335',690,560,193,50],['4027','AISI 4027',500,380,152,65],['4032','AISI 4032',540,410,163,62],
        ['4037','AISI 4037',585,450,175,58],['4047','AISI 4047',620,485,190,52],['4063','AISI 4063',745,600,220,42]
    ];
    alloySteel.forEach(([id,name,ts,ys,hd,mc]) => { DB.GROUP_P_STEEL.grades[id] = F.generateMaterial(id,name,'steel_alloy',ts,ys,hd,mc); });

    // GROUP P - TOOL STEELS (60)
    const toolSteel = [
        ['A2','AISI A2',760,415,620,65],['A3','AISI A3',780,435,630,60],['A4','AISI A4',750,405,610,68],
        ['A6','AISI A6',720,375,600,70],['A7','AISI A7',800,455,650,45],['A8','AISI A8',710,365,590,72],
        ['A9','AISI A9',700,355,580,75],['A10','AISI A10',690,345,570,78],['D2','AISI D2',760,415,620,30],
        ['D3','AISI D3',780,435,630,28],['D4','AISI D4',800,455,640,25],['D5','AISI D5',820,475,650,22],
        ['D7','AISI D7',850,505,660,18],['H10','AISI H10',670,325,540,55],['H11','AISI H11',700,355,560,52],
        ['H12','AISI H12',680,335,550,53],['H13','AISI H13',760,415,520,45],['H14','AISI H14',730,385,500,48],
        ['H19','AISI H19',790,445,580,40],['H21','AISI H21',810,465,600,35],['H22','AISI H22',830,485,610,33],
        ['H23','AISI H23',850,505,620,30],['H24','AISI H24',870,525,630,28],['H25','AISI H25',890,545,640,25],
        ['H26','AISI H26',920,575,650,22],['M1','AISI M1',880,535,630,30],['M2','AISI M2',950,600,650,25],
        ['M3_1','AISI M3-1',970,625,660,23],['M3_2','AISI M3-2',990,645,670,20],['M4','AISI M4',1020,675,680,18],
        ['M7','AISI M7',930,585,640,28],['M10','AISI M10',910,565,630,30],['M33','AISI M33',960,615,660,22],
        ['M34','AISI M34',980,635,670,20],['M35','AISI M35',1000,655,670,20],['M36','AISI M36',1020,675,680,18],
        ['M41','AISI M41',1100,755,690,15],['M42','AISI M42',1080,735,690,18],['M43','AISI M43',1120,775,700,14],
        ['M44','AISI M44',1140,795,700,12],['M46','AISI M46',1160,815,710,10],['M47','AISI M47',1180,835,710,8],
        ['O1','AISI O1',760,415,580,40],['O2','AISI O2',740,395,570,45],['O6','AISI O6',720,375,550,50],
        ['O7','AISI O7',700,355,540,55],['P2','AISI P2',620,275,320,70],['P3','AISI P3',640,295,340,68],
        ['P4','AISI P4',680,335,380,62],['P5','AISI P5',700,355,400,58],['P6','AISI P6',720,375,420,55],
        ['P20','AISI P20',965,830,300,65],['P21','AISI P21',1000,870,340,60],['S1','AISI S1',720,375,540,52],
        ['S2','AISI S2',700,355,520,55],['S5','AISI S5',740,395,550,48],['S6','AISI S6',760,415,560,45],
        ['S7','AISI S7',760,415,560,45],['T1','AISI T1',920,575,640,28],['T2','AISI T2',940,595,650,25]
    ];
    toolSteel.forEach(([id,name,ts,ys,hd,mc]) => { DB.GROUP_P_STEEL.grades[id] = F.generateMaterial(id,name,'steel_tool',ts,ys,hd,mc); });

    (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log(`[PRISM] GROUP_P_STEEL generated: ${Object.keys(DB.GROUP_P_STEEL.grades).length} grades`);
})();

(typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM] Part 2 loaded: Steel materials generated');
// PRISM LAYER 1 & 2 - PART 3: STAINLESS, CAST IRON, NON-FERROUS, SUPERALLOYS

(typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM] Loading Part 3: Remaining material groups...');

(function generateRemainingMaterials() {
    const F = PRISM_MATERIALS_FACTORY;
    const DB = PRISM_MATERIALS_MASTER;

    // GROUP M - AUSTENITIC STAINLESS (55)
    const austenitic = [
        ['201','AISI 201',655,310,183,45],['201L','AISI 201L',600,260,170,48],['202','AISI 202',620,275,175,46],
        ['301','AISI 301',760,275,217,40],['301L','AISI 301L',690,220,200,45],['302','AISI 302',620,275,175,45],
        ['303','AISI 303 Free-Cut',620,415,228,78],['304','AISI 304',580,290,201,45],['304H','AISI 304H',600,310,208,42],
        ['304L','AISI 304L',560,240,187,48],['304N','AISI 304N',650,345,217,40],['305','AISI 305',550,240,163,50],
        ['308','AISI 308',620,310,187,42],['309','AISI 309',620,310,187,40],['309S','AISI 309S',600,290,180,42],
        ['310','AISI 310',620,310,183,38],['310S','AISI 310S',600,275,175,40],['314','AISI 314',690,345,200,35],
        ['316','AISI 316',580,290,217,45],['316H','AISI 316H',600,310,222,42],['316L','AISI 316L',560,240,200,48],
        ['316N','AISI 316N',650,345,228,40],['316Ti','AISI 316Ti',600,310,217,43],['317','AISI 317',620,310,200,42],
        ['317L','AISI 317L',600,275,190,45],['321','AISI 321',620,240,187,45],['321H','AISI 321H',640,260,195,42],
        ['330','AISI 330',550,240,163,45],['347','AISI 347',655,275,187,42],['347H','AISI 347H',680,295,195,40],
        ['348','AISI 348',655,275,187,42],['384','AISI 384',550,240,163,48],['904L','UNS N08904',500,220,149,35],
        ['20Cb3','Alloy 20Cb-3',520,240,156,32],['254SMO','254 SMO',680,310,200,28],['654SMO','654 SMO',750,400,220,22],
        ['S31254','UNS S31254',650,300,195,30],['N08020','UNS N08020',520,240,156,32],['N08367','UNS N08367',700,320,205,25],
        ['S32654','UNS S32654',750,400,220,22],['S34565','UNS S34565',800,450,235,18],['204Cu','AISI 204Cu',585,245,167,50],
        ['XM-19','Nitronic 50',860,415,248,32],['XM-21','Nitronic 60',690,380,195,38],['XM-29','Nitronic 32',690,365,190,40],
        ['22Cr13Ni5Mn','Nitronic 33',655,380,190,42],['21Cr6Ni9Mn','Nitronic 40',655,360,185,44],
        ['Sanicro28','Sanicro 28',500,210,145,32],['AL6XN','AL-6XN',760,350,215,28],['25-6MO','25-6MO',700,310,200,30],
        ['1925hMo','1.4529 (25-6Mo)',700,310,200,30],['Alloy28','Alloy 28',500,210,145,32],['2RK65','2RK65',550,240,160,35],
        ['4565S','UNS S34565',800,450,235,18]
    ];
    austenitic.forEach(([id,name,ts,ys,hd,mc]) => { DB.GROUP_M_STAINLESS.grades[id] = F.generateMaterial(id,name,'stainless_austenitic',ts,ys,hd,mc); });

    // GROUP M - MARTENSITIC STAINLESS (30)
    const martensitic = [
        ['403','AISI 403',485,275,156,50],['410','AISI 410',450,275,217,54],['410S','AISI 410S',415,240,187,58],
        ['414','AISI 414',795,620,269,40],['416','AISI 416 Free-Cut',517,275,228,85],['420','AISI 420',690,550,241,45],
        ['420F','AISI 420F Free-Cut',690,550,241,65],['422','AISI 422',860,655,285,35],['431','AISI 431',860,655,269,38],
        ['440A','AISI 440A',725,415,269,38],['440B','AISI 440B',740,425,277,36],['440C','AISI 440C',760,450,302,32],
        ['440F','AISI 440F Free-Cut',760,450,302,48],['501','AISI 501',485,275,163,55],['502','AISI 502',485,275,163,55],
        ['Greek_Ascoloy','Greek Ascoloy',795,620,269,38],['S41000','UNS S41000',450,275,217,54],['S41040','UNS S41040',485,310,228,50],
        ['S41400','UNS S41400',795,620,269,40],['S41425','UNS S41425',860,690,285,35],['S41500','UNS S41500',900,725,295,32],
        ['S42000','UNS S42000',690,550,241,45],['S42010','UNS S42010',725,585,255,42],['S42020','UNS S42020',760,620,269,38],
        ['S42200','UNS S42200',860,655,285,35],['S44002','UNS S44002',725,415,269,38],['S44003','UNS S44003',740,425,277,36],
        ['S44004','UNS S44004',760,450,302,32],['154CM','154CM Blade',760,450,600,28],['ATS34','ATS-34 Blade',760,450,600,28]
    ];
    martensitic.forEach(([id,name,ts,ys,hd,mc]) => { DB.GROUP_M_STAINLESS.grades[id] = F.generateMaterial(id,name,'stainless_martensitic',ts,ys,hd,mc); });

    // GROUP M - PH STAINLESS (25)
    const phStainless = [
        ['17_4PH','17-4 PH',1310,1170,400,40],['17_4PH_H900','17-4 PH H900',1380,1240,440,35],['17_4PH_H1025','17-4 PH H1025',1170,1070,380,42],
        ['17_4PH_H1100','17-4 PH H1100',1070,965,350,45],['17_4PH_H1150','17-4 PH H1150',965,860,330,48],['15_5PH','15-5 PH',1310,1170,400,38],
        ['15_5PH_H900','15-5 PH H900',1380,1240,440,33],['15_5PH_H1025','15-5 PH H1025',1170,1070,380,40],['13_8Mo','13-8 Mo PH',1480,1380,470,30],
        ['13_8Mo_H950','13-8 Mo H950',1520,1420,490,28],['13_8Mo_H1000','13-8 Mo H1000',1450,1350,460,32],['17_7PH','17-7 PH',1240,1030,400,45],
        ['17_7PH_RH950','17-7 PH RH950',1450,1310,460,35],['PH15_7Mo','PH 15-7 Mo',1380,1170,440,32],['AM350','AM 350',1310,965,400,35],
        ['AM355','AM 355',1310,1035,420,33],['A286','A-286',965,655,320,35],['Custom455','Custom 455',1620,1550,480,25],
        ['Custom450','Custom 450',1310,1170,400,38],['Pyromet355','Pyromet 355',1310,1035,420,32],['S17400','UNS S17400',1310,1170,400,40],
        ['S15500','UNS S15500',1310,1170,400,38],['S13800','UNS S13800',1480,1380,470,30],['PH14_8Mo','PH 14-8 Mo',1380,1240,440,30],
        ['JBK_75','JBK-75',1380,1170,430,28]
    ];
    phStainless.forEach(([id,name,ts,ys,hd,mc]) => { DB.GROUP_M_STAINLESS.grades[id] = F.generateMaterial(id,name,'stainless_ph',ts,ys,hd,mc); });

    // GROUP M - DUPLEX STAINLESS (20)
    const duplex = [
        ['2205','Duplex 2205',620,450,293,30],['2304','Duplex 2304',600,400,270,35],['2507','Super Duplex 2507',795,550,310,22],
        ['2101','Lean Duplex 2101',700,450,285,32],['2003','Lean Duplex 2003',680,430,278,34],['255','Ferralium 255',760,550,302,24],
        ['S31803','UNS S31803',620,450,293,30],['S32205','UNS S32205',655,480,300,28],['S32304','UNS S32304',600,400,270,35],
        ['S32550','UNS S32550',760,550,302,24],['S32750','UNS S32750',795,550,310,22],['S32760','UNS S32760',750,530,305,23],
        ['S32900','UNS S32900',620,450,280,32],['S32950','UNS S32950',690,485,295,28],['S39274','UNS S39274',800,550,320,20],
        ['S39277','UNS S39277',850,600,335,18],['S32001','UNS S32001',650,430,275,33],['S32003','UNS S32003',680,450,285,31],
        ['S32101','UNS S32101',700,450,285,32],['S82441','UNS S82441',700,480,290,30]
    ];
    duplex.forEach(([id,name,ts,ys,hd,mc]) => { DB.GROUP_M_STAINLESS.grades[id] = F.generateMaterial(id,name,'stainless_duplex',ts,ys,hd,mc); });

    // GROUP M - FERRITIC STAINLESS (20)
    const ferritic = [
        ['405','AISI 405',415,275,149,55],['409','AISI 409',380,205,137,60],['409Cb','AISI 409Cb',400,225,143,58],
        ['429','AISI 429',450,275,163,52],['430','AISI 430',450,275,183,54],['430F','AISI 430F Free-Cut',450,275,183,75],
        ['434','AISI 434',530,365,190,48],['436','AISI 436',530,365,190,48],['439','AISI 439',450,275,163,52],
        ['442','AISI 442',530,310,197,45],['444','AISI 444',415,275,163,55],['446','AISI 446',515,275,190,42],
        ['S40500','UNS S40500',415,275,149,55],['S40900','UNS S40900',380,205,137,60],['S43000','UNS S43000',450,275,183,54],
        ['S43400','UNS S43400',530,365,190,48],['S44400','UNS S44400',415,275,163,55],['S44600','UNS S44600',515,275,190,42],
        ['S44660','Sea-Cure',550,380,200,40],['E-Brite26-1','E-Brite 26-1',480,310,175,50]
    ];
    ferritic.forEach(([id,name,ts,ys,hd,mc]) => { DB.GROUP_M_STAINLESS.grades[id] = F.generateMaterial(id,name,'stainless_martensitic',ts,ys,hd,mc); });

    (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log(`[PRISM] GROUP_M_STAINLESS generated: ${Object.keys(DB.GROUP_M_STAINLESS.grades).length} grades`);

    // GROUP K - GRAY CAST IRON (22)
    const grayCast = [
        ['GG10','Gray GG10',100,0,120,100],['GG15','Gray GG15',150,0,140,95],['GG20','Gray GG20',200,0,160,90],
        ['GG25','Gray GG25',250,0,180,85],['GG30','Gray GG30',300,0,200,80],['GG35','Gray GG35',350,0,220,75],
        ['GG40','Gray GG40',400,0,240,70],['Class20','ASTM A48 Class 20',152,0,146,95],['Class25','ASTM A48 Class 25',179,0,170,90],
        ['Class30','ASTM A48 Class 30',214,0,190,85],['Class35','ASTM A48 Class 35',252,0,207,80],['Class40','ASTM A48 Class 40',293,0,223,75],
        ['Class45','ASTM A48 Class 45',324,0,241,70],['Class50','ASTM A48 Class 50',362,0,262,65],['Class55','ASTM A48 Class 55',393,0,285,60],
        ['Class60','ASTM A48 Class 60',431,0,302,55],['FC100','JIS FC100',100,0,120,100],['FC150','JIS FC150',150,0,145,95],
        ['FC200','JIS FC200',200,0,170,90],['FC250','JIS FC250',250,0,195,85],['FC300','JIS FC300',300,0,215,80],['FC350','JIS FC350',350,0,235,75]
    ];
    grayCast.forEach(([id,name,ts,ys,hd,mc]) => { DB.GROUP_K_CAST_IRON.grades[id] = F.generateMaterial(id,name,'cast_iron_gray',ts,ys,hd,mc,{density:7.2}); });

    // GROUP K - DUCTILE CAST IRON (25)
    const ductileCast = [
        ['GGG40','Ductile GGG-40',400,250,140,75],['GGG50','Ductile GGG-50',500,320,170,70],['GGG60','Ductile GGG-60',600,370,190,65],
        ['GGG70','Ductile GGG-70',700,440,220,60],['GGG80','Ductile GGG-80',800,510,250,55],['65_45_12','ASTM 65-45-12',448,310,156,72],
        ['80_55_06','ASTM 80-55-06',552,379,170,68],['100_70_03','ASTM 100-70-03',690,483,217,60],['120_90_02','ASTM 120-90-02',827,621,269,52],
        ['FCD400','JIS FCD400',400,250,140,75],['FCD450','JIS FCD450',450,280,155,72],['FCD500','JIS FCD500',500,320,170,70],
        ['FCD600','JIS FCD600',600,370,200,65],['FCD700','JIS FCD700',700,440,230,58],['FCD800','JIS FCD800',800,510,260,52],
        ['ADI_900','ADI Grade 900',900,600,269,45],['ADI_1050','ADI Grade 1050',1050,750,302,40],['ADI_1200','ADI Grade 1200',1200,850,341,35],
        ['ADI_1400','ADI Grade 1400',1400,1100,401,28],['ADI_1600','ADI Grade 1600',1600,1300,444,22],['D4018','ASTM A897 D4018',1200,850,341,35],
        ['D4512','ASTM A897 D4512',1400,1100,401,28],['D5506','ASTM A897 D5506',1600,1300,444,22],['Ni_Resist_D2','Ni-Resist D-2',420,240,139,65],
        ['Ni_Resist_D2C','Ni-Resist D-2C',470,280,156,60]
    ];
    ductileCast.forEach(([id,name,ts,ys,hd,mc]) => { DB.GROUP_K_CAST_IRON.grades[id] = F.generateMaterial(id,name,'cast_iron_ductile',ts,ys,hd,mc,{density:7.1}); });

    // GROUP K - CGI & SPECIAL (10)
    const cgiCast = [
        ['GJV300','CGI GJV-300',300,210,170,75],['GJV350','CGI GJV-350',350,250,190,70],['GJV400','CGI GJV-400',400,280,210,65],
        ['GJV450','CGI GJV-450',450,310,230,60],['GJV500','CGI GJV-500',500,340,250,55],['Malle32510','Malleable 32510',345,224,131,80],
        ['Malle35018','Malleable 35018',366,241,143,78],['Malle40010','Malleable 40010',400,276,163,72],['Malle45006','Malleable 45006',449,311,179,68],
        ['Malle50005','Malleable 50005',483,345,197,62]
    ];
    cgiCast.forEach(([id,name,ts,ys,hd,mc]) => { DB.GROUP_K_CAST_IRON.grades[id] = F.generateMaterial(id,name,'cast_iron_cgi',ts,ys,hd,mc,{density:7.15}); });

    (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log(`[PRISM] GROUP_K_CAST_IRON generated: ${Object.keys(DB.GROUP_K_CAST_IRON.grades).length} grades`);
})();

(typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM] Part 3 loaded: Stainless & Cast Iron generated');
// PRISM LAYER 1 & 2 - PART 4: NON-FERROUS, SUPERALLOYS, HARDENED

(typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM] Loading Part 4: Non-ferrous, Superalloys, Hardened...');

(function generatePart4Materials() {
    const F = PRISM_MATERIALS_FACTORY;
    const DB = PRISM_MATERIALS_MASTER;

    // GROUP N - WROUGHT ALUMINUM (50)
    const aluminumWrought = [
        ['1100','AA 1100',90,34,23,125,{density:2.71}],
        ['1100_H14','AA 1100-H14',125,117,32,115,{density:2.71}],['1100_H18','AA 1100-H18',165,152,44,100,{density:2.71}],
        ['2011_T3','AA 2011-T3 Free-Cut',380,295,95,150,{density:2.83}],['2014_T4','AA 2014-T4',425,290,105,70,{density:2.80}],
        ['2014_T6','AA 2014-T6',485,415,135,65,{density:2.80}],['2017_T4','AA 2017-T4',427,276,105,70,{density:2.79}],
        ['2024_O','AA 2024-O',186,76,47,90,{density:2.78}],['2024_T3','AA 2024-T3',485,345,120,60,{density:2.78}],
        ['2024_T351','AA 2024-T351',470,325,120,60,{density:2.78}],['2024_T4','AA 2024-T4',470,325,120,60,{density:2.78}],
        ['2024_T6','AA 2024-T6',476,393,125,55,{density:2.78}],['2024_T81','AA 2024-T81',485,450,128,52,{density:2.78}],
        ['2124_T851','AA 2124-T851',485,440,126,55,{density:2.78}],['2219_T62','AA 2219-T62',414,290,103,65,{density:2.84}],
        ['2219_T87','AA 2219-T87',476,393,123,55,{density:2.84}],['2618_T61','AA 2618-T61',440,372,115,62,{density:2.76}],
        ['5052_O','AA 5052-O',195,90,47,100,{density:2.68}],['5052_H32','AA 5052-H32',230,195,60,90,{density:2.68}],
        ['5052_H34','AA 5052-H34',260,215,68,85,{density:2.68}],['5083_O','AA 5083-O',290,145,65,90,{density:2.66}],
        ['5083_H116','AA 5083-H116',315,230,77,85,{density:2.66}],['5086_O','AA 5086-O',260,115,58,92,{density:2.66}],
        ['5086_H32','AA 5086-H32',290,205,72,88,{density:2.66}],['5454_O','AA 5454-O',250,115,55,94,{density:2.69}],
        ['5456_H321','AA 5456-H321',350,255,90,80,{density:2.66}],['6061_O','AA 6061-O',125,55,30,110,{density:2.70}],
        ['6061_T4','AA 6061-T4',240,145,65,90,{density:2.70}],['6061_T6','AA 6061-T6',310,275,95,85,{density:2.70}],
        ['6061_T651','AA 6061-T651',310,275,95,85,{density:2.70}],['6063_T5','AA 6063-T5',185,145,60,95,{density:2.70}],
        ['6063_T6','AA 6063-T6',240,215,73,90,{density:2.70}],['6082_T6','AA 6082-T6',310,260,90,85,{density:2.70}],
        ['6262_T9','AA 6262-T9 Free-Cut',400,380,120,140,{density:2.72}],['7050_T7451','AA 7050-T7451',525,455,142,50,{density:2.83}],
        ['7050_T7651','AA 7050-T7651',550,490,148,48,{density:2.83}],['7075_O','AA 7075-O',228,103,60,75,{density:2.81}],
        ['7075_T6','AA 7075-T6',572,503,150,50,{density:2.81}],['7075_T651','AA 7075-T651',572,503,150,50,{density:2.81}],
        ['7075_T73','AA 7075-T73',503,434,138,55,{density:2.81}],['7175_T7351','AA 7175-T7351',538,469,145,52,{density:2.80}],
        ['7475_T7351','AA 7475-T7351',490,414,135,55,{density:2.81}],['7178_T6','AA 7178-T6',607,538,160,45,{density:2.83}],
        ['A356_T6','A356-T6 Cast',262,186,80,90,{density:2.68}],['A380','A380 Die Cast',320,160,80,75,{density:2.71}],
        ['A383','A383 Die Cast',310,150,75,78,{density:2.74}],['319_T6','319-T6 Cast',250,165,80,80,{density:2.79}],
        ['355_T6','355-T6 Cast',240,170,75,82,{density:2.71}]
    ];
    aluminumWrought.forEach(([id,name,ts,ys,hd,mc,ex]) => { DB.GROUP_N_NONFERROUS.grades[id] = F.generateMaterial(id,name,'aluminum_wrought',ts,ys,hd,mc,ex); });

    // GROUP N - COPPER ALLOYS (25)
    const copperAlloys = [
        ['C10100','C10100 OFC',220,69,45,80,{density:8.94}],['C10200','C10200 OFHC',221,69,45,80,{density:8.94}],
        ['C11000','C11000 ETP',220,69,42,80,{density:8.94}],['C14500','C14500 Tellurium Cu',317,303,82,130,{density:8.94}],
        ['C17200','C17200 BeCu HT',1280,1100,400,25,{density:8.26}],['C17300','C17300 BeCu',758,620,250,35,{density:8.26}],
        ['C18200','C18200 CrCu',469,379,80,45,{density:8.89}],['C26000','C26000 Cartridge Brass',380,135,65,90,{density:8.53}],
        ['C27000','C27000 Yellow Brass',365,125,62,92,{density:8.47}],['C28000','C28000 Muntz',370,145,75,85,{density:8.39}],
        ['C35300','C35300 Leaded Brass',338,117,55,140,{density:8.47}],['C36000','C36000 Free-Cut Brass',338,124,60,170,{density:8.50}],
        ['C37700','C37700 Forging Brass',345,140,65,130,{density:8.44}],['C46400','C46400 Naval Brass',395,170,78,70,{density:8.41}],
        ['C51000','C51000 Phosphor Bronze',340,200,90,65,{density:8.86}],['C52100','C52100 Phosphor Bronze',455,262,100,55,{density:8.80}],
        ['C54400','C54400 Phosphor Bronze',390,230,88,100,{density:8.89}],['C61300','C61300 AlBronze',550,275,155,50,{density:7.89}],
        ['C63000','C63000 NiAlBronze',690,345,195,35,{density:7.58}],['C63200','C63200 NiAlBronze',620,260,175,40,{density:7.64}],
        ['C70600','C70600 CuNi 90/10',275,105,75,70,{density:8.94}],['C71500','C71500 CuNi 70/30',372,125,85,60,{density:8.95}],
        ['C93200','C93200 Bearing Bronze',240,115,65,85,{density:8.93}],['C95400','C95400 AlBronze',586,241,170,45,{density:7.45}],
        ['C95500','C95500 NiAlBronze',760,310,200,38,{density:7.53}]
    ];
    copperAlloys.forEach(([id,name,ts,ys,hd,mc,ex]) => { DB.GROUP_N_NONFERROUS.grades[id] = F.generateMaterial(id,name,'copper_pure',ts,ys,hd,mc,ex); });

    // GROUP N - MAGNESIUM (10)
    const magnesiumAlloys = [
        ['AZ31B','AZ31B Mg',260,200,49,120,{density:1.77}],['AZ31B_H24','AZ31B-H24',290,220,55,115,{density:1.77}],
        ['AZ61A','AZ61A Mg',310,230,60,110,{density:1.80}],['AZ80A_T5','AZ80A-T5',380,275,75,90,{density:1.80}],
        ['AZ91D','AZ91D Die Cast',230,160,63,100,{density:1.81}],['AM50A','AM50A Die Cast',210,125,57,105,{density:1.77}],
        ['AM60B','AM60B Die Cast',225,130,60,102,{density:1.79}],['ZK60A_T5','ZK60A-T5',365,305,85,85,{density:1.83}],
        ['WE43_T6','WE43-T6 RareEarth',250,170,75,80,{density:1.84}],['EZ33A_T5','EZ33A-T5',160,110,50,90,{density:1.83}]
    ];
    magnesiumAlloys.forEach(([id,name,ts,ys,hd,mc,ex]) => { DB.GROUP_N_NONFERROUS.grades[id] = F.generateMaterial(id,name,'magnesium',ts,ys,hd,mc,ex); });

    // GROUP N - ZINC (6)
    const zincAlloys = [
        ['Zamak2','Zamak 2',328,283,100,110,{density:6.6}],['Zamak3','Zamak 3',283,221,82,115,{density:6.6}],
        ['Zamak5','Zamak 5',328,228,91,108,{density:6.6}],['Zamak7','Zamak 7',283,221,80,118,{density:6.6}],
        ['ZA8','ZA-8',374,290,100,100,{density:6.3}],['ZA27','ZA-27',425,320,116,80,{density:5.0}]
    ];
    zincAlloys.forEach(([id,name,ts,ys,hd,mc,ex]) => { DB.GROUP_N_NONFERROUS.grades[id] = F.generateMaterial(id,name,'zinc_alloy',ts,ys,hd,mc,ex); });

    (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log(`[PRISM] GROUP_N_NONFERROUS generated: ${Object.keys(DB.GROUP_N_NONFERROUS.grades).length} grades`);

    // GROUP S - TITANIUM (25)
    const titanium = [
        ['Ti_CP_Gr1','Ti CP Grade 1',240,170,120,60,{density:4.51}],['Ti_CP_Gr2','Ti CP Grade 2',345,275,145,55,{density:4.51}],
        ['Ti_CP_Gr3','Ti CP Grade 3',450,380,175,48,{density:4.51}],['Ti_CP_Gr4','Ti CP Grade 4',550,480,200,42,{density:4.51}],
        ['Ti_64','Ti-6Al-4V Grade 5',950,880,334,28,{density:4.43}],['Ti_64_ELI','Ti-6Al-4V ELI',860,795,320,30,{density:4.43}],
        ['Ti_64_Ann','Ti-6Al-4V Annealed',895,830,320,30,{density:4.43}],['Ti_64_STA','Ti-6Al-4V STA',1100,1000,370,22,{density:4.43}],
        ['Ti_6242','Ti-6Al-2Sn-4Zr-2Mo',1030,965,350,25,{density:4.54}],['Ti_6246','Ti-6Al-2Sn-4Zr-6Mo',1170,1100,380,20,{density:4.65}],
        ['Ti_5553','Ti-5Al-5V-5Mo-3Cr',1280,1210,405,18,{density:4.65}],['Ti_17','Ti-17',1170,1100,375,22,{density:4.65}],
        ['Ti_1023','Ti-10V-2Fe-3Al',1250,1170,400,18,{density:4.65}],['Ti_15_3','Ti-15V-3Cr-3Al-3Sn',1000,965,340,28,{density:4.76}],
        ['Ti_3Al_25V','Ti-3Al-2.5V Grade 9',620,520,235,40,{density:4.48}],['Ti_Gr7','Ti Grade 7 Pd',345,275,145,55,{density:4.51}],
        ['Ti_Gr12','Ti Grade 12',480,380,180,45,{density:4.51}],['Ti_6242S','Ti-6Al-2Sn-4Zr-2Mo-Si',1035,970,355,24,{density:4.54}],
        ['Ti_811','Ti-8Al-1Mo-1V',965,895,330,28,{density:4.37}],['Ti_662','Ti-6Al-6V-2Sn',1100,1030,370,22,{density:4.54}],
        ['Beta_21S','Beta 21S',1100,1000,365,25,{density:4.94}],['Ti_LCB','Ti-LCB',860,760,310,32,{density:4.82}],
        ['Ti_6Al_7Nb','Ti-6Al-7Nb Medical',900,800,330,30,{density:4.52}],['SP700','SP-700',1000,920,345,26,{density:4.50}],
        ['Ti_38644','Ti-38-6-44',1100,1030,360,24,{density:4.81}]
    ];
    titanium.forEach(([id,name,ts,ys,hd,mc,ex]) => { DB.GROUP_S_SUPERALLOYS.grades[id] = F.generateMaterial(id,name,'titanium_alloy',ts,ys,hd,mc,ex); });

    // GROUP S - NICKEL SUPERALLOYS (40)
    const nickel = [
        ['Inconel_600','Inconel 600',550,220,150,40,{density:8.47}],['Inconel_601','Inconel 601',620,270,165,35,{density:8.11}],
        ['Inconel_617','Inconel 617',740,310,195,28,{density:8.36}],['Inconel_625','Inconel 625',827,414,235,25,{density:8.44}],
        ['Inconel_690','Inconel 690',620,240,175,35,{density:8.19}],['Inconel_713C','Inconel 713C',850,740,285,18,{density:8.00}],
        ['Inconel_718','Inconel 718',1240,1035,363,15,{density:8.19}],['Inconel_718_Ann','Inconel 718 Ann',965,550,290,22,{density:8.19}],
        ['Inconel_725','Inconel 725',1035,724,315,18,{density:8.31}],['Inconel_738','Inconel 738',1095,896,340,14,{density:8.11}],
        ['Inconel_X750','Inconel X-750',1240,862,330,18,{density:8.28}],['Waspaloy','Waspaloy',1275,795,350,15,{density:8.19}],
        ['Hastelloy_B2','Hastelloy B-2',895,390,230,30,{density:9.22}],['Hastelloy_C22','Hastelloy C-22',785,360,210,32,{density:8.69}],
        ['Hastelloy_C276','Hastelloy C-276',785,355,210,32,{density:8.89}],['Hastelloy_G30','Hastelloy G-30',690,315,195,38,{density:8.22}],
        ['Hastelloy_X','Hastelloy X',785,360,220,28,{density:8.22}],['Rene_41','Rene 41',1380,1035,375,12,{density:8.25}],
        ['Rene_80','Rene 80',1240,965,350,14,{density:8.16}],['Rene_88DT','Rene 88DT',1350,1100,380,10,{density:8.22}],
        ['Rene_95','Rene 95',1620,1240,420,8,{density:8.25}],['Udimet_500','Udimet 500',1170,860,340,15,{density:8.03}],
        ['Udimet_520','Udimet 520',1275,930,360,12,{density:8.02}],['Udimet_700','Udimet 700',1380,1000,380,10,{density:7.91}],
        ['Udimet_720','Udimet 720',1520,1175,400,8,{density:8.08}],['MAR_M247','MAR-M247',1035,870,350,10,{density:8.53}],
        ['Nimonic_75','Nimonic 75',620,260,175,38,{density:8.37}],['Nimonic_80A','Nimonic 80A',1100,690,310,18,{density:8.19}],
        ['Nimonic_90','Nimonic 90',1170,760,335,15,{density:8.18}],['Nimonic_105','Nimonic 105',1170,825,340,14,{density:8.00}],
        ['Nimonic_115','Nimonic 115',1240,830,355,12,{density:7.85}],['Monel_400','Monel 400',550,240,140,50,{density:8.80}],
        ['Monel_K500','Monel K-500',1100,790,290,25,{density:8.44}],['Incoloy_800','Incoloy 800',520,205,140,48,{density:7.94}],
        ['Incoloy_800H','Incoloy 800H',520,205,140,48,{density:7.94}],['Incoloy_825','Incoloy 825',585,240,160,42,{density:8.14}],
        ['Incoloy_901','Incoloy 901',1170,830,325,18,{density:8.21}],['Incoloy_925','Incoloy 925',827,517,250,28,{density:8.08}],
        ['Pyromet_A286','Pyromet A-286',965,655,295,20,{density:7.94}],['MP159','MP159',1830,1690,440,10,{density:8.35}]
    ];
    nickel.forEach(([id,name,ts,ys,hd,mc,ex]) => { DB.GROUP_S_SUPERALLOYS.grades[id] = F.generateMaterial(id,name,'nickel_superalloy',ts,ys,hd,mc,ex); });

    // GROUP S - COBALT SUPERALLOYS (15)
    const cobalt = [
        ['Stellite_1','Stellite 1',620,475,550,15,{density:8.69}],['Stellite_6','Stellite 6',800,550,400,20,{density:8.44}],
        ['Stellite_6B','Stellite 6B',860,635,420,18,{density:8.39}],['Stellite_12','Stellite 12',690,540,480,16,{density:8.58}],
        ['Stellite_21','Stellite 21',690,480,320,25,{density:8.33}],['Stellite_25','Stellite 25',920,520,300,18,{density:9.13}],
        ['L605','L-605 Haynes 25',1000,445,280,20,{density:9.13}],['Haynes_188','Haynes 188',900,410,265,22,{density:8.98}],
        ['Haynes_230','Haynes 230',860,370,240,25,{density:8.97}],['Haynes_556','Haynes 556',795,380,230,28,{density:8.23}],
        ['MP35N','MP35N',1860,1725,580,10,{density:8.43}],['Phynox','Phynox Elgiloy',1900,1600,560,12,{density:8.30}],
        ['FSX_414','FSX-414',790,455,255,22,{density:8.58}],['X_40','X-40',745,505,275,18,{density:8.60}],['WI_52','WI-52',700,490,265,20,{density:9.00}]
    ];
    cobalt.forEach(([id,name,ts,ys,hd,mc,ex]) => { DB.GROUP_S_SUPERALLOYS.grades[id] = F.generateMaterial(id,name,'cobalt_superalloy',ts,ys,hd,mc,ex); });

    (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log(`[PRISM] GROUP_S_SUPERALLOYS generated: ${Object.keys(DB.GROUP_S_SUPERALLOYS.grades).length} grades`);

    // GROUP H - HARDENED STEEL (30)
    const hardened = [
        ['Steel_40HRC','Steel 40 HRC',1280,1100,375,45],['Steel_42HRC','Steel 42 HRC',1340,1150,395,42],['Steel_44HRC','Steel 44 HRC',1400,1200,415,38],
        ['Steel_46HRC','Steel 46 HRC',1480,1280,437,35],['Steel_48HRC','Steel 48 HRC',1550,1350,460,32],['Steel_50HRC','Steel 50 HRC',1650,1450,484,28],
        ['Steel_52HRC','Steel 52 HRC',1750,1550,509,25],['Steel_54HRC','Steel 54 HRC',1850,1650,535,22],['Steel_55HRC','Steel 55 HRC',1900,1700,550,20],
        ['Steel_56HRC','Steel 56 HRC',1950,1750,567,18],['Steel_58HRC','Steel 58 HRC',2050,1850,603,15],['Steel_60HRC','Steel 60 HRC',2150,1950,641,12],
        ['Steel_62HRC','Steel 62 HRC',2270,2070,680,10],['Steel_64HRC','Steel 64 HRC',2400,2200,722,8],['Steel_66HRC','Steel 66 HRC',2550,2350,768,6],
        ['Steel_68HRC','Steel 68 HRC',2700,2500,816,5],['Steel_70HRC','Steel 70 HRC',2850,2650,868,4],['D2_60HRC','D2 @ 60 HRC',2150,1950,641,12],
        ['H13_48HRC','H13 @ 48 HRC',1550,1350,460,30],['S7_56HRC','S7 @ 56 HRC',1950,1750,567,18],['4140_50HRC','4140 @ 50 HRC',1650,1450,484,25],
        ['4340_54HRC','4340 @ 54 HRC',1850,1650,535,20],['52100_62HRC','52100 @ 62 HRC',2270,2070,680,10],['M2_65HRC','M2 @ 65 HRC',2450,2250,746,8],
        ['A2_60HRC','A2 @ 60 HRC',2150,1950,641,15],['O1_58HRC','O1 @ 58 HRC',2050,1850,603,18],['440C_58HRC','440C @ 58 HRC',2050,1850,603,15],
        ['17_4PH_44HRC','17-4PH @ 44 HRC',1400,1200,415,30],['CPM_S90V','CPM S90V @ 60 HRC',2150,1950,641,8],['CPM_10V','CPM 10V @ 62 HRC',2270,2070,680,6]
    ];
    hardened.forEach(([id,name,ts,ys,hd,mc]) => { DB.GROUP_H_HARDENED.grades[id] = F.generateMaterial(id,name,'hardened_steel',ts,ys,hd,mc); });

    (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log(`[PRISM] GROUP_H_HARDENED generated: ${Object.keys(DB.GROUP_H_HARDENED.grades).length} grades`);

    // Calculate total
    let total = 0;
    ['GROUP_P_STEEL','GROUP_M_STAINLESS','GROUP_K_CAST_IRON','GROUP_N_NONFERROUS','GROUP_S_SUPERALLOYS','GROUP_H_HARDENED'].forEach(g => {
        total += Object.keys(DB[g].grades).length;
    });
    DB.totalMaterials = total;
    (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log(`[PRISM] TOTAL MATERIALS: ${total}`);
})();

// Utility functions
PRISM_MATERIALS_MASTER.getMaterial = function(id) {
    for (const group of ['GROUP_P_STEEL','GROUP_M_STAINLESS','GROUP_K_CAST_IRON','GROUP_N_NONFERROUS','GROUP_S_SUPERALLOYS','GROUP_H_HARDENED']) {
        if (this[group].grades[id]) return { ...this[group].grades[id], isoGroup: group };
    }
    return null;
};
PRISM_MATERIALS_MASTER.calculateKc = function(id, h) {
    const mat = this.getMaterial(id);
    return mat ? mat.Kc1_1 * Math.pow(h, -mat.mc) : null;
};
PRISM_MATERIALS_MASTER.search = function(q) {
    const results = [], query = q.toLowerCase();
    for (const group of ['GROUP_P_STEEL','GROUP_M_STAINLESS','GROUP_K_CAST_IRON','GROUP_N_NONFERROUS','GROUP_S_SUPERALLOYS','GROUP_H_HARDENED']) {
        for (const [id, mat] of Object.entries(this[group].grades)) {
            if (id.toLowerCase().includes(query) || mat.name.toLowerCase().includes(query)) results.push({ id, ...mat, isoGroup: group });
        }
    }
    return results;
};
