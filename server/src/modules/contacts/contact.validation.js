const { z } = require('zod');

const createContactSchema = z.object({
  phone: z.string().min(5, 'Phone number is required').max(25),
  waId: z.string().optional(),
  firstName: z.string().max(50).optional(),
  lastName: z.string().max(50).optional(),
  email: z.string().email().optional().or(z.literal('')),
  tags: z.array(z.string()).optional().default([]),
  customFields: z.record(z.any()).optional().default({}),
  consentStatus: z.enum(['GRANTED', 'REVOKED', 'PENDING']).optional().default('PENDING'),
});

const updateContactSchema = z.object({
  phone: z.string().min(5).max(25).optional(),
  waId: z.string().optional(),
  firstName: z.string().max(50).optional(),
  lastName: z.string().max(50).optional(),
  email: z.string().email().optional().or(z.literal('')),
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
  consentStatus: z.enum(['GRANTED', 'REVOKED', 'PENDING']).optional(),
  isOptedOut: z.string().optional(),
});

module.exports = {
  createContactSchema,
  updateContactSchema,
  listContactQuerySchema,
};
