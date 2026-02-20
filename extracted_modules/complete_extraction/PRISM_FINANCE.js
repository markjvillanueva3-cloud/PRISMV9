const PRISM_FINANCE = {
  
  // Net Present Value
  npv: function(initialInvestment, cashFlows, discountRate) {
    let npv = -initialInvestment;
    for (let t = 0; t < cashFlows.length; t++) {
      npv += cashFlows[t] / Math.pow(1 + discountRate, t + 1);
    }
    return npv;
  },
  
  // Internal Rate of Return
  irr: function(initialInvestment, cashFlows, guess = 0.1) {
    let rate = guess;
    
    for (let iter = 0; iter < 100; iter++) {
      let npv = -initialInvestment;
      let derivative = 0;
      
      for (let t = 0; t < cashFlows.length; t++) {
        const discount = Math.pow(1 + rate, t + 1);
        npv += cashFlows[t] / discount;
        derivative -= (t + 1) * cashFlows[t] / Math.pow(1 + rate, t + 2);
      }
      
      if (Math.abs(npv) < 0.0001) return rate;
      rate = rate - npv / derivative;
    }
    
    return rate;
  },
  
  // Payback Period
  paybackPeriod: function(initialInvestment, cashFlows) {
    let cumulative = 0;
    
    for (let t = 0; t < cashFlows.length; t++) {
      cumulative += cashFlows[t];
      if (cumulative >= initialInvestment) {
        const prev = cumulative - cashFlows[t];
        return t + (initialInvestment - prev) / cashFlows[t];
      }
    }
    
    return Infinity;
  },
  
  // Machine Investment Analysis
  analyzeMachineInvestment: function(machine, projections) {
    const { purchasePrice, installationCost = 0, usefulLife, salvageValue = 0, discountRate = 0.10 } = machine;
    const { annualRevenue, annualCosts, taxRate = 0.25 } = projections;
    
    const initialInvestment = purchasePrice + installationCost;
    const annualDepreciation = (purchasePrice + installationCost - salvageValue) / usefulLife;
    
    const cashFlows = [];
    for (let year = 1; year <= usefulLife; year++) {
      const ebit = annualRevenue - annualCosts - annualDepreciation;
      const taxes = Math.max(0, ebit * taxRate);
      const netIncome = ebit - taxes;
      const operatingCashFlow = netIncome + annualDepreciation;
      cashFlows.push(operatingCashFlow);
    }
    cashFlows[cashFlows.length - 1] += salvageValue;
    
    return {
      initialInvestment,
      cashFlows,
      npv: this.npv(initialInvestment, cashFlows, discountRate),
      irr: this.irr(initialInvestment, cashFlows),
      payback: this.paybackPeriod(initialInvestment, cashFlows),
      recommendation: this.npv(initialInvestment, cashFlows, discountRate) > 0 ? 'ACCEPT' : 'REJECT'
    };
  },
  
  // OEE Calculation
  calculateOEE: function(data) {
    const { plannedTime, downtime, idealCycleTime, totalParts, goodParts } = data;
    
    const actualTime = plannedTime - downtime;
    const availability = actualTime / plannedTime;
    
    const theoreticalOutput = actualTime / idealCycleTime;
    const performance = totalParts / theoreticalOutput;
    
    const quality = goodParts / totalParts;
    
    return {
      oee: availability * performance * quality,
      availability,
      performance,
      quality,
      worldClass: availability * performance * quality >= 0.85
    };
  }
}