const PRISM_PRODUCTION_SCHEDULER = {
  version: '1.0.0',

  /**
   * Generate optimized production schedule
   */
  scheduleProduction(jobs, machines, constraints = {}) {
    const schedule = {
      jobs: [],
      machineUtilization: {},
      totalTime: 0,
      efficiency: 0,
      recommendations: []
    };
    // Sort jobs by priority and due date
    const sortedJobs = [...jobs].sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      return new Date(a.dueDate) - new Date(b.dueDate);
    });

    // Initialize machine schedules
    for (const machine of machines) {
      schedule.machineUtilization[machine.id] = {
        name: machine.name,
        jobs: [],
        totalTime: 0,
        idleTime: 0,
        utilization: 0
      };
    }
    // Assign jobs to machines
    for (const job of sortedJobs) {
      const bestMachine = this._findBestMachine(job, machines, schedule);

      if (bestMachine) {
        const startTime = schedule.machineUtilization[bestMachine.id].totalTime;
        const endTime = startTime + job.estimatedTime;

        schedule.jobs.push({
          jobId: job.id,
          machineId: bestMachine.id,
          machineName: bestMachine.name,
          startTime,
          endTime,
          setupTime: job.setupTime || 30 * 60,
          runTime: job.estimatedTime
        });

        schedule.machineUtilization[bestMachine.id].jobs.push(job.id);
        schedule.machineUtilization[bestMachine.id].totalTime = endTime;
      } else {
        schedule.recommendations.push({
          type: 'warning',
          message: `Job ${job.id} cannot be scheduled - no capable machine available`
        });
      }
    }
    // Calculate utilization
    let maxTime = 0;
    for (const [machineId, util] of Object.entries(schedule.machineUtilization)) {
      maxTime = Math.max(maxTime, util.totalTime);
    }
    schedule.totalTime = maxTime;

    for (const [machineId, util] of Object.entries(schedule.machineUtilization)) {
      util.idleTime = maxTime - util.totalTime;
      util.utilization = maxTime > 0 ? (util.totalTime / maxTime) * 100 : 0;
    }
    // Overall efficiency
    const totalMachineTime = Object.values(schedule.machineUtilization)
      .reduce((sum, u) => sum + u.totalTime, 0);
    schedule.efficiency = (totalMachineTime / (maxTime * machines.length)) * 100;

    // Generate recommendations
    this._generateRecommendations(schedule);

    return schedule;
  },
  _findBestMachine(job, machines, schedule) {
    const capableMachines = machines.filter(m =>
      m.capabilities?.includes(job.machineType) || m.type === job.machineType
    );

    if (capableMachines.length === 0) return null;

    // Find machine with earliest availability
    let bestMachine = null;
    let earliestEnd = Infinity;

    for (const machine of capableMachines) {
      const currentEnd = schedule.machineUtilization[machine.id]?.totalTime || 0;
      if (currentEnd < earliestEnd) {
        earliestEnd = currentEnd;
        bestMachine = machine;
      }
    }
    return bestMachine;
  },
  _generateRecommendations(schedule) {
    // Check for underutilized machines
    for (const [machineId, util] of Object.entries(schedule.machineUtilization)) {
      if (util.utilization < 50 && util.jobs.length > 0) {
        schedule.recommendations.push({
          type: 'optimization',
          message: `Machine ${util.name} is underutilized (${util.utilization.toFixed(1)}%). Consider consolidating jobs.`
        });
      }
    }
    // Check for bottlenecks
    const avgUtilization = Object.values(schedule.machineUtilization)
      .reduce((sum, u) => sum + u.utilization, 0) / Object.keys(schedule.machineUtilization).length;

    for (const [machineId, util] of Object.entries(schedule.machineUtilization)) {
      if (util.utilization > avgUtilization * 1.5) {
        schedule.recommendations.push({
          type: 'bottleneck',
          message: `Machine ${util.name} is a bottleneck. Consider adding capacity or redistributing work.`
        });
      }
    }
  },
  /**
   * Optimize tool magazine for job
   */
  optimizeToolMagazine(operations, magazineCapacity = 24) {
    const toolsNeeded = [];
    const toolMap = new Map();

    // Collect all unique tools
    for (const op of operations) {
      const toolKey = `${op.toolType}_${op.toolDiameter}`;
      if (!toolMap.has(toolKey)) {
        toolMap.set(toolKey, {
          type: op.toolType,
          diameter: op.toolDiameter,
          usageCount: 1,
          firstUse: operations.indexOf(op)
        });
      } else {
        toolMap.get(toolKey).usageCount++;
      }
    }
    // Convert to array and sort by first use
    for (const [key, tool] of toolMap) {
      toolsNeeded.push({ key, ...tool });
    }
    toolsNeeded.sort((a, b) => a.firstUse - b.firstUse);

    // Check capacity
    const result = {
      toolsRequired: toolsNeeded.length,
      magazineCapacity,
      fits: toolsNeeded.length <= magazineCapacity,
      toolList: toolsNeeded,
      recommendations: []
    };
    if (!result.fits) {
      result.recommendations.push({
        type: 'warning',
        message: `Job requires ${toolsNeeded.length} tools but magazine only holds ${magazineCapacity}. Tool change required mid-job.`
      });

      // Suggest tool consolidation
      const duplicateTypes = toolsNeeded.filter(t =>
        toolsNeeded.filter(t2 => t2.type === t.type).length > 1
      );
      if (duplicateTypes.length > 0) {
        result.recommendations.push({
          type: 'optimization',
          message: 'Consider consolidating similar tool sizes to reduce tool count.'
        });
      }
    }
    return result;
  },
  init() {
    (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM_PRODUCTION_SCHEDULER] v1.0 initialized');
    return this;
  }
}