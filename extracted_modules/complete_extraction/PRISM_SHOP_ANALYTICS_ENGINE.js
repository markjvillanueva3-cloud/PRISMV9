const PRISM_SHOP_ANALYTICS_ENGINE = {

    version: '1.0.0',

    /**
     * Calculate Overall Equipment Effectiveness (OEE)
     * OEE = Availability × Performance × Quality
     */
    calculateOEE: function(machineData) {
        // Availability = Running Time / Planned Production Time
        const plannedTime = machineData.plannedTime || 480; // minutes
        const downtime = machineData.downtime || 0;
        const runningTime = plannedTime - downtime;
        const availability = runningTime / plannedTime;

        // Performance = (Ideal Cycle Time × Total Parts) / Running Time
        const idealCycleTime = machineData.idealCycleTime || 1; // minutes
        const totalParts = machineData.totalParts || 0;
        const performance = (idealCycleTime * totalParts) / runningTime;

        // Quality = Good Parts / Total Parts
        const goodParts = machineData.goodParts || totalParts;
        const quality = totalParts > 0 ? goodParts / totalParts : 1;

        const oee = availability * performance * quality;

        return {
            oee: (oee * 100).toFixed(1) + '%',
            availability: (availability * 100).toFixed(1) + '%',
            performance: (performance * 100).toFixed(1) + '%',
            quality: (quality * 100).toFixed(1) + '%',

            worldClass: oee >= 0.85,
            benchmark: oee >= 0.85 ? 'World Class' : oee >= 0.65 ? 'Average' : 'Below Average',

            losses: {
                downtimeLoss: ((1 - availability) * 100).toFixed(1) + '%',
                speedLoss: ((1 - performance) * 100).toFixed(1) + '%',
                qualityLoss: ((1 - quality) * 100).toFixed(1) + '%'
            }
        };
    },
    /**
     * Calculate On-Time Delivery (OTD)
     */
    calculateOTD: function(jobs) {
        const completed = jobs.filter(j => j.status === 'complete' || j.status === 'shipped');
        const onTime = completed.filter(j => {
            const due = new Date(j.dueDate);
            const shipped = new Date(j.actualEnd);
            return shipped <= due;
        });

        const otd = completed.length > 0 ? onTime.length / completed.length : 1;

        return {
            rate: (otd * 100).toFixed(1) + '%',
            onTime: onTime.length,
            total: completed.length,
            late: completed.length - onTime.length
        };
    },
    /**
     * Calculate First Pass Yield (FPY)
     */
    calculateFPY: function(qualityData) {
        const totalInspected = qualityData.totalInspected || 0;
        const passedFirst = qualityData.passedFirstTime || 0;

        const fpy = totalInspected > 0 ? passedFirst / totalInspected : 1;

        return {
            rate: (fpy * 100).toFixed(1) + '%',
            passed: passedFirst,
            total: totalInspected,
            rework: totalInspected - passedFirst,
            costOfQuality: (totalInspected - passedFirst) * (qualityData.avgReworkCost || 50)
        };
    },
    /**
     * Calculate Shop Utilization
     */
    calculateUtilization: function(machineHours) {
        const available = machineHours.available || 40; // hours per week
        const productive = machineHours.productive || 0;
        const setup = machineHours.setup || 0;
        const maintenance = machineHours.maintenance || 0;
        const idle = available - productive - setup - maintenance;

        return {
            utilization: ((productive / available) * 100).toFixed(1) + '%',
            breakdown: {
                productive: ((productive / available) * 100).toFixed(1) + '%',
                setup: ((setup / available) * 100).toFixed(1) + '%',
                maintenance: ((maintenance / available) * 100).toFixed(1) + '%',
                idle: ((Math.max(0, idle) / available) * 100).toFixed(1) + '%'
            },
            hours: { available, productive, setup, maintenance, idle: Math.max(0, idle) }
        };
    },
    /**
     * Calculate Throughput Metrics
     */
    calculateThroughput: function(periodData) {
        const jobs = periodData.jobsCompleted || 0;
        const parts = periodData.partsProduced || 0;
        const revenue = periodData.revenue || 0;
        const days = periodData.workDays || 22;
        const machines = periodData.machines || 1;

        return {
            jobsPerDay: (jobs / days).toFixed(2),
            partsPerDay: (parts / days).toFixed(0),
            revenuePerDay: '$' + (revenue / days).toFixed(0),
            revenuePerMachineDay: '$' + (revenue / (days * machines)).toFixed(0),
            partsPerMachine: (parts / machines).toFixed(0)
        };
    },
    /**
     * Calculate Quote Win Rate
     */
    calculateWinRate: function(quoteData) {
        const sent = quoteData.quotesSent || 0;
        const won = quoteData.quotesWon || 0;
        const value = quoteData.totalValue || 0;
        const wonValue = quoteData.wonValue || 0;

        return {
            countRate: sent > 0 ? ((won / sent) * 100).toFixed(1) + '%' : 'N/A',
            valueRate: value > 0 ? ((wonValue / value) * 100).toFixed(1) + '%' : 'N/A',
            avgQuoteValue: sent > 0 ? '$' + (value / sent).toFixed(0) : 'N/A',
            avgWonValue: won > 0 ? '$' + (wonValue / won).toFixed(0) : 'N/A',
            conversionFunnel: {
                sent, won, lost: sent - won, pending: 0
            }
        };
    },
    /**
     * Generate Shop Dashboard Summary
     */
    generateDashboard: function(shopData) {
        return {
            generated: new Date().toISOString(),
            period: shopData.period || 'current_month',

            kpis: {
                oee: this.calculateOEE(shopData.machines),
                otd: this.calculateOTD(shopData.jobs || []),
                fpy: this.calculateFPY(shopData.quality),
                utilization: this.calculateUtilization(shopData.hours),
                throughput: this.calculateThroughput(shopData.period_data),
                winRate: this.calculateWinRate(shopData.quotes)
            },
            financials: {
                revenue: shopData.revenue || 0,
                costs: shopData.costs || 0,
                grossMargin: shopData.revenue ?
                    (((shopData.revenue - shopData.costs) / shopData.revenue) * 100).toFixed(1) + '%' : 'N/A'
            },
            alerts: this._generateAlerts(shopData)
        };
    },
    _generateAlerts: function(shopData) {
        const alerts = [];

        // Check OEE
        const oee = parseFloat(this.calculateOEE(shopData.machines).oee);
        if (oee < 65) {
            alerts.push({ level: 'warning', message: `OEE is below target (${oee}%)` });
        }
        // Check OTD
        const otd = this.calculateOTD(shopData.jobs || []);
        if (parseFloat(otd.rate) < 95) {
            alerts.push({ level: 'warning', message: `On-time delivery below 95% (${otd.rate})` });
        }
        // Check FPY
        const fpy = this.calculateFPY(shopData.quality);
        if (parseFloat(fpy.rate) < 95) {
            alerts.push({ level: 'warning', message: `First pass yield below 95% (${fpy.rate})` });
        }
        return alerts;
    }
}