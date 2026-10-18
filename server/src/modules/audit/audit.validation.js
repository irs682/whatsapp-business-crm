const { z } = require('zod');

const auditQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
});

module.exports = {
  auditQuerySchema,
};
