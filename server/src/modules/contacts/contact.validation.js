const { z } = require('zod');

const createContactSchema = z.object({
  phone: z.string().min(5, 'Phone number is required').max(25),
  waId: z.string().optional().nullable(),
  firstName: z.string().max(50).optional().nullable(),
  lastName: z.string().max(50).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  company: z.string().max(100).optional().nullable(),
  source: z.string().max(50).optional().default('DIRECT'),
  ownerId: z.string().uuid().optional().nullable(),
  departmentId: z.string().uuid().optional().nullable(),
  tagIds: z.array(z.string().uuid()).optional().default([]),
  tags: z.array(z.string()).optional().default([]),
  customFields: z.record(z.any()).optional().default({}),
  consentStatus: z.enum(['GRANTED', 'REVOKED', 'PENDING']).optional().default('PENDING'),
});

const updateContactSchema = z.object({
  phone: z.string().min(5).max(25).optional(),
  waId: z.string().optional().nullable(),
  firstName: z.string().max(50).optional().nullable(),
  lastName: z.string().max(50).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  company: z.string().max(100).optional().nullable(),
  source: z.string().max(50).optional().nullable(),
  ownerId: z.string().uuid().optional().nullable(),
  departmentId: z.string().uuid().optional().nullable(),
  tagIds: z.array(z.string().uuid()).optional(),
  tags: z.array(z.string()).optional(),
  customFields: z.record(z.any()).optional(),
  consentStatus: z.enum(['GRANTED', 'REVOKED', 'PENDING']).optional(),
  isOptedOut: z.boolean().optional(),
});

const listContactQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  tag: z.string().optional(),
  departmentId: z.string().uuid().optional(),
  ownerId: z.string().uuid().optional(),
  consentStatus: z.enum(['GRANTED', 'REVOKED', 'PENDING']).optional(),
  isOptedOut: z.string().optional(),
});

const importContactsSchema = z.object({
  rows: z.array(
    z.object({
      phone: z.string().min(3, 'Phone is required'),
      firstName: z.string().optional().nullable(),
      lastName: z.string().optional().nullable(),
      email: z.string().optional().nullable(),
      company: z.string().optional().nullable(),
      source: z.string().optional().nullable(),
      tags: z.union([z.array(z.string()), z.string()]).optional(),
      departmentId: z.string().uuid().optional().nullable(),
    })
  ).min(1, 'At least one contact row is required'),
  preview: z.boolean().optional().default(false),
  defaultDepartmentId: z.string().uuid().optional().nullable(),
});

module.exports = {
  createContactSchema,
  updateContactSchema,
  listContactQuerySchema,
  importContactsSchema,
};
