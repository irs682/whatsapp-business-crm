const prisma = require('../../config/prisma');

class ContactRepository {
  async findAll({ skip, limit, orderBy, where }) {
    const [total, items] = await Promise.all([
      prisma.contact.count({ where }),
      prisma.contact.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          owner: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          department: {
            select: { id: true, name: true },
          },
          contactTags: {
            include: { tag: true },
          },
          _count: {
            select: {
              conversations: true,
              leads: true,
              notes: true,
              tasks: true,
            },
          },
        },
      }),
    ]);

    return { total, items };
  }

  async findById(id) {
    return prisma.contact.findFirst({
      where: { id, deletedAt: null },
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        department: {
          select: { id: true, name: true },
        },
        contactTags: {
          include: { tag: true },
        },
        conversations: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        leads: {
          orderBy: { createdAt: 'desc' },
          include: {
            assignedToUser: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        notes: {
          where: { deletedAt: null },
          include: {
            author: {
              select: { id: true, firstName: true, lastName: true, email: true },
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
        consents: {
          orderBy: { createdAt: 'desc' },
        },
        activityLogs: {
          orderBy: { createdAt: 'desc' },
          take: 25,
          include: {
            actor: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });
  }

  async findByPhone(phone) {
    return prisma.contact.findFirst({
      where: { phone, deletedAt: null },
    });
  }

  async findByWaId(waId) {
    return prisma.contact.findFirst({
      where: { waId, deletedAt: null },
    });
  }

  async findExistingPhones(phoneList) {
    if (!phoneList || phoneList.length === 0) return [];
    const existing = await prisma.contact.findMany({
      where: {
        phone: { in: phoneList },
        deletedAt: null,
      },
      select: { phone: true, id: true, firstName: true, lastName: true },
    });
    return existing;
  }

  async create(data, tagIds = []) {
    return prisma.$transaction(async (tx) => {
      const contact = await tx.contact.create({
        data,
      });

      if (tagIds && tagIds.length > 0) {
        await tx.contactTag.createMany({
          data: tagIds.map((tagId) => ({
            contactId: contact.id,
            tagId,
          })),
        });
      }

      return contact;
    });
  }

  async update(id, data, tagIds) {
    return prisma.$transaction(async (tx) => {
      const contact = await tx.contact.update({
        where: { id },
        data,
      });

      if (tagIds !== undefined) {
        await tx.contactTag.deleteMany({
          where: { contactId: id },
        });

        if (tagIds.length > 0) {
          await tx.contactTag.createMany({
            data: tagIds.map((tagId) => ({
              contactId: id,
              tagId,
            })),
          });
        }
      }

      return contact;
    });
  }

  async bulkCreate(contactsData) {
    return prisma.$transaction(async (tx) => {
      const createdContacts = [];
      for (const item of contactsData) {
        const { tagNames, ...contactFields } = item;
        const contact = await tx.contact.create({
          data: contactFields,
        });

        if (tagNames && tagNames.length > 0) {
          for (const tName of tagNames) {
            const tag = await tx.tag.upsert({
              where: { name: tName.trim() },
              update: {},
              create: { name: tName.trim() },
            });
            await tx.contactTag.create({
              data: { contactId: contact.id, tagId: tag.id },
            });
          }
        }

        createdContacts.push(contact);
      }
      return createdContacts;
    });
  }

  async getActivity(contactId) {
    return prisma.activityLog.findMany({
      where: { contactId },
      orderBy: { createdAt: 'desc' },
      include: {
        actor: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  }

  async softDelete(id) {
    return prisma.contact.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}

module.exports = new ContactRepository();
