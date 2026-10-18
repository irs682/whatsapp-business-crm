const { z } = require('zod');

const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  phone: z.string().optional(),
  roleId: z.string().uuid('Invalid role ID'),
  departmentIds: z.array(z.string().uuid('Invalid department ID')).optional().default([]),
});

const updateUserSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  phone: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
  roleId: z.string().uuid().optional(),
  departmentIds: z.array(z.string().uuid()).optional(),
});

const listUsersQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  role: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
});

module.exports = {
  createUserSchema,
  updateUserSchema,
  listUsersQuerySchema,
};
