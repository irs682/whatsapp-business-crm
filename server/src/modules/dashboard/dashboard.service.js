const prisma = require('../../config/prisma');

class DashboardService {
  async getMetrics(user) {
    const isPrivileged = user && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN');
    const userDeptIds = (user?.departments || []).map((d) => d.id);
    const now = new Date();
    const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    // Build contact where clause with department isolation
    const contactWhere = {
      deletedAt: null,
      ...(!isPrivileged && {
        OR: [
          { departmentId: { in: userDeptIds } },
          { ownerId: user.id },
          { departmentId: null },
        ],
      }),
    };

    // Build lead where clause with department isolation
    const leadWhere = {
      deletedAt: null,
      ...(!isPrivileged && {
        OR: [
          { departmentId: { in: userDeptIds } },
          { assignedToUserId: user.id },
          { departmentId: null },
        ],
      }),
    };

    // Build task where clause with department isolation
    const taskWhere = {
      deletedAt: null,
      ...(!isPrivileged && {
        OR: [
          { assignedToUserId: user.id },
          { creatorId: user.id },
          { contact: { departmentId: { in: userDeptIds } } },
          { lead: { departmentId: { in: userDeptIds } } },
          { contactId: null, leadId: null },
        ],
      }),
    };

    const overdueWhere = {
      ...taskWhere,
      dueDate: { lt: now },
      status: { notIn: ['COMPLETED', 'CANCELLED'] },
    };

    const dueSoonWhere = {
      ...taskWhere,
      dueDate: { gte: now, lte: in48Hours },
      status: { notIn: ['COMPLETED', 'CANCELLED'] },
    };

    const myLeadsWhere = {
      deletedAt: null,
      assignedToUserId: user.id,
    };

    // Run parallel queries against database
    const [
      totalContacts,
      totalLeads,
      myAssignedLeads,
      overdueTasksCount,
      tasksDueSoonCount,
      allAccessibleLeads,
      recentLeads,
      recentContacts,
      recentActivities,
    ] = await Promise.all([
      prisma.contact.count({ where: contactWhere }),
      prisma.lead.count({ where: leadWhere }),
      prisma.lead.count({ where: myLeadsWhere }),
      prisma.task.count({ where: overdueWhere }),
      prisma.task.count({ where: dueSoonWhere }),
      prisma.lead.findMany({
        where: leadWhere,
        select: { stage: true, value: true },
      }),
      prisma.lead.findMany({
        where: leadWhere,
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          contact: {
            select: { id: true, firstName: true, lastName: true, phone: true, company: true },
          },
          assignedToUser: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
      prisma.contact.findMany({
        where: contactWhere,
        take: 5,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
          company: true,
          updatedAt: true,
          tags: true,
        },
      }),
      prisma.activityLog.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      }),
    ]);

    // Aggregate lead stages distribution
    const stageCounts = {
      NEW: 0,
      CONTACTED: 0,
      QUALIFIED: 0,
      PROPOSAL_SENT: 0,
      NEGOTIATION: 0,
      WON: 0,
      LOST: 0,
    };

    let totalPipelineValue = 0;
    for (const lead of allAccessibleLeads) {
      if (stageCounts[lead.stage] !== undefined) {
        stageCounts[lead.stage] += 1;
      }
      if (lead.value) {
        totalPipelineValue += Number(lead.value);
      }
    }

    return {
      metrics: {
        totalContacts,
        totalLeads,
        myAssignedLeads,
        overdueTasksCount,
        tasksDueSoonCount,
        totalPipelineValue,
      },
      stageCounts,
      recentLeads,
      recentContacts,
      recentActivities,
    };
  }
}

module.exports = new DashboardService();
