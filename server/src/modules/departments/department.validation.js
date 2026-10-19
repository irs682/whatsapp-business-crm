const { z } = require('zod');

const createDepartmentSchema = z.object({
  name: z.string().min(2, 'Department name must have at least 2 characters').max(50),
  description: z.string().max(255).optional().nullable(),
  isActive: z.boolean().optional().default(true),
  managerId: z.string().uuid().optional().nullable(),
});

const updateDepartmentSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  description: z.string().max(255).optional().nullable(),
  isActive: z.boolean().optional(),
  managerId: z.string().uuid().optional().nullable(),
});

const assignUserToDepartmentSchema = z.object({
  userId: z.string().uuid('Valid user ID is required'),
  isPrimary: z.boolean().optional().default(false),
});

const listDepartmentQuerySchema = z.object({
  search: z.string().optional(),
  isActive: z.string().optional(),
});

module.exports = {
  createDepartmentSchema,
  updateDepartmentSchema,
  assignUserToDepartmentSchema,
  listDepartmentQuerySchema,
};
