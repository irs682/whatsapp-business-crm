const { z } = require('zod');

const createDepartmentSchema = z.object({
  name: z.string().min(2, 'Department name must have at least 2 characters').max(50),
  description: z.string().max(255).optional(),
  isActive: z.boolean().optional().default(true),
});

const updateDepartmentSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  description: z.string().max(255).optional(),
  isActive: z.boolean().optional(),
});

const listDepartmentQuerySchema = z.object({
  search: z.string().optional(),
  isActive: z.string().optional(),
});

module.exports = {
  createDepartmentSchema,
  updateDepartmentSchema,
  listDepartmentQuerySchema,
};
