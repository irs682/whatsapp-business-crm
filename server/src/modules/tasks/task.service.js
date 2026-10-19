const taskRepository = require('./task.repository');
const contactService = require('../contacts/contact.service');
const leadService = require('../leads/lead.service');
const { NotFoundError, ForbiddenError } = require('../../errors');
const { getPagination, formatPaginatedResponse } = require('../../utils/pagination');
const { logActivity } = require('../../utils/activityLogger');

class TaskService {
  async listTasks(query, user) {
    const { page, limit, skip, orderBy } = getPagination(query);
    const isPrivileged = user && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN');
    const userDeptIds = (user?.departments || []).map((d) => d.id);
    const now = new Date();

    const where = {
      deletedAt: null,
      ...(query.status && { status: query.status }),
      ...(query.priority && { priority: query.priority }),
      ...(query.assignedToUserId && { assignedToUserId: query.assignedToUserId }),
      ...(query.creatorId && { creatorId: query.creatorId }),
      ...(query.contactId && { contactId: query.contactId }),
      ...(query.leadId && { leadId: query.leadId }),
      ...(query.search && {
        OR: [
          { title: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    // Preset filters
    if (query.filter === 'assigned_to_me') {
      where.assignedToUserId = user.id;
    } else if (query.filter === 'overdue') {
      where.dueDate = { lt: now };
      where.status = { notIn: ['COMPLETED', 'CANCELLED'] };
    } else if (query.filter === 'due_soon') {
      const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      where.dueDate = { gte: now, lte: in48Hours };
      where.status = { notIn: ['COMPLETED', 'CANCELLED'] };
    } else if (query.filter === 'completed') {
      where.status = 'COMPLETED';
    }

    // Department isolation: Non-privileged users only see tasks assigned to them, created by them, or matching department
    if (!isPrivileged) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { assignedToUserId: user?.id },
            { creatorId: user?.id },
            { contact: { departmentId: { in: userDeptIds } } },
            { lead: { departmentId: { in: userDeptIds } } },
            { contact: { departmentId: null } },
            { lead: { departmentId: null } },
            { contactId: null, leadId: null },
          ],
        },
      ];
    }

    const { total, items } = await taskRepository.findAll({ skip, limit, orderBy, where });
    
    // Add computed isOverdue and isDueSoon indicators
    const enhancedItems = items.map((task) => {
      const isComplete = task.status === 'COMPLETED' || task.status === 'CANCELLED';
      const isOverdue = !isComplete && task.dueDate && new Date(task.dueDate) < now;
      const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      const isDueSoon = !isComplete && task.dueDate && new Date(task.dueDate) >= now && new Date(task.dueDate) <= in48Hours;
      return {
        ...task,
        isOverdue: Boolean(isOverdue),
        isDueSoon: Boolean(isDueSoon),
      };
    });

    return formatPaginatedResponse(enhancedItems, total, page, limit);
  }

  async getTaskById(id, user) {
    const task = await taskRepository.findById(id);
    if (!task) {
      throw new NotFoundError('Task not found');
    }

    const isPrivileged = user && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN');
    if (!isPrivileged) {
      const userDeptIds = (user?.departments || []).map((d) => d.id);
      const isAssigned = task.assignedToUserId === user?.id;
      const isCreator = task.creatorId === user?.id;
      const isContactDept = task.contact?.departmentId && userDeptIds.includes(task.contact.departmentId);
      const isLeadDept = task.lead?.departmentId && userDeptIds.includes(task.lead.departmentId);
      const isUnlinked = !task.contactId && !task.leadId;

      if (!isAssigned && !isCreator && !isContactDept && !isLeadDept && !isUnlinked) {
        throw new ForbiddenError('You do not have permission to view this task');
      }
    }

    return task;
  }

  async createTask(data, user) {
    // Parent authorization checks
    if (data.contactId) {
      await contactService.getContactById(data.contactId, user);
    }
    if (data.leadId) {
      await leadService.getLeadById(data.leadId, user);
    }

    const assignedUserId = data.assignedToUserId || user.id;

    const task = await taskRepository.create({
      title: data.title,
      description: data.description || null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      priority: data.priority || 'MEDIUM',
      status: data.status || 'TODO',
      creatorId: user.id,
      assignedToUserId: assignedUserId,
      contactId: data.contactId || null,
      leadId: data.leadId || null,
      completedAt: data.status === 'COMPLETED' ? new Date() : null,
    });

    await logActivity({
      actorId: user.id,
      action: 'TASK_CREATED',
      entityType: 'TASK',
      entityId: task.id,
      contactId: task.contactId,
      leadId: task.leadId,
      description: `Task created: "${task.title}" (Priority: ${task.priority})`,
      metadata: { priority: task.priority, dueDate: task.dueDate },
    });

    return task;
  }

  async updateTask(id, data, user) {
    const currentTask = await this.getTaskById(id, user);

    if (data.contactId && data.contactId !== currentTask.contactId) {
      await contactService.getContactById(data.contactId, user);
    }
    if (data.leadId && data.leadId !== currentTask.leadId) {
      await leadService.getLeadById(data.leadId, user);
    }

    const updatePayload = { ...data };
    if (data.dueDate !== undefined) {
      updatePayload.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    }

    // Auto-update completedAt
    if (data.status === 'COMPLETED' && currentTask.status !== 'COMPLETED') {
      updatePayload.completedAt = new Date();
    } else if (data.status && data.status !== 'COMPLETED') {
      updatePayload.completedAt = null;
    }

    const updated = await taskRepository.update(id, updatePayload);

    if (data.status === 'COMPLETED' && currentTask.status !== 'COMPLETED') {
      await logActivity({
        actorId: user.id,
        action: 'TASK_COMPLETED',
        entityType: 'TASK',
        entityId: id,
        contactId: updated.contactId,
        leadId: updated.leadId,
        description: `Task completed: "${updated.title}"`,
      });
    } else {
      await logActivity({
        actorId: user.id,
        action: 'TASK_UPDATED',
        entityType: 'TASK',
        entityId: id,
        contactId: updated.contactId,
        leadId: updated.leadId,
        description: `Task updated: "${updated.title}"`,
        metadata: { updatedFields: Object.keys(data) },
      });
    }

    return updated;
  }

  async deleteTask(id, user) {
    const task = await this.getTaskById(id, user);
    await taskRepository.softDelete(id);

    await logActivity({
      actorId: user.id,
      action: 'TASK_DELETED',
      entityType: 'TASK',
      entityId: id,
      contactId: task.contactId,
      leadId: task.leadId,
      description: `Task deleted: "${task.title}"`,
    });

    return { id, deleted: true };
  }
}

module.exports = new TaskService();
