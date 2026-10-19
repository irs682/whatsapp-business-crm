const contactRepository = require('./contact.repository');
const { ConflictError, NotFoundError, ForbiddenError, BadRequestError } = require('../../errors');
const { getPagination, formatPaginatedResponse } = require('../../utils/pagination');
const { normalizePhoneNumber } = require('../../utils/phone');
const { logActivity } = require('../../utils/activityLogger');

class ContactService {
  async listContacts(query, user) {
    const { page, limit, skip, orderBy } = getPagination(query);
    const isPrivileged = user && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN');
    const userDeptIds = (user?.departments || []).map((d) => d.id);

    const where = {
      deletedAt: null,
      ...(query.consentStatus && { consentStatus: query.consentStatus }),
      ...(query.isOptedOut !== undefined && { isOptedOut: query.isOptedOut === 'true' }),
      ...(query.ownerId && { ownerId: query.ownerId }),
      ...(query.tag && {
        OR: [
          { tags: { has: query.tag } },
          { contactTags: { some: { tag: { name: { equals: query.tag, mode: 'insensitive' } } } } },
        ],
      }),
      ...(query.search && {
        OR: [
          { phone: { contains: query.search, mode: 'insensitive' } },
          { firstName: { contains: query.search, mode: 'insensitive' } },
          { lastName: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
          { company: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    // Department isolation: Non-privileged users only see contacts assigned to them,
    // in their departments, or in the unassigned pool
    if (!isPrivileged) {
      where.AND = [
        {
          OR: [
            { departmentId: { in: userDeptIds } },
            { ownerId: user?.id },
            {
              conversations: {
                some: { departmentId: { in: userDeptIds } },
              },
            },
            {
              leads: {
                some: { departmentId: { in: userDeptIds } },
              },
            },
            {
              AND: [
                { departmentId: null },
                { ownerId: null },
                { conversations: { none: {} } },
              ],
            },
          ],
        },
      ];
    } else if (query.departmentId) {
      where.departmentId = query.departmentId;
    }

    const { total, items } = await contactRepository.findAll({ skip, limit, orderBy, where });
    return formatPaginatedResponse(items, total, page, limit);
  }

  async getContactById(id, user) {
    const contact = await contactRepository.findById(id);
    if (!contact) {
      throw new NotFoundError('Contact not found');
    }

    if (user && user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      const userDeptIds = (user.departments || []).map((d) => d.id);

      // Check direct contact department or owner
      const isOwner = contact.ownerId === user.id;
      const isDirectDept = contact.departmentId && userDeptIds.includes(contact.departmentId);

      // Check linked conversations and leads
      const conversationDeptIds = (contact.conversations || []).map((c) => c.departmentId).filter(Boolean);
      const leadDeptIds = (contact.leads || []).map((l) => l.departmentId).filter(Boolean);
      const allContactDeptIds = [
        ...new Set([...(contact.departmentId ? [contact.departmentId] : []), ...conversationDeptIds, ...leadDeptIds]),
      ];

      const hasDeptAccess = allContactDeptIds.some((deptId) => userDeptIds.includes(deptId));
      const isUnassigned = allContactDeptIds.length === 0 && !contact.ownerId;

      if (!isOwner && !isDirectDept && !hasDeptAccess && !isUnassigned) {
        throw new ForbiddenError('You do not have access to contacts belonging to unauthorized departments');
      }

      // Filter sub-resources by authorized departments
      if (contact.conversations) {
        contact.conversations = contact.conversations.filter(
          (c) => !c.departmentId || userDeptIds.includes(c.departmentId) || c.assignedToUserId === user.id
        );
      }
      if (contact.leads) {
        contact.leads = contact.leads.filter(
          (l) => !l.departmentId || userDeptIds.includes(l.departmentId) || l.assignedToUserId === user.id
        );
      }
    }

    return contact;
  }

  async createContact(data, user) {
    const normalizedPhone = normalizePhoneNumber(data.phone);
    if (!normalizedPhone) {
      throw new BadRequestError('Invalid phone number provided');
    }

    const existing = await contactRepository.findByPhone(normalizedPhone);
    if (existing) {
      throw new ConflictError(`A contact with phone number ${normalizedPhone} already exists`);
    }

    if (data.waId) {
      const existingWa = await contactRepository.findByWaId(data.waId);
      if (existingWa) {
        throw new ConflictError('A contact with this WhatsApp ID already exists');
      }
    }

    const { tagIds, ...contactFields } = data;
    contactFields.phone = normalizedPhone;
    if (!contactFields.ownerId && user) {
      contactFields.ownerId = user.id;
    }

    const contact = await contactRepository.create(contactFields, tagIds || []);

    // Record activity
    await logActivity({
      actorId: user?.id,
      action: 'CONTACT_CREATED',
      entityType: 'CONTACT',
      entityId: contact.id,
      contactId: contact.id,
      description: `Contact ${contact.firstName || ''} ${contact.lastName || ''} (${contact.phone}) created`,
      metadata: { phone: contact.phone, source: contact.source },
    });

    return this.getContactById(contact.id, user);
  }

  async updateContact(id, data, user) {
    await this.getContactById(id, user);

    if (data.phone) {
      const normalizedPhone = normalizePhoneNumber(data.phone);
      if (!normalizedPhone) {
        throw new BadRequestError('Invalid phone number provided');
      }
      const existing = await contactRepository.findByPhone(normalizedPhone);
      if (existing && existing.id !== id) {
        throw new ConflictError(`Phone number ${normalizedPhone} is already associated with another contact`);
      }
      data.phone = normalizedPhone;
    }

    if (data.isOptedOut === true) {
      data.optOutAt = new Date();
      data.consentStatus = 'REVOKED';
    } else if (data.isOptedOut === false) {
      data.optOutAt = null;
    }

    const { tagIds, ...contactFields } = data;
    const updated = await contactRepository.update(id, contactFields, tagIds);

    // Record activity
    await logActivity({
      actorId: user?.id,
      action: data.isOptedOut ? 'CONTACT_OPT_OUT' : 'CONTACT_UPDATED',
      entityType: 'CONTACT',
      entityId: id,
      contactId: id,
      description: `Contact updated by ${user?.firstName || 'User'}`,
      metadata: { fields: Object.keys(data) },
    });

    return this.getContactById(id, user);
  }

  async importContacts(payload, user) {
    const { rows, preview, defaultDepartmentId } = payload;
    const validRows = [];
    const rejectedRows = [];
    const seenPhonesInBatch = new Set();

    // 1. First pass: normalize and detect intra-batch duplicates
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const rawPhone = row.phone;
      const normalized = normalizePhoneNumber(rawPhone);

      if (!normalized || normalized.length < 5) {
        rejectedRows.push({
          rowNumber: index + 1,
          data: row,
          reason: 'Invalid or missing phone number',
        });
        continue;
      }

      if (seenPhonesInBatch.has(normalized)) {
        rejectedRows.push({
          rowNumber: index + 1,
          data: row,
          reason: `Duplicate phone number within import batch: ${normalized}`,
        });
        continue;
      }

      seenPhonesInBatch.add(normalized);
      validRows.push({
        ...row,
        phone: normalized,
        originalIndex: index + 1,
      });
    }

    // 2. Second pass: check against existing contacts in PostgreSQL
    const candidatePhones = validRows.map((r) => r.phone);
    const existingInDb = await contactRepository.findExistingPhones(candidatePhones);
    const existingDbPhoneSet = new Set(existingInDb.map((c) => c.phone));

    const finalImportList = [];
    for (const validRow of validRows) {
      if (existingDbPhoneSet.has(validRow.phone)) {
        rejectedRows.push({
          rowNumber: validRow.originalIndex,
          data: validRow,
          reason: `Contact already exists in database with phone: ${validRow.phone}`,
        });
      } else {
        // Tag parsing (array or comma-separated string)
        let tagNames = [];
        if (Array.isArray(validRow.tags)) {
          tagNames = validRow.tags;
        } else if (typeof validRow.tags === 'string' && validRow.tags.trim()) {
          tagNames = validRow.tags.split(',').map((t) => t.trim()).filter(Boolean);
        }

        finalImportList.push({
          phone: validRow.phone,
          firstName: validRow.firstName || null,
          lastName: validRow.lastName || null,
          email: validRow.email || null,
          company: validRow.company || null,
          source: validRow.source || 'CSV_IMPORT',
          ownerId: user?.id || null,
          departmentId: validRow.departmentId || defaultDepartmentId || null,
          // CRITICAL: Importing a contact must NEVER automatically opt them into marketing!
          consentStatus: 'PENDING',
          isOptedOut: false,
          tagNames,
        });
      }
    }

    // If preview mode, return validation breakdown without database write
    if (preview) {
      return {
        preview: true,
        totalRows: rows.length,
        validCount: finalImportList.length,
        duplicateCount: existingDbPhoneSet.size + (rows.length - validRows.length),
        rejectedCount: rejectedRows.length,
        validPreview: finalImportList.slice(0, 5),
        rejectedRows,
      };
    }

    // Perform bulk creation
    const created = await contactRepository.bulkCreate(finalImportList);

    // Record batch import activity
    await logActivity({
      actorId: user?.id,
      action: 'CONTACT_IMPORT',
      entityType: 'CONTACT',
      entityId: user?.id || 'SYSTEM',
      description: `Imported ${created.length} contacts from CSV (${rejectedRows.length} rejected)`,
      metadata: { importedCount: created.length, rejectedCount: rejectedRows.length },
    });

    return {
      success: true,
      importedCount: created.length,
      rejectedCount: rejectedRows.length,
      rejectedRows,
    };
  }

  async getContactActivity(id, user) {
    await this.getContactById(id, user);
    return contactRepository.getActivity(id);
  }

  async deleteContact(id, user) {
    await this.getContactById(id, user);
    await contactRepository.softDelete(id);

    await logActivity({
      actorId: user?.id,
      action: 'CONTACT_DELETED',
      entityType: 'CONTACT',
      entityId: id,
      contactId: id,
      description: `Contact archived by ${user?.firstName || 'User'}`,
    });

    return { id, deleted: true };
  }
}

module.exports = new ContactService();
