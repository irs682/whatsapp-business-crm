const prisma = require('../../config/prisma');

class LeadRepository {
  async findAll({ skip, limit, orderBy, where }) {
    const [total, items] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          contact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true,
              company: true,
            },
          },
          assignedToUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          department: {
            select: {
              id: true,
              name: true,
            },
          },
          pipelineStage: true,
        },
      }),
    ]);

    return { total, items };
  }

  async findById(id) {
    return prisma.lead.findFirst({
      where: { id, deletedAt: null },
      include: {
        contact: true,
        assignedToUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        department: true,
        pipelineStage: true,
        notes: {
          where: { deletedAt: null },
          include: {
            author: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        tasks: {
          where: { deletedAt: null },
          include: {
            assignedToUser: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
          orderBy: { dueDate: 'asc' },
        },
        activityLogs: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            actor: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });
  }

  async create(data) {
    return prisma.lead.create({
      data,
      include: {
        contact: true,
        assignedToUser: true,
        department: true,
        pipelineStage: true,
      },
    });
  }

  async update(id, data) {
    return prisma.lead.update({
      where: { id },
      data,
      include: {
        contact: true,
        assignedToUser: true,
        department: true,
        pipelineStage: true,
      },
    });
  }

  async softDelete(id) {
    return prisma.lead.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  // Pipeline Stages Repository
  async findAllStages() {
    return prisma.leadPipelineStage.findMany({
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: {
            leads: true,
          },
        },
      },
    });
  }

  async findStageById(id) {
    return prisma.leadPipelineStage.findUnique({
      where: { id },
    });
  }

  async findStageByName(name) {
    return prisma.leadPipelineStage.findUnique({
      where: { name },
    });
  }

  async createStage(data) {
    return prisma.leadPipelineStage.create({
      data,
    });
  }

  async updateStage(id, data) {
    return prisma.leadPipelineStage.update({
      where: { id },
      data,
    });
  }
}

module.exports = new LeadRepository();
