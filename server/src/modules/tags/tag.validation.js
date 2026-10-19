const { z } = require('zod');

const createTagSchema = z.object({
  name: z.string().min(1, 'Tag name is required').max(30),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex code (e.g. #10b981)').optional().default('#10b981'),
  description: z.string().max(255).optional().nullable(),
});

const updateTagSchema = z.object({
  name: z.string().min(1).max(30).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex code').optional(),
  description: z.string().max(255).optional().nullable(),
});

const listTagsQuerySchema = z.object({
  search: z.string().optional(),
});

module.exports = {
  createTagSchema,
  updateTagSchema,
  listTagsQuerySchema,
};
