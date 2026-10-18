const { z } = require('zod');

const consentQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
});

module.exports = {
  consentQuerySchema,
};
