const { z } = require('zod');

const segmentFilterSchema = z.object({
  tags: z.array(z.string()).optional(),
  leadStages: z.array(z.string()).optional(),
  sources: z.array(z.string()).optional(),
  consentOnly: z.boolean().default(true),
  isOptedOut: z.boolean().default(false),
  departmentId: z.string().uuid().optional().nullable(),
  createdAfter: z.string().datetime().optional().nullable(),
  createdBefore: z.string().datetime().optional().nullable(),
  ownerId: z.string().uuid().optional().nullable(),
});

const createSegmentSchema = z.object({
  name: z.string().min(2, 'Segment name must be at least 2 characters').max(100),
  description: z.string().max(500).optional().nullable(),
  departmentId: z.string().uuid().optional().nullable(),
  filters: segmentFilterSchema.default({ consentOnly: true, isOptedOut: false }),
});

const updateSegmentSchema = createSegmentSchema.partial();

const previewFilterSchema = z.object({
  filters: segmentFilterSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

module.exports = {
  segmentFilterSchema,
  createSegmentSchema,
  updateSegmentSchema,
  previewFilterSchema,
};
