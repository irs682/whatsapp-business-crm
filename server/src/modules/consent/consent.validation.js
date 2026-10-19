const { z } = require('zod');

const recordConsentSchema = z.object({
  status: z.enum(['GRANTED', 'REVOKED', 'PENDING']),
  source: z.string().min(2).default('MANUAL_STAFF'),
  proof: z.string().max(500).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

module.exports = {
  recordConsentSchema,
};
