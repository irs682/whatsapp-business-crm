const noteRepository = require('./note.repository');
const contactService = require('../contacts/contact.service');
const leadService = require('../leads/lead.service');
const conversationRepository = require('../conversations/conversation.repository');
const { NotFoundError, ForbiddenError } = require('../../errors');
const { getPagination, formatPaginatedResponse } = require('../../utils/pagination');
const { logActivity } = require('../../utils/activityLogger');
const { getIO } = require('../../socket');

class NoteService {
  async listNotes(query, user) {
    const { page, limit, skip, orderBy } = getPagination(query);

    // Validate access to parent entity if querying by contactId or leadId
    if (query.contactId) {
      await contactService.getContactById(query.contactId, user);
    }
    if (query.leadId) {
      await leadService.getLeadById(query.leadId, user);
    }
    if (query.conversationId) {
      const conv = await conversationRepository.findById(query.conversationId);
      if (!conv) {
        throw new NotFoundError('Conversation not found');
      }
      if (
        user.role !== 'SUPER_ADMIN' &&
        user.role !== 'ADMIN' &&
        user.departmentId &&
        conv.departmentId &&
        conv.departmentId !== user.departmentId
      ) {
        throw new ForbiddenError('You do not have access to this conversation');
      }
    }

    const where = {
      deletedAt: null,
      ...(query.contactId && { contactId: query.contactId }),
      ...(query.leadId && { leadId: query.leadId }),
      ...(query.conversationId && { conversationId: query.conversationId }),
    };

    const { total, items } = await noteRepository.findAll({ skip, limit, orderBy, where });
    return formatPaginatedResponse(items, total, page, limit);
  }

  async createNote(data, user) {
    // Parent authorization check
    if (data.contactId) {
      await contactService.getContactById(data.contactId, user);
    }
    if (data.leadId) {
      await leadService.getLeadById(data.leadId, user);
    }
    if (data.conversationId) {
      const conv = await conversationRepository.findById(data.conversationId);
      if (!conv) {
        throw new NotFoundError('Conversation not found');
      }
      if (
        user.role !== 'SUPER_ADMIN' &&
        user.role !== 'ADMIN' &&
        user.departmentId &&
        conv.departmentId &&
        conv.departmentId !== user.departmentId
      ) {
        throw new ForbiddenError('You do not have permission to add notes to this conversation');
      }
    }

    const note = await noteRepository.create({
      content: data.content,
      contactId: data.contactId || null,
      leadId: data.leadId || null,
      conversationId: data.conversationId || null,
      isInternal: data.isInternal !== undefined ? data.isInternal : true,
      authorId: user.id,
    });

    await logActivity({
      actorId: user.id,
      action: 'NOTE_ADDED',
      entityType: 'NOTE',
      entityId: note.id,
      contactId: note.contactId,
      leadId: note.leadId,
      description: `Internal note added by ${user.firstName || 'User'}`,
      metadata: { isInternal: note.isInternal, conversationId: note.conversationId },
    });

    // Real-time broadcast
    if (note.conversationId) {
      try {
        const io = getIO();
        io.to(`conversation:${note.conversationId}`).emit('note.created', {
          conversationId: note.conversationId,
          note,
        });
      } catch (err) {
        // Socket not initialized in test/isolated mode
      }
    }

    return note;
  }

  async deleteNote(id, user) {
    const note = await noteRepository.findById(id);
    if (!note) {
      throw new NotFoundError('Note not found');
    }

    const isPrivileged = user.role === 'SUPER_ADMIN' || user.role === 'ADMIN';
    const isAuthor = note.authorId === user.id;

    if (!isPrivileged && !isAuthor) {
      throw new ForbiddenError('You can only delete your own notes');
    }

    await noteRepository.softDelete(id);

    await logActivity({
      actorId: user.id,
      action: 'NOTE_DELETED',
      entityType: 'NOTE',
      entityId: id,
      contactId: note.contactId,
      leadId: note.leadId,
      description: `Internal note deleted by ${user.firstName || 'User'}`,
    });

    return { id, deleted: true };
  }
}

module.exports = new NoteService();
