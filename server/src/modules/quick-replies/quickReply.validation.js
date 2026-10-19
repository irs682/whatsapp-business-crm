const { z } = require('zod');

const createQuickReplySchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  content: z.string().min(1, 'Content is required').max(2000),
  shortcut: z.string().regex(/^\/[a-zA-Z0-9_-]+$/, 'Shortcut must start with / followed by alphanumeric characters').max(30).optional().nullable(),
  departmentId: z.string().uuid().optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

const updateQuickReplySchema = z.object({
  title: z.string().min(1).max(100).optional(),
  content: z.string().min(1).max(2000).optional(),
  shortcut: z.string().regex(/^\/[a-zA-Z0-9_-]+$/).max(30).optional().nullable(),
  departmentId: z.string().uuid().optional().nullable(),
  isActive: z.boolean().optional(),
});

const listQuickRepliesQuerySchema = z.object({
  departmentId: z.string().uuid().optional(),
  search: z.string().optional(),
});

module.exports = {
  createQuickReplySchema,
  updateQuickReplySchema,
  listQuickRepliesQuerySchema,
};
