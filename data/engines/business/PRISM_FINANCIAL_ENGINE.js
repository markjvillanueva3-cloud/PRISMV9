/**
 * PRISM_FINANCIAL_ENGINE
 * Extracted from PRISM v8.89.002 monolith
 * Lines: 177
 * Session: R2.3.1 Engine Gap Extraction Round 2
 */

const PRISM_FINANCIAL_ENGINE = {

    version: '1.0.0',

    /**
     * Calculate Net Present Value (NPV)
     */
    calculateNPV: function(cashFlows, discountRate) {
        let npv = 0;
        cashFlows.forEach((cf, year) => {
            npv += cf / Math.pow(1 + discountRate, year);
        });
        return {
            npv: npv,
            formatted: '$' + npv.toFixed(2),
            viable: npv > 0,
            recommendation: npv > 0 ? 'Project is financially viable' : 'Project does not meet hurdle rate'
        };
    },
    /**
     * Calculate Internal Rate of Return (IRR)
     */
    calculateIRR: function(cashFlows, guess = 0.1) {
        const maxIterations = 100;
        const tolerance = 0.0001;
        let rate = guess;

        for (let i = 0; i < maxIterations; i++) {
            let npv = 0;
            let derivativeNpv = 0;

            cashFlows.forEach((cf, year) => {
                npv += cf / Math.pow(1 + rate, year);
                if (year > 0) {
                    derivativeNpv -= year * cf / Math.pow(1 + rate, year + 1);
                }
            });

            const newRate = rate - npv / derivativeNpv;

            if (Math.abs(newRate - rate) < tolerance) {
                return {
                    irr: newRate,
                    formatted: (newRate * 100).toFixed(2) + '%',
                    iterations: i + 1
                };
            }
            rate = newRate;
        }
        return { irr: rate, formatted: (rate * 100).toFixed(2) + '%', converged: false };
    },
    /**
     * Calculate Payback Period
     */
    calculatePayback: function(initialInvestment, annualCashFlow) {
        const paybackYears = initialInvestment / annualCashFlow;

        return {
            years: paybackYears,
            formatted: paybackYears.toFixed(2) + ' years',
            acceptable: paybackYears <= 3, // Typical 3-year threshold
            recommendation: paybackYears <= 3 ?
                'Investment recovers within acceptable timeframe' :
                'Payback period exceeds typical 3-year threshold'
        };
    },
    /**
     * Calculate Break-Even Point
     */
    calculateBreakEven: function(fixedCosts, pricePerUnit, variableCostPerUnit) {
        const contributionMargin = pricePerUnit - variableCostPerUnit;
        const breakEvenUnits = fixedCosts / contributionMargin;
        const breakEvenRevenue = breakEvenUnits * pricePerUnit;

        return {
            units: Math.ceil(breakEvenUnits),
            revenue: '$' + breakEvenRevenue.toFixed(2),
            contributionMargin: '$' + contributionMargin.toFixed(2),
            marginPercent: ((contributionMargin / pricePerUnit) * 100).toFixed(1) + '%'
        };
    },
    /**
     * Calculate Return on Investment (ROI)
     */
    calculateROI: function(gain, cost) {
        const roi = (gain - cost) / cost;
        return {
            roi: roi,
            formatted: (roi * 100).toFixed(1) + '%',
            profitable: roi > 0
        };
    },
    /**
     * Machine Investment Analysis
     */
    analyzeMachineInvestment: function(investment) {
        const {
            machineCost,
            installationCost = 0,
            trainingCost = 0,
            annualRevenue,
            annualOperatingCost,
            usefulLife = 10,
            salvageValue = 0,
            discountRate = 0.10
        } = investment;

        const totalInvestment = machineCost + installationCost + trainingCost;
        const annualCashFlow = annualRevenue - annualOperatingCost;

        // Build cash flow array
        const cashFlows = [-totalInvestment];
        for (let year = 1; year <= usefulLife; year++) {
            let cf = annualCashFlow;
            if (year === usefulLife) cf += salvageValue;
            cashFlows.push(cf);
        }
        // Calculate depreciation (straight-line)
        const annualDepreciation = (totalInvestment - salvageValue) / usefulLife;

        return {
            summary: {
                totalInvestment: '$' + totalInvestment.toFixed(0),
                annualCashFlow: '$' + annualCashFlow.toFixed(0),
                usefulLife: usefulLife + ' years'
            },
            npv: this.calculateNPV(cashFlows, discountRate),
            irr: this.calculateIRR(cashFlows),
            payback: this.calculatePayback(totalInvestment, annualCashFlow),
            roi: this.calculateROI(annualCashFlow * usefulLife + salvageValue, totalInvestment),

            depreciation: {
                method: 'Straight-line',
                annual: '$' + annualDepreciation.toFixed(0),
                bookValueYear5: '$' + (totalInvestment - annualDepreciation * 5).toFixed(0)
            },
            recommendation: this._generateInvestmentRecommendation(
                this.calculateNPV(cashFlows, discountRate).npv,
                this.calculateIRR(cashFlows).irr,
                this.calculatePayback(totalInvestment, annualCashFlow).years,
                discountRate
            )
        };
    },
    _generateInvestmentRecommendation: function(npv, irr, payback, hurdleRate) {
        let score = 0;
        const factors = [];

        if (npv > 0) {
            score += 2;
            factors.push('Positive NPV');
        } else {
            factors.push('Negative NPV - does not meet return requirements');
        }
        if (irr > hurdleRate) {
            score += 2;
            factors.push(`IRR (${(irr * 100).toFixed(1)}%) exceeds hurdle rate (${(hurdleRate * 100).toFixed(1)}%)`);
        } else {
            factors.push(`IRR below hurdle rate`);
        }
        if (payback <= 3) {
            score += 1;
            factors.push('Payback within 3 years');
        } else if (payback <= 5) {
            factors.push('Payback within 5 years - moderate risk');
        } else {
            factors.push('Long payback period - higher risk');
        }
        let recommendation;
        if (score >= 4) recommendation = 'STRONGLY RECOMMEND - All financial metrics favorable';
        else if (score >= 3) recommendation = 'RECOMMEND - Most financial metrics favorable';
        else if (score >= 2) recommendation = 'CONDITIONAL - Some concerns, requires further analysis';
        else recommendation = 'NOT RECOMMENDED - Financial metrics unfavorable';

        return { recommendation, score, factors };
    }
}