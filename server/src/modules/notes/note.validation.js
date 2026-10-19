const { z } = require('zod');

const createNoteSchema = z.object({
  content: z.string().min(1, 'Note content cannot be empty').max(5000),
  contactId: z.string().uuid('Valid contact ID is required').optional().nullable(),
  leadId: z.string().uuid('Valid lead ID is required').optional().nullable(),
  conversationId: z.string().uuid('Valid conversation ID is required').optional().nullable(),
  isInternal: z.boolean().optional().default(true),
}).refine((data) => data.contactId || data.leadId || data.conversationId, {
  message: 'A note must be attached to at least one entity (contact, lead, or conversation)',
});

const listNotesQuerySchema = z.object({
  contactId: z.string().uuid().optional(),
  leadId: z.string().uuid().optional(),
  conversationId: z.string().uuid().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

module.exports = {
  createNoteSchema,
  listNotesQuerySchema,
};
