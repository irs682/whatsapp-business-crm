const prisma = require('../../config/prisma');
const { parseReportFilters } = require('./report.filter');
const { logAudit } = require('../../utils/auditLogger');
const { BadRequestError } = require('../../errors');

class ReportService {
  /**
   * 1. Executive Management Dashboard Report
   */
  async getExecutiveReport(query, user) {
    const filters = parseReportFilters(query, user);
    const { start, end, priorStart, priorEnd, targetDepartmentIds } = filters;

    const deptFilter = targetDepartmentIds ? { departmentId: { in: targetDepartmentIds } } : {};
    const taskDeptFilter = targetDepartmentIds
      ? {
          OR: [
            { contact: { departmentId: { in: targetDepartmentIds } } },
            { lead: { departmentId: { in: targetDepartmentIds } } },
          ],
        }
      : {};

    const [
      totalCustomers,
      newCustomersCurrent,
      newCustomersPrior,
      totalLeads,
      newLeadsCurrent,
      newLeadsPrior,
      wonLeads,
      lostLeads,
      leadsByStageRaw,
      openConversations,
      pendingConversations,
      resolvedConversations,
      unassignedConversations,
      overdueTasks,
      totalCampaigns,
      completedCampaigns,
      campaignMetrics,
      agentWorkloadRaw,
    ] = await Promise.all([
      // Total customers accessible
      prisma.contact.count({ where: { deletedAt: null, ...deptFilter } }),

      // New customers in current period
      prisma.contact.count({
        where: { deletedAt: null, ...deptFilter, createdAt: { gte: start, lte: end } },
      }),

      // New customers in prior period
      prisma.contact.count({
        where: { deletedAt: null, ...deptFilter, createdAt: { gte: priorStart, lte: priorEnd } },
      }),

      // Total active leads
      prisma.lead.count({ where: { deletedAt: null, ...deptFilter } }),

      // New leads current vs prior
      prisma.lead.count({
        where: { deletedAt: null, ...deptFilter, createdAt: { gte: start, lte: end } },
      }),
      prisma.lead.count({
        where: { deletedAt: null, ...deptFilter, createdAt: { gte: priorStart, lte: priorEnd } },
      }),

      // Won & Lost leads in period
      prisma.lead.count({
        where: { deletedAt: null, ...deptFilter, stage: 'WON', updatedAt: { gte: start, lte: end } },
      }),
      prisma.lead.count({
        where: { deletedAt: null, ...deptFilter, stage: 'LOST', updatedAt: { gte: start, lte: end } },
      }),

      // Leads by stage breakdown
      prisma.lead.groupBy({
        by: ['stage'],
        where: { deletedAt: null, ...deptFilter },
        _count: { id: true },
        _sum: { value: true },
      }),

      // Conversation states
      prisma.conversation.count({ where: { deletedAt: null, ...deptFilter, status: 'OPEN' } }),
      prisma.conversation.count({ where: { deletedAt: null, ...deptFilter, status: 'PENDING' } }),
      prisma.conversation.count({
        where: { deletedAt: null, ...deptFilter, status: { in: ['RESOLVED', 'CLOSED'] } },
      }),
      prisma.conversation.count({
        where: { deletedAt: null, ...deptFilter, status: 'OPEN', assignedToUserId: null },
      }),

      // Overdue tasks
      prisma.task.count({
        where: {
          deletedAt: null,
          ...taskDeptFilter,
          dueDate: { lt: new Date() },
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
        },
      }),

      // Campaigns overview
      prisma.campaign.count({ where: { deletedAt: null, ...deptFilter } }),
      prisma.campaign.count({ where: { deletedAt: null, ...deptFilter, status: 'COMPLETED' } }),
      prisma.campaign.aggregate({
        where: { deletedAt: null, ...deptFilter },
        _sum: {
          totalRecipients: true,
          sentCount: true,
          deliveredCount: true,
          readCount: true,
          failedCount: true,
          repliedCount: true,
          optOutCount: true,
        },
      }),

      // Active agent workload
      prisma.conversation.groupBy({
        by: ['assignedToUserId'],
        where: {
          deletedAt: null,
          ...deptFilter,
          status: { in: ['OPEN', 'PENDING'] },
          assignedToUserId: { not: null },
        },
        _count: { id: true },
      }),
    ]);

    // Format leads by stage
    const leadsByStage = leadsByStageRaw.map((s) => ({
      stage: s.stage,
      count: s._count.id,
      totalValue: Number(s._sum.value || 0),
    }));

    // Period over period calculations
    const calculateGrowth = (current, prior) => {
      if (prior === 0) return current > 0 ? 100 : 0;
      return Number((((current - prior) / prior) * 100).toFixed(1));
    };

    const customerGrowthPercent = calculateGrowth(newCustomersCurrent, newCustomersPrior);
    const leadGrowthPercent = calculateGrowth(newLeadsCurrent, newLeadsPrior);

    return {
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
        priorStart: priorStart.toISOString(),
        priorEnd: priorEnd.toISOString(),
      },
      customers: {
        total: totalCustomers,
        newInPeriod: newCustomersCurrent,
        priorPeriodNew: newCustomersPrior,
        growthPercent: customerGrowthPercent,
      },
      leads: {
        total: totalLeads,
        newInPeriod: newLeadsCurrent,
        priorPeriodNew: newLeadsPrior,
        growthPercent: leadGrowthPercent,
        won: wonLeads,
        lost: lostLeads,
        byStage: leadsByStage,
      },
      inbox: {
        open: openConversations,
        pending: pendingConversations,
        resolved: resolvedConversations,
        unassigned: unassignedConversations,
        totalActive: openConversations + pendingConversations,
      },
      tasks: {
        overdue: overdueTasks,
      },
      campaigns: {
        total: totalCampaigns,
        completed: completedCampaigns,
        totalRecipients: campaignMetrics._sum.totalRecipients || 0,
        sent: campaignMetrics._sum.sentCount || 0,
        delivered: campaignMetrics._sum.deliveredCount || 0,
        read: campaignMetrics._sum.readCount || 0,
        failed: campaignMetrics._sum.failedCount || 0,
        replies: campaignMetrics._sum.repliedCount || 0,
        optOuts: campaignMetrics._sum.optOutCount || 0,
      },
      agentWorkload: agentWorkloadRaw.map((w) => ({
        agentId: w.assignedToUserId,
        activeConversations: w._count.id,
      })),
    };
  }

  /**
   * 2. Conversation & Inbox Service Analytics
   */
  async getConversationReport(query, user) {
    const filters = parseReportFilters(query, user);
    const { start, end, targetDepartmentIds } = filters;

    const deptFilter = targetDepartmentIds ? { departmentId: { in: targetDepartmentIds } } : {};

    // 1. Fetch conversations within date window
    const conversations = await prisma.conversation.findMany({
      where: {
        deletedAt: null,
        ...deptFilter,
        createdAt: { gte: start, lte: end },
      },
      include: {
        department: { select: { id: true, name: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          select: { id: true, direction: true, createdAt: true },
        },
      },
    });

    // 2. Calculate First Response Time (FRT) & Resolution Time
    const frtDurationsMinutes = [];
    const resolutionDurationsHours = [];
    let resolvedCount = 0;
    let openCount = 0;
    let pendingCount = 0;
    let unassignedCount = 0;

    const deptVolumeMap = {};
    const dailyVolumeMap = {};

    for (const c of conversations) {
      if (c.status === 'OPEN') openCount++;
      else if (c.status === 'PENDING') pendingCount++;
      else if (['RESOLVED', 'CLOSED'].includes(c.status)) resolvedCount++;

      if (!c.assignedToUserId && c.status === 'OPEN') unassignedCount++;

      // Department distribution
      const deptName = c.department?.name || 'General / Unassigned';
      deptVolumeMap[deptName] = (deptVolumeMap[deptName] || 0) + 1;

      // Daily volume trend
      const dayKey = c.createdAt.toISOString().slice(0, 10);
      dailyVolumeMap[dayKey] = (dailyVolumeMap[dayKey] || 0) + 1;

      // Calculate FRT: first inbound -> first subsequent outbound
      const firstInbound = c.messages.find((m) => m.direction === 'INBOUND');
      if (firstInbound) {
        const firstOutbound = c.messages.find(
          (m) => m.direction === 'OUTBOUND' && m.createdAt > firstInbound.createdAt
        );
        if (firstOutbound) {
          const diffMinutes = (firstOutbound.createdAt.getTime() - firstInbound.createdAt.getTime()) / (1000 * 60);
          frtDurationsMinutes.push(diffMinutes);
        }
      }

      // Calculate Resolution Time: c.createdAt -> c.resolvedAt
      if (c.resolvedAt) {
        const diffHours = (c.resolvedAt.getTime() - c.createdAt.getTime()) / (1000 * 60 * 60);
        resolutionDurationsHours.push(diffHours);
      }
    }

    const calcMedian = (arr) => {
      if (arr.length === 0) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    };

    const avgFRT =
      frtDurationsMinutes.length > 0
        ? frtDurationsMinutes.reduce((a, b) => a + b, 0) / frtDurationsMinutes.length
        : 0;
    const medianFRT = calcMedian(frtDurationsMinutes);

    const avgResolutionTime =
      resolutionDurationsHours.length > 0
        ? resolutionDurationsHours.reduce((a, b) => a + b, 0) / resolutionDurationsHours.length
        : 0;
    const medianResolutionTime = calcMedian(resolutionDurationsHours);

    // Reopen Rate calculation from ActivityLog
    const reopenEventsCount = await prisma.activityLog.count({
      where: {
        action: 'CONVERSATION_REOPENED',
        createdAt: { gte: start, lte: end },
      },
    });

    const reopenRatePercent =
      resolvedCount > 0 ? Number(((reopenEventsCount / resolvedCount) * 100).toFixed(1)) : 0;

    return {
      period: { start: start.toISOString(), end: end.toISOString() },
      volume: {
        total: conversations.length,
        open: openCount,
        pending: pendingCount,
        resolved: resolvedCount,
        unassigned: unassignedCount,
      },
      performance: {
        averageFirstResponseMinutes: Number(avgFRT.toFixed(1)),
        medianFirstResponseMinutes: Number(medianFRT.toFixed(1)),
        evaluatedFRTSampleSize: frtDurationsMinutes.length,
        averageResolutionHours: Number(avgResolutionTime.toFixed(1)),
        medianResolutionHours: Number(medianResolutionTime.toFixed(1)),
        evaluatedResolutionSampleSize: resolutionDurationsHours.length,
        reopenRatePercent,
        reopenCount: reopenEventsCount,
      },
      trends: {
        daily: Object.entries(dailyVolumeMap)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, count]) => ({ date, count })),
        byDepartment: Object.entries(deptVolumeMap).map(([department, count]) => ({
          department,
          count,
        })),
      },
    };
  }

  /**
   * 3. Agent Performance & Productivity Analytics
   */
  async getAgentReport(query, user) {
    const filters = parseReportFilters(query, user);
    const { start, end, targetDepartmentIds, agentId } = filters;

    // Filter agents by department or specific agent ID
    const userRole = typeof user.role === 'string' ? user.role : user.role?.name;
    const isGlobal = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

    const whereUser = {
      deletedAt: null,
      status: 'ACTIVE',
      ...(agentId && { id: agentId }),
      ...(!isGlobal && targetDepartmentIds && {
        departments: { some: { departmentId: { in: targetDepartmentIds } } },
      }),
    };

    const agents = await prisma.user.findMany({
      where: whereUser,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        departments: { include: { department: { select: { id: true, name: true } } } },
      },
    });

    const agentIds = agents.map((a) => a.id);

    // Parallel metrics per agent
    const [assignedChats, resolvedChats, completedTasks, overdueTasks, notesCreated, transfersInitiated] =
      await Promise.all([
        prisma.conversation.groupBy({
          by: ['assignedToUserId'],
          where: {
            assignedToUserId: { in: agentIds },
            deletedAt: null,
            createdAt: { gte: start, lte: end },
          },
          _count: { id: true },
        }),
        prisma.conversation.groupBy({
          by: ['assignedToUserId'],
          where: {
            assignedToUserId: { in: agentIds },
            status: { in: ['RESOLVED', 'CLOSED'] },
            deletedAt: null,
            resolvedAt: { gte: start, lte: end },
          },
          _count: { id: true },
        }),
        prisma.task.groupBy({
          by: ['assignedToUserId'],
          where: {
            assignedToUserId: { in: agentIds },
            status: 'COMPLETED',
            completedAt: { gte: start, lte: end },
          },
          _count: { id: true },
        }),
        prisma.task.groupBy({
          by: ['assignedToUserId'],
          where: {
            assignedToUserId: { in: agentIds },
            status: { notIn: ['COMPLETED', 'CANCELLED'] },
            dueDate: { lt: new Date() },
          },
          _count: { id: true },
        }),
        prisma.note.groupBy({
          by: ['authorId'],
          where: {
            authorId: { in: agentIds },
            createdAt: { gte: start, lte: end },
          },
          _count: { id: true },
        }),
        prisma.conversationTransfer.groupBy({
          by: ['transferredById'],
          where: {
            transferredById: { in: agentIds },
            createdAt: { gte: start, lte: end },
          },
          _count: { id: true },
        }),
      ]);

    const countMap = (arr, key) =>
      arr.reduce((acc, item) => {
        if (item[key]) acc[item[key]] = item._count.id;
        return acc;
      }, {});

    const assignedMap = countMap(assignedChats, 'assignedToUserId');
    const resolvedMap = countMap(resolvedChats, 'assignedToUserId');
    const tasksCompMap = countMap(completedTasks, 'assignedToUserId');
    const tasksOverdueMap = countMap(overdueTasks, 'assignedToUserId');
    const notesMap = countMap(notesCreated, 'authorId');
    const transfersMap = countMap(transfersInitiated, 'transferredById');

    const agentReports = agents.map((ag) => ({
      agentId: ag.id,
      name: `${ag.firstName || ''} ${ag.lastName || ''}`.trim() || ag.email,
      email: ag.email,
      departments: ag.departments.map((d) => d.department.name),
      assignedConversations: assignedMap[ag.id] || 0,
      resolvedConversations: resolvedMap[ag.id] || 0,
      completedTasks: tasksCompMap[ag.id] || 0,
      overdueTasks: tasksOverdueMap[ag.id] || 0,
      notesWritten: notesMap[ag.id] || 0,
      transfersInitiated: transfersMap[ag.id] || 0,
    }));

    return {
      period: { start: start.toISOString(), end: end.toISOString() },
      agents: agentReports,
    };
  }

  /**
   * 4. Department Performance & Transfer Flow Analytics
   */
  async getDepartmentReport(query, user) {
    const filters = parseReportFilters(query, user);
    const { start, end, targetDepartmentIds } = filters;

    const whereDept = {
      deletedAt: null,
      isActive: true,
      ...(targetDepartmentIds && { id: { in: targetDepartmentIds } }),
    };

    const departments = await prisma.department.findMany({
      where: whereDept,
      include: {
        _count: {
          select: {
            users: true,
            conversations: { where: { status: { in: ['OPEN', 'PENDING'] }, deletedAt: null } },
            leads: { where: { deletedAt: null } },
          },
        },
      },
    });

    const deptIds = departments.map((d) => d.id);

    // Parallel metrics per department
    const [unassignedQueue, transfersIn, transfersOut] = await Promise.all([
      prisma.conversation.groupBy({
        by: ['departmentId'],
        where: {
          departmentId: { in: deptIds },
          status: 'OPEN',
          assignedToUserId: null,
          deletedAt: null,
        },
        _count: { id: true },
      }),
      prisma.conversationTransfer.groupBy({
        by: ['toDepartmentId'],
        where: {
          toDepartmentId: { in: deptIds },
          createdAt: { gte: start, lte: end },
        },
        _count: { id: true },
      }),
      prisma.conversationTransfer.groupBy({
        by: ['fromDepartmentId'],
        where: {
          fromDepartmentId: { in: deptIds },
          createdAt: { gte: start, lte: end },
        },
        _count: { id: true },
      }),
    ]);

    const countMap = (arr, key) =>
      arr.reduce((acc, item) => {
        if (item[key]) acc[item[key]] = item._count.id;
        return acc;
      }, {});

    const unassignedMap = countMap(unassignedQueue, 'departmentId');
    const transferInMap = countMap(transfersIn, 'toDepartmentId');
    const transferOutMap = countMap(transfersOut, 'fromDepartmentId');

    const departmentReports = departments.map((d) => ({
      departmentId: d.id,
      name: d.name,
      activeStaffCount: d._count.users,
      activeConversations: d._count.conversations,
      unassignedQueueCount: unassignedMap[d.id] || 0,
      activeLeads: d._count.leads,
      transfersReceived: transferInMap[d.id] || 0,
      transfersHandedOver: transferOutMap[d.id] || 0,
    }));

    return {
      period: { start: start.toISOString(), end: end.toISOString() },
      departments: departmentReports,
    };
  }

  /**
   * 5. Customer & Contact Analytics
   */
  async getCustomerReport(query, user) {
    const filters = parseReportFilters(query, user);
    const { start, end, targetDepartmentIds } = filters;

    const deptFilter = targetDepartmentIds ? { departmentId: { in: targetDepartmentIds } } : {};

    const [totalContacts, newContactsInPeriod, contactsBySourceRaw, consentStatusRaw, sampleContacts] =
      await Promise.all([
        prisma.contact.count({ where: { deletedAt: null, ...deptFilter } }),
        prisma.contact.count({
          where: { deletedAt: null, ...deptFilter, createdAt: { gte: start, lte: end } },
        }),
        prisma.contact.groupBy({
          by: ['source'],
          where: { deletedAt: null, ...deptFilter },
          _count: { id: true },
        }),
        prisma.contact.groupBy({
          by: ['consentStatus', 'isOptedOut'],
          where: { deletedAt: null, ...deptFilter },
          _count: { id: true },
        }),
        prisma.contact.findMany({
          where: { deletedAt: null, ...deptFilter, createdAt: { gte: start, lte: end } },
          select: { createdAt: true },
          orderBy: { createdAt: 'asc' },
        }),
      ]);

    // Build Daily Growth Trend
    const dailyGrowthMap = {};
    for (const c of sampleContacts) {
      const day = c.createdAt.toISOString().slice(0, 10);
      dailyGrowthMap[day] = (dailyGrowthMap[day] || 0) + 1;
    }

    return {
      period: { start: start.toISOString(), end: end.toISOString() },
      totalContacts,
      newContactsInPeriod,
      bySource: contactsBySourceRaw.map((s) => ({
        source: s.source || 'UNKNOWN',
        count: s._count.id,
      })),
      consentBreakdown: consentStatusRaw.map((c) => ({
        consentStatus: c.consentStatus,
        isOptedOut: c.isOptedOut,
        count: c._count.id,
      })),
      growthTrend: Object.entries(dailyGrowthMap).map(([date, count]) => ({ date, count })),
    };
  }

  /**
   * 6. Lead Pipeline & Conversion Analytics
   */
  async getLeadReport(query, user) {
    const filters = parseReportFilters(query, user);
    const { start, end, targetDepartmentIds } = filters;

    const deptFilter = targetDepartmentIds ? { departmentId: { in: targetDepartmentIds } } : {};

    const [totalLeads, newLeads, wonLeads, lostLeads, stageGroups, ownerGroups] = await Promise.all([
      prisma.lead.count({ where: { deletedAt: null, ...deptFilter } }),
      prisma.lead.count({
        where: { deletedAt: null, ...deptFilter, createdAt: { gte: start, lte: end } },
      }),
      prisma.lead.count({
        where: { deletedAt: null, ...deptFilter, stage: 'WON', updatedAt: { gte: start, lte: end } },
      }),
      prisma.lead.count({
        where: { deletedAt: null, ...deptFilter, stage: 'LOST', updatedAt: { gte: start, lte: end } },
      }),
      prisma.lead.groupBy({
        by: ['stage'],
        where: { deletedAt: null, ...deptFilter },
        _count: { id: true },
        _sum: { value: true },
      }),
      prisma.lead.groupBy({
        by: ['assignedToUserId'],
        where: { deletedAt: null, ...deptFilter, assignedToUserId: { not: null } },
        _count: { id: true },
        _sum: { value: true },
      }),
    ]);

    const totalPipelineValue = stageGroups.reduce((acc, s) => acc + Number(s._sum.value || 0), 0);
    const wonValue = stageGroups.find((s) => s.stage === 'WON')?._sum.value || 0;

    // Conversion rate: WON / Total Finished Decisions (WON + LOST) or Total in Period
    const closedDecisions = wonLeads + lostLeads;
    const conversionRatePercent =
      closedDecisions > 0 ? Number(((wonLeads / closedDecisions) * 100).toFixed(1)) : 0;

    return {
      period: { start: start.toISOString(), end: end.toISOString() },
      summary: {
        totalLeads,
        newLeadsInPeriod: newLeads,
        wonLeadsInPeriod: wonLeads,
        lostLeadsInPeriod: lostLeads,
        conversionRatePercent,
        totalPipelineValue,
        wonPipelineValue: Number(wonValue),
      },
      stages: stageGroups.map((s) => ({
        stage: s.stage,
        count: s._count.id,
        value: Number(s._sum.value || 0),
      })),
      owners: ownerGroups.map((o) => ({
        agentId: o.assignedToUserId,
        count: o._count.id,
        value: Number(o._sum.value || 0),
      })),
    };
  }

  /**
   * 7. WhatsApp Messaging Delivery Analytics
   */
  async getWhatsAppReport(query, user) {
    const filters = parseReportFilters(query, user);
    const { start, end } = filters;

    const [statusCounts, directionCounts, templateUsageRaw, sampleMessages] = await Promise.all([
      // Status breakdown of outbound WhatsApp messages
      prisma.message.groupBy({
        by: ['status'],
        where: {
          direction: 'OUTBOUND',
          createdAt: { gte: start, lte: end },
        },
        _count: { id: true },
      }),
      // Direction count
      prisma.message.groupBy({
        by: ['direction'],
        where: { createdAt: { gte: start, lte: end } },
        _count: { id: true },
      }),
      // Template usage count
      prisma.message.groupBy({
        by: ['type'],
        where: { createdAt: { gte: start, lte: end } },
        _count: { id: true },
      }),
      // Daily throughput trend
      prisma.message.findMany({
        where: { createdAt: { gte: start, lte: end } },
        select: { createdAt: true, direction: true },
      }),
    ]);

    const countStatus = (status) => statusCounts.find((s) => s.status === status)?._count.id || 0;
    const sent = countStatus('SENT');
    const delivered = countStatus('DELIVERED');
    const read = countStatus('READ');
    const failed = countStatus('FAILED');
    const totalOutbound = sent + delivered + read + failed;

    const deliveryRate = totalOutbound > 0 ? Number((((delivered + read) / totalOutbound) * 100).toFixed(1)) : 0;
    const readRate = delivered + read > 0 ? Number(((read / (delivered + read)) * 100).toFixed(1)) : 0;

    const inboundCount = directionCounts.find((d) => d.direction === 'INBOUND')?._count.id || 0;

    // Daily distribution map
    const dailyMap = {};
    for (const m of sampleMessages) {
      const day = m.createdAt.toISOString().slice(0, 10);
      if (!dailyMap[day]) dailyMap[day] = { date: day, inbound: 0, outbound: 0 };
      if (m.direction === 'INBOUND') dailyMap[day].inbound++;
      else dailyMap[day].outbound++;
    }

    return {
      period: { start: start.toISOString(), end: end.toISOString() },
      metrics: {
        totalInbound: inboundCount,
        totalOutbound,
        sent,
        delivered,
        read,
        failed,
        deliveryRatePercent: deliveryRate,
        readRatePercent: readRate,
      },
      messageTypes: templateUsageRaw.map((t) => ({ type: t.type, count: t._count.id })),
      dailyTrends: Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date)),
    };
  }

  /**
   * 8. Campaign Performance Analytics
   */
  async getCampaignReport(query, user) {
    const filters = parseReportFilters(query, user);
    const { start, end, targetDepartmentIds } = filters;

    const deptFilter = targetDepartmentIds ? { departmentId: { in: targetDepartmentIds } } : {};

    const [campaigns, aggregate] = await Promise.all([
      prisma.campaign.findMany({
        where: {
          deletedAt: null,
          ...deptFilter,
          createdAt: { gte: start, lte: end },
        },
        include: {
          template: { select: { id: true, name: true, category: true } },
          department: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.campaign.aggregate({
        where: {
          deletedAt: null,
          ...deptFilter,
          createdAt: { gte: start, lte: end },
        },
        _sum: {
          totalRecipients: true,
          eligibleCount: true,
          suppressedCount: true,
          sentCount: true,
          deliveredCount: true,
          readCount: true,
          failedCount: true,
          repliedCount: true,
          optOutCount: true,
        },
      }),
    ]);

    const totalRecipients = aggregate._sum.totalRecipients || 0;
    const delivered = aggregate._sum.deliveredCount || 0;
    const read = aggregate._sum.readCount || 0;
    const replies = aggregate._sum.repliedCount || 0;
    const optOuts = aggregate._sum.optOutCount || 0;

    const deliveryRate = totalRecipients > 0 ? Number(((delivered / totalRecipients) * 100).toFixed(1)) : 0;
    const readRate = delivered > 0 ? Number(((read / delivered) * 100).toFixed(1)) : 0;
    const replyRate = delivered > 0 ? Number(((replies / delivered) * 100).toFixed(1)) : 0;
    const optOutRate = delivered > 0 ? Number(((optOuts / delivered) * 100).toFixed(1)) : 0;

    return {
      period: { start: start.toISOString(), end: end.toISOString() },
      summary: {
        totalCampaigns: campaigns.length,
        totalRecipients,
        eligibleCount: aggregate._sum.eligibleCount || 0,
        suppressedCount: aggregate._sum.suppressedCount || 0,
        sentCount: aggregate._sum.sentCount || 0,
        deliveredCount: delivered,
        readCount: read,
        failedCount: aggregate._sum.failedCount || 0,
        repliedCount: replies,
        optOutCount: optOuts,
        deliveryRatePercent: deliveryRate,
        readRatePercent: readRate,
        replyRatePercent: replyRate,
        optOutRatePercent: optOutRate,
      },
      campaigns: campaigns.map((c) => ({
        id: c.id,
        name: c.name,
        status: c.status,
        type: c.type,
        templateName: c.template?.name || 'Custom',
        department: c.department?.name || 'General',
        totalRecipients: c.totalRecipients,
        deliveredCount: c.deliveredCount,
        readCount: c.readCount,
        repliedCount: c.repliedCount,
        optOutCount: c.optOutCount,
        scheduledAt: c.scheduledAt,
        startedAt: c.startedAt,
        completedAt: c.completedAt,
      })),
    };
  }

  /**
   * 9. Task & Follow-Up Performance Analytics
   */
  async getTaskReport(query, user) {
    const filters = parseReportFilters(query, user);
    const { start, end, targetDepartmentIds } = filters;

    const taskDeptFilter = targetDepartmentIds
      ? {
          OR: [
            { contact: { departmentId: { in: targetDepartmentIds } } },
            { lead: { departmentId: { in: targetDepartmentIds } } },
          ],
        }
      : {};

    const [totalTasks, completedTasks, overdueTasks, dueSoonTasks, priorityBreakdown] = await Promise.all([
      prisma.task.count({
        where: { deletedAt: null, ...taskDeptFilter, createdAt: { gte: start, lte: end } },
      }),
      prisma.task.count({
        where: {
          deletedAt: null,
          ...taskDeptFilter,
          status: 'COMPLETED',
          completedAt: { gte: start, lte: end },
        },
      }),
      prisma.task.count({
        where: {
          deletedAt: null,
          ...taskDeptFilter,
          dueDate: { lt: new Date() },
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
        },
      }),
      prisma.task.count({
        where: {
          deletedAt: null,
          ...taskDeptFilter,
          dueDate: { gte: new Date(), lte: new Date(Date.now() + 48 * 60 * 60 * 1000) },
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
        },
      }),
      prisma.task.groupBy({
        by: ['priority'],
        where: { deletedAt: null, ...taskDeptFilter, createdAt: { gte: start, lte: end } },
        _count: { id: true },
      }),
    ]);

    const completionRate = totalTasks > 0 ? Number(((completedTasks / totalTasks) * 100).toFixed(1)) : 0;

    return {
      period: { start: start.toISOString(), end: end.toISOString() },
      summary: {
        totalTasksCreated: totalTasks,
        completedTasks,
        overdueTasks,
        dueSoonTasks,
        completionRatePercent: completionRate,
      },
      byPriority: priorityBreakdown.map((p) => ({ priority: p.priority, count: p._count.id })),
    };
  }

  /**
   * 10. Secure Report Export with Formula-Injection Defense & Audit Logging
   */
  async exportReport(type, query, user, clientIp = null) {
    let reportData;
    let filename = `report_${type}_${Date.now()}.csv`;

    switch (type) {
      case 'executive':
        reportData = await this.getExecutiveReport(query, user);
        break;
      case 'conversations':
        reportData = await this.getConversationReport(query, user);
        break;
      case 'agents':
        reportData = await this.getAgentReport(query, user);
        break;
      case 'departments':
        reportData = await this.getDepartmentReport(query, user);
        break;
      case 'contacts':
        reportData = await this.getCustomerReport(query, user);
        break;
      case 'leads':
        reportData = await this.getLeadReport(query, user);
        break;
      case 'whatsapp':
        reportData = await this.getWhatsAppReport(query, user);
        break;
      case 'campaigns':
        reportData = await this.getCampaignReport(query, user);
        break;
      case 'tasks':
        reportData = await this.getTaskReport(query, user);
        break;
      default:
        throw new BadRequestError(`Unsupported report type "${type}" requested for export.`);
    }

    // CSV Formula Injection Sanitization Helper
    const sanitizeCell = (val) => {
      if (val === null || val === undefined) return '""';
      let str = String(val).replace(/"/g, '""');
      // Escape characters that spreadsheet applications interpret as formulas: =, +, -, @
      if (/^[=+\-@\t\r]/.test(str)) {
        str = `'${str}`;
      }
      return `"${str}"`;
    };

    let csvContent = '';

    if (type === 'agents' && reportData.agents) {
      const headers = ['Agent Name', 'Email', 'Departments', 'Assigned Chats', 'Resolved Chats', 'Completed Tasks', 'Overdue Tasks', 'Notes Written', 'Transfers'];
      csvContent += headers.map(sanitizeCell).join(',') + '\n';
      for (const a of reportData.agents) {
        csvContent += [a.name, a.email, a.departments.join('; '), a.assignedConversations, a.resolvedConversations, a.completedTasks, a.overdueTasks, a.notesWritten, a.transfersInitiated].map(sanitizeCell).join(',') + '\n';
      }
    } else if (type === 'campaigns' && reportData.campaigns) {
      const headers = ['Campaign Name', 'Status', 'Type', 'Template', 'Department', 'Recipients', 'Delivered', 'Read', 'Replies', 'Opt-Outs', 'Created At'];
      csvContent += headers.map(sanitizeCell).join(',') + '\n';
      for (const c of reportData.campaigns) {
        csvContent += [c.name, c.status, c.type, c.templateName, c.department, c.totalRecipients, c.deliveredCount, c.readCount, c.repliedCount, c.optOutCount, c.startedAt || ''].map(sanitizeCell).join(',') + '\n';
      }
    } else if (type === 'departments' && reportData.departments) {
      const headers = ['Department Name', 'Staff Count', 'Active Chats', 'Unassigned Queue', 'Active Leads', 'Transfers In', 'Transfers Out'];
      csvContent += headers.map(sanitizeCell).join(',') + '\n';
      for (const d of reportData.departments) {
        csvContent += [d.name, d.activeStaffCount, d.activeConversations, d.unassignedQueueCount, d.activeLeads, d.transfersReceived, d.transfersHandedOver].map(sanitizeCell).join(',') + '\n';
      }
    } else {
      // General summary key-value CSV output
      const flatten = (obj, prefix = '') => {
        let rows = [];
        for (const [k, v] of Object.entries(obj)) {
          const key = prefix ? `${prefix}.${k}` : k;
          if (v && typeof v === 'object' && !Array.isArray(v)) {
            rows = rows.concat(flatten(v, key));
          } else if (!Array.isArray(v)) {
            rows.push([key, v]);
          }
        }
        return rows;
      };
      const flatRows = flatten(reportData);
      csvContent += ['Metric Key', 'Value'].map(sanitizeCell).join(',') + '\n';
      for (const [k, v] of flatRows) {
        csvContent += [k, v].map(sanitizeCell).join(',') + '\n';
      }
    }

    // Record Security Audit Log
    await logAudit({
      actorId: user.id,
      action: 'REPORT_EXPORTED',
      entity: 'REPORT',
      entityId: type,
      departmentId: user.departments?.[0]?.id || null,
      metadata: {
        reportType: type,
        filters: query,
        rowCount: csvContent.split('\n').length - 1,
      },
      ipAddress: clientIp,
    });

    return {
      filename,
      contentType: 'text/csv; charset=utf-8',
      data: csvContent,
    };
  }
}

module.exports = new ReportService();
