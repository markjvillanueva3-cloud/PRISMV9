const PRISM_ENHANCED_POST_DATABASE_V2 = {
  version: '3.0.0',
  buildDate: '2026-01-08',
  totalPosts: 7,

  posts: {
    'HAAS_VF2__Ai_Enhanced__iMachining_': {
      filename: "HAAS_VF2_-Ai-Enhanced__iMachining_.cps",
      description: "HAAS VF-2 Enhanced",
      vendor: "Haas Automation",
      capabilities: "CAPABILITY_MILLING | CAPABILITY_MACHINE_SIMULATION",
      lines: 4960,
      enhanced: true,
      iMachining: false
    },
    'HURCO_VM30i_PRISM_Enhanced_v8_9_153': {
      filename: "HURCO_VM30i_PRISM_Enhanced_v8_9_153.cps",
      description: "PRISM Enhanced - HURCO VM30i",
      vendor: "HURCO",
      capabilities: "CAPABILITY_MILLING | CAPABILITY_MACHINE_SIMULATION",
      lines: 5011,
      enhanced: true,
      iMachining: false
    },
    'OKUMA_M460V_5AX_Ai_Enhanced__iMachining_': {
      filename: "OKUMA-M460V-5AX-Ai_Enhanced-_iMachining_.cps",
      description: "OKUMA M460V-5AX Ultra Enhanced",
      vendor: "OKUMA",
      capabilities: "CAPABILITY_MILLING | CAPABILITY_MACHINE_SIMULATION",
      lines: 4927,
      enhanced: true,
      iMachining: false
    },
    'OKUMA_GENOS_L400II_P300LA_Ai_Enhanced': {
      filename: "OKUMA_GENOS_L400II_P300LA-Ai-Enhanced.cps",
      description: "Okuma Genos L400II-e with OSP-P300LA-e control",
      vendor: "OKUMA",
      capabilities: "CAPABILITY_TURNING",
      lines: 4138,
      enhanced: true,
      iMachining: false
    },
    'OKUMA_LATHE_LB3000_Ai_Enhanced': {
      filename: "OKUMA_LATHE_LB3000-Ai-Enhanced.cps",
      description: "Okuma LB3000EXII with OSP-P300L control",
      vendor: "OKUMA",
      capabilities: "CAPABILITY_MILLING | CAPABILITY_TURNING",
      lines: 4293,
      enhanced: true,
      iMachining: false
    },
    'OKUMA_MULTUS_B250IIW_Ai_Enhanced': {
      filename: "OKUMA_MULTUS_B250IIW-Ai-Enhanced.cps",
      description: "Okuma Multus B250IIW Ultra Enhanced",
      vendor: "OKUMA",
      capabilities: "CAPABILITY_MILLING | CAPABILITY_TURNING",
      lines: 5657,
      enhanced: true,
      iMachining: false
    },
    'Roku_Roku_Ai_Enhanced': {
      filename: "Roku-Roku-Ai-Enhanced.cps",
      description: "FANUC 31i-B5 Roku-Roku Enhanced",
      vendor: "Fanuc",
      capabilities: "CAPABILITY_MILLING | CAPABILITY_MACHINE_SIMULATION",
      lines: 5261,
      enhanced: true,
      iMachining: false
    }
  },
  // Get post by name
  getPost(name) {
    const safeName = name.replace(/ /g, '_').replace(/-/g, '_').replace(/\./g, '_');
    return this.posts[safeName] || null;
  },
  // Get posts by vendor
  getByVendor(vendor) {
    return Object.values(this.posts).filter(p =>
      p.vendor.toLowerCase().includes(vendor.toLowerCase())
    );
  },
  // Get enhanced posts only
  getEnhancedPosts() {
    return Object.values(this.posts).filter(p => p.enhanced);
  },
  // Get posts with iMachining support
  getIMachiningPosts() {
    return Object.values(this.posts).filter(p => p.iMachining);
  }
}