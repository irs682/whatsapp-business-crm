const prisma = require('../../../config/prisma');
const { ApiError } = require('../../../errors');
const { logActivity } = require('../../../utils/activityLogger');

class AutomationService {
  /**
   * List automation rules
   */
  async listRules(user) {
    return prisma.marketingAutomationRule.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { executions: true } },
      },
    });
  }

  /**
   * Create new automation rule
   */
  async createRule(data, user) {
    const rule = await prisma.marketingAutomationRule.create({
      data: {
        name: data.name,
        description: data.description,
        triggerType: data.triggerType,
        triggerConfig: data.triggerConfig || null,
        conditions: data.conditions || null,
        actionType: data.actionType,
        actionConfig: data.actionConfig || null,
        isActive: data.isActive !== undefined ? data.isActive : true,
        createdById: user.id,
      },
    });

    await logActivity({
      actorId: user.id,
      action: 'CREATE_AUTOMATION_RULE',
      entityType: 'AUTOMATION_RULE',
      entityId: rule.id,
      description: `Created automation rule "${rule.name}" for trigger ${rule.triggerType}`,
    });

    return rule;
  }

  /**
   * Get single rule by ID
   */
  async getRuleById(id, user) {
    const rule = await prisma.marketingAutomationRule.findUnique({
      where: { id },
      include: {
        executions: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!rule) throw new ApiError(404, 'Automation rule not found');
    return rule;
  }

  /**
   * Update automation rule
   */
  async updateRule(id, data, user) {
    await this.getRuleById(id, user);

    const updated = await prisma.marketingAutomationRule.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    return updated;
  }

  /**
   * Delete automation rule
   */
  async deleteRule(id, user) {
    await this.getRuleById(id, user);

    await prisma.marketingAutomationRule.delete({
      where: { id },
    });

    return { message: 'Automation rule deleted successfully' };
  }

  /**
   * Get execution history for a rule
   */
  async getExecutions(id, user, page = 1, limit = 20) {
    await this.getRuleById(id, user);
    const skip = (Number(page) - 1) * Number(limit);

    const [total, items] = await Promise.all([
      prisma.automationExecution.count({ where: { ruleId: id } }),
      prisma.automationExecution.findMany({
        where: { ruleId: id },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      items,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)) || 1,
      },
    };
  }

  /**
   * Trigger evaluation engine
   */
  async evaluateTrigger(triggerType, eventContext = {}) {
    const activeRules = await prisma.marketingAutomationRule.findMany({
      where: {
        triggerType,
        isActive: true,
      },
    });

    const results = [];

    for (const rule of activeRules) {
      try {
        // Evaluate conditions
        let matches = true;
        if (rule.conditions && typeof rule.conditions === 'object') {
          for (const [key, expectedVal] of Object.entries(rule.conditions)) {
            if (eventContext[key] !== undefined && eventContext[key] !== expectedVal) {
              matches = false;
              break;
            }
          }
        }

        if (!matches) {
          results.push({ ruleId: rule.id, status: 'SKIPPED', reason: 'Conditions not met' });
          continue;
        }

        // Execute configured action
        let executionDetails = {};
        const contactId = eventContext.contactId;

        switch (rule.actionType) {
          case 'CREATE_TASK': {
            const taskTitle = rule.actionConfig?.taskTitle || `Follow-up on ${rule.name}`;
            const priority = rule.actionConfig?.priority || 'MEDIUM';
            const adminUser = await prisma.user.findFirst({ where: { role: { name: 'ADMIN' } } });

            const task = await prisma.task.create({
              data: {
                title: taskTitle,
                description: `Created automatically by rule "${rule.name}"`,
                priority,
                status: 'PENDING',
                creatorId: adminUser?.id || rule.createdById,
                contactId: contactId || null,
                leadId: eventContext.leadId || null,
              },
            });
            executionDetails = { taskId: task.id, title: task.title };
            break;
          }
          case 'ASSIGN_DEPARTMENT': {
            const departmentId = rule.actionConfig?.departmentId;
            if (departmentId && contactId) {
              await prisma.contact.update({
                where: { id: contactId },
                data: { departmentId },
              });
              executionDetails = { departmentId };
            }
            break;
          }
          case 'SUPPRESS_CONTACT': {
            if (contactId) {
              await prisma.contact.update({
                where: { id: contactId },
                data: { isOptedOut: true, consentStatus: 'REVOKED', optOutAt: new Date() },
              });
              executionDetails = { suppressed: true };
            }
            break;
          }
          default:
            executionDetails = { action: rule.actionType, executed: true };
        }

        // Record execution audit log
        await prisma.automationExecution.create({
          data: {
            ruleId: rule.id,
            contactId: contactId || null,
            status: 'SUCCESS',
            executionDetails,
          },
        });

        results.push({ ruleId: rule.id, status: 'SUCCESS', executionDetails });
      } catch (err) {
        console.error(`[AutomationEngine] Failed to execute rule ${rule.id}:`, err.message);
        await prisma.automationExecution.create({
          data: {
            ruleId: rule.id,
            contactId: eventContext.contactId || null,
            status: 'FAILED',
            error: err.message,
          },
        });
        results.push({ ruleId: rule.id, status: 'FAILED', error: err.message });
      }
    }

    return results;
  }
}

module.exports = new AutomationService();
