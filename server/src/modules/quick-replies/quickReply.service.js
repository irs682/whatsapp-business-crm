const quickReplyRepository = require('./quickReply.repository');
const { NotFoundError, ConflictError } = require('../../errors');

class QuickReplyService {
  async list(query = {}, user) {
    const isPrivileged = user && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN');
    const userDeptIds = (user?.departments || []).map((d) => d.id);

    const where = {
      isActive: true,
      ...(query.search && {
        OR: [
          { title: { contains: query.search, mode: 'insensitive' } },
          { shortcut: { contains: query.search, mode: 'insensitive' } },
          { content: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    // Scoping: Non-admin users see global quick replies (departmentId is null) plus their department's quick replies
    if (!isPrivileged) {
      where.OR = [
        ...(where.OR || []),
        { departmentId: null },
        { departmentId: { in: userDeptIds } },
      ];
    } else if (query.departmentId) {
      where.departmentId = query.departmentId;
    }

    return quickReplyRepository.findAll({ where });
  }

  async getById(id) {
    const qr = await quickReplyRepository.findById(id);
    if (!qr) throw new NotFoundError('Quick reply not found');
    return qr;
  }

  async create(data, user) {
    if (data.shortcut) {
      const existing = await quickReplyRepository.findByShortcut(data.shortcut);
      if (existing) {
        throw new ConflictError(`Quick reply with shortcut "${data.shortcut}" already exists`);
      }
    }

    return quickReplyRepository.create({
      ...data,
      createdById: user.id,
    });
  }

  async update(id, data) {
    await this.getById(id);

    if (data.shortcut) {
      const existing = await quickReplyRepository.findByShortcut(data.shortcut);
      if (existing && existing.id !== id) {
        throw new ConflictError(`Quick reply with shortcut "${data.shortcut}" already exists`);
      }
    }

    return quickReplyRepository.update(id, data);
  }

  async delete(id) {
    await this.getById(id);
    await quickReplyRepository.delete(id);
    return { id, deleted: true };
  }
}

module.exports = new QuickReplyService();
